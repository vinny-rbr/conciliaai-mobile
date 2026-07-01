import React from "react";
import { View, Text, StyleSheet } from "react-native";

// ── Types ────────────────────────────────────────────────────────────
export type PlanTab    = "orcamento" | "poupanca" | "previsao" | "objetivos" | "diaria";
export type BudgetLimit = { category: string; limitCents: number };
export type Goal        = { id: string; name: string; emoji: string; targetCents: number; savedCents: number; deadline: string };
export type WorkType    = "mototaxi" | "entregador" | "motorista" | "autonomo" | "outro";
export type DiariaView    = "meta" | "registro" | "relatorios";
export type DiariaExpense = { id: string; name: string; amountCents: number };
export type DiariaLog     = { date: string; earnedCents: number }; // date = YYYY-MM-DD
export type DiariaPerfil  = {
  workType: WorkType;
  workDays: number;
  workDaysList?: number[]; // dias específicos do mês (1–31)
  fuelCents: number;
  maintenanceCents: number;
  platformCutPct: number;
  liquidMeta: number;
  expenses: DiariaExpense[];
};

// ── SecureStore keys ─────────────────────────────────────────────────
export const BUDGETS_KEY   = (ym: string) => `conciliaai.budgets.${ym}`;
export const SAVINGS_KEY   = "conciliaai.savings.target";
export const GOALS_KEY     = "conciliaai.goals";
export const DIARIA_KEY      = "conciliaai.diaria.v1";
export const DIARIA_LOGS_KEY = (ym: string) => `conciliaai.diaria.logs.${ym}`;

// ── Constants ────────────────────────────────────────────────────────
export const WORK_TYPES: { type: WorkType; emoji: string; label: string; hasFuel: boolean; hasPlatform: boolean }[] = [
  { type: "mototaxi",   emoji: "🛵", label: "Mototaxi",         hasFuel: true,  hasPlatform: false },
  { type: "entregador", emoji: "📦", label: "Entregador",        hasFuel: true,  hasPlatform: true  },
  { type: "motorista",  emoji: "🚗", label: "Motorista (Uber/99)", hasFuel: true, hasPlatform: true },
  { type: "autonomo",   emoji: "🔨", label: "Autônomo",          hasFuel: false, hasPlatform: false },
  { type: "outro",      emoji: "💼", label: "Outro",             hasFuel: false, hasPlatform: false },
];

export const GOAL_EMOJIS = ["🎯","🏠","🚗","✈️","💍","📱","💻","🎓","🏖️","💪","🛍️","🎮","📷","🏋️","🍕","🎁"];

// ── Helpers ──────────────────────────────────────────────────────────
export function curYM(): string { return new Date().toISOString().slice(0, 7); }
export function daysInMonth(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
export function monthLabel(): string {
  const M = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const d = new Date();
  return `${M[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
}
export function daysLeft(deadline: string): number {
  if (!deadline) return -1;
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return -1;
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
}
export function parseCents(s: string): number { return parseInt(s.replace(/\D/g, "") || "0", 10); }
export function fmtBRL(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (!d) return "";
  return (parseInt(d, 10) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}
export function uid(): string { return Math.random().toString(36).slice(2, 10); }

// ── Sub-components ───────────────────────────────────────────────────
export function ProgressBar({ ratio, color, height = 8 }: { ratio: number; color: string; height?: number }) {
  const pct = Math.min(100, Math.max(0, Math.round(ratio * 100)));
  return (
    <View style={{ height, backgroundColor: "#0F172A", borderRadius: height / 2, overflow: "hidden" }}>
      <View style={{ height, width: `${pct}%`, backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

export function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderColor: "#1E293B" }}>
      <Text style={{ color: "#64748B", fontSize: 13 }}>{label}</Text>
      <Text style={{ color: color ?? "#F1F5F9", fontSize: 13, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────
export const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: "#0F172A" },
  header:       { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  pageTitle:    { fontSize: 26, fontWeight: "800", color: "#F1F5F9" },
  pageSub:      { fontSize: 13, color: "#64748B", marginTop: 2 },
  tabBar:       { flexGrow: 0, borderBottomWidth: 1, borderColor: "#1E293B" },
  tabBtn:       { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#1E293B" },
  tabBtnActive: { backgroundColor: "#1E3A5F", borderWidth: 1, borderColor: "#3B82F6" },
  tabTxt:       { color: "#64748B", fontSize: 13, fontWeight: "600" },
  tabTxtActive: { color: "#3B82F6", fontWeight: "700" },
  tabContent:   { padding: 20, gap: 12, paddingBottom: 100 },
  card:         { backgroundColor: "#1E293B", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#334155" },
  cardLabel:    { color: "#F1F5F9", fontSize: 14, fontWeight: "700" },
  emptyCard:    { backgroundColor: "#1E293B", borderRadius: 16, padding: 32, borderWidth: 1, borderColor: "#334155", alignItems: "center" },
  emptyTitle:   { color: "#F1F5F9", fontSize: 16, fontWeight: "700", marginBottom: 6 },
  emptyTxt:     { color: "#475569", fontSize: 13, textAlign: "center", marginBottom: 16 },
  emptyBtn:     { backgroundColor: "#1E3A5F", borderRadius: 10, borderWidth: 1, borderColor: "#3B82F644", paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnTxt:  { color: "#3B82F6", fontSize: 14, fontWeight: "700" },
  editBtn:      { backgroundColor: "#1E3A5F", borderRadius: 10, borderWidth: 1, borderColor: "#3B82F644", paddingHorizontal: 12, paddingVertical: 6 },
  hint:         { color: "#334155", fontSize: 11, textAlign: "center", marginTop: 4 },
  overlay:      { flex: 1, backgroundColor: "#00000099", justifyContent: "center", alignItems: "center", padding: 24 },
  modal:        { backgroundColor: "#1E293B", borderRadius: 16, padding: 20, width: "100%", borderWidth: 1, borderColor: "#334155", gap: 12 },
  modalTitle:   { color: "#F1F5F9", fontSize: 16, fontWeight: "800" },
  modalSub:     { color: "#64748B", fontSize: 13, marginTop: -4 },
  input:        { backgroundColor: "#0F172A", borderRadius: 10, borderWidth: 1, borderColor: "#334155", padding: 12, color: "#F1F5F9", fontSize: 15 },
  modalBtns:    { flexDirection: "row", gap: 8, marginTop: 4 },
  btnCancel:    { flex: 1, backgroundColor: "#0F172A", borderRadius: 10, borderWidth: 1, borderColor: "#334155", padding: 12, alignItems: "center" },
  btnCancelTxt: { color: "#94A3B8", fontWeight: "700" },
  btnConfirm:   { flex: 1, backgroundColor: "#3B82F6", borderRadius: 10, padding: 12, alignItems: "center" },
  btnConfirmTxt:{ color: "#fff", fontWeight: "800" },
  workChip:     { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#0F172A", borderRadius: 10, borderWidth: 1, borderColor: "#334155" },
  workChipActive:{ backgroundColor: "#1E3A5F", borderColor: "#3B82F6" },
  workChipTxt:  { color: "#64748B", fontSize: 13, fontWeight: "600" },
  counterBtn:   { width: 32, height: 32, borderRadius: 8, backgroundColor: "#0F172A", borderWidth: 1, borderColor: "#334155", alignItems: "center", justifyContent: "center" },
  counterTxt:   { color: "#F1F5F9", fontSize: 18, fontWeight: "700", lineHeight: 22 },
});
