import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator, ScrollView, StyleSheet, Text,
  TouchableOpacity, View, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import { fetchFinanceItems, fmt } from "../../lib/financeService";
import type { FinanceItem } from "../../types/finance";

// ── helpers ───────────────────────────────────────────────────────────────────

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function curMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getLast12Months(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

function monthShort(key: string) {
  const [y, m] = key.split("-");
  return `${MESES[Number(m) - 1]}/${y.slice(2)}`;
}

function monthFull(key: string) {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

interface MonthData {
  key: string;
  rec:  number;
  des:  number;
  sal:  number;
  cats: Record<string, { rec: number; des: number }>;
}

function buildMonthData(items: FinanceItem[], months: string[]): MonthData[] {
  return months.map(key => {
    const mo = items.filter(it => it.dateISO.startsWith(key));
    const rec = mo.filter(it => it.type === "RECEITA").reduce((s, it) => s + it.amountCents, 0);
    const des = mo.filter(it => it.type === "DESPESA").reduce((s, it) => s + it.amountCents, 0);
    const cats: Record<string, { rec: number; des: number }> = {};
    for (const it of mo) {
      const cat = it.category || "Sem categoria";
      if (!cats[cat]) cats[cat] = { rec: 0, des: 0 };
      if (it.type === "RECEITA") cats[cat].rec += it.amountCents;
      else cats[cat].des += it.amountCents;
    }
    return { key, rec, des, sal: rec - des, cats };
  });
}

// ── BarChart ──────────────────────────────────────────────────────────────────

const BAR_H   = 100;
const BAR_W   = 28;
const COL_W   = 52;

function BarChart({
  data, selected, onSelect,
}: { data: MonthData[]; selected: string; onSelect: (k: string) => void }) {
  const max = Math.max(...data.map(m => Math.max(m.rec, m.des)), 1);
  return (
    <View style={s.chartCard}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chartInner}>
        {data.map(m => {
          const recH  = Math.max(Math.round((m.rec / max) * BAR_H), 3);
          const desH  = Math.max(Math.round((m.des / max) * BAR_H), 3);
          const isSel = m.key === selected;
          return (
            <TouchableOpacity key={m.key} onPress={() => onSelect(m.key)} activeOpacity={0.75}
              style={[s.col, isSel && s.colSelected]}>
              <View style={[s.barsWrap, { height: BAR_H }]}>
                <View style={[s.bar, { height: recH, backgroundColor: isSel ? "#34D399" : "rgba(52,211,153,.45)" }]} />
                <View style={[s.bar, { height: desH, backgroundColor: isSel ? "#F87171" : "rgba(248,113,113,.38)" }]} />
              </View>
              <Text style={[s.colLabel, isSel && s.colLabelSel]}>{monthShort(m.key)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {/* legenda */}
      <View style={s.legend}>
        <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: "#34D399" }]} /><Text style={s.legendTxt}>Receitas</Text></View>
        <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: "#F87171" }]} /><Text style={s.legendTxt}>Despesas</Text></View>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function FluxoCaixaScreen() {
  const navigation = useNavigation();
  const months12   = useMemo(() => getLast12Months(), []);

  const [items,      setItems]      = useState<FinanceItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selMonth,   setSelMonth]   = useState(curMonthKey);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setItems(await fetchFinanceItems());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const monthData = useMemo(() => buildMonthData(items, months12), [items, months12]);
  const sel       = useMemo(() => monthData.find(m => m.key === selMonth) ?? null, [monthData, selMonth]);

  const catRows = useMemo(() => {
    if (!sel) return [];
    return Object.entries(sel.cats)
      .map(([cat, v]) => ({ cat, ...v, total: v.rec + v.des }))
      .sort((a, b) => b.total - a.total);
  }, [sel]);

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Fluxo de Caixa</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#3B82F6" size="large" /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }} tintColor="#3B82F6" />}
        >
          {/* Gráfico */}
          <BarChart data={monthData} selected={selMonth} onSelect={setSelMonth} />

          {sel && (
            <>
              <Text style={s.monthTitle}>{monthFull(sel.key)}</Text>

              {/* Cards resumo */}
              <View style={s.summaryRow}>
                {[
                  { label: "Receitas", val: sel.rec,  color: "#34D399" },
                  { label: "Despesas", val: sel.des,  color: "#F87171" },
                  { label: "Saldo",    val: sel.sal,  color: sel.sal >= 0 ? "#34D399" : "#F87171" },
                ].map(c => (
                  <View key={c.label} style={s.summaryCard}>
                    <Text style={s.summaryLabel}>{c.label}</Text>
                    <Text style={[s.summaryVal, { color: c.color }]}>{fmt(c.val)}</Text>
                  </View>
                ))}
              </View>

              {/* Por categoria */}
              {catRows.length > 0 ? (
                <View style={s.catCard}>
                  <Text style={s.catTitle}>Por categoria</Text>
                  {catRows.map(({ cat, rec, des }, i) => (
                    <View key={cat}>
                      {i > 0 && <View style={s.divider} />}
                      <View style={s.catRow}>
                        <Text style={s.catName} numberOfLines={1}>{cat}</Text>
                        <View style={s.catAmts}>
                          {rec > 0 && <Text style={s.catRec}>+{fmt(rec)}</Text>}
                          {des > 0 && <Text style={s.catDes}>-{fmt(des)}</Text>}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={s.empty}>
                  <Text style={s.emptyTxt}>Nenhuma transação neste mês.</Text>
                </View>
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#0F172A" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  backBtn:{ width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backTxt:{ color: "#60A5FA", fontSize: 32, fontWeight: "300", lineHeight: 40 },
  title:  { flex: 1, color: "#F1F5F9", fontSize: 20, fontWeight: "800", textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },

  // chart
  chartCard:  { backgroundColor: "#1E293B", borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#334155" },
  chartInner: { alignItems: "flex-end", paddingBottom: 4, gap: 0 },
  col:        { width: COL_W, alignItems: "center", borderRadius: 10, paddingVertical: 6 },
  colSelected:{ backgroundColor: "rgba(59,130,246,0.12)" },
  barsWrap:   { flexDirection: "row", alignItems: "flex-end", gap: 3, marginBottom: 6 },
  bar:        { width: BAR_W, borderRadius: 4 },
  colLabel:   { fontSize: 10, color: "#475569", fontWeight: "600" },
  colLabelSel:{ color: "#F1F5F9", fontWeight: "800" },
  legend:     { flexDirection: "row", gap: 16, marginTop: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot:  { width: 8, height: 8, borderRadius: 2 },
  legendTxt:  { color: "#64748B", fontSize: 12 },

  // month detail
  monthTitle: { color: "#F1F5F9", fontSize: 17, fontWeight: "800", marginBottom: 12 },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  summaryCard:{ flex: 1, backgroundColor: "#1E293B", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#334155" },
  summaryLabel:{ color: "#64748B", fontSize: 11, fontWeight: "700", marginBottom: 6 },
  summaryVal: { fontSize: 13, fontWeight: "800" },

  // categories
  catCard:  { backgroundColor: "#1E293B", borderRadius: 20, borderWidth: 1, borderColor: "#334155", overflow: "hidden", marginBottom: 8 },
  catTitle: { color: "#94A3B8", fontSize: 12, fontWeight: "700", padding: 16, paddingBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  divider:  { height: 1, backgroundColor: "#334155", marginHorizontal: 16 },
  catRow:   { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  catName:  { flex: 1, color: "#F1F5F9", fontSize: 14 },
  catAmts:  { flexDirection: "row", gap: 10 },
  catRec:   { color: "#34D399", fontSize: 13, fontWeight: "700" },
  catDes:   { color: "#F87171", fontSize: 13, fontWeight: "700" },

  empty:    { paddingVertical: 40, alignItems: "center" },
  emptyTxt: { color: "#475569", fontSize: 14 },
});
