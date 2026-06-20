import { Dimensions, StyleSheet } from "react-native";
import type { CreditCardBrand } from "../../../types/creditCard";

export const ACCENT = "#F59E0B";
const { width: W } = Dimensions.get("window");
export const CARD_W = W - 48;
export const CARD_H = Math.round(CARD_W * 0.6);

export const BRANDS: Record<CreditCardBrand, { label: string; bg1: string; bg2: string; logoBg: string; logoText: string; logoColor: string }> = {
  nubank:    { label: "Nubank",    bg1: "#820AD1", bg2: "#4A0080", logoBg: "rgba(255,255,255,.18)", logoText: "nu",    logoColor: "#fff" },
  itau:      { label: "Itaú",     bg1: "#FF6B00", bg2: "#C25000", logoBg: "rgba(255,255,255,.18)", logoText: "i",     logoColor: "#fff" },
  inter:     { label: "Inter",    bg1: "#FF7A00", bg2: "#C25000", logoBg: "rgba(255,255,255,.18)", logoText: "inter", logoColor: "#fff" },
  c6:        { label: "C6 Bank",  bg1: "#1A1A1A", bg2: "#0A0A0A", logoBg: "#C0A060",               logoText: "C6",    logoColor: "#C0A060" },
  bb:        { label: "BB",       bg1: "#0038A8", bg2: "#001C6E", logoBg: "#FFD700",               logoText: "BB",    logoColor: "#0038A8" },
  santander: { label: "Santander",bg1: "#EC0000", bg2: "#A00000", logoBg: "rgba(255,255,255,.18)", logoText: "S",     logoColor: "#fff" },
  caixa:     { label: "Caixa",    bg1: "#006BB6", bg2: "#004880", logoBg: "rgba(255,255,255,.18)", logoText: "C",     logoColor: "#fff" },
  picpay:    { label: "PicPay",   bg1: "#21C25E", bg2: "#118040", logoBg: "rgba(255,255,255,.18)", logoText: "PP",    logoColor: "#fff" },
  outro:     { label: "Outro",    bg1: "#334155", bg2: "#1E293B", logoBg: "rgba(255,255,255,.18)", logoText: "?",     logoColor: "#94A3B8" },
};

export const BRANDS_LIST = Object.entries(BRANDS) as [CreditCardBrand, (typeof BRANDS)[CreditCardBrand]][];
export const EXPENSE_CATS = ["Alimentação", "Transporte", "Compras", "Assinaturas", "Saúde", "Viagem", "Lazer", "Outros"];

export function usageColor(pct: number) {
  return pct < 0.5 ? "#4ADE80" : pct < 0.82 ? ACCENT : "#F87171";
}

const FACE_MAP: Record<string, { bg1: string; bg2: string }> = {
  "linear-gradient(135deg,#9F37E8,#6A02B0)": { bg1: "#9F37E8", bg2: "#6A02B0" },
  "linear-gradient(135deg,#FBBF24,#D97706)": { bg1: "#F59E0B", bg2: "#D97706" },
  "linear-gradient(135deg,#3B82F6,#1b3fa0)": { bg1: "#3B82F6", bg2: "#1b3fa0" },
  "linear-gradient(135deg,#334155,#0F172A)": { bg1: "#334155", bg2: "#0F172A" },
};

export function faceColors(face: string | null | undefined, brand: { bg1: string; bg2: string }) {
  if (!face) return brand;
  return FACE_MAP[face] ?? brand;
}

export function parseBRL(s: string): number {
  const clean = s.replace(/[^\d,]/g, "").replace(",", ".");
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : Math.round(n * 100);
}

export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F172A" },
  loadWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1E293B" },
  backBtn: { paddingRight: 12 },
  backTxt: { color: "#94A3B8", fontSize: 16 },
  headerTitle: { flex: 1, color: "#F1F5F9", fontSize: 17, fontWeight: "700" },
  newBtn: { backgroundColor: "#F59E0B22", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  newBtnTxt: { color: ACCENT, fontSize: 14, fontWeight: "700" },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  summary: { flexDirection: "row", justifyContent: "space-between", margin: 16, backgroundColor: "#1E293B", borderRadius: 14, padding: 16 },
  summaryLabel: { color: "#64748B", fontSize: 12, marginBottom: 2 },
  summaryVal: { color: ACCENT, fontSize: 18, fontWeight: "700" },
  summaryRight: { alignItems: "flex-end" },
  carousel: { paddingTop: 16 },
  cardVisual: { width: CARD_W, height: CARD_H, borderRadius: 20, padding: 20, overflow: "hidden" },
  cardCircle: { position: "absolute" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardLogo: { width: 44, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  cardLogoTxt: { fontWeight: "900", letterSpacing: 0.3 },
  cardNick: { color: "rgba(255,255,255,0.82)", fontSize: 13, fontWeight: "700" },
  cardChip: { width: 38, height: 28, borderRadius: 5, backgroundColor: "#F4D58A", marginTop: 24, marginBottom: 8, borderWidth: 1, borderColor: "rgba(0,0,0,.15)" },
  cardLast4: { color: "rgba(255,255,255,0.92)", fontSize: 15, fontWeight: "500", letterSpacing: 3 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 12, marginBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#334155" },
  dotActive: { backgroundColor: ACCENT, width: 18 },
  detailPanel: { margin: 16, backgroundColor: "#1E293B", borderRadius: 16, padding: 16 },
  detailRow: { marginBottom: 12 },
  detailLabel: { color: "#64748B", fontSize: 13, marginBottom: 2 },
  detailAmt: { fontSize: 26, fontWeight: "800" },
  barTrack: { height: 8, backgroundColor: "#0F172A", borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  barFill: { height: 8, borderRadius: 4 },
  limitRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  limitTxt: { color: "#64748B", fontSize: 12 },
  chips: { flexDirection: "row", gap: 8, marginBottom: 16 },
  chip: { flex: 1, backgroundColor: "#0F172A", borderRadius: 10, padding: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  chipIcon: { fontSize: 14 },
  chipLabel: { color: "#64748B", fontSize: 10 },
  chipVal: { color: "#F1F5F9", fontSize: 12, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, backgroundColor: ACCENT, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  actionBtnSec: { backgroundColor: "#0F172A", borderWidth: 1, borderColor: "#334155" },
  actionBtnTxt: { color: "#0F172A", fontSize: 14, fontWeight: "800" },
  txSection: { marginHorizontal: 16, marginTop: 8 },
  txTitle: { color: "#94A3B8", fontSize: 12, fontWeight: "700", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  txRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#1E293B", borderRadius: 12, padding: 14, marginBottom: 8 },
  txLeft: { flex: 1, marginRight: 12 },
  txName: { color: "#F1F5F9", fontSize: 14, fontWeight: "600" },
  txCat: { color: "#64748B", fontSize: 12, marginTop: 2 },
  txAmt: { fontSize: 14, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { color: "#F1F5F9", fontSize: 20, fontWeight: "700", marginBottom: 8 },
  emptySub: { color: "#64748B", fontSize: 14, textAlign: "center", marginBottom: 24 },
  emptyBtn: { backgroundColor: ACCENT, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  emptyBtnTxt: { color: "#0F172A", fontSize: 15, fontWeight: "800" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#1E293B", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { color: "#F1F5F9", fontSize: 18, fontWeight: "800", marginBottom: 4 },
  modalSub: { color: "#94A3B8", fontSize: 13, marginBottom: 20 },
  fieldLabel: { color: "#94A3B8", fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
  input: { backgroundColor: "#0F172A", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: "#F1F5F9", fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: "#334155" },
  saveBtn: { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveBtnTxt: { color: "#0F172A", fontSize: 16, fontWeight: "800" },
  cancelBtn: { alignItems: "center", paddingTop: 14 },
  cancelBtnTxt: { color: "#64748B", fontSize: 14 },
  brandChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, opacity: 0.75 },
  brandChipSel: { opacity: 1, borderWidth: 2, borderColor: "rgba(255,255,255,0.8)" },
  brandChipTxt: { color: "#fff", fontSize: 13 },
  accChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: "#0F172A", borderWidth: 1, borderColor: "#334155" },
  accChipSel: { backgroundColor: "#1D4ED8", borderColor: "#3B82F6" },
  accChipTxt: { color: "#94A3B8", fontSize: 13 },
  catChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: "#0F172A", borderWidth: 1, borderColor: "#334155" },
  catChipSel: { backgroundColor: "#F59E0B22", borderColor: ACCENT },
  catChipTxt: { color: "#94A3B8", fontSize: 13 },
});
