import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, Dimensions, Keyboard, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation";
import { closeFabAnim } from "../../navigation/fabAnimState";
import { fetchFinanceItems } from "../../lib/financeService";
import { listBankAccounts } from "../../lib/bankAccountsService";
import { listFinanceCategories } from "../../lib/financeCategoriesService";
import { getKnownTags } from "../../lib/tagsStore";
import { apiUrl } from "../../lib/api";
import { getToken } from "../../lib/auth";
import type { BankAccount, FinanceCategoryOption, FinanceItem } from "../../types/finance";
import {
  TxType, Summary, QUICK, MORE,
  fmtAmount, todayBR, brToISO, parseCents, makeGroupId, addMonthsISO, seriesInfo,
} from "./addTransaction/shared";
import QuickActionsSheet from "./addTransaction/QuickActionsSheet";
import TransactionForm   from "./addTransaction/TransactionForm";

const { height: SCREEN_H } = Dimensions.get("window");

export default function AddTransactionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route      = useRoute<RouteProp<RootStackParamList, "AddTransaction">>();
  const defaultType = route.params?.defaultType;
  const editItem    = route.params?.editItem;

  // ── Ações rápidas ─────────────────────────────────────────────────
  const [summary,          setSummary]          = useState<Summary | null>(null);
  const [showNovoBanco,    setShowNovoBanco]    = useState(false);
  const [showTransferencia,setShowTransferencia]= useState(false);
  const slideAnim   = useRef(new Animated.Value(SCREEN_H)).current;
  const cardY       = useRef(new Animated.Value(30)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const quickAnims  = useRef(QUICK.map(() => new Animated.Value(0))).current;
  const cardAnims   = useRef(MORE.map(() => ({ x: new Animated.Value(0), opacity: new Animated.Value(0) }))).current;
  const headerY     = useRef(new Animated.Value(-40)).current;
  const headerOp    = useRef(new Animated.Value(0)).current;

  // ── Formulário ────────────────────────────────────────────────────
  const formSlide   = useRef(new Animated.Value(SCREEN_H)).current;
  const [formType,         setFormType]         = useState<TxType | null>(null);
  const [formVisible,      setFormVisible]      = useState(false);
  const [title,            setTitle]            = useState("");
  const [amount,           setAmount]           = useState("");
  const [dateBR,           setDateBR]           = useState(todayBR);
  const [payType,          setPayType]          = useState("pix");
  const [paid,             setPaid]             = useState(true);
  const [note,             setNote]             = useState("");
  const [tags,             setTags]             = useState("");
  const [availableTags,    setAvailableTags]    = useState<string[]>([]);
  const [saving,           setSaving]           = useState(false);
  const [categories,       setCategories]       = useState<FinanceCategoryOption[]>([]);
  const [selectedCat,      setSelectedCat]      = useState<FinanceCategoryOption | null>(null);
  const [catModal,         setCatModal]         = useState(false);
  const [accounts,         setAccounts]         = useState<BankAccount[]>([]);
  const [selectedAcc,      setSelectedAcc]      = useState<BankAccount | null>(null);
  const [accModal,         setAccModal]         = useState(false);
  const [deleteModal,      setDeleteModal]      = useState(false);
  const [isRecurring,      setIsRecurring]      = useState(false);
  const [recurringMode,    setRecurringMode]    = useState<"forever" | "months">("forever");
  const [recurringMonths,  setRecurringMonths]  = useState("12");
  const [recurringAction,  setRecurringAction]  = useState<"edit" | "delete" | "unset" | null>(null);
  const [recurringGaps,    setRecurringGaps]    = useState<string[] | null>(null);   // meses (YYYY-MM) apagados na série (modal)
  const [seriesGaps,       setSeriesGaps]       = useState<string[]>([]);            // buracos detectados ao abrir (banner inline)

  // ── Mount: entrada ────────────────────────────────────────────────
  useEffect(() => {
    if (editItem) {
      slideAnim.setValue(0);
      openEditForm(editItem);
    } else if (defaultType) {
      slideAnim.setValue(0);
      openForm(defaultType);
    } else {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 18 }).start();
    }
  }, []);

  // ── Mount: saldo e contas ─────────────────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardY,       { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    void (async () => {
      try {
        const [items, accs] = await Promise.all([fetchFinanceItems(), listBankAccounts()]);
        const ym = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; })();
        let rec = 0, des = 0, cumR = 0, cumD = 0;
        for (const it of items) {
          if (it.dateISO.startsWith(ym)) { if (it.type==="RECEITA") rec+=it.amountCents; else des+=it.amountCents; }
          if (it.type==="RECEITA") cumR+=it.amountCents; else cumD+=it.amountCents;
        }
        const stored = accs.reduce((s, a) => s + a.balanceCents, 0);
        setSummary({ saldo: accs.length > 0 && stored !== 0 ? stored : cumR - cumD, receitas: rec, despesas: des });
        setAccounts(accs);
        if (editItem)           setSelectedAcc(accs.find(a => a.id === editItem.accountId) ?? null);
        else if (accs.length === 1) setSelectedAcc(accs[0]);
        if (editItem?.recurringGroupId) {
          const group = items.filter(it => it.recurringGroupId === editItem.recurringGroupId);
          setSeriesGaps(seriesInfo(group, editItem.dateISO).missing);
        }
        const tagSet = new Set<string>();
        for (const it of items) {
          if (it.tags) it.tags.split(",").map(t => t.trim()).filter(Boolean).forEach(t => tagSet.add(t));
        }
        const known = await getKnownTags();
        known.forEach(t => tagSet.add(t));
        setAvailableTags([...tagSet].sort());
      } catch {}
    })();
  }, []);

  // ── Mount: animações do menu ──────────────────────────────────────
  useEffect(() => {
    cardAnims.forEach((a, i) => { a.x.setValue(i%2===0?-320:320); a.opacity.setValue(0); });
    quickAnims.forEach(a => a.setValue(0));
    headerY.setValue(-40); headerOp.setValue(0);
    Animated.parallel([
      Animated.spring(headerY,  { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(headerOp, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.stagger(80, quickAnims.map(a => Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }))),
      Animated.sequence([
        Animated.delay(180),
        Animated.stagger(50, cardAnims.map(a => Animated.parallel([
          Animated.spring(a.x,       { toValue: 0, useNativeDriver: true, tension: 70, friction: 11 }),
          Animated.timing(a.opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        ]))),
      ]),
    ]).start();
  }, []);

  // ── Navegação ─────────────────────────────────────────────────────
  const handleClose = (target?: "Receitas" | "Despesas" | "Cartao") => {
    closeFabAnim();
    Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 260, useNativeDriver: true }).start();
    setTimeout(() => {
      if      (target === "Cartao")      navigation.replace("Cartao");
      else if (target && !defaultType)   navigation.reset({ index: 1, routes: [{ name: "Tabs" }, { name: target }] });
      else                               navigation.goBack();
    }, 220);
  };

  const handleNavigate = (itemTitle: string) => {
    if      (itemTitle === "Importar")          { closeFabAnim(); navigation.navigate("ImportarExtrato"  as never); }
    else if (itemTitle === "Relatórios")        { closeFabAnim(); navigation.navigate("Relatorios"       as never); }
    else if (itemTitle === "Tags")              { closeFabAnim(); navigation.navigate("Tags"             as never); }
    else if (itemTitle === "Contas bancárias")   { closeFabAnim(); navigation.navigate("ContasBancarias" as never); }
    else if (itemTitle === "Novo cartão de crédito") { closeFabAnim(); navigation.navigate("Cartao"      as never); }
    else if (itemTitle === "Fluxo de Caixa")         { closeFabAnim(); navigation.navigate("FluxoCaixa"  as never); }
    else handleClose();
  };

  // ── Formulário ────────────────────────────────────────────────────
  const openForm = useCallback((type: TxType) => {
    setFormType(type);
    setTitle(""); setAmount(""); setDateBR(todayBR()); setPayType("pix");
    setPaid(true); setNote(""); setTags(""); setSelectedCat(null);
    setFormVisible(true);
    formSlide.setValue(SCREEN_H);
    Animated.spring(formSlide, { toValue: 0, useNativeDriver: true, tension: 80, friction: 18 }).start();
    void listFinanceCategories().then(cats => setCategories(cats.filter(c => c.type === type))).catch(() => {});
  }, [formSlide]);

  const openEditForm = useCallback((item: FinanceItem) => {
    setFormType(item.type);
    setTitle(item.title);
    setAmount(fmtAmount(String(item.amountCents)));
    const [y, mth, d] = item.dateISO.split("-");
    setDateBR(`${d}/${mth}/${y}`);
    setPayType(item.paymentType || "pix");
    setPaid(item.status === "paid");
    setNote(item.note ?? "");
    setTags(item.tags ?? "");
    setFormVisible(true);
    formSlide.setValue(0);
    void listFinanceCategories().then(cats => {
      const filtered = cats.filter(c => c.type === item.type);
      setCategories(filtered);
      setSelectedCat(filtered.find(c => c.name === item.category) ?? null);
    }).catch(() => {});
  }, [formSlide]);

  const closeForm = useCallback(() => {
    Keyboard.dismiss();
    if (defaultType || editItem) {
      closeFabAnim();
      Animated.parallel([
        Animated.timing(formSlide, { toValue: SCREEN_H, duration: 260, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 260, useNativeDriver: true }),
      ]).start(() => navigation.goBack());
    } else {
      Animated.timing(formSlide, { toValue: SCREEN_H, duration: 280, useNativeDriver: true }).start(() => {
        setFormVisible(false);
        setFormType(null);
      });
    }
  }, [formSlide, slideAnim, defaultType, editItem, navigation]);

  // ── CRUD ──────────────────────────────────────────────────────────
  async function handleSave() {
    if (!title.trim())       { Alert.alert("Atenção","Digite uma descrição."); return; }
    if (!parseCents(amount)) { Alert.alert("Atenção","Digite o valor."); return; }
    const dateISO = brToISO(dateBR);
    if (!dateISO)            { Alert.alert("Atenção","Data inválida. Use DD/MM/AAAA."); return; }
    if (editItem?.recurringGroupId) { setRecurringAction("edit"); return; }
    await performSave("one");
  }

  async function performSave(scope: "one" | "all", refill?: boolean) {
    setSaving(true);
    const dateISO = brToISO(dateBR)!;
    try {
      const token = await getToken();
      const payload = {
        type: formType, title: title.trim(),
        category: selectedCat?.name ?? "Outros",
        amountCents: parseCents(amount), date: dateISO,
        paymentType: payType, status: paid ? "paid" : "pending",
        accountId: selectedAcc?.id ?? null, note: note.trim() || null,
        tags: tags.trim() || null,
      };

      if (!editItem) {
        if (isRecurring) {
          const totalMonths = recurringMode === "forever" ? 12 : Math.max(1, parseInt(recurringMonths, 10) || 12);
          const groupId = makeGroupId();
          for (let i = 0; i < totalMonths; i++) {
            const r = await fetch(apiUrl("/api/finance"), {
              method: "POST",
              headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
              body: JSON.stringify({ ...payload, date: addMonthsISO(dateISO, i), recurringGroupId: groupId, recurringKind: "fixo", recurringTotal: totalMonths, recurringStartDate: dateISO, status: i === 0 ? payload.status : "pending" }),
            });
            if (!r.ok) { const e = await r.json().catch(()=>null) as {message?:string}|null; throw new Error(e?.message ?? `Erro ${r.status}`); }
          }
        } else {
          const r = await fetch(apiUrl("/api/finance"), {
            method: "POST",
            headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!r.ok) { const e = await r.json().catch(()=>null) as {message?:string}|null; throw new Error(e?.message ?? `Erro ${r.status}`); }
        }
      } else if (scope === "all" && editItem.recurringGroupId) {
        const groupId = editItem.recurringGroupId;
        const group = (await fetchFinanceItems()).filter(it => it.recurringGroupId === groupId);

        const { startDate, total, missing } = seriesInfo(group, dateISO);
        const byMonth = new Map(group.map(it => [it.dateISO.slice(0, 7), it] as const));

        // 1ª passada: há buracos e o usuário ainda não decidiu → pergunta.
        if (missing.length > 0 && refill === undefined) {
          setSaving(false);
          setRecurringGaps(missing);
          return;
        }

        const recreate = refill === true;
        for (let i = 0; i < total; i++) {
          const dISO = addMonthsISO(startDate, i);
          const existing = byMonth.get(dISO.slice(0, 7));
          if (existing) {
            await fetch(apiUrl(`/api/finance/${existing.id}`), {
              method: "PUT",
              headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
              body: JSON.stringify({ ...payload, date: existing.dateISO, status: existing.status, recurringGroupId: groupId, recurringKind: "fixo", recurringTotal: total, recurringStartDate: startDate }),
            });
          } else if (recreate) {
            const r = await fetch(apiUrl("/api/finance"), {
              method: "POST",
              headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
              body: JSON.stringify({ ...payload, date: dISO, status: "pending", recurringGroupId: groupId, recurringKind: "fixo", recurringTotal: total, recurringStartDate: startDate }),
            });
            if (!r.ok) { const e = await r.json().catch(()=>null) as {message?:string}|null; throw new Error(e?.message ?? `Erro ${r.status}`); }
          }
        }
      } else if (!editItem.recurringGroupId && isRecurring) {
        const totalMonths = recurringMode === "forever" ? 12 : Math.max(1, parseInt(recurringMonths, 10) || 12);
        const groupId = makeGroupId();
        const r = await fetch(apiUrl(`/api/finance/${editItem.id}`), {
          method: "PUT",
          headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, recurringGroupId: groupId, recurringKind: "fixo", recurringTotal: totalMonths, recurringStartDate: dateISO }),
        });
        if (!r.ok) { const e = await r.json().catch(()=>null) as {message?:string}|null; throw new Error(e?.message ?? `Erro ${r.status}`); }
        for (let i = 1; i < totalMonths; i++) {
          const r2 = await fetch(apiUrl("/api/finance"), {
            method: "POST",
            headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, date: addMonthsISO(dateISO, i), recurringGroupId: groupId, recurringKind: "fixo", recurringTotal: totalMonths, recurringStartDate: dateISO, status: "pending" }),
          });
          if (!r2.ok) { const e = await r2.json().catch(()=>null) as {message?:string}|null; throw new Error(e?.message ?? `Erro ${r2.status}`); }
        }
      } else {
        const r = await fetch(apiUrl(`/api/finance/${editItem.id}`), {
          method: "PUT",
          headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) { const e = await r.json().catch(()=>null) as {message?:string}|null; throw new Error(e?.message ?? `Erro ${r.status}`); }
      }

      if (defaultType || editItem) {
        closeFabAnim();
        Animated.parallel([
          Animated.timing(formSlide, { toValue: SCREEN_H, duration: 260, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 260, useNativeDriver: true }),
        ]).start(() => navigation.goBack());
      } else {
        closeForm();
      }
    } catch (e) {
      Alert.alert("Erro", e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function performDelete(scope: "one" | "all") {
    if (!editItem) return;
    setDeleteModal(false);
    try {
      const token = await getToken();
      if (scope === "all" && editItem.recurringGroupId) {
        const allItems = await fetchFinanceItems();
        for (const it of allItems.filter(it => it.recurringGroupId === editItem.recurringGroupId)) {
          await fetch(apiUrl(`/api/finance/${it.id}`), { method: "DELETE", headers: { Authorization: `Bearer ${token ?? ""}` } });
        }
      } else {
        const r = await fetch(apiUrl(`/api/finance/${editItem.id}`), { method: "DELETE", headers: { Authorization: `Bearer ${token ?? ""}` } });
        if (!r.ok) { Alert.alert("Erro","Não foi possível excluir o lançamento."); return; }
      }
      closeFabAnim();
      Animated.parallel([
        Animated.timing(formSlide, { toValue: SCREEN_H, duration: 260, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 260, useNativeDriver: true }),
      ]).start(() => navigation.goBack());
    } catch {
      Alert.alert("Erro","Não foi possível excluir o lançamento.");
    }
  }

  async function performUnsetRecurring(scope: "one" | "all") {
    if (!editItem) return;
    setRecurringAction(null);
    setSaving(true);
    try {
      const token = await getToken();
      const strip = { recurringGroupId: null, recurringKind: null, recurringTotal: null, recurringStartDate: null };
      const targets = scope === "all" && editItem.recurringGroupId
        ? (await fetchFinanceItems()).filter(it => it.recurringGroupId === editItem.recurringGroupId)
        : [editItem];
      for (const it of targets) {
        const r = await fetch(apiUrl(`/api/finance/${it.id}`), {
          method: "PUT",
          headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
          body: JSON.stringify(strip),
        });
        if (!r.ok) { const e = await r.json().catch(()=>null) as {message?:string}|null; throw new Error(e?.message ?? `Erro ${r.status}`); }
      }
      closeFabAnim();
      Animated.parallel([
        Animated.timing(formSlide, { toValue: SCREEN_H, duration: 260, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 260, useNativeDriver: true }),
      ]).start(() => navigation.goBack());
    } catch (e) {
      Alert.alert("Erro", e instanceof Error ? e.message : "Não foi possível remover a recorrência.");
    } finally {
      setSaving(false);
    }
  }

  function handleDateChange(text: string) {
    let d = text.replace(/\D/g,"").slice(0,8);
    if (d.length>=5) d=`${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`;
    else if (d.length>=3) d=`${d.slice(0,2)}/${d.slice(2)}`;
    setDateBR(d);
  }

  // ── Render ────────────────────────────────────────────────────────
  const accent   = formType === "RECEITA" ? "#22C55E" : "#EF4444";

  return (
    <View style={{ flex: 1 }}>
      <QuickActionsSheet
        summary={summary}
        slideAnim={slideAnim}
        cardY={cardY}
        cardOpacity={cardOpacity}
        quickAnims={quickAnims}
        cardAnims={cardAnims}
        headerY={headerY}
        headerOp={headerOp}
        showNovoBanco={showNovoBanco}
        setShowNovoBanco={setShowNovoBanco}
        showTransferencia={showTransferencia}
        setShowTransferencia={setShowTransferencia}
        onClose={handleClose}
        onNavigate={handleNavigate}
      />
      {formVisible && formType && (
        <TransactionForm
          formSlide={formSlide}
          formType={formType}
          editItem={editItem}
          accent={accent}
          title={title}            setTitle={setTitle}
          amount={amount}          setAmount={setAmount}
          dateBR={dateBR}          onDateChange={handleDateChange}
          payType={payType}        setPayType={setPayType}
          paid={paid}              setPaid={setPaid}
          note={note}              setNote={setNote}
          tags={tags}              setTags={setTags}
          availableTags={availableTags}
          saving={saving}
          categories={categories}
          selectedCat={selectedCat}    setSelectedCat={setSelectedCat}
          catModal={catModal}          setCatModal={setCatModal}
          accounts={accounts}
          selectedAcc={selectedAcc}    setSelectedAcc={setSelectedAcc}
          accModal={accModal}          setAccModal={setAccModal}
          isRecurring={isRecurring}    setIsRecurring={setIsRecurring}
          recurringMode={recurringMode} setRecurringMode={setRecurringMode}
          recurringMonths={recurringMonths} setRecurringMonths={setRecurringMonths}
          recurringAction={recurringAction} setRecurringAction={setRecurringAction}
          recurringGaps={recurringGaps}
          onRefillConfirm={(recreate) => { setRecurringGaps(null); void performSave("all", recreate); }}
          onRefillCancel={() => setRecurringGaps(null)}
          seriesGaps={seriesGaps}
          onFixGaps={() => { setSeriesGaps([]); void performSave("all", true); }}
          deleteModal={deleteModal}    setDeleteModal={setDeleteModal}
          onClose={closeForm}
          onSave={() => void handleSave()}
          onPerformSave={performSave}
          onPerformDelete={performDelete}
          onPerformUnset={performUnsetRecurring}
        />
      )}
    </View>
  );
}
