import { StyleSheet } from "react-native";
import { H_PAD } from "../../../components/categorias/constants";

export type TabType = "RECEITA" | "DESPESA";

export type EditState = {
  id?: string; name: string; icon: string; color: string; parentId: string; type: TabType;
};

export const EMPTY_EDIT: EditState = { name: "", icon: "💼", color: "#60a5fa", parentId: "", type: "RECEITA" };

export const ICONS = [
  "💼","💵","📈","🍽️","🚗","🏠","📚","🎁","🛡️","✈️","🏦","🛍️","🚲","📱",
  "🧹","🎂","🧮","🎥","📷","🍬","🛒","💻","🏋️","🎮","⛽","❤️","🏥","🌲",
  "🦷","🏆","🔒","🌎","🐾","💎","🏀","🎤","🎵","🧾","📌","☁️","💡","🗺️",
];

export const COLORS = [
  "#60a5fa","#22c55e","#f59e0b","#ef4444","#8b5cf6",
  "#06b6d4","#ec4899","#84cc16","#64748b","#f97316",
];

export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A1628" },
  header: { paddingHorizontal: H_PAD, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#F1F5F9" },
  tabBar: { flexDirection: "row", marginHorizontal: H_PAD, marginBottom: 16, backgroundColor: "#1E293B", borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: "center" },
  tabActive: { backgroundColor: "#3B82F6" },
  tabTxt: { color: "#64748B", fontWeight: "600", fontSize: 14 },
  tabTxtActive: { color: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { paddingHorizontal: H_PAD, paddingBottom: 40 },
  newCard: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, borderColor: "#3B82F6", borderStyle: "dashed", borderRadius: 14, padding: 14, marginBottom: 14, backgroundColor: "rgba(59,130,246,0.06)" },
  newIconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#3B82F6", alignItems: "center", justifyContent: "center" },
  newIconTxt: { color: "#fff", fontSize: 22, fontWeight: "700", lineHeight: 26 },
  newCardTitle: { color: "#F1F5F9", fontWeight: "700", fontSize: 15 },
  newCardSub: { color: "#64748B", fontSize: 12, marginTop: 2 },
  empty: { alignItems: "center", marginTop: 40 },
  emptyTxt: { color: "#64748B", fontSize: 15 },
  modal: { flex: 1, backgroundColor: "#0F172A" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#1E293B" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#F1F5F9" },
  modalClose: { fontSize: 18, color: "#64748B", padding: 4 },
  modalBody: { padding: 20, gap: 20 },
  field: { gap: 8 },
  label: { color: "#94A3B8", fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: "#1E293B", borderRadius: 10, padding: 14, color: "#F1F5F9", fontSize: 16, borderWidth: 1, borderColor: "#334155" },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  iconOpt: { width: 44, height: 44, borderRadius: 10, backgroundColor: "#1E293B", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#334155" },
  iconOptTxt: { fontSize: 22 },
  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  colorOpt: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: "transparent" },
  colorOptSel: { borderColor: "#fff", transform: [{ scale: 1.2 }] },
  parentChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#1E293B", borderWidth: 1, borderColor: "#334155", marginRight: 8 },
  parentChipSel: { borderColor: "#3B82F6", backgroundColor: "#1D4ED8" },
  parentChipTxt: { color: "#94A3B8", fontSize: 14, fontWeight: "500" },
  parentChipTxtSel: { color: "#fff" },
  saveBtn: { backgroundColor: "#3B82F6", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  saveBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
