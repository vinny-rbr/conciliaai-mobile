import { StyleSheet } from "react-native";

export const PHOTO_KEY = (uid: string) => `conciliaai.profile.photo.${uid}`;

export type Sub = {
  isLifetime: boolean;
  status: string;
  startDateUtc: string | null;
  endDateUtc: string | null;
};

export function getInitials(nameOrEmail: string): string {
  const str = nameOrEmail.trim();
  if (!str) return "US";
  const part = str.includes("@") ? str.split("@")[0] : str;
  const words = part.split(/[\s._-]+/).filter(Boolean);
  if (!words.length) return "US";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function decodeUserId(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const p = JSON.parse(atob(b64)) as Record<string, unknown>;
    return typeof p.sub === "string" ? p.sub :
           typeof p.id  === "string" ? p.id  :
           typeof p.userId === "string" ? p.userId : null;
  } catch { return null; }
}

export function chipInfo(sub: Sub | null): { color: string; label: string } {
  const isActive = sub && (sub.status === "active" || sub.isLifetime);
  const color = isActive ? "#4ADE80" : "#F87171";
  const label = sub?.isLifetime ? "Vitalício" :
                sub?.status === "active" ? "Ativo" :
                sub?.status === "trial"  ? "Teste" : "Inativo";
  return { color, label };
}

export const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#070d1a" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Aurora blob (absolute, behind everything)
  auroraBlob: { position: "absolute", borderRadius: 999 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 22, paddingTop: 6, paddingBottom: 10,
  },
  backBtn:      { flexDirection: "row", alignItems: "center", gap: 2 },
  backTxt:      { color: "#cdddf7", fontSize: 14, fontWeight: "600" },
  headerTitle:  { color: "#F1F5F9", fontSize: 15, fontWeight: "700" },
  headerSpacer: { width: 54 },
  scroll:       { paddingHorizontal: 18, paddingTop: 4 },

  // Avatar
  avatarSection:   { alignItems: "center", paddingVertical: 24, paddingTop: 8 },
  avatarRingOuter: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 3, borderColor: "#8B5CF6",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#60A5FA", shadowRadius: 20, shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
  },
  avatarInner:    { width: 98, height: 98, borderRadius: 49, backgroundColor: "#0b1426", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg:      { width: 98, height: 98, borderRadius: 49 },
  avatarInitials: { color: "#fff", fontSize: 35, fontWeight: "900", letterSpacing: 1 },
  cameraBadge:    {
    position: "absolute", bottom: 2, right: 2,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  avatarName:  { color: "#F8FAFC", fontSize: 23, fontWeight: "800", marginTop: 15, marginBottom: 3, letterSpacing: -0.3 },
  avatarEmail: { color: "#93a7c6", fontSize: 14, fontWeight: "500", marginBottom: 13 },
  badge:       { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, backgroundColor: "rgba(255,255,255,0.06)" },
  badgeDot:    { width: 7, height: 7, borderRadius: 4 },
  badgeTxt:    { fontSize: 12, fontWeight: "700" },

  sectionLabel: { color: "#7e93b3", fontSize: 11, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10, marginLeft: 4 },
  sectionWrap:  { marginTop: 20 },

  // Glass card
  card:    {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowRadius: 30,
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 10 },
  },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginHorizontal: 15 },

  row:      { flexDirection: "row", alignItems: "center", padding: 15, gap: 13 },
  rowIcon:  { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  rowBody:  { flex: 1 },
  rowLabel: { color: "#8096b6", fontSize: 10, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 2 },
  rowValue: { color: "#F1F5F9", fontSize: 15, fontWeight: "600" },
  rowInput: { color: "#F1F5F9", fontSize: 15, fontWeight: "600", padding: 0 },

  // Subscription — active state
  subCard:      { backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.13)", overflow: "hidden", shadowColor: "#000", shadowRadius: 30, shadowOpacity: 0.6, shadowOffset: { width: 0, height: 12 } },
  subRow:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 18, paddingBottom: 0 },
  subTitle:     { color: "#F1F5F9", fontSize: 15, fontWeight: "700" },
  subDates:     { flexDirection: "row", justifyContent: "space-between", padding: 18, paddingTop: 16 },
  subDateItem:  { flex: 1 },
  subDateLabel: { color: "#8096b6", fontSize: 10, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 4 },
  subDateValue: { color: "#F1F5F9", fontSize: 17, fontWeight: "800" },

  // Subscription — inactive CTA
  subCtaIconWrap:   { width: 38, height: 38, borderRadius: 11, backgroundColor: "rgba(253,224,107,0.18)", alignItems: "center", justifyContent: "center" },
  subCtaHeader:     { flexDirection: "row", alignItems: "center", gap: 11 },
  subCtaTitle:      { color: "#fff", fontSize: 16, fontWeight: "800" },
  subCtaSub:        { color: "#aebfd9", fontSize: 12, fontWeight: "500", marginTop: 1 },
  subCtaFeatures:   { gap: 8, marginTop: 15, marginBottom: 16 },
  subCtaFeature:    { flexDirection: "row", alignItems: "center", gap: 9 },
  subCtaFeatureTxt: { color: "#dbe7fb", fontSize: 13, fontWeight: "600" },
  subCtaBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 14, backgroundColor: "#4F6EF7", shadowColor: "#4F6EF7", shadowRadius: 24, shadowOpacity: 0.6, shadowOffset: { width: 0, height: 8 } },
  subCtaBtnTxt:     { color: "#fff", fontSize: 14, fontWeight: "800" },

  menuRow:   { flexDirection: "row", alignItems: "center", padding: 15, gap: 13 },
  menuLabel: { flex: 1, color: "#F1F5F9", fontSize: 14, fontWeight: "600" },

  // Sugestões
  suggestionDesc:   { color: "#aebfd9", fontSize: 13, lineHeight: 20, padding: 16, paddingBottom: 8, fontWeight: "500" },
  suggestionInput:  { backgroundColor: "rgba(0,0,0,0.25)", borderRadius: 12, margin: 16, marginTop: 4, padding: 13, color: "#F1F5F9", fontSize: 14, minHeight: 88, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  suggestionBtn:    { margin: 16, marginTop: 0, padding: 13, borderRadius: 13, backgroundColor: "#4F6EF7", alignItems: "center", shadowColor: "#4F6EF7", shadowRadius: 20, shadowOpacity: 0.55, shadowOffset: { width: 0, height: 8 } },
  suggestionBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "800" },
  suggestionSent:   { color: "#4ADE80", fontSize: 13, fontWeight: "700", textAlign: "center", padding: 14 },

  footer: { textAlign: "center", color: "#41526e", fontSize: 12, fontWeight: "500", paddingTop: 22, paddingBottom: 30 },
});
