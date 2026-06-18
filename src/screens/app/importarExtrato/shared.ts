import { StyleSheet } from "react-native";

export type Step = "pick" | "review" | "importing" | "done";

const MONTHS = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

export function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

export const s = StyleSheet.create({
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
