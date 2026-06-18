import { StyleSheet } from "react-native";
import { useRef, useEffect } from "react";
import { Animated } from "react-native";
import { Text, View } from "react-native";

export const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
export const PAY_LABELS: Record<string, string> = {
  pix: "Pix", debit: "Débito", credit: "Crédito", cash: "Dinheiro",
  transfer: "TED/DOC", boleto: "Boleto",
};
export const CAT_COLORS = ["#3B82F6","#8B5CF6","#F59E0B","#10B981","#EF4444","#EC4899","#14B8A6","#F97316","#6366F1","#84CC16"];
export const PAY_COLORS = ["#3B82F6","#8B5CF6","#14B8A6","#F59E0B","#EF4444","#EC4899"];
export const PERIOD_OPTIONS = [{ label: "1M", months: 1 },{ label: "3M", months: 3 },{ label: "6M", months: 6 },{ label: "12M", months: 12 }];

export const REPORT_TITLES: Record<string, string> = {
  "entradas-saidas":    "Entradas e saídas",
  "gastos-categoria":   "Gastos por categoria",
  "maiores-gastos":     "Maiores gastos",
  "fluxo-caixa":        "Fluxo de caixa",
  "por-conta":          "Por conta / carteira",
  "por-cartao":         "Por cartão de crédito",
  "comparativo-meses":  "Comparativo entre meses",
  "orcamento-realizado":"Orçamento x realizado",
  "dre":                "DRE simplificado",
  "por-grupo":          "Por grupo",
  "relatorio-anual":    "Relatório anual",
  "extrato-contador":   "Extrato para o contador",
};

export function isoToMonthKey(iso: string) { return iso.slice(0, 7); }
export function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return `${MONTHS_PT[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}
export function lastNMonths(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const t = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export function AnimBar({ ratio, color, delay = 0, maxH = 120 }: { ratio: number; color: string; delay?: number; maxH?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: ratio, duration: 600, delay, useNativeDriver: false }).start();
  }, [ratio]);
  return <Animated.View style={{ flex: anim, backgroundColor: color, borderRadius: 4, minWidth: ratio > 0 ? 2 : 0, maxHeight: maxH }} />;
}

export function HBar({ ratio, color, delay = 0 }: { ratio: number; color: string; delay?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: ratio, duration: 700, delay, useNativeDriver: false }).start();
  }, [ratio]);
  return (
    <View style={{ flex: 1, height: 8, backgroundColor: "#1E293B", borderRadius: 4, overflow: "hidden" }}>
      <Animated.View style={{ height: 8, backgroundColor: color, borderRadius: 4, width: anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }} />
    </View>
  );
}

export function SectionTitle({ title }: { title: string }) {
  return <Text style={c.secTitle}>{title}</Text>;
}

export const c = StyleSheet.create({
  root:       { flex: 1, backgroundColor: "#0A1628" },
  header:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1E293B", gap: 8 },
  backTxt:    { color: "#94A3B8", fontSize: 13, width: 80 },
  headerTitle:{ flex: 1, color: "#F1F5F9", fontSize: 16, fontWeight: "800", textAlign: "center" },
  periodRow:  { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  periodBtn:  { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: "#334155", backgroundColor: "#1E293B", alignItems: "center" },
  periodBtnA: { borderColor: "#3B82F6", backgroundColor: "#1D4ED822" },
  periodTxt:  { color: "#64748B", fontSize: 13, fontWeight: "700" },
  periodTxtA: { color: "#60A5FA" },
  scroll:     { padding: 16, paddingTop: 8 },
  empty:      { color: "#475569", fontSize: 14, textAlign: "center", paddingVertical: 24 },
  secTitle:   { color: "#64748B", fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6, marginTop: 4 },
});

export const c2 = StyleSheet.create({
  card:      { flex: 1, borderRadius: 14, borderWidth: 1.5, padding: 14 },
  cardLabel: { color: "#94A3B8", fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 4 },
  cardVal:   { fontSize: 16, fontWeight: "800" },
  balCard:   { borderRadius: 16, borderWidth: 1.5, padding: 16, alignItems: "center" },
  balLabel:  { color: "#94A3B8", fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 4 },
  balVal:    { fontSize: 28, fontWeight: "900" },
  balSub:    { color: "#475569", fontSize: 12, marginTop: 4 },
  monthRow:  { backgroundColor: "#1E293B", borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  monthName: { color: "#94A3B8", fontSize: 11, fontWeight: "700", width: 40 },
  monthVal:  { fontSize: 11, fontWeight: "700", width: 68, textAlign: "right" },
  monthSaldo:{ fontSize: 12, fontWeight: "800", width: 70, textAlign: "right" },
  topRow:    { backgroundColor: "#1E293B", borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  topRank:   { color: "#475569", fontSize: 16, fontWeight: "900", width: 24, textAlign: "center" },
  accCard:   { backgroundColor: "#1E293B", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#334155" },
});
