import { useEffect, useState } from "react";
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert,
} from "react-native";
import { listBankAccounts, transferBetweenAccounts } from "../lib/bankAccountsService";
import { fmt } from "../lib/financeService";
import type { BankAccount } from "../types/finance";

function parseCents(v: string): number {
  const d = v.replace(/\D/g, "");
  return d ? parseInt(d, 10) : 0;
}

function fmtInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return (parseInt(digits, 10) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

export default function TransferenciaModal({
  visible, onClose, onDone,
}: {
  visible: boolean;
  onClose: () => void;
  onDone?: () => void;
}) {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [fromId, setFromId]     = useState("");
  const [toId, setToId]         = useState("");
  const [amount, setAmount]     = useState("");
  const [saving, setSaving]     = useState(false);
  const [done, setDone]         = useState(false);

  useEffect(() => {
    if (!visible) return;
    setFromId(""); setToId(""); setAmount(""); setDone(false);
    void listBankAccounts().then(accs => {
      const filtered = accs.filter(a => a.accountType !== "credito");
      setAccounts(filtered);
      if (filtered.length >= 2) { setFromId(filtered[0].id); setToId(filtered[1].id); }
    });
  }, [visible]);

  const fromAcc = accounts.find(a => a.id === fromId);
  const toAcc   = accounts.find(a => a.id === toId);
  const cents   = parseCents(amount);
  const canSave = fromId && toId && fromId !== toId && cents > 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await transferBetweenAccounts(fromId, toId, cents);
      setDone(true);
      onDone?.();
    } catch (e) {
      Alert.alert("Erro", e instanceof Error ? e.message : "Não foi possível transferir.");
    } finally {
      setSaving(false);
    }
  }

  function close() { setDone(false); onClose(); }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: "#0F172A", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "88%" }}>
          {/* Handle */}
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#334155", alignSelf: "center", marginTop: 12, marginBottom: 4 }} />

          {/* Header */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
            <View>
              <Text style={{ color: "#F1F5F9", fontSize: 18, fontWeight: "800" }}>Transferência</Text>
              <Text style={{ color: "#64748B", fontSize: 12, marginTop: 2 }}>Mover dinheiro entre suas contas</Text>
            </View>
            <TouchableOpacity onPress={close}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#1E293B", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#334155" }}>
              <Text style={{ color: "#94A3B8", fontSize: 16, fontWeight: "700" }}>✕</Text>
            </TouchableOpacity>
          </View>

          {done ? (
            // ── Sucesso ──
            <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 }}>
              <Text style={{ fontSize: 52, marginBottom: 12 }}>✓</Text>
              <Text style={{ color: "#4ADE80", fontSize: 20, fontWeight: "800", marginBottom: 6 }}>Transferência realizada!</Text>
              <Text style={{ color: "#94A3B8", fontSize: 14, textAlign: "center", marginBottom: 4 }}>
                {fmt(cents)} de {fromAcc?.nick || fromAcc?.bank} para {toAcc?.nick || toAcc?.bank}
              </Text>
              <TouchableOpacity onPress={close}
                style={{ marginTop: 24, backgroundColor: "#1E293B", borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14, borderWidth: 1, borderColor: "#334155" }}>
                <Text style={{ color: "#F1F5F9", fontSize: 14, fontWeight: "700" }}>Fechar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {accounts.length < 2 ? (
                <View style={{ alignItems: "center", paddingVertical: 32 }}>
                  <Text style={{ fontSize: 40, marginBottom: 12 }}>🏦</Text>
                  <Text style={{ color: "#F1F5F9", fontSize: 16, fontWeight: "700", marginBottom: 6 }}>Cadastre mais uma conta</Text>
                  <Text style={{ color: "#64748B", fontSize: 13, textAlign: "center" }}>
                    Você precisa ter ao menos 2 contas para fazer transferências.
                  </Text>
                </View>
              ) : (
                <>
                  {/* Valor */}
                  <Text style={{ color: "#94A3B8", fontSize: 12, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Valor</Text>
                  <View style={{ backgroundColor: "#1E293B", borderRadius: 14, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 20, borderWidth: 1, borderColor: "#334155" }}>
                    <Text style={{ color: "#64748B", fontSize: 20, fontWeight: "700", marginRight: 6 }}>R$</Text>
                    <TextInput
                      value={amount}
                      onChangeText={t => setAmount(fmtInput(t))}
                      placeholder="0,00"
                      placeholderTextColor="#475569"
                      keyboardType="numeric"
                      autoFocus
                      style={{ flex: 1, paddingVertical: 16, color: "#F1F5F9", fontSize: 26, fontWeight: "800" }}
                    />
                  </View>

                  {/* De */}
                  <Text style={{ color: "#94A3B8", fontSize: 12, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>De (origem)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {accounts.map(a => {
                        const sel = fromId === a.id;
                        const disabled = toId === a.id;
                        return (
                          <TouchableOpacity key={a.id} onPress={() => !disabled && setFromId(a.id)} activeOpacity={0.7}
                            style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
                              backgroundColor: sel ? "#1D4ED8" : "#1E293B",
                              borderColor: sel ? "#3B82F6" : disabled ? "#1E293B" : "#334155",
                              opacity: disabled ? 0.35 : 1 }}>
                            <Text style={{ color: sel ? "#fff" : "#94A3B8", fontSize: 13, fontWeight: "700" }}>{a.nick || a.bank}</Text>
                            {sel && cents > 0 && (
                              <Text style={{ color: "#93C5FD", fontSize: 11, marginTop: 2 }}>− {fmt(cents)}</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>

                  {/* Seta */}
                  <View style={{ alignItems: "center", marginBottom: 12 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#14B8A622", borderWidth: 1, borderColor: "#14B8A655", justifyContent: "center", alignItems: "center" }}>
                      <Text style={{ color: "#2DD4BF", fontSize: 18 }}>↓</Text>
                    </View>
                  </View>

                  {/* Para */}
                  <Text style={{ color: "#94A3B8", fontSize: 12, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Para (destino)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {accounts.map(a => {
                        const sel = toId === a.id;
                        const disabled = fromId === a.id;
                        return (
                          <TouchableOpacity key={a.id} onPress={() => !disabled && setToId(a.id)} activeOpacity={0.7}
                            style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
                              backgroundColor: sel ? "#14532D" : "#1E293B",
                              borderColor: sel ? "#22C55E" : disabled ? "#1E293B" : "#334155",
                              opacity: disabled ? 0.35 : 1 }}>
                            <Text style={{ color: sel ? "#4ADE80" : "#94A3B8", fontSize: 13, fontWeight: "700" }}>{a.nick || a.bank}</Text>
                            {sel && cents > 0 && (
                              <Text style={{ color: "#86EFAC", fontSize: 11, marginTop: 2 }}>+ {fmt(cents)}</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>

                  {/* Preview */}
                  {canSave && (
                    <View style={{ backgroundColor: "#0F172A", borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "#1E293B", flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Text style={{ color: "#94A3B8", fontSize: 13, flex: 1 }}>
                        <Text style={{ color: "#F1F5F9", fontWeight: "700" }}>{fmt(cents)}</Text>
                        {" de "}
                        <Text style={{ color: "#60A5FA", fontWeight: "700" }}>{fromAcc?.nick || fromAcc?.bank}</Text>
                        {" → "}
                        <Text style={{ color: "#4ADE80", fontWeight: "700" }}>{toAcc?.nick || toAcc?.bank}</Text>
                      </Text>
                    </View>
                  )}

                  {/* Botão */}
                  <TouchableOpacity
                    onPress={() => void handleSave()}
                    disabled={!canSave || saving}
                    style={{ backgroundColor: canSave ? "#14B8A6" : "#1E293B", borderRadius: 16, padding: 17, alignItems: "center" }}
                  >
                    {saving
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={{ color: canSave ? "#fff" : "#475569", fontSize: 16, fontWeight: "800" }}>
                          {canSave ? `Transferir ${fmt(cents)}` : "Preencha os campos"}
                        </Text>
                    }
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
