import React, { useCallback, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { useFocusEffect } from "@react-navigation/native";
import { fetchFinanceItems } from "../../lib/financeService";
import {
  PlanTab, BudgetLimit, Goal,
  BUDGETS_KEY, SAVINGS_KEY, GOALS_KEY,
  curYM, daysInMonth, monthLabel,
  s,
} from "./planejamento/shared";
import OrcamentoTab  from "./planejamento/OrcamentoTab";
import PoupancaTab   from "./planejamento/PoupancaTab";
import PrevisaoTab   from "./planejamento/PrevisaoTab";
import ObjetivosTab  from "./planejamento/ObjetivosTab";
import DiariaTab     from "./planejamento/DiariaTab";

export default function PlanejamentoScreen() {
  const [tab,        setTab]        = useState<PlanTab>("orcamento");
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Finance data
  const [spentByCategory,   setSpentByCategory]   = useState<Record<string, number>>({});
  const [totalIncome,       setTotalIncome]        = useState(0);
  const [totalExpenses,     setTotalExpenses]      = useState(0);
  const [projectedExpenses, setProjectedExpenses]  = useState(0);

  // Persisted
  const [budgets,       setBudgets]       = useState<BudgetLimit[]>([]);
  const [savingsTarget, setSavingsTarget] = useState(0);
  const [goals,         setGoals]         = useState<Goal[]>([]);

  // ── Load ─────────────────────────────────────────────────────────
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const ym = curYM();
      const items = await fetchFinanceItems();
      const month = items.filter(it => it.dateISO.startsWith(ym));

      const income   = month.filter(it => it.type === "RECEITA").reduce((s, it) => s + it.amountCents, 0);
      const expenses = month.filter(it => it.type === "DESPESA").reduce((s, it) => s + it.amountCents, 0);
      const byCategory = month
        .filter(it => it.type === "DESPESA")
        .reduce((acc, it) => { acc[it.category] = (acc[it.category] ?? 0) + it.amountCents; return acc; }, {} as Record<string, number>);

      const today = new Date().getDate();
      const projected = Math.round((expenses / Math.max(1, today)) * daysInMonth());

      setTotalIncome(income);
      setTotalExpenses(expenses);
      setSpentByCategory(byCategory);
      setProjectedExpenses(projected);

      const [bRaw, sRaw, gRaw] = await Promise.all([
        SecureStore.getItemAsync(BUDGETS_KEY(ym)),
        SecureStore.getItemAsync(SAVINGS_KEY),
        SecureStore.getItemAsync(GOALS_KEY),
      ]);
      if (bRaw) setBudgets(JSON.parse(bRaw) as BudgetLimit[]);
      if (sRaw) setSavingsTarget(parseInt(sRaw, 10));
      if (gRaw) setGoals(JSON.parse(gRaw) as Goal[]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // ── Persist ───────────────────────────────────────────────────────
  async function saveBudgets(next: BudgetLimit[]) {
    setBudgets(next);
    await SecureStore.setItemAsync(BUDGETS_KEY(curYM()), JSON.stringify(next));
  }
  async function saveGoals(next: Goal[]) {
    setGoals(next);
    await SecureStore.setItemAsync(GOALS_KEY, JSON.stringify(next));
  }
  async function onSaveSavingsTarget(cents: number) {
    setSavingsTarget(cents);
    await SecureStore.setItemAsync(SAVINGS_KEY, String(cents));
  }

  // ── Derived ───────────────────────────────────────────────────────
  const savedCents    = totalIncome - totalExpenses;
  const totalBudget   = budgets.reduce((s, b) => s + b.limitCents, 0);
  const allCategories = Array.from(new Set([
    ...budgets.map(b => b.category),
    ...Object.keys(spentByCategory),
  ])).sort();
  const today     = new Date().getDate();
  const totalDays = daysInMonth();
  const dailyAvg  = Math.round(totalExpenses / Math.max(1, today));

  // ── Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  const refreshCtrl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); void load(true); }}
      tintColor="#3B82F6"
    />
  );

  // ── Render ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.pageTitle}>Planejamento</Text>
          <Text style={s.pageSub}>{monthLabel()}</Text>
        </View>
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingVertical: 12 }}>
        {(["orcamento","poupanca","previsao","objetivos","diaria"] as PlanTab[]).map(t => {
          const labels: Record<PlanTab, string> = {
            orcamento: "Orçamento", poupanca: "Poupança", previsao: "Previsão", objetivos: "Objetivos", diaria: "Diária",
          };
          return (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={[s.tabBtn, tab === t && s.tabBtnActive]}>
              <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>{labels[t]}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Tab content */}
      {tab === "orcamento" && (
        <OrcamentoTab
          allCategories={allCategories}
          spentByCategory={spentByCategory}
          totalExpenses={totalExpenses}
          totalBudget={totalBudget}
          budgets={budgets}
          saveBudgets={saveBudgets}
          refreshControl={refreshCtrl}
        />
      )}
      {tab === "poupanca" && (
        <PoupancaTab
          savedCents={savedCents}
          totalIncome={totalIncome}
          totalExpenses={totalExpenses}
          savingsTarget={savingsTarget}
          onSave={onSaveSavingsTarget}
          refreshControl={refreshCtrl}
        />
      )}
      {tab === "previsao" && (
        <PrevisaoTab
          projectedExpenses={projectedExpenses}
          totalExpenses={totalExpenses}
          totalBudget={totalBudget}
          dailyAvg={dailyAvg}
          today={today}
          totalDays={totalDays}
          allCategories={allCategories}
          spentByCategory={spentByCategory}
          budgets={budgets}
          refreshControl={refreshCtrl}
        />
      )}
      {tab === "objetivos" && (
        <ObjetivosTab
          goals={goals}
          saveGoals={saveGoals}
          refreshControl={refreshCtrl}
        />
      )}
      {tab === "diaria" && (
        <DiariaTab
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); void load(true); }}
        />
      )}
    </SafeAreaView>
  );
}
