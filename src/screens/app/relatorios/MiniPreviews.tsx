import { Text, View } from "react-native";
import { fmt } from "../../../lib/financeService";
import type { FinanceItem } from "../../../types/finance";

export function MiniSaldo({ items }: { items: FinanceItem[] }) {
  const now = new Date();
  const ym  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = items.filter(i => i.dateISO.startsWith(ym));
  const rec  = month.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
  const desp = month.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);
  const sal  = rec - desp;
  return (
    <Text style={{ color: sal >= 0 ? "#22C55E" : "#EF4444", fontSize: 12, fontWeight: "700" }} numberOfLines={1}>
      {sal >= 0 ? "+" : ""}{fmt(sal)}
    </Text>
  );
}

export function MiniDonut({ items }: { items: FinanceItem[] }) {
  const total = items.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);
  const catMap: Record<string, number> = {};
  items.filter(i => i.type === "DESPESA").forEach(i => { catMap[i.category] = (catMap[i.category] ?? 0) + i.amountCents; });
  const top = Object.values(catMap).sort((a, b) => b - a)[0] ?? 0;
  const pct = total > 0 ? top / total : 0;
  const COLORS = { fill: "#8B5CF6", bg: "#1E293B" };
  const q1 = pct > 0, q2 = pct > 0.25, q3 = pct > 0.5, q4 = pct > 0.75;
  return (
    <View style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
      <View style={{
        width: 30, height: 30, borderRadius: 15, borderWidth: 5,
        borderTopColor:    q1 ? COLORS.fill : COLORS.bg,
        borderRightColor:  q2 ? COLORS.fill : COLORS.bg,
        borderBottomColor: q3 ? COLORS.fill : COLORS.bg,
        borderLeftColor:   q4 ? COLORS.fill : COLORS.bg,
        transform: [{ rotate: "-45deg" }],
      }} />
    </View>
  );
}

export function MiniTopCat({ items }: { items: FinanceItem[] }) {
  const catMap: Record<string, number> = {};
  items.filter(i => i.type === "DESPESA").forEach(i => { catMap[i.category] = (catMap[i.category] ?? 0) + i.amountCents; });
  const top = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
  if (!top) return null;
  return (
    <Text style={{ color: "#94A3B8", fontSize: 11, fontWeight: "600" }} numberOfLines={1}>{top[0]}</Text>
  );
}

export function MiniSparkline({ items }: { items: FinanceItem[] }) {
  const months: string[] = [];
  const d = new Date();
  for (let i = 3; i >= 0; i--) {
    const t = new Date(d.getFullYear(), d.getMonth() - i, 1);
    months.push(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`);
  }
  const vals = months.map(ym => {
    const mi = items.filter(i => i.dateISO.startsWith(ym));
    const r = mi.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
    const e = mi.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);
    return r - e;
  });
  const maxAbs = Math.max(...vals.map(Math.abs), 1);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height: 20 }}>
      {vals.map((v, i) => (
        <View key={i} style={{
          width: 6, height: Math.max(3, Math.abs(v) / maxAbs * 18),
          backgroundColor: v >= 0 ? "#22C55E" : "#EF4444",
          borderRadius: 2,
        }} />
      ))}
    </View>
  );
}
