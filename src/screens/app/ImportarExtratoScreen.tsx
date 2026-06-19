import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";

import { parseOfx, parseCsv, type ParsedItem } from "../../lib/ofxParser";
import { listBankAccounts } from "../../lib/bankAccountsService";
import { apiUrl } from "../../lib/api";
import { getToken } from "../../lib/auth";
import type { BankAccount } from "../../types/finance";
import { s } from "./importarExtrato/shared";
import { PickStep, ImportingStep, DoneStep, ReviewStep } from "./importarExtrato/stages";

type Step = "pick" | "review" | "importing" | "done";
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

      const text = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
      let parsed: ParsedItem[] = [];
      if (ext === "ofx") {
        const { items: ofxItems } = parseOfx(text);
        parsed = ofxItems;
      } else {
        parsed = parseCsv(text);
      }

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
            type: it.type, title: it.title, category: "Outros",
            amountCents: it.amountCents, date: it.dateISO,
            paymentType: "debit", status: "paid",
            accountId: selAccId || null,
          }),
        });
        if (r.ok) added++; else skipped++;
      } catch { skipped++; }
    }

    setResult({ added, skipped });
    setStep("done");
  };

  const totalSel = items.filter(it => it.selected).length;

  if (step === "pick") {
    return (
      <SafeAreaView style={s.root}>
        <PickStep onPick={() => void pickFile()} loading={loading} onGoBack={() => navigation.goBack()} />
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
      handleImport={() => void handleImport()}
      onBack={() => setStep("pick")}
    />
  );
}
