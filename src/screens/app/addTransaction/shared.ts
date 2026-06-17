import { StyleSheet } from "react-native";

export type TxType  = "RECEITA" | "DESPESA";
export type Summary = { saldo: number; receitas: number; despesas: number };

export const QUICK = [
  { icon: "↑", color: "#22C55E", title: "Receita" },
  { icon: "↓", color: "#EF4444", title: "Despesa" },
  { icon: "↓", color: "#F59E0B", title: "Cartão"  },
];

export const MORE = [
  { icon: "🏦", color: "#3B82F6", title: "Novo banco",             subtitle: "Cadastrar conta ou cartão"          },
  { icon: "💳", color: "#F59E0B", title: "Novo cartão de crédito", subtitle: "Limite, fatura e vencimento"        },
  { icon: "⬇",  color: "#6366F1", title: "Importar extrato",       subtitle: "OFX, CSV, XLSX ou PDF"             },
  { icon: "⇅",  color: "#14B8A6", title: "Transferência",          subtitle: "Mover entre suas contas"           },
  { icon: "📷", color: "#3B82F6", title: "Lançar por foto",        subtitle: "IA lê o recibo automaticamente", badge: "NOVO" },
  { icon: "📊", color: "#8B5CF6", title: "Relatórios",             subtitle: "Gráficos e exportar PDF"           },
];

export const PAY_TYPES = [
  { key: "pix",    label: "Pix"       },
  { key: "cash",   label: "Dinheiro"  },
  { key: "debit",  label: "Débito"    },
  { key: "credit", label: "Crédito"   },
];

export function fmtBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
export function todayBR() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}
export function brToISO(br: string): string | null {
  const p = br.split("/");
  if (p.length !== 3 || p[2].length !== 4) return null;
  return `${p[2]}-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`;
}
export function fmtAmount(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return (parseInt(digits, 10) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}
export function parseCents(v: string): number {
  const d = v.replace(/\D/g, "");
  return d ? parseInt(d, 10) : 0;
}
export function makeGroupId(): string {
  const arr = new Uint8Array(16);
  for (let i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256);
  const hex = Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export function addMonthsISO(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target  = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return `${target.getFullYear()}-${String(target.getMonth()+1).padStart(2,"0")}-${String(Math.min(d, lastDay)).padStart(2,"0")}`;
}

// ── StyleSheets ───────────────────────────────────────────────────────
export const s = StyleSheet.create({
  root:            { ...StyleSheet.absoluteFillObject, backgroundColor: "#0F172A" },
  overlay:         { ...StyleSheet.absoluteFillObject, backgroundColor: "#0F172A" },
  balanceCard:     { position:"absolute", top:46, left:16, right:16, backgroundColor:"#1E3A8A", borderRadius:16, padding:12, shadowColor:"#3B82F6", shadowOpacity:0.35, shadowRadius:16, shadowOffset:{width:0,height:4}, elevation:10 },
  balanceTop:      { flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:4 },
  balanceLabel:    { fontSize:11, color:"#93C5FD", fontWeight:"600" },
  balanceMes:      { fontSize:10, color:"#60A5FA", textTransform:"capitalize" },
  balanceVal:      { fontSize:20, fontWeight:"800", color:"#fff", marginBottom:8 },
  balanceRow:      { flexDirection:"row", alignItems:"center" },
  balanceItem:     { flex:1, flexDirection:"row", alignItems:"center", gap:6 },
  balanceItemIcon: { fontSize:14, color:"#fff" },
  balanceItemLbl:  { fontSize:10, color:"#93C5FD" },
  balanceItemVal:  { fontSize:12, fontWeight:"700" },
  balanceDivider:  { width:1, height:28, backgroundColor:"#3B82F633", marginHorizontal:8 },
  sheet:           { position:"absolute", bottom:0, left:0, right:0, backgroundColor:"#0F172A", borderTopLeftRadius:24, borderTopRightRadius:24, maxHeight:"92%" },
  handle:          { width:40, height:4, borderRadius:2, backgroundColor:"#334155", alignSelf:"center", marginTop:12, marginBottom:4 },
  header:          { flexDirection:"row", alignItems:"center", justifyContent:"space-between", paddingHorizontal:20, paddingVertical:14 },
  headerTitle:     { fontSize:18, fontWeight:"800", color:"#F1F5F9" },
  headerSub:       { fontSize:12, color:"#64748B", marginTop:2 },
  closeBtn:        { width:36, height:36, borderRadius:18, backgroundColor:"#1E293B", justifyContent:"center", alignItems:"center", borderWidth:1, borderColor:"#334155" },
  closeTxt:        { color:"#94A3B8", fontSize:16, fontWeight:"700" },
  quickRow:        { flexDirection:"row", paddingHorizontal:20, paddingBottom:16, gap:8 },
  quickBtn:        { width:68, height:68, borderRadius:20, justifyContent:"center", alignItems:"center", borderWidth:1.5, marginBottom:6 },
  quickIcon:       { fontSize:28, fontWeight:"700" },
  quickLabel:      { fontSize:12, fontWeight:"700" },
  dividerRow:      { flexDirection:"row", alignItems:"center", marginHorizontal:20, marginBottom:12, gap:10 },
  dividerLine:     { flex:1, height:1, backgroundColor:"#1E293B" },
  dividerTxt:      { fontSize:11, color:"#475569", fontWeight:"600" },
  list:            { paddingHorizontal:16, paddingBottom:24 },
  item:            { flexDirection:"row", alignItems:"center", backgroundColor:"#1E293B", borderRadius:14, padding:13, marginBottom:8, gap:12 },
  iconWrap:        { width:44, height:44, borderRadius:12, justifyContent:"center", alignItems:"center" },
  iconTxt:         { fontWeight:"700" },
  texts:           { flex:1 },
  titleRow:        { flexDirection:"row", alignItems:"center", gap:8 },
  itemTitle:       { fontSize:14, fontWeight:"700", color:"#F1F5F9" },
  subtitle:        { fontSize:12, color:"#64748B", marginTop:2 },
  badge:           { backgroundColor:"#22C55E22", borderRadius:6, paddingHorizontal:6, paddingVertical:2 },
  badgeTxt:        { fontSize:10, fontWeight:"800", color:"#22C55E" },
  chevron:         { fontSize:20, color:"#334155" },
});

export const f = StyleSheet.create({
  root:             { ...StyleSheet.absoluteFillObject, backgroundColor:"#0A1628", zIndex:10 },
  header:           { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingVertical:12, gap:12, paddingTop:16 },
  backBtn:          { width:36, height:36, borderRadius:18, backgroundColor:"#1E293B", alignItems:"center", justifyContent:"center" },
  backTxt:          { color:"#94A3B8", fontSize:16, fontWeight:"700" },
  headerTitle:      { flex:1, fontSize:18, fontWeight:"800", color:"#F1F5F9" },
  saveBtn:          { backgroundColor:"#3B82F6", borderRadius:10, paddingHorizontal:18, paddingVertical:9, minWidth:72, alignItems:"center" },
  saveTxt:          { color:"#fff", fontWeight:"700", fontSize:14 },
  deleteBtn:        { width:36, height:36, borderRadius:10, backgroundColor:"#EF444422", alignItems:"center", justifyContent:"center", borderWidth:1, borderColor:"#EF444455" },
  deleteTxt:        { fontSize:16 },
  toggleCard:       { flexDirection:"row", alignItems:"center", backgroundColor:"#1E293B", borderRadius:14, padding:14, gap:12, borderWidth:1, borderColor:"#334155" },
  toggleCardActive: { borderColor:"#3B82F6", backgroundColor:"#3B82F610" },
  toggleCardIcon:   { width:40, height:40, borderRadius:12, alignItems:"center", justifyContent:"center" },
  toggleCardTitle:  { color:"#F1F5F9", fontSize:14, fontWeight:"700" as const },
  toggleCardSub:    { color:"#64748B", fontSize:12, marginTop:2 },
  switchTrack:      { width:42, height:24, borderRadius:12, backgroundColor:"#334155", padding:2, justifyContent:"center" as const },
  switchThumb:      { width:20, height:20, borderRadius:10, backgroundColor:"#fff" },
  radioCard:        { flexDirection:"row" as const, alignItems:"center" as const, backgroundColor:"#1E293B", borderRadius:14, padding:14, gap:12, borderWidth:1, borderColor:"#334155" },
  radioCardActive:  { borderColor:"#3B82F6", backgroundColor:"#3B82F610" },
  radioCircle:      { width:22, height:22, borderRadius:11, borderWidth:2, borderColor:"#334155", alignItems:"center" as const, justifyContent:"center" as const },
  radioCircleActive:{ borderColor:"#3B82F6" },
  radioDot:         { width:10, height:10, borderRadius:5, backgroundColor:"#3B82F6" },
  radioTitle:       { color:"#F1F5F9", fontSize:14, fontWeight:"700" as const },
  radioSub:         { color:"#64748B", fontSize:12, marginTop:2 },
  body:             { paddingHorizontal:16, paddingBottom:40, gap:20 },
  amountBlock:      { borderRadius:18, borderWidth:1.5, flexDirection:"row", alignItems:"center", paddingHorizontal:20, paddingVertical:16, gap:6 },
  currencySign:     { color:"#94A3B8", fontSize:22, fontWeight:"700" },
  amountInput:      { flex:1, fontSize:36, fontWeight:"800" },
  toggleRow:        { flexDirection:"row", gap:10 },
  toggleBtn:        { flex:1, borderRadius:12, borderWidth:1.5, borderColor:"#334155", paddingVertical:12, alignItems:"center" },
  toggleTxt:        { fontSize:13, fontWeight:"700", color:"#64748B" },
  field:            { gap:6 },
  label:            { color:"#94A3B8", fontSize:12, fontWeight:"700", textTransform:"uppercase", letterSpacing:0.5 },
  input:            { backgroundColor:"#1E293B", borderRadius:12, paddingHorizontal:16, paddingVertical:14, color:"#F1F5F9", fontSize:15, borderWidth:1, borderColor:"#334155" },
  selectBtn:        { backgroundColor:"#1E293B", borderRadius:12, paddingHorizontal:16, paddingVertical:14, flexDirection:"row", alignItems:"center", borderWidth:1, borderColor:"#334155" },
  selectInner:      { flex:1, flexDirection:"row", alignItems:"center", gap:10 },
  selectVal:        { color:"#F1F5F9", fontSize:15, flex:1 },
  selectPlaceholder:{ color:"#475569", fontSize:15, flex:1 },
  chevronTxt:       { color:"#475569", fontSize:20 },
  catDot:           { width:36, height:36, borderRadius:10, alignItems:"center", justifyContent:"center" },
  chipRow:          { flexDirection:"row", gap:8, flexWrap:"wrap" },
  chip:             { borderRadius:20, paddingHorizontal:14, paddingVertical:8, borderWidth:1.5, borderColor:"#334155", backgroundColor:"#1E293B" },
  chipTxt:          { color:"#64748B", fontSize:13, fontWeight:"600" },
});

export const m = StyleSheet.create({
  overlay: { flex:1, backgroundColor:"rgba(0,0,0,.6)", justifyContent:"flex-end" },
  sheet:   { backgroundColor:"#0F172A", borderTopLeftRadius:24, borderTopRightRadius:24, maxHeight:"75%", paddingBottom:24 },
  handle:  { width:40, height:4, borderRadius:2, backgroundColor:"#334155", alignSelf:"center", marginTop:12 },
  mHeader: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", paddingHorizontal:20, paddingVertical:16 },
  mTitle:  { fontSize:17, fontWeight:"800", color:"#F1F5F9" },
  mClose:  { color:"#64748B", fontSize:18, padding:4 },
  row:     { flexDirection:"row", alignItems:"center", padding:14, borderRadius:12, borderWidth:1, borderColor:"transparent", marginBottom:8, backgroundColor:"#1E293B", gap:12 },
  rowName: { flex:1, color:"#F1F5F9", fontSize:15, fontWeight:"600" },
  check:   { fontSize:16, fontWeight:"800" },
  empty:   { color:"#64748B", textAlign:"center", marginTop:24 },
});
