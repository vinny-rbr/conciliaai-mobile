import { StyleSheet } from "react-native";
import * as SecureStore from "expo-secure-store";

// ── Types ─────────────────────────────────────────────────────────────
export type SplitMode = "SALARY" | "MANUAL";
export type DetailTab  = "resumo" | "despesas" | "saldos" | "membros";
export type ExpTab     = "avulsa" | "casa";
export type DonutSlice = { id: string; label: string; amountCents: number; colorIdx: number };
export type Settlement = { fromId: string; from: string; toId: string; to: string; cents: number };

// ── Storage helpers ───────────────────────────────────────────────────
function storageKey(groupId: string, suffix: string) {
  return `conciliaai.g.${groupId}.${suffix}`;
}
export async function loadSplitMode(groupId: string): Promise<SplitMode> {
  const v = await SecureStore.getItemAsync(storageKey(groupId, "mode")).catch(() => null);
  return v === "MANUAL" ? "MANUAL" : "SALARY";
}
export async function saveSplitMode(groupId: string, mode: SplitMode) {
  await SecureStore.setItemAsync(storageKey(groupId, "mode"), mode).catch(() => {});
}
export async function loadSalaries(groupId: string): Promise<Record<string, number>> {
  const raw = await SecureStore.getItemAsync(storageKey(groupId, "sal")).catch(() => null);
  try { return raw ? (JSON.parse(raw) as Record<string, number>) : {}; } catch { return {}; }
}
export async function saveSalaries(groupId: string, s: Record<string, number>) {
  await SecureStore.setItemAsync(storageKey(groupId, "sal"), JSON.stringify(s)).catch(() => {});
}
export async function loadPercents(groupId: string): Promise<Record<string, number>> {
  const raw = await SecureStore.getItemAsync(storageKey(groupId, "pct")).catch(() => null);
  try { return raw ? (JSON.parse(raw) as Record<string, number>) : {}; } catch { return {}; }
}
export async function savePercents(groupId: string, p: Record<string, number>) {
  await SecureStore.setItemAsync(storageKey(groupId, "pct"), JSON.stringify(p)).catch(() => {});
}

// ── Helpers ───────────────────────────────────────────────────────────
export const AVATAR_COLORS = ["#3B82F6","#8B5CF6","#F59E0B","#10B981","#EF4444","#EC4899","#14B8A6","#F97316"];

import type { GroupMember, GroupMemberBalance, ExpenseParticipantInput } from "../../../lib/groupsService";

export function memberLabel(m: GroupMember) { return m.displayName ?? m.name ?? m.email ?? "Membro"; }
export function avatarColor(idx: number)    { return AVATAR_COLORS[idx % AVATAR_COLORS.length]; }
export function fmtDate(iso: string)        { return iso.slice(0, 10).split("-").reverse().join("/"); }
export function monthKey(iso: string)       { return iso.slice(0, 7); }
export function currentMonthKey()           { return new Date().toISOString().slice(0, 7); }
export function monthLabelBR(ym: string) {
  const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const [y, m] = ym.split("-");
  return `${MONTHS[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}
export function fmtBRL(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (!d) return "";
  return (parseInt(d, 10) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}
export function parseCents(brl: string): number {
  return parseInt(brl.replace(/\D/g, "") || "0", 10);
}

export function computeParticipants(
  members: GroupMember[],
  weights: Record<string, number>,
  totalCents: number,
): ExpenseParticipantInput[] {
  const active = members.filter(m => (weights[m.userId] ?? 0) > 0);
  if (!active.length) return [];
  let assigned = 0;
  const parts: ExpenseParticipantInput[] = members.map(m => {
    const w = weights[m.userId] ?? 0;
    if (w === 0) return { userId: m.userId, shareCents: 0, isExcluded: true };
    const share = Math.round(totalCents * w);
    assigned += share;
    return { userId: m.userId, shareCents: share, isExcluded: false };
  });
  const diff = totalCents - assigned;
  if (diff !== 0) {
    const last = parts.slice().reverse().find(p => !p.isExcluded);
    if (last) last.shareCents += diff;
  }
  return parts;
}

export function computeSettlements(bal: GroupMemberBalance[]): Settlement[] {
  const creds = bal.filter(b => b.balanceCents > 0).map(b => ({ ...b }));
  const debts = bal.filter(b => b.balanceCents < 0).map(b => ({ ...b }));
  const res: Settlement[] = [];
  let i = 0, j = 0;
  while (i < debts.length && j < creds.length) {
    const d = debts[i], c = creds[j];
    const amt = Math.min(Math.abs(d.balanceCents), c.balanceCents);
    if (amt > 0) res.push({ fromId: d.userId, from: d.name, toId: c.userId, to: c.name, cents: amt });
    d.balanceCents += amt; c.balanceCents -= amt;
    if (d.balanceCents === 0) i++;
    if (c.balanceCents === 0) j++;
  }
  return res;
}

// ── Styles ────────────────────────────────────────────────────────────
export const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#0A1628" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  arrow:  { color: "#334155", fontSize: 24 },
  dot:    { color: "#334155", fontSize: 14 },

  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  listTitle:  { color: "#F1F5F9", fontSize: 28, fontWeight: "900" },
  hdrBtn:     { backgroundColor: "#1D4ED8", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  hdrBtnTxt:  { color: "#fff", fontSize: 13, fontWeight: "800" },
  hdrBtn2:    { backgroundColor: "#1E293B", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: "#334155" },
  hdrBtn2Txt: { color: "#94A3B8", fontSize: 13, fontWeight: "700" },
  listScroll: { padding: 16, paddingTop: 4 },

  groupCard:  { backgroundColor: "#1E293B", borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 10, borderWidth: 1, borderColor: "#334155" },
  groupName:  { color: "#F1F5F9", fontSize: 16, fontWeight: "800" },
  groupSub:   { color: "#475569", fontSize: 12, marginTop: 2 },

  emptyWrap:  { alignItems: "center", paddingVertical: 48, gap: 10 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { color: "#F1F5F9", fontSize: 18, fontWeight: "800" },
  emptySub:   { color: "#64748B", fontSize: 13, textAlign: "center", lineHeight: 20, paddingHorizontal: 24 },
  emptyBtn:   { backgroundColor: "#1D4ED8", borderRadius: 14, paddingHorizontal: 24, paddingVertical: 13, marginTop: 6 },
  emptyBtnTxt:{ color: "#fff", fontSize: 15, fontWeight: "800" },

  detailHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1E293B" },
  backTxt:      { color: "#94A3B8", fontSize: 14 },
  detailTitle:  { flex: 1, color: "#F1F5F9", fontSize: 16, fontWeight: "800", textAlign: "center" },

  statsStrip: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1E293B" },
  statItem:   { flex: 1, alignItems: "center" },
  statVal:    { color: "#F1F5F9", fontSize: 14, fontWeight: "800" },
  statLbl:    { color: "#475569", fontSize: 10, fontWeight: "600", marginTop: 2 },
  statDiv:    { width: 1, backgroundColor: "#1E293B" },

  tabRow:  { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  tabBtn:  { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: "#1E293B", alignItems: "center", borderWidth: 1.5, borderColor: "#1E293B" },
  tabBtnA: { borderColor: "#3B82F6", backgroundColor: "#1D4ED822" },
  tabTxt:  { color: "#64748B", fontSize: 11, fontWeight: "700" },
  tabTxtA: { color: "#60A5FA" },

  detailScroll: { padding: 14, paddingBottom: 60 },
  secLabel:     { color: "#64748B", fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", marginTop: 4, marginBottom: 4 },

  metricCard:  { flex: 1, backgroundColor: "#1E293B", borderRadius: 14, padding: 14, borderWidth: 1 },
  metricLbl:   { color: "#64748B", fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 4 },
  metricVal:   { fontSize: 17, fontWeight: "800" },

  splitHeader: { backgroundColor: "#1E293B", borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#334155" },
  splitTitle:  { color: "#F1F5F9", fontSize: 14, fontWeight: "700" },
  splitSub:    { color: "#64748B", fontSize: 11, marginTop: 2 },
  configBtn:   { backgroundColor: "#1D4ED8", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  configBtnTxt:{ color: "#fff", fontSize: 12, fontWeight: "800" },
  configNudge: { backgroundColor: "#1E293B", borderRadius: 14, padding: 14, flexDirection: "row", gap: 10, alignItems: "flex-start", borderWidth: 1, borderColor: "#334155" },
  nudgeIcon:   { fontSize: 22 },
  nudgeTitle:  { color: "#F1F5F9", fontSize: 13, fontWeight: "700", marginBottom: 3 },
  nudgeSub:    { color: "#64748B", fontSize: 12, lineHeight: 18 },
  splitRow:    { backgroundColor: "#1E293B", borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#334155" },
  splitName:   { color: "#F1F5F9", fontSize: 13, fontWeight: "700" },
  splitPct:    { color: "#64748B", fontSize: 11 },
  splitAmt:    { color: "#60A5FA", fontSize: 15, fontWeight: "900" },

  primaryBtn:    { backgroundColor: "#1D4ED8", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  primaryBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "800" },
  expCard:       { backgroundColor: "#1E293B", borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 12, borderWidth: 1, borderColor: "#334155" },
  expTitle:      { color: "#F1F5F9", fontSize: 14, fontWeight: "700" },
  expMeta:       { color: "#64748B", fontSize: 11 },
  expAmt:        { color: "#F1F5F9", fontSize: 15, fontWeight: "800" },
  expEditHint:   { color: "#334155", fontSize: 9 },
  pChip:         { backgroundColor: "#0F172A", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexDirection: "row", alignItems: "center" },
  pChipTxt:      { color: "#60A5FA", fontSize: 10, fontWeight: "700" },

  balCard:     { backgroundColor: "#1E293B", borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#334155" },
  balName:     { color: "#F1F5F9", fontSize: 14, fontWeight: "700" },
  balMeta:     { color: "#64748B", fontSize: 11 },
  acertoCard:  { backgroundColor: "#1E293B", borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#334155" },
  acertoCardMe:{ borderColor: "#F59E0B55", backgroundColor: "#1A1500" },
  pagueiBtn:   { backgroundColor: "#16532244", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: "#22C55E88" },
  pagueiTxt:   { color: "#4ADE80", fontSize: 12, fontWeight: "800" },

  memberCard:     { backgroundColor: "#1E293B", borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#334155" },
  memberName:     { color: "#F1F5F9", fontSize: 14, fontWeight: "700" },
  memberEmail:    { color: "#64748B", fontSize: 11 },
  roleBadge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: "#1E293B", borderWidth: 1, borderColor: "#334155" },
  roleBadgeAdmin: { backgroundColor: "#1D4ED822", borderColor: "#3B82F644" },
  roleTxt:        { color: "#64748B", fontSize: 11, fontWeight: "700" },
  roleTxtAdmin:   { color: "#60A5FA" },

  modalOverlay:  { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalSheet:    { backgroundColor: "#0F172A", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 8, maxHeight: "92%" },
  modalHandle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: "#334155", alignSelf: "center", marginBottom: 18 },
  modalTitle:    { color: "#F1F5F9", fontSize: 20, fontWeight: "900", marginBottom: 4 },
  modalSub:      { color: "#64748B", fontSize: 13, marginBottom: 16 },
  modalInput:    { backgroundColor: "#1E293B", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: "#F1F5F9", fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: "#334155" },
  fieldLbl:      { color: "#94A3B8", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  modalBtns:     { flexDirection: "row", gap: 10, marginTop: 4 },
  btnCancel:     { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: "#1E293B", alignItems: "center" },
  btnCancelTxt:  { color: "#94A3B8", fontWeight: "700" },
  btnConfirm:    { flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: "#3B82F6", alignItems: "center" },
  btnConfirmTxt: { color: "#fff", fontWeight: "800", fontSize: 15 },
  btnDelete:     { paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: "#EF444466", alignItems: "center", marginBottom: 10 },
  btnDeleteTxt:  { color: "#F87171", fontWeight: "700", fontSize: 14 },

  expTabRow:  { flexDirection: "row", gap: 6, marginBottom: 16 },
  expTabBtn:  { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: "#1E293B", alignItems: "center", borderWidth: 1.5, borderColor: "#1E293B" },
  expTabBtnA: { borderColor: "#3B82F6", backgroundColor: "#1D4ED822" },
  expTabTxt:  { color: "#64748B", fontSize: 12, fontWeight: "700" },
  expTabTxtA: { color: "#60A5FA" },

  amtRow:   { backgroundColor: "#1E293B", borderRadius: 12, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginBottom: 14, borderWidth: 1, borderColor: "#334155" },
  amtSign:  { color: "#64748B", fontSize: 20, fontWeight: "700", marginRight: 6 },
  amtInput: { flex: 1, paddingVertical: 14, color: "#F1F5F9", fontSize: 26, fontWeight: "800" },

  baseInput: { flexDirection: "row", alignItems: "center", backgroundColor: "#1E293B", borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: "#334155", minWidth: 100 },
  basePre:   { color: "#64748B", fontSize: 13, fontWeight: "700" },
  baseField: { flex: 1, paddingVertical: 10, paddingHorizontal: 6, color: "#F1F5F9", fontSize: 14, fontWeight: "700" },

  settlRow: { backgroundColor: "#1E293B", borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#334155" },
  settlTxt: { fontSize: 14, lineHeight: 22, flex: 1 },
});
