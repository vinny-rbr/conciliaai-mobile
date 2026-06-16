import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Animated, Dimensions, Keyboard,
  Modal, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation";
import { closeFabAnim } from "../../navigation/fabAnimState";
import { NovoBancoModal } from "../../components/dashboard/BankCarousel";
import TransferenciaModal from "../../components/TransferenciaModal";
import { fetchFinanceItems } from "../../lib/financeService";
import { listBankAccounts, updateBankAccount } from "../../lib/bankAccountsService";
import { listFinanceCategories } from "../../lib/financeCategoriesService";
import { apiUrl } from "../../lib/api";
import { getToken } from "../../lib/auth";
import type { BankAccount, FinanceCategoryOption, FinanceItem } from "../../types/finance";

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");

type TxType = "RECEITA" | "DESPESA";

const QUICK = [
  { icon: "↑", color: "#22C55E", title: "Receita"  },
  { icon: "↓", color: "#EF4444", title: "Despesa"  },
  { icon: "↓", color: "#F59E0B", title: "Cartão"   },
];

const MORE = [
  { icon: "🏦", color: "#3B82F6", title: "Novo banco",             subtitle: "Cadastrar conta ou cartão" },
  { icon: "💳", color: "#F59E0B", title: "Novo cartão de crédito", subtitle: "Limite, fatura e vencimento" },
  { icon: "⬇",  color: "#6366F1", title: "Importar extrato",       subtitle: "OFX, CSV, XLSX ou PDF" },
  { icon: "⇅",  color: "#14B8A6", title: "Transferência",          subtitle: "Mover entre suas contas" },
  { icon: "📷", color: "#3B82F6", title: "Lançar por foto",        subtitle: "IA lê o recibo automaticamente", badge: "NOVO" },
  { icon: "📊", color: "#8B5CF6", title: "Relatórios",             subtitle: "Gráficos e exportar PDF" },
];

const PAY_TYPES = [
  { key: "pix",    label: "Pix" },
  { key: "cash",   label: "Dinheiro" },
  { key: "debit",  label: "Débito" },
  { key: "credit", label: "Crédito" },
];

type Summary = { saldo: number; receitas: number; despesas: number };

function fmtBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function todayBR() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}
function brToISO(br: string): string | null {
  const p = br.split("/");
  if (p.length !== 3 || p[2].length !== 4) return null;
  return `${p[2]}-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`;
}
function fmtAmount(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return (parseInt(digits, 10) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}
function parseCents(v: string): number {
  const d = v.replace(/\D/g, "");
  return d ? parseInt(d, 10) : 0;
}
function makeGroupId(): string {
  const arr = new Uint8Array(16);
  for (let i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256);
  const hex = Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
function addMonthsISO(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(Math.min(d, lastDay)).padStart(2, "0")}`;
}

export default function AddTransactionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "AddTransaction">>();
  const defaultType = route.params?.defaultType;
  const editItem = route.params?.editItem;

  // ── Ações rápidas ──
  const [summary, setSummary] = useState<Summary | null>(null);
  const [showNovoBanco, setShowNovoBanco]         = useState(false);
  const [showTransferencia, setShowTransferencia] = useState(false);
  const slideAnim    = useRef(new Animated.Value(SCREEN_H)).current;
  const cardY        = useRef(new Animated.Value(30)).current;
  const cardOpacity  = useRef(new Animated.Value(0)).current;
  const quickAnims   = useRef(QUICK.map(() => new Animated.Value(0))).current;
  const cardAnims    = useRef(MORE.map(() => ({ x: new Animated.Value(0), opacity: new Animated.Value(0) }))).current;
  const headerY      = useRef(new Animated.Value(-40)).current;
  const headerOp     = useRef(new Animated.Value(0)).current;

  // ── Formulário ──
  const formSlide    = useRef(new Animated.Value(SCREEN_H)).current;
  const [formType, setFormType]       = useState<TxType | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [title, setTitle]             = useState("");
  const [amount, setAmount]           = useState("");
  const [dateBR, setDateBR]           = useState(todayBR);
  const [payType, setPayType]         = useState("pix");
  const [paid, setPaid]               = useState(true);
  const [note, setNote]               = useState("");
  const [saving, setSaving]           = useState(false);
  const [categories, setCategories]   = useState<FinanceCategoryOption[]>([]);
  const [selectedCat, setSelectedCat] = useState<FinanceCategoryOption | null>(null);
  const [catModal, setCatModal]       = useState(false);
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const [accounts, setAccounts]       = useState<BankAccount[]>([]);
  const [selectedAcc, setSelectedAcc] = useState<BankAccount | null>(null);
  const [accModal, setAccModal]       = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringMode, setRecurringMode] = useState<"forever" | "months">("forever");
  const [recurringMonths, setRecurringMonths] = useState("12");
  const [recurringAction, setRecurringAction] = useState<"edit" | "delete" | null>(null);

  // ── Mount ──
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

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardY,      { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(cardOpacity,{ toValue: 1, duration: 250, useNativeDriver: true }),
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
        const stored = accs.reduce((s,a) => s+a.balanceCents, 0);
        setSummary({ saldo: accs.length>0&&stored!==0 ? stored : cumR-cumD, receitas: rec, despesas: des });
        setAccounts(accs);
        if (editItem) {
          setSelectedAcc(accs.find(a => a.id === editItem.accountId) ?? null);
        } else if (accs.length === 1) {
          setSelectedAcc(accs[0]);
        }
      } catch {}
    })();
  }, []);

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
          Animated.spring(a.x,      { toValue: 0, useNativeDriver: true, tension: 70, friction: 11 }),
          Animated.timing(a.opacity,{ toValue: 1, duration: 220, useNativeDriver: true }),
        ]))),
      ]),
    ]).start();
  }, []);

  const handleClose = (target?: "Receitas" | "Despesas" | "Cartao") => {
    closeFabAnim();
    Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 260, useNativeDriver: true }).start();
    setTimeout(() => {
      if (target === "Cartao") {
        navigation.replace("Cartao");
      } else if (target && !defaultType) {
        navigation.reset({ index: 1, routes: [{ name: "Tabs" }, { name: target }] });
      } else {
        navigation.goBack();
      }
    }, 220);
  };

  // ── Abrir formulário ──
  const openForm = useCallback((type: TxType) => {
    setFormType(type);
    setTitle(""); setAmount(""); setDateBR(todayBR()); setPayType("pix");
    setPaid(true); setNote(""); setSelectedCat(null);
    setFormVisible(true);
    formSlide.setValue(SCREEN_H);
    Animated.spring(formSlide, { toValue: 0, useNativeDriver: true, tension: 80, friction: 18 }).start();

    void listFinanceCategories().then(cats => {
      setCategories(cats.filter(c => c.type === type));
    }).catch(() => {});
  }, [formSlide]);

  const openEditForm = useCallback((item: FinanceItem) => {
    setFormType(item.type);
    setTitle(item.title);
    setAmount(fmtAmount(String(item.amountCents)));
    const [y, m, d] = item.dateISO.split("-");
    setDateBR(`${d}/${m}/${y}`);
    setPayType(item.paymentType || "pix");
    setPaid(item.status === "paid");
    setNote(item.note ?? "");
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

  async function handleSave() {
    if (!title.trim())       { Alert.alert("Atenção","Digite uma descrição."); return; }
    if (!parseCents(amount)) { Alert.alert("Atenção","Digite o valor."); return; }
    const dateISO = brToISO(dateBR);
    if (!dateISO)            { Alert.alert("Atenção","Data inválida. Use DD/MM/AAAA."); return; }
    if (editItem?.recurringGroupId) { setRecurringAction("edit"); return; }
    await performSave("one");
  }

  async function performSave(scope: "one" | "all") {
    setSaving(true);
    const dateISO = brToISO(dateBR)!;
    try {
      const token = await getToken();
      const payload = {
        type: formType,
        title: title.trim(),
        category: selectedCat?.name ?? "Outros",
        amountCents: parseCents(amount),
        date: dateISO,
        paymentType: payType,
        status: paid ? "paid" : "pending",
        accountId: selectedAcc?.id ?? null,
        note: note.trim() || null,
      };

      if (!editItem) {
        if (isRecurring) {
          const totalMonths = recurringMode === "forever"
            ? 12
            : Math.max(1, parseInt(recurringMonths, 10) || 12);
          const groupId = makeGroupId();
          for (let i = 0; i < totalMonths; i++) {
            const r = await fetch(apiUrl("/api/finance"), {
              method: "POST",
              headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                ...payload,
                date: addMonthsISO(dateISO, i),
                recurringGroupId: groupId,
                recurringKind: "fixo",
                recurringTotal: totalMonths,
                status: i === 0 ? payload.status : "pending",
              }),
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
        const allItems = await fetchFinanceItems();
        const group = allItems.filter(it => it.recurringGroupId === editItem.recurringGroupId);
        for (const it of group) {
          await fetch(apiUrl(`/api/finance/${it.id}`), {
            method: "PUT",
            headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, date: it.dateISO, status: it.status }),
          });
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
        const group = allItems.filter(it => it.recurringGroupId === editItem.recurringGroupId);
        for (const it of group) {
          await fetch(apiUrl(`/api/finance/${it.id}`), {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token ?? ""}` },
          });
        }
      } else {
        const r = await fetch(apiUrl(`/api/finance/${editItem.id}`), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token ?? ""}` },
        });
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

  function handleDateChange(text: string) {
    let d = text.replace(/\D/g,"").slice(0,8);
    if (d.length>=5) d=`${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`;
    else if (d.length>=3) d=`${d.slice(0,2)}/${d.slice(2)}`;
    setDateBR(d);
  }

  const accent   = formType==="RECEITA" ? "#22C55E" : "#EF4444";
  const rootCats = categories.filter(c => !c.parentId);

  return (
    <View style={{ flex:1 }}>
      <NovoBancoModal
        visible={showNovoBanco}
        onClose={() => setShowNovoBanco(false)}
        onSaved={() => { setShowNovoBanco(false); }}
      />
      <TransferenciaModal
        visible={showTransferencia}
        onClose={() => setShowTransferencia(false)}
      />
      {/* ── Ações Rápidas ── */}
      <Animated.View style={[s.root, { transform: [{ translateY: slideAnim }] }]}>
        <View style={s.overlay} />

        <Animated.View style={[s.balanceCard, { transform:[{translateY:cardY}], opacity:cardOpacity }]}>
          <View style={s.balanceTop}>
            <Text style={s.balanceLabel}>Saldo em contas</Text>
            <Text style={s.balanceMes}>{new Date().toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}</Text>
          </View>
          <Text style={s.balanceVal}>{summary ? fmtBRL(summary.saldo) : "—"}</Text>
          <View style={s.balanceRow}>
            <View style={s.balanceItem}>
              <Text style={s.balanceItemIcon}>↑</Text>
              <View>
                <Text style={s.balanceItemLbl}>Receitas</Text>
                <Text style={[s.balanceItemVal,{color:"#22C55E"}]}>{summary ? fmtBRL(summary.receitas) : "—"}</Text>
              </View>
            </View>
            <View style={s.balanceDivider} />
            <View style={s.balanceItem}>
              <Text style={s.balanceItemIcon}>↓</Text>
              <View>
                <Text style={s.balanceItemLbl}>Despesas</Text>
                <Text style={[s.balanceItemVal,{color:"#EF4444"}]}>{summary ? fmtBRL(summary.despesas) : "—"}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <SafeAreaView style={s.sheet} edges={["bottom"]}>
          <View style={s.handle} />
          <Animated.View style={[s.header,{transform:[{translateY:headerY}],opacity:headerOp}]}>
            <View>
              <Text style={s.headerTitle}>Ações rápidas</Text>
              <Text style={s.headerSub}>O que deseja fazer agora?</Text>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={() => handleClose()} activeOpacity={0.8}>
              <Text style={s.closeTxt}>✕</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={s.quickRow}>
            {QUICK.map((q, i) => (
              <Animated.View key={i} style={{transform:[{scale:quickAnims[i]}],flex:1,alignItems:"center"}}>
                <TouchableOpacity
                  style={[s.quickBtn,{backgroundColor:q.color+"22",borderColor:q.color+"55"}]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (q.title === "Receita")  handleClose("Receitas");
                    else if (q.title === "Despesa") handleClose("Despesas");
                    else if (q.title === "Cartão") handleClose("Cartao");
                    else handleClose();
                  }}
                >
                  <Text style={[s.quickIcon,{color:q.color}]}>{q.icon}</Text>
                </TouchableOpacity>
                <Text style={[s.quickLabel,{color:q.color}]}>{q.title}</Text>
              </Animated.View>
            ))}
          </View>

          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerTxt}>Mais opções</Text>
            <View style={s.dividerLine} />
          </View>

          <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
            {MORE.map((a, i) => (
              <Animated.View key={i} style={{transform:[{translateX:cardAnims[i].x}],opacity:cardAnims[i].opacity}}>
                <TouchableOpacity style={s.item} activeOpacity={0.7} onPress={() => {
                    if (a.title === "Novo cartão de crédito") handleClose("Cartao");
                    else if (a.title === "Novo banco") setShowNovoBanco(true);
                    else if (a.title === "Transferência") setShowTransferencia(true);
                    else if (a.title === "Importar extrato") { closeFabAnim(); navigation.navigate("ImportarExtrato" as never); }
                    else if (a.title === "Lançar por foto") { closeFabAnim(); navigation.navigate("LancarPorFoto" as never); }
                    else if (a.title === "Relatórios") { closeFabAnim(); navigation.navigate("Relatorios" as never); }
                    else handleClose();
                  }}>
                  <View style={[s.iconWrap,{backgroundColor:a.color+"22"}]}>
                    <Text style={[s.iconTxt,{color:a.color,fontSize:a.icon.length===1?20:17}]}>{a.icon}</Text>
                  </View>
                  <View style={s.texts}>
                    <View style={s.titleRow}>
                      <Text style={s.itemTitle}>{a.title}</Text>
                      {"badge" in a && a.badge && <View style={s.badge}><Text style={s.badgeTxt}>{a.badge}</Text></View>}
                    </View>
                    <Text style={s.subtitle}>{a.subtitle}</Text>
                  </View>
                  <Text style={s.chevron}>›</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>

      {/* ── Formulário (slide por cima, sem Modal) ── */}
      {formVisible && (
        <Animated.View style={[f.root, { transform: [{ translateY: formSlide }] }]}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={f.header}>
              <TouchableOpacity onPress={closeForm} style={f.backBtn}>
                <Text style={f.backTxt}>✕</Text>
              </TouchableOpacity>
              <Text style={f.headerTitle}>
                {editItem
                  ? (formType==="RECEITA" ? "Editar receita" : "Editar despesa")
                  : (formType==="RECEITA" ? "Nova receita" : "Nova despesa")}
              </Text>
              {editItem && (
                <TouchableOpacity style={f.deleteBtn} onPress={() => {
                  if (editItem.recurringGroupId) setRecurringAction("delete");
                  else setDeleteModal(true);
                }}>
                  <Text style={f.deleteTxt}>🗑</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[f.saveBtn, saving&&{opacity:.6}]} onPress={() => { Keyboard.dismiss(); void handleSave(); }} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={f.saveTxt}>Salvar</Text>}
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={f.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Valor */}
              <View style={[f.amountBlock,{borderColor:accent+"44",backgroundColor:accent+"11"}]}>
                <Text style={f.currencySign}>R$</Text>
                <TextInput
                  style={[f.amountInput,{color:accent}]}
                  value={amount} onChangeText={v => setAmount(fmtAmount(v))}
                  keyboardType="numeric" placeholder="0,00" placeholderTextColor={accent+"55"} returnKeyType="done"
                />
              </View>

              {/* Status */}
              <View style={f.toggleRow}>
                <TouchableOpacity style={[f.toggleBtn, paid&&{backgroundColor:accent+"22",borderColor:accent}]} onPress={() => setPaid(true)}>
                  <Text style={[f.toggleTxt, paid&&{color:accent}]}>{formType==="RECEITA" ? "✓  Recebido" : "✓  Pago"}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[f.toggleBtn, !paid&&{backgroundColor:"#F59E0B22",borderColor:"#F59E0B"}]} onPress={() => setPaid(false)}>
                  <Text style={[f.toggleTxt, !paid&&{color:"#F59E0B"}]}>{formType==="RECEITA" ? "⏱  A receber" : "⏱  A pagar"}</Text>
                </TouchableOpacity>
              </View>

              {/* Descrição */}
              <View style={f.field}>
                <Text style={f.label}>Descrição</Text>
                <TextInput style={f.input} value={title} onChangeText={setTitle}
                  placeholder={formType==="RECEITA" ? "Ex: Salário, Freelance..." : "Ex: Aluguel, Mercado..."}
                  placeholderTextColor="#475569" returnKeyType="next" />
              </View>

              {/* Data */}
              <View style={f.field}>
                <Text style={f.label}>Data</Text>
                <TextInput style={f.input} value={dateBR} onChangeText={handleDateChange}
                  placeholder="DD/MM/AAAA" placeholderTextColor="#475569" keyboardType="numeric" maxLength={10} />
              </View>

              {/* Categoria */}
              <View style={f.field}>
                <Text style={f.label}>Categoria</Text>
                <TouchableOpacity style={f.selectBtn} onPress={() => setCatModal(true)}>
                  {selectedCat ? (
                    <View style={f.selectInner}>
                      <View style={[f.catDot,{backgroundColor:selectedCat.color+"33"}]}>
                        <Text style={{fontSize:14}}>{selectedCat.icon}</Text>
                      </View>
                      <Text style={f.selectVal}>{selectedCat.name}</Text>
                    </View>
                  ) : (
                    <Text style={f.selectPlaceholder}>Selecionar categoria</Text>
                  )}
                  <Text style={f.chevronTxt}>›</Text>
                </TouchableOpacity>
              </View>

              {/* Pagamento */}
              <View style={f.field}>
                <Text style={f.label}>Forma de pagamento</Text>
                <View style={f.chipRow}>
                  {PAY_TYPES.map(pt => (
                    <TouchableOpacity key={pt.key}
                      style={[f.chip, payType===pt.key&&{backgroundColor:accent+"22",borderColor:accent}]}
                      onPress={() => setPayType(pt.key)}>
                      <Text style={[f.chipTxt, payType===pt.key&&{color:accent}]}>{pt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Gasto fixo mensal */}
              {!editItem ? (
                <View style={{ gap: 10 }}>
                  <TouchableOpacity
                    style={[f.toggleCard, isRecurring && f.toggleCardActive]}
                    onPress={() => setIsRecurring(v => !v)}
                    activeOpacity={0.8}
                  >
                    <View style={[f.toggleCardIcon, { backgroundColor: "#3B82F618" }]}>
                      <Text style={{ fontSize: 18 }}>🔄</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={f.toggleCardTitle}>Gasto fixo mensal</Text>
                      <Text style={f.toggleCardSub}>Repete nos próximos meses automaticamente</Text>
                    </View>
                    <View style={[f.switchTrack, isRecurring && { backgroundColor: "#3B82F6" }]}>
                      <View style={[f.switchThumb, isRecurring && { transform: [{ translateX: 18 }] }]} />
                    </View>
                  </TouchableOpacity>

                  {isRecurring && (
                    <>
                      <TouchableOpacity
                        style={[f.radioCard, recurringMode === "forever" && f.radioCardActive]}
                        onPress={() => setRecurringMode("forever")}
                        activeOpacity={0.8}
                      >
                        <View style={[f.radioCircle, recurringMode === "forever" && f.radioCircleActive]}>
                          {recurringMode === "forever" && <View style={f.radioDot} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={f.radioTitle}>Sem data para acabar</Text>
                          <Text style={f.radioSub}>Cria os próximos 12 meses agora.</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[f.radioCard, recurringMode === "months" && f.radioCardActive]}
                        onPress={() => setRecurringMode("months")}
                        activeOpacity={0.8}
                      >
                        <View style={[f.radioCircle, recurringMode === "months" && f.radioCircleActive]}>
                          {recurringMode === "months" && <View style={f.radioDot} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={f.radioTitle}>Por alguns meses</Text>
                          <Text style={f.radioSub}>Você escolhe a quantidade de parcelas mensais.</Text>
                        </View>
                      </TouchableOpacity>
                      {recurringMode === "months" && (
                        <View style={f.field}>
                          <Text style={f.label}>Quantidade de meses</Text>
                          <TextInput
                            style={f.input}
                            value={recurringMonths}
                            onChangeText={v => setRecurringMonths(v.replace(/\D/g, ""))}
                            keyboardType="numeric"
                            placeholder="12"
                            placeholderTextColor="#475569"
                            returnKeyType="done"
                          />
                        </View>
                      )}
                    </>
                  )}
                </View>
              ) : editItem.recurringGroupId ? (
                <View style={{ flexDirection:"row", alignItems:"center", backgroundColor:"#3B82F611", borderRadius:12, padding:12, borderWidth:1, borderColor:"#3B82F622", gap:8 }}>
                  <Text style={{ fontSize:16 }}>🔄</Text>
                  <Text style={{ color:"#60A5FA", fontSize:13, fontWeight:"600", flex:1 }}>Gasto fixo mensal</Text>
                </View>
              ) : null}

              {/* Conta */}
              {accounts.length > 0 && (
                <View style={f.field}>
                  <Text style={f.label}>Conta (opcional)</Text>
                  <TouchableOpacity style={f.selectBtn} onPress={() => setAccModal(true)}>
                    <Text style={selectedAcc ? f.selectVal : f.selectPlaceholder}>
                      {selectedAcc ? selectedAcc.nick||selectedAcc.bank : "Selecionar conta"}
                    </Text>
                    <Text style={f.chevronTxt}>›</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Observação */}
              <View style={f.field}>
                <Text style={f.label}>Observação (opcional)</Text>
                <TextInput style={[f.input,{minHeight:72,textAlignVertical:"top"}]}
                  value={note} onChangeText={setNote} placeholder="Adicionar nota..." placeholderTextColor="#475569" multiline />
              </View>
            </ScrollView>
          </SafeAreaView>

          {/* Categoria picker */}
          <Modal visible={catModal} transparent animationType="slide"
            onRequestClose={() => { setCatModal(false); setExpandedCatId(null); }}>
            <View style={m.overlay}>
              <View style={m.sheet}>
                <View style={m.handle} />
                <View style={m.mHeader}>
                  <Text style={m.mTitle}>Categoria</Text>
                  <TouchableOpacity onPress={() => { setCatModal(false); setExpandedCatId(null); }}>
                    <Text style={m.mClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={{paddingHorizontal:16,paddingBottom:24}}>
                  {rootCats.length===0 ? <Text style={m.empty}>Nenhuma categoria.</Text> : rootCats.map(c => {
                    const children = categories.filter(s => s.parentId === c.id);
                    const isExpanded = expandedCatId === c.id;
                    const isSelected = selectedCat?.id === c.id;
                    return (
                      <View key={c.id}>
                        <TouchableOpacity
                          style={[m.row, isSelected&&{backgroundColor:c.color+"18",borderColor:c.color}]}
                          onPress={() => {
                            if (children.length > 0) setExpandedCatId(isExpanded ? null : c.id);
                            else { setSelectedCat(c); setCatModal(false); setExpandedCatId(null); }
                          }}>
                          <View style={[f.catDot,{backgroundColor:c.color+"33"}]}>
                            <Text style={{fontSize:18}}>{c.icon}</Text>
                          </View>
                          <Text style={[m.rowName,{flex:1}]}>{c.name}</Text>
                          {isSelected && <Text style={[m.check,{color:c.color}]}>✓</Text>}
                          {children.length > 0 && (
                            <Text style={{color:"#64748B",fontSize:12,marginLeft:4}}>{isExpanded?"▲":"▼"}</Text>
                          )}
                        </TouchableOpacity>
                        {isExpanded && children.map(sub => (
                          <TouchableOpacity key={sub.id}
                            style={[m.row,{marginLeft:16,marginTop:-4}, selectedCat?.id===sub.id&&{backgroundColor:sub.color+"18",borderColor:sub.color}]}
                            onPress={() => { setSelectedCat(sub); setCatModal(false); setExpandedCatId(null); }}>
                            <View style={[f.catDot,{backgroundColor:sub.color+"33",width:36,height:36}]}>
                              <Text style={{fontSize:15}}>{sub.icon}</Text>
                            </View>
                            <Text style={[m.rowName,{flex:1,fontSize:13}]}>{sub.name}</Text>
                            {selectedCat?.id===sub.id && <Text style={[m.check,{color:sub.color}]}>✓</Text>}
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Modal: escopo de edição/exclusão recorrente */}
          <Modal visible={recurringAction !== null} transparent animationType="fade" onRequestClose={() => setRecurringAction(null)}>
            <View style={{ flex:1, backgroundColor:"rgba(0,0,0,.65)", justifyContent:"center", alignItems:"center", padding:28 }}>
              <View style={{ backgroundColor:"#1E293B", borderRadius:20, padding:24, width:"100%", borderWidth:1, borderColor:"#334155" }}>
                <View style={{ width:48, height:48, borderRadius:16, backgroundColor:"#3B82F618", alignItems:"center", justifyContent:"center", alignSelf:"center", marginBottom:16, borderWidth:1, borderColor:"#3B82F633" }}>
                  <Text style={{ fontSize:22 }}>🔄</Text>
                </View>
                <Text style={{ color:"#F1F5F9", fontSize:17, fontWeight:"800", textAlign:"center", marginBottom:8 }}>
                  Gasto fixo mensal
                </Text>
                <Text style={{ color:"#64748B", fontSize:14, textAlign:"center", marginBottom:24, lineHeight:20 }}>
                  {recurringAction === "delete"
                    ? "Deseja excluir apenas este lançamento\nou todos os do grupo?"
                    : "Deseja alterar apenas este lançamento\nou todos os do grupo?"}
                </Text>
                <View style={{ gap:10 }}>
                  <TouchableOpacity
                    style={{ backgroundColor:"#3B82F6", borderRadius:14, paddingVertical:14, alignItems:"center" }}
                    activeOpacity={0.8}
                    onPress={() => {
                      const action = recurringAction;
                      setRecurringAction(null);
                      if (action === "delete") void performDelete("one");
                      else void performSave("one");
                    }}
                  >
                    <Text style={{ color:"#fff", fontSize:14, fontWeight:"700" }}>Só este lançamento</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ backgroundColor:"#0F172A", borderRadius:14, paddingVertical:14, alignItems:"center", borderWidth:1, borderColor:"#334155" }}
                    activeOpacity={0.8}
                    onPress={() => {
                      const action = recurringAction;
                      setRecurringAction(null);
                      if (action === "delete") void performDelete("all");
                      else void performSave("all");
                    }}
                  >
                    <Text style={{ color:"#F1F5F9", fontSize:14, fontWeight:"700" }}>Todos do grupo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ paddingVertical:10, alignItems:"center" }} onPress={() => setRecurringAction(null)}>
                    <Text style={{ color:"#64748B", fontSize:14, fontWeight:"700" }}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Modal: confirmar exclusão */}
          <Modal visible={deleteModal} transparent animationType="fade" onRequestClose={() => setDeleteModal(false)}>
            <View style={{ flex:1, backgroundColor:"rgba(0,0,0,.65)", justifyContent:"center", alignItems:"center", padding:28 }}>
              <View style={{ backgroundColor:"#1E293B", borderRadius:20, padding:24, width:"100%", borderWidth:1, borderColor:"#334155" }}>
                <View style={{ width:48, height:48, borderRadius:16, backgroundColor:"#EF444418", alignItems:"center", justifyContent:"center", alignSelf:"center", marginBottom:16, borderWidth:1, borderColor:"#EF444433" }}>
                  <Text style={{ fontSize:22 }}>🗑</Text>
                </View>
                <Text style={{ color:"#F1F5F9", fontSize:17, fontWeight:"800", textAlign:"center", marginBottom:8 }}>
                  Excluir lançamento
                </Text>
                <Text style={{ color:"#64748B", fontSize:14, textAlign:"center", marginBottom:24, lineHeight:20 }}>
                  Tem certeza? Esta ação{"\n"}não pode ser desfeita.
                </Text>
                <View style={{ flexDirection:"row", gap:10 }}>
                  <TouchableOpacity
                    style={{ flex:1, backgroundColor:"#0F172A", borderRadius:14, paddingVertical:14, alignItems:"center", borderWidth:1, borderColor:"#334155" }}
                    onPress={() => setDeleteModal(false)} activeOpacity={0.8}>
                    <Text style={{ color:"#94A3B8", fontSize:14, fontWeight:"700" }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex:1, backgroundColor:"#EF4444", borderRadius:14, paddingVertical:14, alignItems:"center" }}
                    onPress={() => void performDelete("one")} activeOpacity={0.8}>
                    <Text style={{ color:"#fff", fontSize:14, fontWeight:"700" }}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Conta picker */}
          <Modal visible={accModal} transparent animationType="slide" onRequestClose={() => setAccModal(false)}>
            <View style={m.overlay}>
              <View style={m.sheet}>
                <View style={m.handle} />
                <View style={m.mHeader}>
                  <Text style={m.mTitle}>Conta</Text>
                  <TouchableOpacity onPress={() => setAccModal(false)}><Text style={m.mClose}>✕</Text></TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={{paddingHorizontal:16,paddingBottom:24}}>
                  <TouchableOpacity style={[m.row,!selectedAcc&&{backgroundColor:"#3B82F618",borderColor:"#3B82F6"}]}
                    onPress={() => { setSelectedAcc(null); setAccModal(false); }}>
                    <Text style={m.rowName}>Sem conta específica</Text>
                    {!selectedAcc && <Text style={[m.check,{color:"#3B82F6"}]}>✓</Text>}
                  </TouchableOpacity>
                  {accounts.map(a => (
                    <TouchableOpacity key={a.id}
                      style={[m.row, selectedAcc?.id===a.id&&{backgroundColor:"#3B82F618",borderColor:"#3B82F6"}]}
                      onPress={() => { setSelectedAcc(a); setAccModal(false); }}>
                      <Text style={m.rowName}>{a.nick||a.bank}</Text>
                      {selectedAcc?.id===a.id && <Text style={[m.check,{color:"#3B82F6"}]}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:    { ...StyleSheet.absoluteFillObject, backgroundColor: "#0F172A" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0F172A" },
  balanceCard: { position:"absolute", top:46, left:16, right:16, backgroundColor:"#1E3A8A", borderRadius:16, padding:12, shadowColor:"#3B82F6", shadowOpacity:0.35, shadowRadius:16, shadowOffset:{width:0,height:4}, elevation:10 },
  balanceTop:      { flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:4 },
  balanceLabel:    { fontSize:11, color:"#93C5FD", fontWeight:"600" },
  balanceMes:      { fontSize:10, color:"#60A5FA", textTransform:"capitalize" },
  balanceVal:      { fontSize:20, fontWeight:"800", color:"#fff", marginBottom:8 },
  balanceRow:      { flexDirection:"row", alignItems:"center" },
  balanceItem:     { flex:1, flexDirection:"row", alignItems:"center", gap:6 },
  balanceItemIcon: { fontSize:14, color:"#fff" },
  balanceItemLbl:  { fontSize:10, color:"#93C5FD" },
  balanceItemVal:  { fontSize:12, fontWeight:"700" },
  balanceDivider:  { width:1, height:28, backgroundColor:"#3B82F633", marginHorizontal:8 },
  sheet:      { position:"absolute", bottom:0, left:0, right:0, backgroundColor:"#0F172A", borderTopLeftRadius:24, borderTopRightRadius:24, maxHeight:"92%" },
  handle:     { width:40, height:4, borderRadius:2, backgroundColor:"#334155", alignSelf:"center", marginTop:12, marginBottom:4 },
  header:     { flexDirection:"row", alignItems:"center", justifyContent:"space-between", paddingHorizontal:20, paddingVertical:14 },
  headerTitle:{ fontSize:18, fontWeight:"800", color:"#F1F5F9" },
  headerSub:  { fontSize:12, color:"#64748B", marginTop:2 },
  closeBtn:   { width:36, height:36, borderRadius:18, backgroundColor:"#1E293B", justifyContent:"center", alignItems:"center", borderWidth:1, borderColor:"#334155" },
  closeTxt:   { color:"#94A3B8", fontSize:16, fontWeight:"700" },
  quickRow:   { flexDirection:"row", paddingHorizontal:20, paddingBottom:16, gap:8 },
  quickBtn:   { width:68, height:68, borderRadius:20, justifyContent:"center", alignItems:"center", borderWidth:1.5, marginBottom:6 },
  quickIcon:  { fontSize:28, fontWeight:"700" },
  quickLabel: { fontSize:12, fontWeight:"700" },
  dividerRow: { flexDirection:"row", alignItems:"center", marginHorizontal:20, marginBottom:12, gap:10 },
  dividerLine:{ flex:1, height:1, backgroundColor:"#1E293B" },
  dividerTxt: { fontSize:11, color:"#475569", fontWeight:"600" },
  list:       { paddingHorizontal:16, paddingBottom:24 },
  item:       { flexDirection:"row", alignItems:"center", backgroundColor:"#1E293B", borderRadius:14, padding:13, marginBottom:8, gap:12 },
  iconWrap:   { width:44, height:44, borderRadius:12, justifyContent:"center", alignItems:"center" },
  iconTxt:    { fontWeight:"700" },
  texts:      { flex:1 },
  titleRow:   { flexDirection:"row", alignItems:"center", gap:8 },
  itemTitle:  { fontSize:14, fontWeight:"700", color:"#F1F5F9" },
  subtitle:   { fontSize:12, color:"#64748B", marginTop:2 },
  badge:      { backgroundColor:"#22C55E22", borderRadius:6, paddingHorizontal:6, paddingVertical:2 },
  badgeTxt:   { fontSize:10, fontWeight:"800", color:"#22C55E" },
  chevron:    { fontSize:20, color:"#334155" },
});

const f = StyleSheet.create({
  root:        { ...StyleSheet.absoluteFillObject, backgroundColor:"#0A1628", zIndex:10 },
  header:      { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingVertical:12, gap:12, paddingTop:16 },
  backBtn:     { width:36, height:36, borderRadius:18, backgroundColor:"#1E293B", alignItems:"center", justifyContent:"center" },
  backTxt:     { color:"#94A3B8", fontSize:16, fontWeight:"700" },
  headerTitle: { flex:1, fontSize:18, fontWeight:"800", color:"#F1F5F9" },
  saveBtn:     { backgroundColor:"#3B82F6", borderRadius:10, paddingHorizontal:18, paddingVertical:9, minWidth:72, alignItems:"center" },
  saveTxt:     { color:"#fff", fontWeight:"700", fontSize:14 },
  deleteBtn:   { width:36, height:36, borderRadius:10, backgroundColor:"#EF444422", alignItems:"center", justifyContent:"center", borderWidth:1, borderColor:"#EF444455" },
  deleteTxt:   { fontSize:16 },
  toggleCard:      { flexDirection:"row", alignItems:"center", backgroundColor:"#1E293B", borderRadius:14, padding:14, gap:12, borderWidth:1, borderColor:"#334155" },
  toggleCardActive:{ borderColor:"#3B82F6", backgroundColor:"#3B82F610" },
  toggleCardIcon:  { width:40, height:40, borderRadius:12, alignItems:"center", justifyContent:"center" },
  toggleCardTitle: { color:"#F1F5F9", fontSize:14, fontWeight:"700" as const },
  toggleCardSub:   { color:"#64748B", fontSize:12, marginTop:2 },
  switchTrack:     { width:42, height:24, borderRadius:12, backgroundColor:"#334155", padding:2, justifyContent:"center" as const },
  switchThumb:     { width:20, height:20, borderRadius:10, backgroundColor:"#fff" },
  radioCard:       { flexDirection:"row" as const, alignItems:"center" as const, backgroundColor:"#1E293B", borderRadius:14, padding:14, gap:12, borderWidth:1, borderColor:"#334155" },
  radioCardActive: { borderColor:"#3B82F6", backgroundColor:"#3B82F610" },
  radioCircle:     { width:22, height:22, borderRadius:11, borderWidth:2, borderColor:"#334155", alignItems:"center" as const, justifyContent:"center" as const },
  radioCircleActive:{ borderColor:"#3B82F6" },
  radioDot:        { width:10, height:10, borderRadius:5, backgroundColor:"#3B82F6" },
  radioTitle:      { color:"#F1F5F9", fontSize:14, fontWeight:"700" as const },
  radioSub:        { color:"#64748B", fontSize:12, marginTop:2 },
  body:        { paddingHorizontal:16, paddingBottom:40, gap:20 },
  amountBlock: { borderRadius:18, borderWidth:1.5, flexDirection:"row", alignItems:"center", paddingHorizontal:20, paddingVertical:16, gap:6 },
  currencySign:{ color:"#94A3B8", fontSize:22, fontWeight:"700" },
  amountInput: { flex:1, fontSize:36, fontWeight:"800" },
  toggleRow:   { flexDirection:"row", gap:10 },
  toggleBtn:   { flex:1, borderRadius:12, borderWidth:1.5, borderColor:"#334155", paddingVertical:12, alignItems:"center" },
  toggleTxt:   { fontSize:13, fontWeight:"700", color:"#64748B" },
  field:       { gap:6 },
  label:       { color:"#94A3B8", fontSize:12, fontWeight:"700", textTransform:"uppercase", letterSpacing:0.5 },
  input:       { backgroundColor:"#1E293B", borderRadius:12, paddingHorizontal:16, paddingVertical:14, color:"#F1F5F9", fontSize:15, borderWidth:1, borderColor:"#334155" },
  selectBtn:   { backgroundColor:"#1E293B", borderRadius:12, paddingHorizontal:16, paddingVertical:14, flexDirection:"row", alignItems:"center", borderWidth:1, borderColor:"#334155" },
  selectInner: { flex:1, flexDirection:"row", alignItems:"center", gap:10 },
  selectVal:   { color:"#F1F5F9", fontSize:15, flex:1 },
  selectPlaceholder: { color:"#475569", fontSize:15, flex:1 },
  chevronTxt:  { color:"#475569", fontSize:20 },
  catDot:      { width:36, height:36, borderRadius:10, alignItems:"center", justifyContent:"center" },
  chipRow:     { flexDirection:"row", gap:8, flexWrap:"wrap" },
  chip:        { borderRadius:20, paddingHorizontal:14, paddingVertical:8, borderWidth:1.5, borderColor:"#334155", backgroundColor:"#1E293B" },
  chipTxt:     { color:"#64748B", fontSize:13, fontWeight:"600" },
});

const m = StyleSheet.create({
  overlay: { flex:1, backgroundColor:"rgba(0,0,0,.6)", justifyContent:"flex-end" },
  sheet:   { backgroundColor:"#0F172A", borderTopLeftRadius:24, borderTopRightRadius:24, maxHeight:"75%", paddingBottom:24 },
  handle:  { width:40, height:4, borderRadius:2, backgroundColor:"#334155", alignSelf:"center", marginTop:12 },
  mHeader: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", paddingHorizontal:20, paddingVertical:16 },
  mTitle:  { fontSize:17, fontWeight:"800", color:"#F1F5F9" },
  mClose:  { color:"#64748B", fontSize:18, padding:4 },
  row:     { flexDirection:"row", alignItems:"center", padding:14, borderRadius:12, borderWidth:1, borderColor:"transparent", marginBottom:8, backgroundColor:"#1E293B", gap:12 },
  rowName: { flex:1, color:"#F1F5F9", fontSize:15, fontWeight:"600" },
  check:   { fontSize:16, fontWeight:"800" },
  empty:   { color:"#64748B", textAlign:"center", marginTop:24 },
});

// suppress unused warning
void SCREEN_W;
