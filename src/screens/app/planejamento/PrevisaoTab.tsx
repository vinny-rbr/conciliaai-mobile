import React from "react";
import { View, Text, ScrollView } from "react-native";
import { fmt } from "../../../lib/financeService";
import { BudgetLimit, ProgressBar, StatRow, s } from "./shared";

type Props = {
  projectedExpenses: number;
  totalExpenses: number;
  totalBudget: number;
  dailyAvg: number;
  today: number;
  totalDays: number;
  allCategories: string[];
  spentByCategory: Record<string, number>;
  budgets: BudgetLimit[];
  refreshControl: React.ReactElement<any>;
};

function budgetColor(ratio: number) {
  if (ratio >= 1) return "#EF4444";
  if (ratio >= 0.8) return "#F59E0B";
  return "#22C55E";
}

export default function PrevisaoTab({
  projectedExpenses,
  totalExpenses,
  totalBudget,
  dailyAvg,
  today,
  totalDays,
  allCategories,
  spentByCategory,
  budgets,
  refreshControl,
}: Props) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={s.tabContent}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
    >
      {/* Projection hero */}
      <View style={s.card}>
        <Text style={s.cardLabel}>Projeção para o fim do mês</Text>
        <Text style={{
          color: totalBudget > 0 && projectedExpenses > totalBudget ? "#EF4444" : "#F1F5F9",
          fontSize: 36, fontWeight: "800", marginTop: 6, marginBottom: 14,
        }}>
          {fmt(projectedExpenses)}
        </Text>
        {totalBudget > 0 && (
          <>
            <ProgressBar ratio={projectedExpenses / totalBudget} color={projectedExpenses > totalBudget ? "#EF4444" : "#22C55E"} height={10} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
              <Text style={{ color: "#64748B", fontSize: 12 }}>Orçamento: {fmt(totalBudget)}</Text>
              <Text style={{
                color: projectedExpenses > totalBudget ? "#EF4444" : "#22C55E",
                fontSize: 12, fontWeight: "700"
              }}>
                {projectedExpenses > totalBudget
                  ? `${fmt(projectedExpenses - totalBudget)} acima`
                  : `${fmt(totalBudget - projectedExpenses)} abaixo`}
              </Text>
            </View>
          </>
        )}
        {totalBudget === 0 && (
          <Text style={{ color: "#475569", fontSize: 13 }}>
            Defina limites na aba Orçamento para ver se a projeção está dentro do planejado.
          </Text>
        )}
      </View>

      {/* Stats */}
      <View style={s.card}>
        <Text style={[s.cardLabel, { marginBottom: 4 }]}>Ritmo atual</Text>
        <StatRow label="Gasto até hoje" value={fmt(totalExpenses)} />
        <StatRow label="Média diária" value={fmt(dailyAvg)} color="#F59E0B" />
        <StatRow label="Dias passados" value={`${today} de ${totalDays}`} />
        <StatRow label="Dias restantes" value={String(totalDays - today)} />
        <StatRow label="Projeção final" value={fmt(projectedExpenses)} color={totalBudget > 0 && projectedExpenses > totalBudget ? "#EF4444" : "#22C55E"} />
      </View>

      {/* Per-category projection */}
      {allCategories.length > 0 && (
        <View style={s.card}>
          <Text style={[s.cardLabel, { marginBottom: 8 }]}>Projeção por categoria</Text>
          {allCategories.map(cat => {
            const spent = spentByCategory[cat] ?? 0;
            const projected = Math.round((spent / Math.max(1, today)) * totalDays);
            const limit = budgets.find(b => b.category === cat)?.limitCents ?? 0;
            const color = limit > 0 ? budgetColor(projected / limit) : "#64748B";
            return (
              <View key={cat} style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: "#0F172A", gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: "#F1F5F9", fontSize: 13, fontWeight: "600" }} numberOfLines={1}>{cat}</Text>
                  <Text style={{ color, fontSize: 13, fontWeight: "700" }}>{fmt(projected)}</Text>
                </View>
                {limit > 0 && <ProgressBar ratio={projected / limit} color={color} height={4} />}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
