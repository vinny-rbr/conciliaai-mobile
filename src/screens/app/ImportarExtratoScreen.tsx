import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";

import { parseOfx, parseCsv, type ParsedItem } from "../../lib/ofxParser";
import { listBankAccounts } from "../../lib/bankAccountsService";
import type { BankAccount } from "../../types/finance";
import { apiUrl } from "../../lib/api";
import { getToken } from "../../lib/auth";
import { fmt } from "../../lib/financeService";

type Step = "pick" | "review" | "importing" | "done";

const MONTHS = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

export default function ImportarExtratoScreen() {
  const navigation = useNavigation();

  const [step, setStep]               = useState<Step>("pick");
  const [items, setItems]             = useState<(ParsedItem & { selected: boolean })[]>([]);
  const [accounts, setAccounts]       = useState<BankAccount[]>([]);
  const [selAccId, setSelAccId]       = useState<string>("");
  const [fileName, setFileName]       = useState("");
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState({ added: 0, skipped: 0 });

  const pickFile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await DocumentPicker.getDocumentAsync({
        type: ["*/*"],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) { setLoading(false); return; }

      const asset = res.assets[0];
      setFileName(asset.name ?? "extrato");

      const ext = (asset.name ?? "").split(".").pop()?.toLowerCase();
      if (ext !== "ofx" && ext !== "csv") {
        Alert.alert("Formato não suportado", "Use um arquivo .OFX ou .CSV exportado pelo seu banco.");
        setLoading(false);
        return;
      }

      const text = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

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

      // Sort newest first
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
    if (toImport.length === 0) {
      Alert.alert("Selecione ao menos um lançamento.");
      return;
    }

    setStep("importing");
    const token = await getToken();
    let added = 0, skipped = 0;

    for (const it of toImport) {
      try {
        const r = await fetch(apiUrl("/api/finance"), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token ?? ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: it.type,
            title: it.title,
            category: "Outros",
            amountCents: it.amountCents,
            date: it.dateISO,
            paymentType: "debit",
            status: "paid",
            accountId: selAccId || null,
          }),
        });
        if (r.ok) added++;
        else skipped++;
      } catch {
        skipped++;
      }
    }

    setResult({ added, skipped });
    setStep("done");
  };

  // ── Render ────────────────────────────────────────────────────────────

  const receitas = items.filter(it => it.selected && it.type === "RECEITA");
  const despesas = items.filter(it => it.selected && it.type === "DESPESA");
  const totalSel = items.filter(it => it.selected).length;

  if (step === "pick") {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backTxt}>‹ Voltar</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Importar extrato</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={s.pickBody}>
          <View style={s.pickCard}>
            <Text style={s.pickIcon}>📄</Text>
            <Text style={s.pickTitle}>Selecione o arquivo do extrato</Text>
            <Text style={s.pickSub}>Formatos suportados:{"\n"}OFX · CSV</Text>
            <Text style={s.pickHint}>
              No seu banco, acesse "Exportar extrato" ou "Baixar OFX" e escolha o período desejado.
            </Text>
          </View>

          <TouchableOpacity
            style={s.pickBtn}
            activeOpacity={0.8}
            onPress={() => void pickFile()}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.pickBtnTxt}>Escolher arquivo</Text>
            }
          </TouchableOpacity>

          <View style={s.bankRow}>
            {["Nubank","Itaú","BB","Inter","Bradesco","Caixa","Santander"].map(b => (
              <View key={b} style={s.bankChip}>
                <Text style={s.bankChipTxt}>{b}</Text>
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (step === "importing") {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.centerFull}>
          <ActivityIndicator color="#3B82F6" size="large" />
          <Text style={s.importingTxt}>Salvando lançamentos…</Text>
          <Text style={s.importingSub}>{items.filter(it => it.selected).length} itens</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (step === "done") {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.centerFull}>
          <Text style={s.doneIcon}>✓</Text>
          <Text style={s.doneTitle}>Importação concluída!</Text>
          <Text style={s.doneSub}>{result.added} lançamentos salvos{result.skipped > 0 ? ` · ${result.skipped} ignorados` : ""}</Text>
          <TouchableOpacity style={s.doneBtn} onPress={() => navigation.goBack()}>
            <Text style={s.doneBtnTxt}>Voltar para o início</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // step === "review"
  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => setStep("pick")} style={s.backBtn}>
          <Text style={s.backTxt}>‹ Voltar</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Revisar importação</Text>
          <Text style={s.headerSub} numberOfLines={1}>{fileName}</Text>
        </View>
        <TouchableOpacity
          style={s.importBtn}
          activeOpacity={0.8}
          onPress={() => void handleImport()}
          disabled={totalSel === 0}
        >
          <Text style={[s.importBtnTxt, totalSel === 0 && { opacity: 0.4 }]}>Importar {totalSel}</Text>
        </TouchableOpacity>
      </View>

      {/* Resumo */}
      <View style={s.summary}>
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>Receitas</Text>
          <Text style={[s.summaryVal, { color: "#4ADE80" }]}>
            {receitas.length > 0 ? fmt(receitas.reduce((s, i) => s + i.amountCents, 0)) : "—"}
          </Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>Despesas</Text>
          <Text style={[s.summaryVal, { color: "#F87171" }]}>
            {despesas.length > 0 ? fmt(despesas.reduce((s, i) => s + i.amountCents, 0)) : "—"}
          </Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>Selecionados</Text>
          <Text style={s.summaryVal}>{totalSel}/{items.length}</Text>
        </View>
      </View>

      {/* Conta */}
      {accounts.length > 0 && (
        <View style={s.accRow}>
          <Text style={s.accLabel}>Conta:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 4 }}>
            <TouchableOpacity
              onPress={() => setSelAccId("")}
              style={[s.accChip, !selAccId && s.accChipSel]}
            >
              <Text style={[s.accChipTxt, !selAccId && { color: "#fff" }]}>Nenhuma</Text>
            </TouchableOpacity>
            {accounts.map(a => (
              <TouchableOpacity
                key={a.id}
                onPress={() => setSelAccId(a.id)}
                style={[s.accChip, selAccId === a.id && s.accChipSel]}
              >
                <Text style={[s.accChipTxt, selAccId === a.id && { color: "#fff" }]}>{a.nick || a.bank}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Toggle all */}
      <View style={s.toggleAllRow}>
        <TouchableOpacity onPress={toggleAll} style={s.toggleAllBtn}>
          <Text style={s.toggleAllTxt}>
            {items.every(it => it.selected) ? "Desmarcar todos" : "Selecionar todos"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {items.map(it => (
          <TouchableOpacity
            key={it.id}
            style={[s.row, !it.selected && s.rowDimmed]}
            onPress={() => toggleItem(it.id)}
            activeOpacity={0.7}
          >
            <View style={[s.checkbox, it.selected && s.checkboxSel]}>
              {it.selected && <Text style={s.checkMark}>✓</Text>}
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowTitle} numberOfLines={1}>{it.title}</Text>
              <Text style={s.rowDate}>{fmtDate(it.dateISO)}</Text>
            </View>
            <Text style={[s.rowAmt, { color: it.type === "RECEITA" ? "#4ADE80" : "#F87171" }]}>
              {it.type === "RECEITA" ? "+" : "-"}{fmt(it.amountCents)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F172A" },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1E293B", gap: 8 },
  backBtn: { paddingRight: 4 },
  backTxt: { color: "#94A3B8", fontSize: 16 },
  headerTitle: { color: "#F1F5F9", fontSize: 17, fontWeight: "700" },
  headerSub: { color: "#64748B", fontSize: 11, marginTop: 1 },
  importBtn: { backgroundColor: "#3B82F6", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  importBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "800" },

  pickBody: { flex: 1, justifyContent: "center", paddingHorizontal: 24, gap: 20 },
  pickCard: { backgroundColor: "#1E293B", borderRadius: 20, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "#334155" },
  pickIcon: { fontSize: 48, marginBottom: 12 },
  pickTitle: { color: "#F1F5F9", fontSize: 18, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  pickSub: { color: "#3B82F6", fontSize: 14, fontWeight: "700", textAlign: "center", marginBottom: 12 },
  pickHint: { color: "#64748B", fontSize: 13, textAlign: "center", lineHeight: 20 },
  pickBtn: { backgroundColor: "#3B82F6", borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  pickBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },
  bankRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  bankChip: { backgroundColor: "#1E293B", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#334155" },
  bankChipTxt: { color: "#64748B", fontSize: 12, fontWeight: "600" },

  centerFull: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  importingTxt: { color: "#F1F5F9", fontSize: 18, fontWeight: "700" },
  importingSub: { color: "#64748B", fontSize: 14 },
  doneIcon: { fontSize: 56, color: "#4ADE80" },
  doneTitle: { color: "#F1F5F9", fontSize: 22, fontWeight: "800" },
  doneSub: { color: "#94A3B8", fontSize: 15, textAlign: "center" },
  doneBtn: { backgroundColor: "#1E293B", borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14, marginTop: 8, borderWidth: 1, borderColor: "#334155" },
  doneBtnTxt: { color: "#F1F5F9", fontSize: 15, fontWeight: "700" },

  summary: { flexDirection: "row", padding: 16, borderBottomWidth: 1, borderBottomColor: "#1E293B" },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryLabel: { color: "#64748B", fontSize: 11, fontWeight: "600", marginBottom: 3 },
  summaryVal: { color: "#F1F5F9", fontSize: 15, fontWeight: "800" },
  summaryDivider: { width: 1, backgroundColor: "#1E293B", marginVertical: 4 },

  accRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#1E293B", gap: 10 },
  accLabel: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  accChip: { backgroundColor: "#1E293B", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#334155" },
  accChipSel: { backgroundColor: "#2563EB", borderColor: "#3B82F6" },
  accChipTxt: { color: "#64748B", fontSize: 12, fontWeight: "600" },

  toggleAllRow: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1E293B" },
  toggleAllBtn: {},
  toggleAllTxt: { color: "#60A5FA", fontSize: 12, fontWeight: "700" },

  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120, gap: 6 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: "#1E293B", borderRadius: 12, padding: 14, gap: 12 },
  rowDimmed: { opacity: 0.4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: "#475569", justifyContent: "center", alignItems: "center" },
  checkboxSel: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  checkMark: { color: "#fff", fontSize: 13, fontWeight: "900" },
  rowInfo: { flex: 1 },
  rowTitle: { color: "#F1F5F9", fontSize: 14, fontWeight: "600" },
  rowDate: { color: "#64748B", fontSize: 12, marginTop: 2 },
  rowAmt: { fontSize: 14, fontWeight: "700" },
});
