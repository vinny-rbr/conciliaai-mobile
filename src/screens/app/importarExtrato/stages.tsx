import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ParsedItem } from "../../../lib/ofxParser";
import type { BankAccount } from "../../../types/finance";
import { fmt } from "../../../lib/financeService";
import { fmtDate, s } from "./shared";

type SelectedItem = ParsedItem & { selected: boolean };

// ── Pick ─────────────────────────────────────────────────────────────────────
type PickStepProps = { onPick: () => void; loading: boolean; onGoBack: () => void };

export function PickStep({ onPick, loading, onGoBack }: PickStepProps) {
  return (
    <>
      <View style={s.header}>
        <TouchableOpacity onPress={onGoBack} style={s.backBtn}>
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
        <TouchableOpacity style={s.pickBtn} activeOpacity={0.8} onPress={onPick} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.pickBtnTxt}>Escolher arquivo</Text>}
        </TouchableOpacity>
        <View style={s.bankRow}>
          {["Nubank","Itaú","BB","Inter","Bradesco","Caixa","Santander"].map(b => (
            <View key={b} style={s.bankChip}><Text style={s.bankChipTxt}>{b}</Text></View>
          ))}
        </View>
      </View>
    </>
  );
}

// ── Importing ─────────────────────────────────────────────────────────────────
type ImportingStepProps = { totalSel: number };

export function ImportingStep({ totalSel }: ImportingStepProps) {
  return (
    <View style={s.centerFull}>
      <ActivityIndicator color="#3B82F6" size="large" />
      <Text style={s.importingTxt}>Salvando lançamentos…</Text>
      <Text style={s.importingSub}>{totalSel} itens</Text>
    </View>
  );
}

// ── Done ─────────────────────────────────────────────────────────────────────
type DoneStepProps = { added: number; skipped: number; onGoBack: () => void };

export function DoneStep({ added, skipped, onGoBack }: DoneStepProps) {
  return (
    <View style={s.centerFull}>
      <Text style={s.doneIcon}>✓</Text>
      <Text style={s.doneTitle}>Importação concluída!</Text>
      <Text style={s.doneSub}>
        {added} lançamentos salvos{skipped > 0 ? ` · ${skipped} ignorados` : ""}
      </Text>
      <TouchableOpacity style={s.doneBtn} onPress={onGoBack}>
        <Text style={s.doneBtnTxt}>Voltar para o início</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Adjust ───────────────────────────────────────────────────────────────────
type AdjustStepProps = {
  bankCents: number;
  appCents: number;
  dateISO: string;
  onApply: () => void;
  onSkip: () => void;
};

export function AdjustStep({ bankCents, appCents, dateISO, onApply, onSkip }: AdjustStepProps) {
  const diff = bankCents - appCents;
  const isPositive = diff > 0;
  return (
    <View style={s.centerFull}>
      <Text style={{ fontSize: 40, marginBottom: 16 }}>⚖️</Text>
      <Text style={[s.doneTitle, { marginBottom: 8 }]}>Ajuste de saldo</Text>
      <Text style={{ color: "#94A3B8", fontSize: 13, textAlign: "center", marginBottom: 24, paddingHorizontal: 24, lineHeight: 20 }}>
        O saldo do banco em {fmtDate(dateISO)} difere do calculado no app.
      </Text>
      <View style={{ backgroundColor: "#1E293B", borderRadius: 16, padding: 20, width: "85%", marginBottom: 28, borderWidth: 1, borderColor: "#334155" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={{ color: "#94A3B8", fontSize: 13 }}>Saldo do banco</Text>
          <Text style={{ color: "#F1F5F9", fontSize: 14, fontWeight: "700" }}>{fmt(bankCents)}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={{ color: "#94A3B8", fontSize: 13 }}>Saldo calculado</Text>
          <Text style={{ color: "#F1F5F9", fontSize: 14, fontWeight: "700" }}>{fmt(appCents)}</Text>
        </View>
        <View style={{ height: 1, backgroundColor: "#334155", marginVertical: 4 }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
          <Text style={{ color: "#94A3B8", fontSize: 13 }}>Diferença</Text>
          <Text style={{ color: isPositive ? "#4ADE80" : "#F87171", fontSize: 15, fontWeight: "800" }}>
            {isPositive ? "+" : ""}{fmt(Math.abs(diff))}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={[s.doneBtn, { marginBottom: 12 }]} onPress={onApply} activeOpacity={0.85}>
        <Text style={s.doneBtnTxt}>Criar lançamento de ajuste</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSkip} activeOpacity={0.7}>
        <Text style={{ color: "#64748B", fontSize: 14, fontWeight: "600" }}>Pular</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Review ────────────────────────────────────────────────────────────────────
type ReviewStepProps = {
  items: SelectedItem[];
  accounts: BankAccount[];
  selAccId: string;
  setSelAccId: (id: string) => void;
  fileName: string;
  totalSel: number;
  toggleAll: () => void;
  toggleItem: (id: string) => void;
  handleImport: () => void;
  onBack: () => void;
};

export function ReviewStep({
  items, accounts, selAccId, setSelAccId, fileName,
  totalSel, toggleAll, toggleItem, handleImport, onBack,
}: ReviewStepProps) {
  const receitas = items.filter(it => it.selected && it.type === "RECEITA");
  const despesas = items.filter(it => it.selected && it.type === "DESPESA");

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backTxt}>‹ Voltar</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Revisar importação</Text>
          <Text style={s.headerSub} numberOfLines={1}>{fileName}</Text>
        </View>
        <TouchableOpacity
          style={s.importBtn}
          activeOpacity={0.8}
          onPress={handleImport}
          disabled={totalSel === 0}
        >
          <Text style={[s.importBtnTxt, totalSel === 0 && { opacity: 0.4 }]}>Importar {totalSel}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.summary}>
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>Receitas</Text>
          <Text style={[s.summaryVal, { color: "#4ADE80" }]}>
            {receitas.length > 0 ? fmt(receitas.reduce((sum, i) => sum + i.amountCents, 0)) : "—"}
          </Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>Despesas</Text>
          <Text style={[s.summaryVal, { color: "#F87171" }]}>
            {despesas.length > 0 ? fmt(despesas.reduce((sum, i) => sum + i.amountCents, 0)) : "—"}
          </Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>Selecionados</Text>
          <Text style={s.summaryVal}>{totalSel}/{items.length}</Text>
        </View>
      </View>

      {accounts.length > 0 && (
        <View style={s.accRow}>
          <Text style={s.accLabel}>Conta:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 4 }}>
            <TouchableOpacity onPress={() => setSelAccId("")} style={[s.accChip, !selAccId && s.accChipSel]}>
              <Text style={[s.accChipTxt, !selAccId && { color: "#fff" }]}>Nenhuma</Text>
            </TouchableOpacity>
            {accounts.map(a => (
              <TouchableOpacity key={a.id} onPress={() => setSelAccId(a.id)} style={[s.accChip, selAccId === a.id && s.accChipSel]}>
                <Text style={[s.accChipTxt, selAccId === a.id && { color: "#fff" }]}>{a.nick || a.bank}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

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
