import { StyleSheet } from "react-native";

export const PAY_TYPES = [
  { key: "pix",    label: "Pix" },
  { key: "cash",   label: "Dinheiro" },
  { key: "debit",  label: "Débito" },
  { key: "credit", label: "Crédito" },
];

export function todayBR(): string {
  const d = new Date();
  return [
    String(d.getDate()).padStart(2, "0"),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getFullYear()),
  ].join("/");
}

export function brToISO(br: string): string | null {
  const [d, m, y] = br.split("/");
  if (!d || !m || !y || y.length !== 4) return null;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function formatAmount(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

export function parseCents(formatted: string): number {
  const digits = formatted.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A1628" },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#1E293B", alignItems: "center", justifyContent: "center" },
  backTxt: { color: "#94A3B8", fontSize: 16, fontWeight: "700" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "#F1F5F9" },
  saveBtn: { backgroundColor: "#3B82F6", borderRadius: 10, paddingHorizontal: 18, paddingVertical: 9, minWidth: 72, alignItems: "center" },
  saveTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },

  body: { paddingHorizontal: 16, paddingBottom: 40, gap: 20 },

  amountBlock: { borderRadius: 18, borderWidth: 1.5, flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, gap: 6 },
  currencySign: { color: "#94A3B8", fontSize: 22, fontWeight: "700" },
  amountInput: { flex: 1, fontSize: 36, fontWeight: "800", letterSpacing: 0.5 },

  toggleRow: { flexDirection: "row", gap: 10 },
  toggleBtn: { flex: 1, borderRadius: 12, borderWidth: 1.5, borderColor: "#334155", paddingVertical: 12, alignItems: "center" },
  toggleTxt: { fontSize: 13, fontWeight: "700", color: "#64748B" },

  field: { gap: 6 },
  label: { color: "#94A3B8", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: "#1E293B", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: "#F1F5F9", fontSize: 15, borderWidth: 1, borderColor: "#334155" },

  selectBtn: { backgroundColor: "#1E293B", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#334155" },
  selectInner: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  selectVal: { color: "#F1F5F9", fontSize: 15, flex: 1 },
  selectPlaceholder: { color: "#475569", fontSize: 15, flex: 1 },
  chevron: { color: "#475569", fontSize: 20 },

  catDot: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  subChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#334155", marginRight: 8, backgroundColor: "#1E293B" },

  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: "#334155", backgroundColor: "#1E293B" },
  chipTxt: { color: "#64748B", fontSize: 13, fontWeight: "600" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#0F172A", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "75%", paddingBottom: 24 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#334155", alignSelf: "center", marginTop: 12 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16 },
  modalTitle: { fontSize: 17, fontWeight: "800", color: "#F1F5F9" },
  modalClose: { color: "#64748B", fontSize: 18, padding: 4 },

  catRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "transparent", marginBottom: 8, backgroundColor: "#1E293B", gap: 12 },
  catName: { flex: 1, color: "#F1F5F9", fontSize: 15, fontWeight: "600" },
  checkMark: { fontSize: 16, fontWeight: "800" },
  emptyTxt: { color: "#64748B", textAlign: "center", marginTop: 24 },
});
