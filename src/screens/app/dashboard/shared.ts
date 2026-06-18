import { StyleSheet } from "react-native";

export const PLAN_COLOR: Record<string, string> = {
  Pro: "#3B82F6", Premium: "#D97706", Basico: "#64748B",
};
export const PLAN_LABEL: Record<string, string> = {
  Pro: "● PRO", Premium: "● PREMIUM", Basico: "● BÁSICO",
};

export type PeriodKey = "MONTH" | "LAST_3" | "YEAR" | "ALL";
export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "MONTH",  label: "Mês atual" },
  { key: "LAST_3", label: "Últimos 3 meses" },
  { key: "YEAR",   label: "Ano" },
  { key: "ALL",    label: "Tudo" },
];

export function getPeriodRange(period: PeriodKey): { from: string; to: string } {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(y, m + 1, 0);
  const to = `${y}-${pad(m+1)}-${pad(lastDay.getDate())}`;
  if (period === "MONTH") return { from: `${y}-${pad(m+1)}-01`, to };
  if (period === "LAST_3") return { from: `${y}-${pad(m-1 < 0 ? 12 : m-1)}-01`.replace(/\d{4}/, String(m-1 < 0 ? y-1 : y)), to };
  if (period === "YEAR") return { from: `${y}-01-01`, to };
  return { from: "2000-01-01", to };
}

export type AnalyticsTab = "confronto" | "gastos" | "receitas" | "pagamento";

export const AVAILABLE_CHARTS = [
  { id: "compare", icon: "⚖️", title: "Compare duas categorias", sub: "Dados de duas categorias lado a lado" },
];

export function cmpLine(pct: string | null, invert = false) {
  if (!pct) return "vs mês anterior: —";
  const n = parseFloat(pct);
  const up = invert ? n < 0 : n >= 0;
  return `vs mês anterior: ${up ? "↑" : "↓"} ${Math.abs(n).toFixed(1)}%`;
}

export const calStyle = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  card:    { backgroundColor: "#1E293B", borderRadius: 20, padding: 16, width: 300, borderWidth: 1, borderColor: "#334155" },
});

export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F172A" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 100 },

  brandBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  brandLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#2563EB", justifyContent: "center", alignItems: "center" },
  brandName: { fontSize: 16, fontWeight: "800", color: "#F1F5F9" },
  brandSub: { fontSize: 9, fontWeight: "700", color: "#64748B", letterSpacing: 1.5 },
  planBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  planBadgeTxt: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  logoutBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#1E293B", borderWidth: 1, borderColor: "#334155", justifyContent: "center", alignItems: "center" },
  logoutTxt: { fontSize: 12, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.5 },

  heroCard: { backgroundColor: "#1D4ED8", borderRadius: 22, padding: 20, marginBottom: 12 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  heroBalLabel: { fontSize: 12, color: "rgba(255,255,255,.6)", fontWeight: "600" },
  monthNav: { flexDirection: "row", alignItems: "center", gap: 8 },
  monthBtn: { width: 26, height: 26, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(255,255,255,.15)", borderRadius: 7 },
  monthBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "600", lineHeight: 20 },
  monthLabel: { fontSize: 13, fontWeight: "700", color: "#fff", minWidth: 110, textAlign: "center" },
  heroBalRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  heroBal: { fontSize: 30, fontWeight: "800", color: "#fff" },
  heroAccountsHint: { fontSize: 11, color: "rgba(255,255,255,.55)", marginTop: 3 },
  eyeBtn: { padding: 6, marginTop: 4 },
  heroStats: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,.18)", borderRadius: 14, padding: 14 },
  heroStat: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  heroStatIc: { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  heroStatLbl: { fontSize: 11, color: "rgba(255,255,255,.6)", fontWeight: "600" },
  heroStatVal: { fontSize: 14, fontWeight: "700", marginTop: 2 },
  heroDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,.2)", marginHorizontal: 12 },

  periodRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  periodRowLabel: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  periodBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#1E293B", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#334155" },
  periodBtnTxt: { fontSize: 13, color: "#F1F5F9", fontWeight: "600" },
  periodDropdown: { backgroundColor: "#1E293B", borderRadius: 12, borderWidth: 1, borderColor: "#334155", marginBottom: 8, overflow: "hidden" },
  periodOption: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#334155" },
  periodOptionActive: { backgroundColor: "rgba(96,165,250,.1)" },
  periodOptionTxt: { fontSize: 14, color: "#CBD5E1", fontWeight: "600" },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#F1F5F9" },
  sectionAction: { fontSize: 13, color: "#60A5FA", fontWeight: "600" },
  cardsScroll: { marginLeft: -16, paddingLeft: 16, marginBottom: 4 },
  bankCard: { width: 160, height: 100, borderRadius: 16, padding: 14, justifyContent: "space-between" },
  bankCardBank: { fontSize: 11, color: "rgba(255,255,255,.7)", fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  bankCardNick: { fontSize: 13, fontWeight: "700", color: "#fff" },
  bankCardBal: { fontSize: 15, fontWeight: "800", color: "#fff" },
  bankCardLast: { fontSize: 10, color: "rgba(255,255,255,.5)" },
  bankCardAdd: { width: 160, height: 100, borderRadius: 16, borderWidth: 2, borderColor: "#334155", borderStyle: "dashed", justifyContent: "center", alignItems: "center", gap: 6 },
  bankCardAddIcon: { fontSize: 24, color: "#60A5FA", fontWeight: "300" },
  bankCardAddTxt: { fontSize: 12, color: "#64748B", fontWeight: "600" },

  cardsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statCard: { flex: 1, minWidth: "45%", backgroundColor: "#1E293B", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#334155" },
  statLab: { fontSize: 11, color: "#94A3B8", fontWeight: "700", marginBottom: 4 },
  statVal: { fontSize: 17, fontWeight: "800", marginBottom: 8 },
  statSub: { fontSize: 10, color: "#64748B", marginTop: 4, fontWeight: "600" },

  analyticsCard: { backgroundColor: "#1E293B", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#334155", marginBottom: 16 },
  analyticsTabs: { flexDirection: "row", gap: 4 },
  analyticsTabBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, alignItems: "center", backgroundColor: "#0F172A" },
  analyticsTabActive: { backgroundColor: "#2563EB" },
  analyticsTabTxt: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  analyticsTabTxtActive: { color: "#fff" },
  progressTrack: { height: 8, backgroundColor: "#334155", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressLabel: { fontSize: 12, color: "#94A3B8", fontWeight: "600", marginTop: 6, textAlign: "center" },
  confrontoLbl: { fontSize: 11, color: "#94A3B8", fontWeight: "600", marginBottom: 2 },
  confrontoVal: { fontSize: 16, fontWeight: "800" },
  catBarLabel: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },
  catBarTrack: { height: 6, backgroundColor: "#334155", borderRadius: 3, overflow: "hidden" },
  catBarFill: { height: "100%", borderRadius: 3 },

  dueSoonCard: { backgroundColor: "rgba(245,158,11,.1)", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "rgba(245,158,11,.3)", marginBottom: 16 },
  dueSoonTitle: { fontSize: 13, fontWeight: "800", color: "#FBBF24", marginBottom: 10 },
  dueSoonRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "rgba(245,158,11,.15)" },
  dueSoonName: { flex: 1, fontSize: 13, fontWeight: "600", color: "#F1F5F9" },
  dueSoonDate: { fontSize: 11, color: "#94A3B8", marginRight: 10 },
  dueSoonAmt: { fontSize: 13, fontWeight: "700", color: "#F87171" },

  extraCard:   { backgroundColor: "#1E293B", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#334155" },
  addChartBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, backgroundColor: "#1E293B", borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: "#334155", borderStyle: "dashed" },
  addChartPlus:{ color: "#3B82F6", fontSize: 20, fontWeight: "300" },
  addChartTxt: { color: "#475569", fontSize: 13, fontWeight: "600" },

  emptyTxt: { color: "#64748B", fontSize: 13, textAlign: "center", paddingVertical: 24 },
  txRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#1E293B" },
  txIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  txEmoji: { fontSize: 20 },
  txInfo: { flex: 1 },
  txTitle: { fontSize: 14, fontWeight: "600", color: "#F1F5F9" },
  txCat: { fontSize: 12, color: "#64748B", marginTop: 2 },
  txAmt: { fontSize: 14, fontWeight: "700" },
});
