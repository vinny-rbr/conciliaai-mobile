import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { fmt } from "../../../lib/financeService";
import { BudgetLimit, ProgressBar, fmtBRL, parseCents, s } from "./shared";

type Props = {
  allCategories: string[];
  spentByCategory: Record<string, number>;
  totalExpenses: number;
  totalBudget: number;
  budgets: BudgetLimit[];
  saveBudgets: (next: BudgetLimit[]) => Promise<void>;
  refreshControl: React.ReactElement<any>;
};

function budgetColor(ratio: number) {
  if (ratio >= 1) return "#EF4444";
  if (ratio >= 0.8) return "#F59E0B";
  return "#22C55E";
}

export default function OrcamentoTab({
  allCategories,
  spentByCategory,
  totalExpenses,
  totalBudget,
  budgets,
  saveBudgets,
  refreshControl,
}: Props) {
  const [editBudget, setEditBudget] = useState<{ category: string } | null>(null);
  const [inputVal, setInputVal] = useState("");

  function openEditBudget(category: string) {
    const existing = budgets.find(b => b.category === category);
    setInputVal(existing ? fmtBRL(String(existing.limitCents)) : "");
    setEditBudget({ category });
  }

  async function confirmEditBudget() {
    if (!editBudget) return;
    const cents = parseCents(inputVal);
    const next = budgets.filter(b => b.category !== editBudget.category);
    if (cents > 0) next.push({ category: editBudget.category, limitCents: cents });
    await saveBudgets(next);
    setEditBudget(null); setInputVal("");
  }

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.tabContent}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card */}
        {totalBudget > 0 && (
          <View style={[s.card, { marginBottom: 8 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <View>
                <Text style={s.cardLabel}>Total do mês</Text>
                <Text style={{ color: totalExpenses > totalBudget ? "#EF4444" : "#22C55E", fontSize: 26, fontWeight: "800", marginTop: 4 }}>
                  {fmt(totalExpenses)}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: "#64748B", fontSize: 12 }}>Orçamento total</Text>
                <Text style={{ color: "#F1F5F9", fontSize: 16, fontWeight: "700" }}>{fmt(totalBudget)}</Text>
              </View>
            </View>
            <ProgressBar ratio={totalExpenses / totalBudget} color={totalExpenses > totalBudget ? "#EF4444" : "#22C55E"} height={10} />
            <Text style={{ color: "#64748B", fontSize: 12, marginTop: 6, textAlign: "right" }}>
              {totalExpenses > totalBudget
                ? `${fmt(totalExpenses - totalBudget)} acima do limite`
                : `${fmt(totalBudget - totalExpenses)} disponível`}
            </Text>
          </View>
        )}

        {/* Category list */}
        {allCategories.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>📂</Text>
            <Text style={s.emptyTitle}>Sem despesas este mês</Text>
            <Text style={s.emptyTxt}>Adicione despesas para ver o orçamento por categoria.</Text>
          </View>
        ) : allCategories.map(cat => {
          const spent = spentByCategory[cat] ?? 0;
          const limit = budgets.find(b => b.category === cat)?.limitCents ?? 0;
          const ratio = limit > 0 ? spent / limit : 0;
          const color = limit > 0 ? budgetColor(ratio) : "#3B82F6";
          return (
            <TouchableOpacity key={cat} style={s.card} onPress={() => openEditBudget(cat)} activeOpacity={0.8}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={s.cardLabel} numberOfLines={1}>{cat}</Text>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color, fontSize: 14, fontWeight: "700" }}>{fmt(spent)}</Text>
                  {limit > 0
                    ? <Text style={{ color: "#64748B", fontSize: 11 }}>limite: {fmt(limit)}</Text>
                    : <Text style={{ color: "#334155", fontSize: 11 }}>toque p/ definir limite</Text>
                  }
                </View>
              </View>
              {limit > 0 && (
                <View style={{ marginTop: 10, gap: 4 }}>
                  <ProgressBar ratio={ratio} color={color} height={6} />
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: "#64748B", fontSize: 11 }}>{Math.round(ratio * 100)}% usado</Text>
                    {ratio >= 1
                      ? <Text style={{ color: "#EF4444", fontSize: 11, fontWeight: "700" }}>Limite ultrapassado</Text>
                      : ratio >= 0.8
                      ? <Text style={{ color: "#F59E0B", fontSize: 11, fontWeight: "700" }}>Quase no limite</Text>
                      : null
                    }
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        <Text style={s.hint}>Toque em uma categoria para definir ou alterar o limite.</Text>
      </ScrollView>

      {/* ── MODAL: Limite de categoria ─────────────────────────── */}
      <Modal visible={editBudget !== null} transparent animationType="fade" onRequestClose={() => setEditBudget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={s.overlay}>
            <View style={s.modal}>
              <Text style={s.modalTitle}>{editBudget?.category}</Text>
              <Text style={s.modalSub}>Limite mensal para esta categoria. Deixe vazio para remover.</Text>
              <TextInput style={s.input} placeholder="R$ 0,00" placeholderTextColor="#475569" keyboardType="numeric" value={inputVal} onChangeText={v => setInputVal(fmtBRL(v))} autoFocus />
              <View style={s.modalBtns}>
                <TouchableOpacity style={s.btnCancel} onPress={() => { setEditBudget(null); setInputVal(""); }}>
                  <Text style={s.btnCancelTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnConfirm} onPress={() => void confirmEditBudget()}>
                  <Text style={s.btnConfirmTxt}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
