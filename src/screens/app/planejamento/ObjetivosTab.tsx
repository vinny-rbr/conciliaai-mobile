import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { fmt } from "../../../lib/financeService";
import { Goal, ProgressBar, GOAL_EMOJIS, fmtBRL, parseCents, daysLeft, uid, s } from "./shared";

type Props = {
  goals: Goal[];
  saveGoals: (next: Goal[]) => Promise<void>;
  refreshControl: React.ReactElement<any>;
};

export default function ObjetivosTab({ goals, saveGoals, refreshControl }: Props) {
  const [editGoal,    setEditGoal]    = useState<(Partial<Goal> & { isNew?: boolean }) | null>(null);
  const [addToGoal,   setAddToGoal]   = useState<Goal | null>(null);
  const [inputVal,     setInputVal]     = useState("");
  const [goalEmoji,    setGoalEmoji]    = useState("🎯");
  const [goalName,     setGoalName]     = useState("");
  const [goalTarget,   setGoalTarget]   = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");

  function openNewGoal() {
    setGoalEmoji("🎯"); setGoalName(""); setGoalTarget(""); setGoalDeadline("");
    setEditGoal({ isNew: true });
  }

  function openEditGoalForm(g: Goal) {
    setGoalEmoji(g.emoji); setGoalName(g.name);
    setGoalTarget(fmtBRL(String(g.targetCents)));
    setGoalDeadline(g.deadline);
    setEditGoal(g);
  }

  async function confirmGoal() {
    const targetCents = parseCents(goalTarget);
    if (!goalName.trim() || !targetCents) return;
    if (editGoal?.isNew) {
      await saveGoals([...goals, { id: uid(), name: goalName.trim(), emoji: goalEmoji, targetCents, savedCents: 0, deadline: goalDeadline }]);
    } else if (editGoal?.id) {
      await saveGoals(goals.map(g => g.id === editGoal.id
        ? { ...g, name: goalName.trim(), emoji: goalEmoji, targetCents, deadline: goalDeadline }
        : g));
    }
    setEditGoal(null);
  }

  async function confirmAddToGoal() {
    if (!addToGoal) return;
    const cents = parseCents(inputVal);
    if (cents > 0) {
      await saveGoals(goals.map(g => g.id === addToGoal.id
        ? { ...g, savedCents: Math.min(g.targetCents, g.savedCents + cents) }
        : g));
    }
    setAddToGoal(null); setInputVal("");
  }

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.tabContent}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
      >
        {goals.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🎯</Text>
            <Text style={s.emptyTitle}>Nenhum objetivo ainda</Text>
            <Text style={s.emptyTxt}>Crie metas financeiras e acompanhe o progresso.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={openNewGoal}>
              <Text style={s.emptyBtnTxt}>+ Criar primeiro objetivo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {goals.map(g => {
              const ratio = g.targetCents > 0 ? g.savedCents / g.targetCents : 0;
              const done  = ratio >= 1;
              const color = done ? "#22C55E" : "#3B82F6";
              const left  = daysLeft(g.deadline);
              return (
                <TouchableOpacity key={g.id} style={s.card} onLongPress={() => openEditGoalForm(g)} activeOpacity={0.9}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 }}>
                    <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: done ? "#14532D33" : "#1E3A5F", borderWidth: 1, borderColor: done ? "#22C55E44" : "#3B82F644", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 26 }}>{g.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.cardLabel, { fontSize: 15 }]}>{g.name}</Text>
                      {done
                        ? <Text style={{ color: "#22C55E", fontSize: 12, fontWeight: "700", marginTop: 3 }}>Concluído!</Text>
                        : left >= 0
                        ? <Text style={{ color: left <= 30 ? "#F59E0B" : "#64748B", fontSize: 12, marginTop: 3 }}>
                            {left === 0 ? "Hoje é o prazo!" : `${left} dias restantes`}
                          </Text>
                        : null
                      }
                    </View>
                    {!done && (
                      <TouchableOpacity
                        onPress={() => { setInputVal(""); setAddToGoal(g); }}
                        style={{ backgroundColor: "#1E3A5F", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#3B82F644" }}
                      >
                        <Text style={{ color: "#3B82F6", fontSize: 13, fontWeight: "800" }}>+ Guardar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <ProgressBar ratio={ratio} color={color} height={8} />
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                    <Text style={{ color, fontSize: 13, fontWeight: "700" }}>{fmt(g.savedCents)}</Text>
                    <Text style={{ color: "#64748B", fontSize: 13 }}>
                      {fmt(g.targetCents)} · <Text style={{ color: done ? "#22C55E" : "#F1F5F9", fontWeight: "700" }}>{Math.round(ratio * 100)}%</Text>
                    </Text>
                  </View>
                  {!done && (
                    <Text style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>
                      Faltam {fmt(g.targetCents - g.savedCents)}
                      {left > 0 ? ` · ${fmt(Math.ceil((g.targetCents - g.savedCents) / left))}/dia para bater a meta` : ""}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={[s.card, { borderStyle: "dashed", borderColor: "#3B82F644", alignItems: "center", paddingVertical: 20 }]} onPress={openNewGoal}>
              <Text style={{ color: "#3B82F6", fontSize: 14, fontWeight: "700" }}>+ Novo objetivo</Text>
            </TouchableOpacity>
          </>
        )}
        <Text style={s.hint}>Segure um objetivo para editar ou excluir.</Text>
      </ScrollView>

      {/* ── MODAL: Novo / editar objetivo ─────────────────────── */}
      <Modal visible={editGoal !== null} transparent animationType="fade" onRequestClose={() => setEditGoal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={s.overlay}>
            <View style={s.modal}>
              <Text style={s.modalTitle}>{editGoal?.isNew ? "Novo objetivo" : "Editar objetivo"}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 6, paddingBottom: 4 }}>
                  {GOAL_EMOJIS.map(e => (
                    <TouchableOpacity key={e} onPress={() => setGoalEmoji(e)}
                      style={{ width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center",
                        backgroundColor: goalEmoji === e ? "#1E3A5F" : "#0F172A",
                        borderWidth: 1, borderColor: goalEmoji === e ? "#3B82F6" : "#334155" }}>
                      <Text style={{ fontSize: 20 }}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <TextInput style={s.input} placeholder="Nome do objetivo" placeholderTextColor="#475569" value={goalName} onChangeText={setGoalName} />
              <TextInput style={s.input} placeholder="Valor alvo (R$)" placeholderTextColor="#475569" keyboardType="numeric" value={goalTarget} onChangeText={v => setGoalTarget(fmtBRL(v))} />
              <TextInput style={s.input} placeholder="Prazo (ex: 2026-12-31)" placeholderTextColor="#475569" value={goalDeadline} onChangeText={setGoalDeadline} />
              <View style={s.modalBtns}>
                {!editGoal?.isNew && editGoal?.id && (
                  <TouchableOpacity style={[s.btnCancel, { flex: 0, paddingHorizontal: 14, borderColor: "#EF444433" }]}
                    onPress={() => { if (editGoal.id) { void saveGoals(goals.filter(g => g.id !== editGoal.id)).then(() => setEditGoal(null)); } }}>
                    <Text style={[s.btnCancelTxt, { color: "#EF4444" }]}>Excluir</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.btnCancel} onPress={() => setEditGoal(null)}>
                  <Text style={s.btnCancelTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnConfirm} onPress={() => void confirmGoal()}>
                  <Text style={s.btnConfirmTxt}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL: Adicionar ao objetivo ───────────────────────── */}
      <Modal visible={addToGoal !== null} transparent animationType="fade" onRequestClose={() => setAddToGoal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={s.overlay}>
            <View style={s.modal}>
              <Text style={s.modalTitle}>{addToGoal?.emoji} {addToGoal?.name}</Text>
              <Text style={s.modalSub}>{fmt(addToGoal?.savedCents ?? 0)} guardado de {fmt(addToGoal?.targetCents ?? 0)}</Text>
              <TextInput style={s.input} placeholder="Quanto guardar agora? (R$)" placeholderTextColor="#475569" keyboardType="numeric" value={inputVal} onChangeText={v => setInputVal(fmtBRL(v))} autoFocus />
              <View style={s.modalBtns}>
                <TouchableOpacity style={s.btnCancel} onPress={() => { setAddToGoal(null); setInputVal(""); }}>
                  <Text style={s.btnCancelTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnConfirm} onPress={() => void confirmAddToGoal()}>
                  <Text style={s.btnConfirmTxt}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
