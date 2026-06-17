import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { fmt } from "../../../lib/financeService";
import { ProgressBar, StatRow, fmtBRL, parseCents, monthLabel, s } from "./shared";

type Props = {
  savedCents: number;
  totalIncome: number;
  totalExpenses: number;
  savingsTarget: number;
  onSave: (cents: number) => Promise<void>;
  refreshControl: React.ReactElement<any>;
};

export default function PoupancaTab({
  savedCents,
  totalIncome,
  totalExpenses,
  savingsTarget,
  onSave,
  refreshControl,
}: Props) {
  const [editSavings, setEditSavings] = useState(false);
  const [inputVal, setInputVal] = useState("");

  const savingsRatio = savingsTarget > 0 ? savedCents / savingsTarget : 0;

  async function confirmEditSavings() {
    const cents = parseCents(inputVal);
    await onSave(cents);
    setEditSavings(false); setInputVal("");
  }

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.tabContent}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <View style={[s.card, { gap: 16 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View>
              <Text style={s.cardLabel}>Economizado em {monthLabel()}</Text>
              <Text style={{ color: savedCents >= 0 ? "#22C55E" : "#EF4444", fontSize: 32, fontWeight: "800", marginTop: 6 }}>
                {savedCents < 0 ? "-" : ""}{fmt(Math.abs(savedCents))}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => { setInputVal(savingsTarget > 0 ? fmtBRL(String(savingsTarget)) : ""); setEditSavings(true); }}
              style={s.editBtn}
            >
              <Text style={{ color: "#3B82F6", fontSize: 12, fontWeight: "700" }}>
                {savingsTarget > 0 ? "Editar meta" : "Definir meta"}
              </Text>
            </TouchableOpacity>
          </View>
          {savingsTarget > 0 && (
            <>
              <ProgressBar ratio={savingsRatio} color={savedCents >= 0 ? "#22C55E" : "#EF4444"} height={10} />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#64748B", fontSize: 13 }}>Meta: <Text style={{ color: "#F1F5F9", fontWeight: "700" }}>{fmt(savingsTarget)}</Text></Text>
                <Text style={{ color: savedCents >= savingsTarget ? "#22C55E" : "#64748B", fontSize: 13, fontWeight: "700" }}>
                  {savedCents >= savingsTarget ? "Meta atingida!" : `${Math.round(Math.max(0, savingsRatio) * 100)}% concluído`}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Stat breakdown */}
        <View style={s.card}>
          <Text style={[s.cardLabel, { marginBottom: 4 }]}>Detalhamento do mês</Text>
          <StatRow label="Receitas" value={fmt(totalIncome)} color="#22C55E" />
          <StatRow label="Despesas" value={fmt(totalExpenses)} color="#EF4444" />
          <StatRow
            label="Balanço"
            value={(savedCents >= 0 ? "+" : "-") + fmt(Math.abs(savedCents))}
            color={savedCents >= 0 ? "#22C55E" : "#EF4444"}
          />
          {savingsTarget > 0 && (
            <StatRow
              label="Falta para a meta"
              value={savedCents >= savingsTarget ? "Atingida!" : fmt(Math.max(0, savingsTarget - savedCents))}
              color={savedCents >= savingsTarget ? "#22C55E" : "#F59E0B"}
            />
          )}
        </View>

        {savingsTarget === 0 && (
          <TouchableOpacity
            style={[s.card, { borderStyle: "dashed", borderColor: "#3B82F644", alignItems: "center", gap: 6 }]}
            onPress={() => { setInputVal(""); setEditSavings(true); }}
          >
            <Text style={{ fontSize: 28 }}>🎯</Text>
            <Text style={{ color: "#3B82F6", fontSize: 14, fontWeight: "700" }}>Definir meta de poupança</Text>
            <Text style={{ color: "#64748B", fontSize: 12 }}>Estabeleça quanto quer guardar este mês</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── MODAL: Meta de poupança ────────────────────────────── */}
      <Modal visible={editSavings} transparent animationType="fade" onRequestClose={() => setEditSavings(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={s.overlay}>
            <View style={s.modal}>
              <Text style={s.modalTitle}>Meta de poupança</Text>
              <Text style={s.modalSub}>Quanto você quer economizar em {monthLabel()}?</Text>
              <TextInput style={s.input} placeholder="R$ 0,00" placeholderTextColor="#475569" keyboardType="numeric" value={inputVal} onChangeText={v => setInputVal(fmtBRL(v))} autoFocus />
              <View style={s.modalBtns}>
                <TouchableOpacity style={s.btnCancel} onPress={() => { setEditSavings(false); setInputVal(""); }}>
                  <Text style={s.btnCancelTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnConfirm} onPress={() => void confirmEditSavings()}>
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
