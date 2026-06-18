import { StyleSheet } from "react-native";

export type Tier   = "free" | "pro" | "premium";
export type Filter = "todos" | "gratis" | "pro" | "premium";

export type Report = {
  id: string;
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  tier: Tier;
  section: string;
  preview?: "saldo" | "top-cat" | "sparkline" | "donut" | "contas";
};

export const REPORTS: Report[] = [
  // ── MAIS USADOS
  { id: "entradas-saidas",    icon: "⇆",  iconBg: "#1D4ED8", title: "Entradas e saídas",        subtitle: "Resumo do mês com saldo final",           tier: "free",    section: "MAIS USADOS", preview: "saldo"     },
  { id: "gastos-categoria",   icon: "◕",  iconBg: "#7C3AED", title: "Gastos por categoria",      subtitle: "Para onde seu dinheiro foi",              tier: "free",    section: "MAIS USADOS", preview: "donut"     },
  { id: "maiores-gastos",     icon: "🔥", iconBg: "#991B1B", title: "Maiores gastos",             subtitle: "Top despesas e recorrentes do período",   tier: "free",    section: "MAIS USADOS", preview: "top-cat"   },
  // ── ANÁLISES
  { id: "fluxo-caixa",        icon: "↗",  iconBg: "#065F46", title: "Fluxo de caixa",            subtitle: "Evolução do saldo mês a mês",             tier: "free",    section: "ANÁLISES",    preview: "sparkline" },
  { id: "comparativo-meses",  icon: "⧉",  iconBg: "#1E3A8A", title: "Comparativo entre meses",   subtitle: "Compare dois períodos lado a lado",       tier: "pro",     section: "ANÁLISES"                          },
  { id: "orcamento-realizado",icon: "⊙",  iconBg: "#065F46", title: "Orçamento x realizado",     subtitle: "Metas planejadas vs. gastos reais",       tier: "pro",     section: "ANÁLISES"                          },
  { id: "dre",                icon: "≡",  iconBg: "#78350F", title: "DRE simplificado",          subtitle: "Resultado: receitas − custos − despesas", tier: "premium", section: "ANÁLISES"                          },
  // ── POR FONTE
  { id: "por-conta",          icon: "▣",  iconBg: "#065F46", title: "Por conta / carteira",      subtitle: "Saldo e movimento por banco",             tier: "free",    section: "POR FONTE",   preview: "contas"    },
  { id: "por-cartao",         icon: "▬",  iconBg: "#831843", title: "Por cartão de crédito",     subtitle: "Fatura e gastos por cartão",              tier: "free",    section: "POR FONTE"                         },
  { id: "por-grupo",          icon: "◉",  iconBg: "#3730A3", title: "Por grupo",                 subtitle: "Despesas compartilhadas e divisões",      tier: "free",    section: "POR FONTE"                         },
  // ── FECHAMENTO
  { id: "relatorio-anual",    icon: "▦",  iconBg: "#1E3A8A", title: "Relatório anual",           subtitle: "Resumo completo do ano em um doc",        tier: "premium", section: "FECHAMENTO E CONTABILIDADE"        },
  { id: "extrato-contador",   icon: "▤",  iconBg: "#1E293B", title: "Extrato para o contador",   subtitle: "Lançamentos detalhados p/ contabilidade", tier: "premium", section: "FECHAMENTO E CONTABILIDADE"        },
];

export const SECTIONS = ["MAIS USADOS", "ANÁLISES", "POR FONTE", "FECHAMENTO E CONTABILIDADE"];

export const TIER_BADGE: Record<Tier, string | null> = { free: null, pro: "PRO", premium: "PREMIUM" };
export const TIER_COLOR: Record<Tier, string> = { free: "", pro: "#F59E0B", premium: "#D97706" };

export const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: "#0A1628" },
  header:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1E293B" },
  backTxt:    { color: "#94A3B8", fontSize: 14 },
  headerTitle:{ flex: 1, color: "#F1F5F9", fontSize: 17, fontWeight: "800", textAlign: "center" },

  searchWrap: { flexDirection: "row", alignItems: "center", margin: 12, backgroundColor: "#1E293B", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 10, borderWidth: 1, borderColor: "#334155" },
  searchIcon: { fontSize: 15 },
  searchInput:{ flex: 1, color: "#F1F5F9", fontSize: 14 },

  filterRow:  { paddingHorizontal: 12, gap: 8, paddingBottom: 4 },
  filterBtn:  { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, backgroundColor: "#1E293B", borderWidth: 1.5, borderColor: "#334155" },
  filterBtnActive: { backgroundColor: "#1D4ED8", borderColor: "#3B82F6" },
  filterTxt:  { color: "#64748B", fontSize: 13, fontWeight: "700" },
  filterTxtActive: { color: "#fff" },

  scroll:     { padding: 12, paddingTop: 16 },
  section:    { marginBottom: 24 },
  sectionTitle:{ color: "#475569", fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10, marginLeft: 4 },

  card:       { flexDirection: "row", alignItems: "center", backgroundColor: "#1E293B", borderRadius: 16, padding: 14, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: "#334155" },
  cardLocked: { opacity: 0.75 },
  iconBox:    { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  iconTxt:    { fontSize: 20, color: "#fff" },
  cardBody:   { flex: 1, gap: 3 },
  titleRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle:  { color: "#F1F5F9", fontSize: 15, fontWeight: "700" },
  cardTitleLocked: { color: "#CBD5E1" },
  cardSub:    { color: "#64748B", fontSize: 12 },
  badge:      { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  badgeTxt:   { fontSize: 10, fontWeight: "800" },
  previewWrap:{ alignItems: "flex-end", minWidth: 50 },
  lock:       { fontSize: 18, color: "#F59E0B" },
  arrow:      { color: "#475569", fontSize: 20, fontWeight: "300", marginLeft: 4 },
});
