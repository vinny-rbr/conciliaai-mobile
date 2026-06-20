import { useState, useCallback, useEffect } from "react";
import { Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

import { parseOfx, parseCsv, type ParsedItem, type LedgerBal } from "../../lib/ofxParser";
import { listBankAccounts, updateBankAccount } from "../../lib/bankAccountsService";
import { fetchFinanceItems } from "../../lib/financeService";
import { listFinanceCategories } from "../../lib/financeCategoriesService";
import { getKnownTags } from "../../lib/tagsStore";
import { apiUrl } from "../../lib/api";
import { getToken } from "../../lib/auth";
import type { BankAccount, FinanceCategoryOption } from "../../types/finance";
import { s } from "./importarExtrato/shared";
import { PickStep, ImportingStep, DoneStep, ReviewStep, AdjustStep } from "./importarExtrato/stages";

type Step = "pick" | "review" | "importing" | "adjust" | "done";
type AdjustInfo = { bankCents: number; appCents: number; dateISO: string };
type SelectedItem = ParsedItem & { selected: boolean };

export default function ImportarExtratoScreen() {
  const navigation = useNavigation();

  const [step, setStep]               = useState<Step>("pick");
  const [items, setItems]             = useState<SelectedItem[]>([]);
  const [accounts, setAccounts]       = useState<BankAccount[]>([]);
  const [selAccId, setSelAccId]       = useState<string>("");
  const [fileName, setFileName]       = useState("");
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState({ added: 0, skipped: 0 });
  const [ledgerBal, setLedgerBal]     = useState<LedgerBal | null>(null);
  const [adjustInfo, setAdjustInfo]   = useState<AdjustInfo | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<FinanceCategoryOption[]>([]);

  useEffect(() => {
    void Promise.all([fetchFinanceItems(), getKnownTags()]).then(([data, known]) => {
      const tagSet = new Set<string>(known);
      for (const it of data) {
        if (it.tags) it.tags.split(",").map(t => t.trim()).filter(Boolean).forEach(t => tagSet.add(t));
      }
      setAvailableTags([...tagSet].sort());
    }).catch(() => {});
    void listFinanceCategories().then(setAllCategories).catch(() => {});
  }, []);

  const pickFile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await DocumentPicker.getDocumentAsync({ type: ["*/*"], copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) { setLoading(false); return; }

      const asset = res.assets[0];
      setFileName(asset.name ?? "extrato");

      const ext = (asset.name ?? "").split(".").pop()?.toLowerCase();
      if (ext !== "ofx" && ext !== "csv") {
        Alert.alert("Formato não suportado", "Use um arquivo .OFX ou .CSV.\n\nNo seu banco acesse: Extrato → Exportar → OFX ou CSV.");
        setLoading(false);
        return;
      }

      const text = await FileSystem.readAsStringAsync(asset.uri, { encoding: "utf8" });
      let parsed: ParsedItem[] = [];
      let bal: LedgerBal | null = null;
      if (ext === "ofx") {
        const { items: ofxItems, ledgerBal: ofxBal } = parseOfx(text);
        parsed = ofxItems;
        bal = ofxBal;
      } else {
        parsed = parseCsv(text);
      }
      setLedgerBal(bal);

      if (parsed.length === 0) {
        Alert.alert("Nenhum lançamento encontrado", "Verifique se o arquivo está no formato correto.");
        setLoading(false);
        return;
      }

      const accs = await listBankAccounts();
      setAccounts(accs);
      if (accs.length === 1) setSelAccId(accs[0].id);

      parsed.sort((a, b) => b.dateISO.localeCompare(a.dateISO));
      setItems(parsed.map(p => ({ ...p, selected: true })));
      setStep("review");
    } catch (e) {
      Alert.alert("Erro ao ler arquivo", String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, selected: !it.selected } : it));
  };

  const toggleAll = () => {
    const allSelected = items.every(it => it.selected);
    setItems(prev => prev.map(it => ({ ...it, selected: !allSelected })));
  };

  const editItem = (id: string, updates: Partial<SelectedItem>) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...updates } : it));
  };

  const handleImport = async () => {
    const toImport = items.filter(it => it.selected);
    if (toImport.length === 0) { Alert.alert("Selecione ao menos um lançamento."); return; }

    setStep("importing");
    const token = await getToken();
    let added = 0, skipped = 0;

    for (const it of toImport) {
      try {
        const r = await fetch(apiUrl("/api/finance"), {
          method: "POST",
          headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            type: it.type, title: it.title, category: it.category || "Outros",
            amountCents: it.amountCents, date: it.dateISO,
            paymentType: "debit", status: "paid",
            accountId: selAccId || null,
            tags: it.tags || null,
          }),
        });
        if (r.ok) added++; else skipped++;
      } catch { skipped++; }
    }

    setResult({ added, skipped });

    // Reajuste: compara saldo do OFX com saldo calculado no app
    if (ledgerBal && ledgerBal.balanceCents > 0) {
      if (selAccId) void updateBankAccount(selAccId, { balanceCents: ledgerBal.balanceCents });
      const allItems = await fetchFinanceItems();
      let cumRec = 0, cumDes = 0;
      for (const it of allItems) {
        if (it.dateISO > ledgerBal.dateISO) continue;
        if (it.type === "RECEITA") cumRec += it.amountCents;
        if (it.type === "DESPESA") cumDes += it.amountCents;
      }
      const appCents = cumRec - cumDes;
      if (Math.abs(ledgerBal.balanceCents - appCents) > 0) {
        setAdjustInfo({ bankCents: ledgerBal.balanceCents, appCents, dateISO: ledgerBal.dateISO });
        setStep("adjust");
        return;
      }
    }

    setStep("done");
  };

  const applyAdjustment = async () => {
    if (!adjustInfo) { setStep("done"); return; }
    const diff = adjustInfo.bankCents - adjustInfo.appCents;
    const token = await getToken();
    if (token) {
      await fetch(apiUrl("/api/finance"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          type: diff > 0 ? "RECEITA" : "DESPESA",
          title: "Saldo inicial — ajuste de importação",
          category: "Outros",
          amountCents: Math.abs(diff),
          date: adjustInfo.dateISO,
          paymentType: "debit",
          status: "paid",
          accountId: selAccId || null,
        }),
      });
    }
    setStep("done");
  };

  const totalSel = items.filter(it => it.selected).length;

  if (step === "pick") {
    return (
      <SafeAreaView style={s.root}>
        <PickStep
          onPick={() => void pickFile()}
          loading={loading}
          onGoBack={() => navigation.goBack()}
          onOpenCamera={() => navigation.navigate("LancarPorFoto" as never)}
        />
      </SafeAreaView>
    );
  }
  if (step === "importing") {
    return (
      <SafeAreaView style={s.root}>
        <ImportingStep totalSel={totalSel} />
      </SafeAreaView>
    );
  }
  if (step === "adjust" && adjustInfo) {
    return (
      <SafeAreaView style={s.root}>
        <AdjustStep
          bankCents={adjustInfo.bankCents}
          appCents={adjustInfo.appCents}
          dateISO={adjustInfo.dateISO}
          onApply={() => void applyAdjustment()}
          onSkip={() => setStep("done")}
        />
      </SafeAreaView>
    );
  }
  if (step === "done") {
    return (
      <SafeAreaView style={s.root}>
        <DoneStep added={result.added} skipped={result.skipped} onGoBack={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  return (
    <ReviewStep
      items={items}
      accounts={accounts}
      selAccId={selAccId}
      setSelAccId={setSelAccId}
      fileName={fileName}
      totalSel={totalSel}
      toggleAll={toggleAll}
      toggleItem={toggleItem}
      onEditItem={editItem}
      handleImport={() => void handleImport()}
      onBack={() => setStep("pick")}
      availableTags={availableTags}
      allCategories={allCategories}
    />
  );
}
