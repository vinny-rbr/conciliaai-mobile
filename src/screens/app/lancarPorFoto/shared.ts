import { StyleSheet } from "react-native";

export type Stage = "source" | "reading" | "review" | "done";

export type OcrResult = {
  amount?: string;
  description?: string;
  date?: string;
  paymentType?: string;
  category?: string;
  detectedFields?: number;
};

export const PAY_TYPES = [
  { key: "pix",    label: "Pix" },
  { key: "debit",  label: "Débito" },
  { key: "credit", label: "Crédito" },
  { key: "cash",   label: "Dinheiro" },
];

export const READ_STEPS = [
  "Enviando a imagem…",
  "Lendo o comprovante…",
  "Identificando valor e data…",
  "Sugerindo categoria…",
];

export function todayISO() { return new Date().toISOString().slice(0, 10); }

export function fmtInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return (parseInt(digits, 10) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

export function parseCents(v: string): number {
  const d = v.replace(/\D/g, "");
  return d ? parseInt(d, 10) : 0;
}

export function brToISO(br: string): string | null {
  const p = br.split("/");
  if (p.length === 3 && p[2].length === 4) return `${p[2]}-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(br)) return br;
  return null;
}

export function isoToBR(iso: string): string {
  if (!iso || iso.length < 10) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F172A" },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1E293B", gap: 8 },
  backBtn: {},
  backTxt: { color: "#94A3B8", fontSize: 14 },
  headerTitle: { flex: 1, color: "#F1F5F9", fontSize: 16, fontWeight: "700" },
  saveHdrBtn: { backgroundColor: "#3B82F6", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  saveHdrTxt: { color: "#fff", fontSize: 13, fontWeight: "800" },

  sourceBody: { flex: 1, padding: 20, gap: 14 },
  heroCard: { backgroundColor: "#1E293B", borderRadius: 20, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "#334155" },
  heroEmoji: { fontSize: 48, marginBottom: 10 },
  heroTitle: { color: "#F1F5F9", fontSize: 18, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  heroSub: { color: "#64748B", fontSize: 13, textAlign: "center", lineHeight: 20 },
  srcBtn: { backgroundColor: "#1E3A8A", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: "#2563EB44" },
  srcBtnIcon: { fontSize: 28 },
  srcBtnTitle: { color: "#F1F5F9", fontSize: 15, fontWeight: "700" },
  srcBtnSub: { color: "#64748B", fontSize: 12, marginTop: 2 },
  tipBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#1E293B", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#334155" },
  tipIcon: { fontSize: 16 },
  tipTxt: { color: "#64748B", fontSize: 12, lineHeight: 18, flex: 1 },

  centerFull: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  thumbReading: { width: 140, height: 180, borderRadius: 14, marginBottom: 24, opacity: 0.85 },
  readingTitle: { color: "#F1F5F9", fontSize: 18, fontWeight: "700", marginBottom: 20 },
  progressTrack: { width: "100%", height: 6, backgroundColor: "#1E293B", borderRadius: 3, overflow: "hidden", marginBottom: 10 },
  progressFill: { height: 6, backgroundColor: "#3B82F6", borderRadius: 3 },
  readingStep: { color: "#64748B", fontSize: 13 },

  doneEmoji: { fontSize: 52, color: "#4ADE80", marginBottom: 12 },
  doneTitle: { color: "#F1F5F9", fontSize: 22, fontWeight: "800", marginBottom: 6 },
  doneSub: { color: "#94A3B8", fontSize: 14, textAlign: "center", marginBottom: 24 },
  doneBtn: { backgroundColor: "#3B82F6", borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  doneBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },

  reviewBody: { padding: 16, gap: 18, paddingBottom: 60 },
  thumbRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  thumb: { width: 80, height: 100, borderRadius: 12 },
  ocrBadge: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#1E3A8A22", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#3B82F633" },
  ocrBadgeIcon: { fontSize: 18 },
  ocrBadgeTxt: { color: "#60A5FA", fontSize: 13, fontWeight: "700" },

  typeRow: { flexDirection: "row", gap: 10 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: "#334155", backgroundColor: "#1E293B", alignItems: "center" },
  typeBtnTxt: { color: "#64748B", fontSize: 14, fontWeight: "700" },

  amtBlock: { borderRadius: 18, borderWidth: 1.5, flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, gap: 6 },
  amtSign: { fontSize: 22, fontWeight: "700" },
  amtInput: { flex: 1, fontSize: 36, fontWeight: "800" },

  field: { gap: 8 },
  label: { color: "#94A3B8", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: "#1E293B", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: "#F1F5F9", fontSize: 15, borderWidth: 1, borderColor: "#334155" },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: "#334155", backgroundColor: "#1E293B" },
  chipTxt: { color: "#64748B", fontSize: 13, fontWeight: "600" },

  saveBtn: { borderRadius: 16, paddingVertical: 17, alignItems: "center", marginTop: 6 },
  saveBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
