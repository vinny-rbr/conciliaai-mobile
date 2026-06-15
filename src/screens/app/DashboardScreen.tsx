import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DonutCounter from "../../components/DonutCounter";
import { fetchFinanceItems, fmt } from "../../lib/financeService";
import { listBankAccounts } from "../../lib/bankAccountsService";
import { getPlanName } from "../../lib/auth";
import { useAuth } from "../../context/AuthContext";
import { onTabBarScroll } from "../../navigation/tabBarScroll";
import type { FinanceItem, BankAccount } from "../../types/finance";
import { addMonthsYM, ymToLabel, todayISO, addDaysISO, dateLabel } from "../../lib/dateUtils";
import { catIcon } from "../../lib/catUtils";
import { Sparkline } from "../../components/dashboard/Sparkline";
import { AnimatedCard, DropdownPanel } from "../../components/dashboard/CollapsePanel";
import { ExpandableLegend, CHART_COLORS } from "../../components/dashboard/ExpandableLegend";
import type { SliceWithItems } from "../../components/dashboard/ExpandableLegend";
import { BankCarousel } from "../../components/dashboard/BankCarousel";
import { MiniCalendar } from "../../components/dashboard/MiniCalendar";

const PLAN_COLOR: Record<string, string> = {
  Pro: "#3B82F6", Premium: "#D97706", Basico: "#64748B",
};
const PLAN_LABEL: Record<string, string> = {
  Pro: "● PRO", Premium: "● PREMIUM", Basico: "● BÁSICO",
};

type PeriodKey = "MONTH" | "LAST_3" | "YEAR" | "ALL";
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "MONTH", label: "Mês atual" },
  { key: "LAST_3", label: "Últimos 3 meses" },
  { key: "YEAR", label: "Ano" },
  { key: "ALL", label: "Tudo" },
];

function getPeriodRange(period: PeriodKey): { from: string; to: string } {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(y, m + 1, 0);
  const to = `${y}-${pad(m+1)}-${pad(lastDay.getDate())}`;
  if (period === "MONTH") return { from: `${y}-${pad(m+1)}-01`, to };
  if (period === "LAST_3") return { from: `${y}-${pad(m-1 < 0 ? 12 : m-1)}-01`.replace(/\d{4}/, String(m-1 < 0 ? y-1 : y)), to };
  if (period === "YEAR") return { from: `${y}-01-01`, to };
  return { from: "2000-01-01", to };
}

type AnalyticsTab = "confronto" | "gastos" | "receitas" | "pagamento";

// ── Available Charts ─────────────────────────────────────────────────────────
const AVAILABLE_CHARTS = [
  { id: "compare", icon: "⚖️", title: "Compare duas categorias", sub: "Dados de duas categorias lado a lado" },
];

// ── Component ──────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { signOut } = useAuth();
  const [items, setItems] = useState<FinanceItem[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [heroMonth, setHeroMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  });
  const [period, setPeriod] = useState<PeriodKey>("LAST_3");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState<AnalyticsTab>("confronto");
  const [planName, setPlanName] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDay, setSelectedDay]   = useState<string | undefined>(undefined);
  const [chartPickerOpen, setChartPickerOpen] = useState(false);
  const [addedCharts, setAddedCharts]         = useState<string[]>([]);
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const [compareCatOpen, setCompareCatOpen] = useState<"A" | "B" | null>(null);

  const currentMonthYM = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }, []);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    const [data, accs, plan] = await Promise.all([
      fetchFinanceItems(),
      listBankAccounts(),
      getPlanName(),
    ]);
    setItems(data);
    setAccounts(accs);
    setPlanName(plan);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { void load(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); void load(true); }, []);

  // Hero card data
  const heroData = useMemo(() => {
    let rec = 0, des = 0, cumRec = 0, cumDes = 0;
    const endExclusive = addMonthsYM(heroMonth, 1);
    for (const item of items) {
      if (item.dateISO.startsWith(heroMonth)) {
        if (item.type === "RECEITA") rec += item.amountCents;
        if (item.type === "DESPESA") des += item.amountCents;
      }
      if (item.dateISO < endExclusive) {
        if (item.type === "RECEITA") cumRec += item.amountCents;
        if (item.type === "DESPESA") cumDes += item.amountCents;
      }
    }
    const storedSum = accounts.reduce((s, a) => s + a.balanceCents, 0);
    const displayBalance = accounts.length > 0 && storedSum !== 0 ? storedSum : cumRec - cumDes;
    return { rec, des, saldo: displayBalance };
  }, [items, heroMonth, accounts]);

  // Filtered items by period
  const filteredItems = useMemo(() => {
    const { from, to } = getPeriodRange(period);
    return items.filter(it => it.dateISO >= from && it.dateISO <= to);
  }, [items, period]);

  // Sparklines — last 6 months
  const sparklines = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    });
    const rec: number[] = [], des: number[] = [], cred: number[] = [], sal: number[] = [];
    for (const ym of months) {
      let r = 0, d = 0, cr = 0;
      for (const item of items) {
        if (!item.dateISO.startsWith(ym)) continue;
        if (item.type === "RECEITA") r += item.amountCents;
        if (item.type === "DESPESA") { d += item.amountCents; if (item.paymentType === "credit") cr += item.amountCents; }
      }
      rec.push(r); des.push(d); cred.push(cr); sal.push(r - d);
    }
    return { rec, des, cred, sal };
  }, [items]);

  // Summary for filtered period
  const totRec = useMemo(() => filteredItems.filter(it => it.type==="RECEITA").reduce((s,it) => s+it.amountCents, 0), [filteredItems]);
  const totDes = useMemo(() => filteredItems.filter(it => it.type==="DESPESA").reduce((s,it) => s+it.amountCents, 0), [filteredItems]);
  const totCred = useMemo(() => filteredItems.filter(it => it.type==="DESPESA" && it.paymentType==="credit").reduce((s,it) => s+it.amountCents, 0), [filteredItems]);
  const saldo = totRec - totDes;

  // Month comparison (vs last month)
  const monthCmp = useMemo(() => {
    const now = new Date();
    const curYM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    const prevYM = addMonthsYM(curYM, -1);
    let curRec = 0, curDes = 0, prevRec = 0, prevDes = 0;
    for (const it of items) {
      if (it.dateISO.startsWith(curYM)) {
        if (it.type==="RECEITA") curRec += it.amountCents;
        if (it.type==="DESPESA") curDes += it.amountCents;
      }
      if (it.dateISO.startsWith(prevYM)) {
        if (it.type==="RECEITA") prevRec += it.amountCents;
        if (it.type==="DESPESA") prevDes += it.amountCents;
      }
    }
    const pct = (cur: number, prev: number) => prev > 0 ? ((cur - prev) / prev * 100).toFixed(1) : null;
    return {
      rec: pct(curRec, prevRec),
      des: pct(curDes, prevDes),
      sal: pct(curRec - curDes, prevRec - prevDes),
    };
  }, [items]);

  const cmpLine = (pct: string | null, invert = false) => {
    if (!pct) return "vs mês anterior: —";
    const n = parseFloat(pct);
    const up = invert ? n < 0 : n >= 0;
    return `vs mês anterior: ${up ? "↑" : "↓"} ${Math.abs(n).toFixed(1)}%`;
  };

  // Due soon
  const dueSoon = useMemo(() => {
    const today = todayISO();
    const limit = addDaysISO(today, 3);
    return items
      .filter(it => it.type==="DESPESA" && it.status!=="paid" && it.dateISO >= today && it.dateISO <= limit)
      .sort((a,b) => a.dateISO.localeCompare(b.dateISO)).slice(0, 4);
  }, [items]);

  const latest = useMemo(() => filteredItems.slice(0, 8), [filteredItems]);

  // Analytics content
  const analyticsContent = useMemo(() => {
    if (analyticsTab === "confronto") {
      const ratio = totRec > 0 ? Math.min(1, totDes / totRec) : 0;
      return { ratio, label: `${(ratio * 100).toFixed(0)}% comprometido` };
    }
    if (analyticsTab === "gastos") {
      const bycat: Record<string, number> = {};
      filteredItems.filter(it => it.type==="DESPESA").forEach(it => { bycat[it.category] = (bycat[it.category] ?? 0) + it.amountCents; });
      return Object.entries(bycat).sort(([,a],[,b]) => b - a).slice(0, 4).map(([k,v]) => ({ k, v }));
    }
    if (analyticsTab === "receitas") {
      const bycat: Record<string, number> = {};
      filteredItems.filter(it => it.type==="RECEITA").forEach(it => { bycat[it.category] = (bycat[it.category] ?? 0) + it.amountCents; });
      return Object.entries(bycat).sort(([,a],[,b]) => b - a).slice(0, 4).map(([k,v]) => ({ k, v }));
    }
    // pagamento
    const byPay: Record<string, number> = { Pix: 0, Crédito: 0, Débito: 0, Dinheiro: 0 };
    filteredItems.filter(it => it.type==="DESPESA").forEach(it => {
      const lbl = it.paymentType === "pix" ? "Pix" : it.paymentType === "credit" ? "Crédito" : it.paymentType === "debit" ? "Débito" : "Dinheiro";
      byPay[lbl] = (byPay[lbl] ?? 0) + it.amountCents;
    });
    return Object.entries(byPay).filter(([,v]) => v > 0).sort(([,a],[,b]) => b - a).map(([k,v]) => ({ k, v }));
  }, [analyticsTab, filteredItems, totRec, totDes]);

  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}><ActivityIndicator size="large" color="#60A5FA" /></View>
      </SafeAreaView>
    );
  }

  const planKey = planName ?? "Basico";
  const planColor = PLAN_COLOR[planKey] ?? "#64748B";
  const planLabel = PLAN_LABEL[planKey] ?? planKey;
  const periodLabel = PERIODS.find(p => p.key === period)?.label ?? "Período";

  return (
    <SafeAreaView style={s.root}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60A5FA" />}
        onScroll={e => onTabBarScroll(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        {/* Brand bar */}
        <View style={s.brandBar}>
          <View style={s.brandLeft}>
            <View style={s.brandMark}>
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800" }}>C</Text>
            </View>
            <View>
              <Text style={s.brandName}>Conciliaaí</Text>
              <Text style={s.brandSub}>FINANÇAS</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {planName && (
              <View style={[s.planBadge, { backgroundColor: planColor + "22", borderColor: planColor + "55" }]}>
                <Text style={[s.planBadgeTxt, { color: planColor }]}>{planLabel}</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => signOut()} style={s.logoutBtn}>
              <Text style={s.logoutTxt}>↩</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero card */}
        <View style={s.heroCard}>
          <View style={s.heroTop}>
            <Text style={s.heroBalLabel}>Saldo em contas</Text>
            <View style={s.monthNav}>
              <TouchableOpacity
                onPress={() => setHeroMonth(m => addMonthsYM(m, -1))}
                disabled={heroMonth <= addMonthsYM(currentMonthYM, -23)}
                style={s.monthBtn}
              >
                <Text style={s.monthBtnTxt}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCalendarOpen(true)} activeOpacity={0.7}>
                <Text style={s.monthLabel}>{ymToLabel(heroMonth)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setHeroMonth(m => addMonthsYM(m, 1))}
                disabled={heroMonth >= currentMonthYM}
                style={s.monthBtn}
              >
                <Text style={s.monthBtnTxt}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.heroBalRow}>
            <View>
              <Text style={[s.heroBal, { color: heroData.saldo < 0 ? "#FFCBC6" : "#fff" }]}>
                {balanceHidden ? "R$ •••••" : fmt(Math.abs(heroData.saldo))}
              </Text>
              {accounts.length > 0 && (
                <Text style={s.heroAccountsHint}>
                  somando {accounts.length} {accounts.length === 1 ? "conta" : "contas"}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => setBalanceHidden(h => !h)} style={s.eyeBtn}>
              <Text style={{ fontSize: 18 }}>{balanceHidden ? "🙈" : "👁"}</Text>
            </TouchableOpacity>
          </View>

          <View style={s.heroStats}>
            <View style={s.heroStat}>
              <View style={[s.heroStatIc, { backgroundColor: "rgba(74,222,128,.25)" }]}>
                <Text style={{ color: "#4ADE80", fontSize: 11, fontWeight: "800" }}>↑</Text>
              </View>
              <View>
                <Text style={s.heroStatLbl}>Receitas</Text>
                <Text style={[s.heroStatVal, { color: "#4ADE80" }]}>
                  {balanceHidden ? "•••" : fmt(heroData.rec)}
                </Text>
              </View>
            </View>
            <View style={s.heroDivider} />
            <View style={s.heroStat}>
              <View style={[s.heroStatIc, { backgroundColor: "rgba(248,113,113,.25)" }]}>
                <Text style={{ color: "#F87171", fontSize: 11, fontWeight: "800" }}>↓</Text>
              </View>
              <View>
                <Text style={s.heroStatLbl}>Despesas</Text>
                <Text style={[s.heroStatVal, { color: "#F87171" }]}>
                  {balanceHidden ? "•••" : fmt(heroData.des)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Period selector */}
        <View style={s.periodRow}>
          <Text style={s.periodRowLabel}>Período da análise</Text>
          <TouchableOpacity style={s.periodBtn} onPress={() => setPeriodOpen(o => !o)}>
            <Text style={s.periodBtnTxt}>{periodLabel}</Text>
            <Text style={{ color: "#94A3B8", fontSize: 12 }}>{periodOpen ? "▲" : "▼"}</Text>
          </TouchableOpacity>
        </View>
        {periodOpen && (
          <View style={s.periodDropdown}>
            {PERIODS.map(p => (
              <TouchableOpacity key={p.key} style={[s.periodOption, period === p.key && s.periodOptionActive]}
                onPress={() => { setPeriod(p.key); setPeriodOpen(false); }}>
                <Text style={[s.periodOptionTxt, period === p.key && { color: "#60A5FA" }]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Meus cartões */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Meus cartões</Text>
          <Text style={s.sectionAction}>Gerenciar ›</Text>
        </View>
        {accounts.length === 0 ? (
          <TouchableOpacity style={s.bankCardAdd}>
            <Text style={s.bankCardAddIcon}>+</Text>
            <Text style={s.bankCardAddTxt}>Adicionar banco</Text>
          </TouchableOpacity>
        ) : (
          <BankCarousel accounts={accounts} hidden={balanceHidden} onSaved={() => void load(true)} items={items} />
        )}

        {/* 4 summary cards */}
        <View style={s.cardsGrid}>
          {([
            { lab: "Receitas",  val: totRec,  color: "#34D399", spark: sparklines.rec,  cmp: cmpLine(monthCmp.rec) },
            { lab: "Despesas",  val: totDes,  color: "#FB7185", spark: sparklines.des,  cmp: cmpLine(monthCmp.des, true) },
            { lab: "Crédito",   val: totCred, color: "#F97316", spark: sparklines.cred, cmp: "gastos no crédito" },
            { lab: "Saldo",     val: saldo,   color: "#60A5FA", spark: sparklines.sal,  cmp: cmpLine(monthCmp.sal) },
          ] as const).map(card => (
            <View key={card.lab} style={[s.statCard, { borderBottomColor: card.color, borderBottomWidth: 3 }]}>
              <Text style={s.statLab}>{card.lab}</Text>
              <Text style={[s.statVal, { color: card.color }]} numberOfLines={1}>
                {balanceHidden ? "•••" : fmt(Math.abs(card.val))}
              </Text>
              <Sparkline vals={card.spark} color={card.color} />
              <Text style={s.statSub}>{card.cmp}</Text>
            </View>
          ))}
        </View>

        {/* Analytics tabs */}
        <View style={s.analyticsCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.analyticsTabs}>
            {(["confronto", "gastos", "receitas", "pagamento"] as AnalyticsTab[]).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[s.analyticsTabBtn, analyticsTab === tab && s.analyticsTabActive]}
                onPress={() => setAnalyticsTab(tab)}
              >
                <Text style={[s.analyticsTabTxt, analyticsTab === tab && s.analyticsTabTxtActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {analyticsTab === "confronto" && (() => {
            const d = analyticsContent as { ratio: number; label: string };
            const pct = Math.round(d.ratio * 100);
            const slices: SliceWithItems[] = [
              { label: "Despesas",    value: totDes,                       color: d.ratio > 0.9 ? "#EF4444" : d.ratio > 0.7 ? "#F59E0B" : "#F97316", items: filteredItems.filter(it => it.type === "DESPESA") },
              { label: "Receitas",    value: totRec,                       color: "#10B981", items: filteredItems.filter(it => it.type === "RECEITA") },
            ];
            return (
              <View style={{ paddingTop: 16, alignItems: "center" }}>
                <DonutCounter key={analyticsTab} slices={slices} counterVal={pct} counterSuffix="%" centerSub="comprometido" />
                <ExpandableLegend slices={slices} />
              </View>
            );
          })()}

          {(analyticsTab === "gastos" || analyticsTab === "receitas" || analyticsTab === "pagamento") && (() => {
            const rows = analyticsContent as { k: string; v: number }[];
            if (rows.length === 0) return <Text style={s.emptyTxt}>Sem dados</Text>;
            const itemType = analyticsTab === "receitas" ? "RECEITA" : "DESPESA";
            const slices: SliceWithItems[] = rows.map((r, i) => ({
              label: `${catIcon(r.k)} ${r.k}`,
              value: r.v,
              color: CHART_COLORS[i % CHART_COLORS.length],
              items: analyticsTab === "pagamento"
                ? filteredItems.filter(it => {
                    const lbl = it.paymentType === "pix" ? "Pix" : it.paymentType === "credit" ? "Crédito" : it.paymentType === "debit" ? "Débito" : "Dinheiro";
                    return it.type === "DESPESA" && lbl === r.k;
                  })
                : filteredItems.filter(it => it.type === itemType && it.category === r.k),
            }));
            return (
              <View style={{ paddingTop: 16, alignItems: "center" }}>
                <DonutCounter key={analyticsTab} slices={slices}
                  counterVal={slices.reduce((s, sl) => s + sl.value, 0)}
                  isCurrency centerSub="total" />
                <ExpandableLegend slices={slices} />
              </View>
            );
          })()}
        </View>

        {/* Gráficos adicionados */}
        {addedCharts.includes("compare") && (() => {
          const cats = Array.from(new Set(filteredItems.map(it => it.category))).sort();
          const catA = compareA || cats[0] || "";
          const catB = compareB || cats[1] || cats[0] || "";
          const getStats = (cat: string) => {
            const its = filteredItems.filter(it => it.category === cat);
            const rec = its.filter(it => it.type === "RECEITA").reduce((s, it) => s + it.amountCents, 0);
            const des = its.filter(it => it.type === "DESPESA").reduce((s, it) => s + it.amountCents, 0);
            return { rec, des, saldo: rec - des };
          };
          const statsA = getStats(catA);
          const statsB = getStats(catB);
          const maxVal = Math.max(statsA.rec, statsA.des, statsB.rec, statsB.des, 1);
          const bar = (v: number, color: string) => (
            <View style={{ height: 6, borderRadius: 3, backgroundColor: "#1E293B", marginTop: 4, overflow: "hidden" }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: color, width: `${Math.round(Math.abs(v) / maxVal * 100)}%` }} />
            </View>
          );
          return (
            <AnimatedCard>
            <View style={s.extraCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <View>
                  <Text style={{ color: "#64748B", fontSize: 10, fontWeight: "700", letterSpacing: 1 }}>COMPARATIVO</Text>
                  <Text style={{ color: "#F1F5F9", fontSize: 15, fontWeight: "800" }}>Compare duas categorias</Text>
                </View>
                <TouchableOpacity onPress={() => setAddedCharts(c => c.filter(x => x !== "compare"))} style={{ padding: 4 }}>
                  <Text style={{ color: "#475569", fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Selectors */}
              {(["A", "B"] as const).map(side => {
                const val = side === "A" ? catA : catB;
                return (
                  <View key={side} style={{ marginBottom: 8 }}>
                    <Text style={{ color: "#64748B", fontSize: 11, fontWeight: "600", marginBottom: 4 }}>
                      {side === "A" ? "Categoria 1" : "Categoria 2"}
                    </Text>
                    <TouchableOpacity
                      style={{ backgroundColor: "#1E293B", borderRadius: 10, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                      onPress={() => setCompareCatOpen(compareCatOpen === side ? null : side)}
                    >
                      <Text style={{ color: "#F1F5F9", fontSize: 13, fontWeight: "600" }}>{val || "Selecionar"}</Text>
                      <Text style={{ color: "#475569" }}>{compareCatOpen === side ? "▲" : "▼"}</Text>
                    </TouchableOpacity>
                    <DropdownPanel isOpen={compareCatOpen === side}>
                      <ScrollView style={{ backgroundColor: "#0F172A", borderRadius: 10 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                        {cats.map(cat => (
                          <TouchableOpacity key={cat} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: "#1E293B" }}
                            onPress={() => { side === "A" ? setCompareA(cat) : setCompareB(cat); setCompareCatOpen(null); }}>
                            <Text style={{ color: cat === val ? "#60A5FA" : "#94A3B8", fontWeight: cat === val ? "700" : "400" }}>{cat}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </DropdownPanel>
                  </View>
                );
              })}

              {/* Side by side */}
              <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                {[{ label: catA, stats: statsA, color: "#3B82F6" }, { label: catB, stats: statsB, color: "#A78BFA" }].map((block, i) => (
                  <View key={i} style={{ flex: 1, backgroundColor: "#0F172A", borderRadius: 12, padding: 12 }}>
                    <Text style={{ color: block.color, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 }}>{i === 0 ? "CAT 1" : "CAT 2"}</Text>
                    <Text style={{ color: "#F1F5F9", fontSize: 13, fontWeight: "700", marginBottom: 10 }} numberOfLines={1}>{block.label}</Text>
                    {[
                      { label: "Receitas", val: block.stats.rec, color: "#22C55E" },
                      { label: "Despesas", val: block.stats.des, color: "#EF4444" },
                      { label: "Saldo",    val: block.stats.saldo, color: block.stats.saldo >= 0 ? "#60A5FA" : "#F87171" },
                    ].map(row => (
                      <View key={row.label} style={{ marginBottom: 8 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ color: "#64748B", fontSize: 10 }}>{row.label}</Text>
                          <Text style={{ color: row.color, fontSize: 10, fontWeight: "700" }}>{fmt(Math.abs(row.val))}</Text>
                        </View>
                        {bar(row.val, row.color)}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </View>
            </AnimatedCard>
          );
        })()}

        {/* Botão adicionar gráfico */}
        {AVAILABLE_CHARTS.some(c => !addedCharts.includes(c.id)) && (
          <TouchableOpacity style={s.addChartBtn} onPress={() => setChartPickerOpen(true)} activeOpacity={0.7}>
            <Text style={s.addChartPlus}>+</Text>
            <Text style={s.addChartTxt}>Adicionar gráfico</Text>
          </TouchableOpacity>
        )}

        {/* Due soon */}
        {dueSoon.length > 0 && (
          <View style={s.dueSoonCard}>
            <Text style={s.dueSoonTitle}>⚠️ Vence em breve</Text>
            {dueSoon.map(it => (
              <View key={it.id} style={s.dueSoonRow}>
                <Text style={s.dueSoonName} numberOfLines={1}>{it.title}</Text>
                <Text style={s.dueSoonDate}>{dateLabel(it.dateISO)}</Text>
                <Text style={s.dueSoonAmt}>{fmt(it.amountCents)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Latest transactions */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Últimas transações</Text>
        </View>
        {latest.length === 0
          ? <Text style={s.emptyTxt}>Nenhuma transação ainda.</Text>
          : latest.map(it => (
            <View key={it.id} style={s.txRow}>
              <View style={[s.txIcon, {
                backgroundColor: it.type==="RECEITA" ? "rgba(74,222,128,.14)" : "rgba(248,113,113,.14)",
              }]}>
                <Text style={s.txEmoji}>{catIcon(it.category)}</Text>
              </View>
              <View style={s.txInfo}>
                <Text style={s.txTitle} numberOfLines={1}>{it.title}</Text>
                <Text style={s.txCat}>{it.category} · {dateLabel(it.dateISO)}</Text>
              </View>
              <Text style={[s.txAmt, { color: it.type==="RECEITA" ? "#4ADE80" : "#F87171" }]}>
                {it.type==="RECEITA" ? "+" : "−"}{fmt(it.amountCents)}
              </Text>
            </View>
          ))}
      </ScrollView>

      {/* Chart picker modal */}
      <Modal transparent visible={chartPickerOpen} animationType="slide" onRequestClose={() => setChartPickerOpen(false)}>
        <TouchableOpacity style={calStyle.overlay} activeOpacity={1} onPress={() => setChartPickerOpen(false)}>
          <View style={[calStyle.card, { width: "100%", borderBottomLeftRadius: 0, borderBottomRightRadius: 0, position: "absolute", bottom: 0, paddingBottom: 32 }]}
            onStartShouldSetResponder={() => true}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#334155", alignSelf: "center", marginBottom: 16 }} />
            <Text style={{ color: "#F1F5F9", fontSize: 16, fontWeight: "800", marginBottom: 4 }}>Adicionar gráfico</Text>
            <Text style={{ color: "#64748B", fontSize: 12, marginBottom: 16 }}>Escolha um gráfico para adicionar ao dashboard</Text>
            {AVAILABLE_CHARTS.filter(c => !addedCharts.includes(c.id)).map(chart => (
              <TouchableOpacity key={chart.id}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#0F172A", borderRadius: 14, padding: 14, marginBottom: 8 }}
                onPress={() => { setAddedCharts(c => [...c, chart.id]); setChartPickerOpen(false); }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 28 }}>{chart.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#F1F5F9", fontSize: 14, fontWeight: "700" }}>{chart.title}</Text>
                  <Text style={{ color: "#64748B", fontSize: 12, marginTop: 2 }}>{chart.sub}</Text>
                </View>
                <Text style={{ color: "#3B82F6", fontSize: 20 }}>+</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {calendarOpen && (
        <MiniCalendar
          month={heroMonth}
          selectedDay={selectedDay}
          onSelectDay={date => {
            setSelectedDay(date);
            setHeroMonth(date.substring(0, 7));
            setCalendarOpen(false);
          }}
          onClose={() => setCalendarOpen(false)}
        />
      )}
    </SafeAreaView>
  );
}

const calStyle = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  card:    { backgroundColor: "#1E293B", borderRadius: 20, padding: 16, width: 300, borderWidth: 1, borderColor: "#334155" },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F172A" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 100 },

  // Brand bar
  brandBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  brandLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#2563EB", justifyContent: "center", alignItems: "center" },
  brandName: { fontSize: 16, fontWeight: "800", color: "#F1F5F9" },
  brandSub: { fontSize: 9, fontWeight: "700", color: "#64748B", letterSpacing: 1.5 },
  planBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  planBadgeTxt: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  logoutBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#1E293B", justifyContent: "center", alignItems: "center" },
  logoutTxt: { fontSize: 16, color: "#64748B" },

  // Hero card
  heroCard: { backgroundColor: "#1D4ED8", borderRadius: 22, padding: 20, marginBottom: 12 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  heroBalLabel: { fontSize: 12, color: "rgba(255,255,255,.6)", fontWeight: "600" },
  monthNav: { flexDirection: "row", alignItems: "center", gap: 8 },
  monthBtn: { width: 26, height: 26, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(255,255,255,.15)", borderRadius: 7 },
  monthBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "600", lineHeight: 20 },
  monthLabel: { fontSize: 13, fontWeight: "700", color: "#fff", minWidth: 110, textAlign: "center" },
  heroBalRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  heroBal: { fontSize: 30, fontWeight: "800", color: "#fff" },
  heroAccountsHint: { fontSize: 11, color: "rgba(255,255,255,.55)", marginTop: 3 },
  eyeBtn: { padding: 6, marginTop: 4 },
  heroStats: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,.18)", borderRadius: 14, padding: 14 },
  heroStat: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  heroStatIc: { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  heroStatLbl: { fontSize: 11, color: "rgba(255,255,255,.6)", fontWeight: "600" },
  heroStatVal: { fontSize: 14, fontWeight: "700", marginTop: 2 },
  heroDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,.2)", marginHorizontal: 12 },

  // Period selector
  periodRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  periodRowLabel: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  periodBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#1E293B", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#334155" },
  periodBtnTxt: { fontSize: 13, color: "#F1F5F9", fontWeight: "600" },
  periodDropdown: { backgroundColor: "#1E293B", borderRadius: 12, borderWidth: 1, borderColor: "#334155", marginBottom: 8, overflow: "hidden" },
  periodOption: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#334155" },
  periodOptionActive: { backgroundColor: "rgba(96,165,250,.1)" },
  periodOptionTxt: { fontSize: 14, color: "#CBD5E1", fontWeight: "600" },

  // Meus cartões
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#F1F5F9" },
  sectionAction: { fontSize: 13, color: "#60A5FA", fontWeight: "600" },
  cardsScroll: { marginLeft: -16, paddingLeft: 16, marginBottom: 4 },
  bankCard: { width: 160, height: 100, borderRadius: 16, padding: 14, justifyContent: "space-between" },
  bankCardBank: { fontSize: 11, color: "rgba(255,255,255,.7)", fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  bankCardNick: { fontSize: 13, fontWeight: "700", color: "#fff" },
  bankCardBal: { fontSize: 15, fontWeight: "800", color: "#fff" },
  bankCardLast: { fontSize: 10, color: "rgba(255,255,255,.5)" },
  bankCardAdd: { width: 160, height: 100, borderRadius: 16, borderWidth: 2, borderColor: "#334155", borderStyle: "dashed", justifyContent: "center", alignItems: "center", gap: 6 },
  bankCardAddIcon: { fontSize: 24, color: "#60A5FA", fontWeight: "300" },
  bankCardAddTxt: { fontSize: 12, color: "#64748B", fontWeight: "600" },

  // Summary cards
  cardsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statCard: { flex: 1, minWidth: "45%", backgroundColor: "#1E293B", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#334155" },
  statLab: { fontSize: 11, color: "#94A3B8", fontWeight: "700", marginBottom: 4 },
  statVal: { fontSize: 17, fontWeight: "800", marginBottom: 8 },
  statSub: { fontSize: 10, color: "#64748B", marginTop: 4, fontWeight: "600" },

  // Analytics
  analyticsCard: { backgroundColor: "#1E293B", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#334155", marginBottom: 16 },
  analyticsTabs: { flexDirection: "row", gap: 4 },
  analyticsTabBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, alignItems: "center", backgroundColor: "#0F172A" },
  analyticsTabActive: { backgroundColor: "#2563EB" },
  analyticsTabTxt: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  analyticsTabTxtActive: { color: "#fff" },
  progressTrack: { height: 8, backgroundColor: "#334155", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressLabel: { fontSize: 12, color: "#94A3B8", fontWeight: "600", marginTop: 6, textAlign: "center" },
  confrontoLbl: { fontSize: 11, color: "#94A3B8", fontWeight: "600", marginBottom: 2 },
  confrontoVal: { fontSize: 16, fontWeight: "800" },
  catBarLabel: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },
  catBarTrack: { height: 6, backgroundColor: "#334155", borderRadius: 3, overflow: "hidden" },
  catBarFill: { height: "100%", borderRadius: 3 },

  // Due soon
  dueSoonCard: { backgroundColor: "rgba(245,158,11,.1)", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "rgba(245,158,11,.3)", marginBottom: 16 },
  dueSoonTitle: { fontSize: 13, fontWeight: "800", color: "#FBBF24", marginBottom: 10 },
  dueSoonRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "rgba(245,158,11,.15)" },
  dueSoonName: { flex: 1, fontSize: 13, fontWeight: "600", color: "#F1F5F9" },
  dueSoonDate: { fontSize: 11, color: "#94A3B8", marginRight: 10 },
  dueSoonAmt: { fontSize: 13, fontWeight: "700", color: "#F87171" },

  // Extra charts
  extraCard:   { backgroundColor: "#1E293B", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#334155" },
  addChartBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, backgroundColor: "#1E293B", borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: "#334155", borderStyle: "dashed" },
  addChartPlus:{ color: "#3B82F6", fontSize: 20, fontWeight: "300" },
  addChartTxt: { color: "#475569", fontSize: 13, fontWeight: "600" },

  // Transactions
  emptyTxt: { color: "#64748B", fontSize: 13, textAlign: "center", paddingVertical: 24 },
  txRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#1E293B" },
  txIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  txEmoji: { fontSize: 20 },
  txInfo: { flex: 1 },
  txTitle: { fontSize: 14, fontWeight: "600", color: "#F1F5F9" },
  txCat: { fontSize: 12, color: "#64748B", marginTop: 2 },
  txAmt: { fontSize: 14, fontWeight: "700" },
});
