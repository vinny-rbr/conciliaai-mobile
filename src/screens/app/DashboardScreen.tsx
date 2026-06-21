import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { showToast } from "../../components/Toast";
import { useFocusEffect } from "@react-navigation/native";
import { rootNavigate } from "../../navigation/rootNav";
import {
  Animated, ActivityIndicator, Modal, RefreshControl, ScrollView,
  Text, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchFinanceItems, fmt } from "../../lib/financeService";
import { listBankAccounts, updateBankAccount } from "../../lib/bankAccountsService";
import { getPlanName, getEmailFromAnySource, getUser } from "../../lib/auth";
import { useAuth } from "../../context/AuthContext";
import { onTabBarScroll } from "../../navigation/tabBarScroll";
import type { FinanceItem, BankAccount } from "../../types/finance";
import { addMonthsYM, todayISO, addDaysISO, dateLabel } from "../../lib/dateUtils";
import { catIcon } from "../../lib/catUtils";
import { Sparkline } from "../../components/dashboard/Sparkline";
import { AnimatedCard, DropdownPanel } from "../../components/dashboard/CollapsePanel";
import { BankCarousel } from "../../components/dashboard/BankCarousel";
import { MiniCalendar } from "../../components/dashboard/MiniCalendar";
import {
  PLAN_COLOR, PLAN_LABEL, PERIODS, getPeriodRange,
  AVAILABLE_CHARTS, cmpLine, calStyle, s,
  type PeriodKey, type AnalyticsTab,
} from "./dashboard/shared";
import { HeroCard } from "./dashboard/HeroCard";
import { AnalyticsSection } from "./dashboard/AnalyticsSection";

function SkeletonBox({ style }: { style?: object }) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.75, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3,  duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return <Animated.View style={[{ backgroundColor: "#1E293B", borderRadius: 10, opacity }, style]} />;
}

export default function DashboardScreen() {
  const { signOut } = useAuth();
  const [items, setItems]       = useState<FinanceItem[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [heroMonth, setHeroMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  });
  const [period, setPeriod]           = useState<PeriodKey>("LAST_3");
  const [periodOpen, setPeriodOpen]   = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState<AnalyticsTab>("confronto");
  const [planName, setPlanName]       = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState("US");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDay, setSelectedDay]   = useState<string | undefined>(undefined);
  const [chartPickerOpen, setChartPickerOpen] = useState(false);
  const [addedCharts, setAddedCharts]         = useState<string[]>([]);
  const [compareA, setCompareA]   = useState("");
  const [compareB, setCompareB]   = useState("");
  const [compareCatOpen, setCompareCatOpen] = useState<"A" | "B" | null>(null);

  const currentMonthYM = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }, []);

  async function load(silent = false, skipAutoSync = false) {
    if (!silent) setLoading(true);
    try {
      const [data, accs, plan, emailVal, cachedUser] = await Promise.all([fetchFinanceItems(), listBankAccounts(), getPlanName(), getEmailFromAnySource(), getUser()]);
      const nameOrEmail = (cachedUser && typeof cachedUser.name === "string" && cachedUser.name.trim()) ? cachedUser.name.trim() : (emailVal ?? "");
      if (nameOrEmail) {
        const part = nameOrEmail.includes("@") ? nameOrEmail.split("@")[0] : nameOrEmail;
        const words = part.split(/[\s._-]+/).filter(Boolean);
        setUserInitials(words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : words[0]?.slice(0, 2).toUpperCase() ?? "US");
      }

      if (!skipAutoSync) {
        const _now = new Date();
        const _next = new Date(_now.getFullYear(), _now.getMonth() + 1, 1);
        const _endExcl = `${_next.getFullYear()}-${String(_next.getMonth() + 1).padStart(2, "0")}`;
        const cumBalance = data
          .filter(it => it.dateISO < _endExcl)
          .reduce((sum, it) => sum + (it.type === "RECEITA" ? it.amountCents : -it.amountCents), 0);
        const nonZero = accs.filter(a => a.balanceCents !== 0);
        if (nonZero.length === 1 && nonZero[0].balanceCents !== cumBalance) {
          nonZero[0].balanceCents = cumBalance;
          void updateBankAccount(nonZero[0].id, { balanceCents: cumBalance });
        }
      }

      setItems(data);
      setAccounts([...accs]);
      setPlanName(plan);
    } catch {
      showToast("Sem conexão. Verifique sua internet.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { void load(); }, []);
  useFocusEffect(useCallback(() => { void load(true, true); }, []));
  const onRefresh = useCallback(() => { setRefreshing(true); void load(true); }, []);

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
    return { rec, des, saldo: cumRec - cumDes };
  }, [items, heroMonth, accounts]);

  const filteredItems = useMemo(() => {
    const { from, to } = getPeriodRange(period);
    return items.filter(it => it.dateISO >= from && it.dateISO <= to);
  }, [items, period]);

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

  const totRec  = useMemo(() => filteredItems.filter(it => it.type==="RECEITA").reduce((s,it) => s+it.amountCents, 0), [filteredItems]);
  const totDes  = useMemo(() => filteredItems.filter(it => it.type==="DESPESA").reduce((s,it) => s+it.amountCents, 0), [filteredItems]);
  const totCred = useMemo(() => filteredItems.filter(it => it.type==="DESPESA" && it.paymentType==="credit").reduce((s,it) => s+it.amountCents, 0), [filteredItems]);
  const saldo = totRec - totDes;

  const monthCmp = useMemo(() => {
    const now = new Date();
    const curYM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    const prevYM = addMonthsYM(curYM, -1);
    let curRec = 0, curDes = 0, prevRec = 0, prevDes = 0;
    for (const it of items) {
      if (it.dateISO.startsWith(curYM))  { if (it.type==="RECEITA") curRec += it.amountCents;  if (it.type==="DESPESA") curDes += it.amountCents; }
      if (it.dateISO.startsWith(prevYM)) { if (it.type==="RECEITA") prevRec += it.amountCents; if (it.type==="DESPESA") prevDes += it.amountCents; }
    }
    const pct = (cur: number, prev: number) => prev > 0 ? ((cur - prev) / prev * 100).toFixed(1) : null;
    return { rec: pct(curRec, prevRec), des: pct(curDes, prevDes), sal: pct(curRec - curDes, prevRec - prevDes) };
  }, [items]);

  const dueSoon = useMemo(() => {
    const today = todayISO();
    const limit = addDaysISO(today, 3);
    return items.filter(it => it.type==="DESPESA" && it.status!=="paid" && it.dateISO >= today && it.dateISO <= limit)
      .sort((a,b) => a.dateISO.localeCompare(b.dateISO)).slice(0, 4);
  }, [items]);

  const latest = useMemo(() => filteredItems.slice(0, 8), [filteredItems]);

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
        <ScrollView contentContainerStyle={s.scroll} scrollEnabled={false}>
          {/* Brand bar */}
          <View style={s.brandBar}>
            <View style={s.brandLeft}>
              <View style={s.brandMark}><Text style={{ color: "#fff", fontSize: 13, fontWeight: "800" }}>C</Text></View>
              <View>
                <Text style={s.brandName}>Conciliaaí</Text>
                <Text style={s.brandSub}>FINANÇAS</Text>
              </View>
            </View>
            <SkeletonBox style={{ width: 36, height: 36, borderRadius: 18 }} />
          </View>
          {/* Hero card */}
          <SkeletonBox style={{ height: 160, borderRadius: 22, marginBottom: 12 }} />
          {/* Period row */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <SkeletonBox style={{ width: 90, height: 14, borderRadius: 6 }} />
            <SkeletonBox style={{ width: 130, height: 36, borderRadius: 10 }} />
          </View>
          {/* Section header */}
          <SkeletonBox style={{ width: 140, height: 18, borderRadius: 6, marginBottom: 12 }} />
          {/* Accounts carousel */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
            <SkeletonBox style={{ width: 160, height: 100, borderRadius: 16 }} />
            <SkeletonBox style={{ width: 160, height: 100, borderRadius: 16 }} />
          </View>
          {/* Stats grid */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            <SkeletonBox style={{ flex: 1, minWidth: "45%", height: 80, borderRadius: 16 }} />
            <SkeletonBox style={{ flex: 1, minWidth: "45%", height: 80, borderRadius: 16 }} />
            <SkeletonBox style={{ flex: 1, minWidth: "45%", height: 80, borderRadius: 16 }} />
            <SkeletonBox style={{ flex: 1, minWidth: "45%", height: 80, borderRadius: 16 }} />
          </View>
          {/* Transaction rows */}
          <SkeletonBox style={{ width: 160, height: 18, borderRadius: 6, marginBottom: 12 }} />
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}>
              <SkeletonBox style={{ width: 42, height: 42, borderRadius: 12 }} />
              <View style={{ flex: 1, gap: 8 }}>
                <SkeletonBox style={{ height: 13, borderRadius: 5, width: "65%" }} />
                <SkeletonBox style={{ height: 10, borderRadius: 4, width: "40%" }} />
              </View>
              <SkeletonBox style={{ width: 58, height: 13, borderRadius: 5 }} />
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const planKey   = planName ?? "Basico";
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
            <TouchableOpacity onPress={() => rootNavigate("Busca")} style={s.logoutBtn} activeOpacity={0.7}>
              <Text style={{ color: "#94A3B8", fontSize: 16 }}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => rootNavigate("Perfil")} style={s.logoutBtn}>
              <Text style={s.logoutTxt}>{userInitials}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <HeroCard
          heroData={heroData}
          balanceHidden={balanceHidden}
          setBalanceHidden={setBalanceHidden}
          heroMonth={heroMonth}
          setHeroMonth={setHeroMonth}
          currentMonthYM={currentMonthYM}
          setCalendarOpen={setCalendarOpen}
        />

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
          <TouchableOpacity onPress={() => rootNavigate("ContasBancarias")} activeOpacity={0.7}>
            <Text style={s.sectionAction}>Gerenciar ›</Text>
          </TouchableOpacity>
        </View>
        {accounts.length === 0 ? (
          <TouchableOpacity style={s.bankCardAdd}>
            <Text style={s.bankCardAddIcon}>+</Text>
            <Text style={s.bankCardAddTxt}>Adicionar banco</Text>
          </TouchableOpacity>
        ) : (
          <BankCarousel accounts={accounts} hidden={balanceHidden} onSaved={() => void load(true)} onBalanceSaved={() => void load(true, true)} items={items} />
        )}

        {/* Summary cards */}
        <View style={s.cardsGrid}>
          {([
            { lab: "Receitas",  val: totRec,  color: "#34D399", spark: sparklines.rec,  cmp: cmpLine(monthCmp.rec) },
            { lab: "Despesas",  val: totDes,  color: "#FB7185", spark: sparklines.des,  cmp: cmpLine(monthCmp.des, true) },
            { lab: "Crédito",   val: totCred, color: "#F97316", spark: sparklines.cred, cmp: "gastos no crédito" },
            { lab: "Saldo",     val: saldo,   color: "#60A5FA", spark: sparklines.sal,  cmp: cmpLine(monthCmp.sal) },
          ] as const).map(card => {
            const dest = card.lab === "Receitas" ? "Receitas" : card.lab === "Despesas" ? "Despesas" : null;
            return (
              <TouchableOpacity
                key={card.lab}
                style={[s.statCard, { borderBottomColor: card.color, borderBottomWidth: 3 }]}
                activeOpacity={dest ? 0.7 : 1}
                onPress={() => dest && rootNavigate(dest)}
              >
                <Text style={s.statLab}>{card.lab}</Text>
                <Text style={[s.statVal, { color: card.color }]} numberOfLines={1}>
                  {balanceHidden ? "•••" : fmt(Math.abs(card.val))}
                </Text>
                <Sparkline vals={card.spark} color={card.color} />
                <Text style={s.statSub}>{card.cmp}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <AnalyticsSection
          analyticsTab={analyticsTab}
          setAnalyticsTab={setAnalyticsTab}
          analyticsContent={analyticsContent}
          totRec={totRec}
          totDes={totDes}
          filteredItems={filteredItems}
        />

        {/* Compare chart */}
        {addedCharts.includes("compare") && (() => {
          const cats = Array.from(new Set(filteredItems.map(it => it.category))).sort();
          const catA = compareA || cats[0] || "";
          const catB = compareB || cats[1] || cats[0] || "";
          const getStats = (cat: string) => {
            const its = filteredItems.filter(it => it.category === cat);
            const rec = its.filter(it => it.type==="RECEITA").reduce((s,it) => s+it.amountCents, 0);
            const des = its.filter(it => it.type==="DESPESA").reduce((s,it) => s+it.amountCents, 0);
            return { rec, des, saldo: rec - des };
          };
          const statsA = getStats(catA), statsB = getStats(catB);
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
              <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                {[{ label: catA, stats: statsA, color: "#3B82F6" }, { label: catB, stats: statsB, color: "#A78BFA" }].map((block, i) => (
                  <View key={i} style={{ flex: 1, backgroundColor: "#0F172A", borderRadius: 12, padding: 12 }}>
                    <Text style={{ color: block.color, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 }}>{i === 0 ? "CAT 1" : "CAT 2"}</Text>
                    <Text style={{ color: "#F1F5F9", fontSize: 13, fontWeight: "700", marginBottom: 10 }} numberOfLines={1}>{block.label}</Text>
                    {[
                      { label: "Receitas", val: block.stats.rec,   color: "#22C55E" },
                      { label: "Despesas", val: block.stats.des,   color: "#EF4444" },
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

        {AVAILABLE_CHARTS.some(c => !addedCharts.includes(c.id)) && (
          <TouchableOpacity style={s.addChartBtn} onPress={() => setChartPickerOpen(true)} activeOpacity={0.7}>
            <Text style={s.addChartPlus}>+</Text>
            <Text style={s.addChartTxt}>Adicionar gráfico</Text>
          </TouchableOpacity>
        )}

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

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Últimas transações</Text>
        </View>
        {latest.length === 0
          ? (
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>📋</Text>
              <Text style={{ color: "#F1F5F9", fontSize: 15, fontWeight: "700", marginBottom: 6 }}>Nenhuma transação ainda</Text>
              <Text style={{ color: "#64748B", fontSize: 13, textAlign: "center", lineHeight: 18, maxWidth: 240 }}>
                Toque em + para adicionar sua primeira receita ou despesa
              </Text>
            </View>
          )
          : latest.map(it => (
            <View key={it.id} style={s.txRow}>
              <View style={[s.txIcon, { backgroundColor: it.type==="RECEITA" ? "rgba(74,222,128,.14)" : "rgba(248,113,113,.14)" }]}>
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
          onSelectDay={date => { setSelectedDay(date); setHeroMonth(date.substring(0, 7)); setCalendarOpen(false); }}
          onClose={() => setCalendarOpen(false)}
        />
      )}
    </SafeAreaView>
  );
}
