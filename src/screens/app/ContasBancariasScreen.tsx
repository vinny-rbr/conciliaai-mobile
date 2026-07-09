import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { BankAccount } from "../../types/finance";
import {
  listBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount,
} from "../../lib/bankAccountsService";
import { fmt } from "../../lib/financeService";
import {
  BankCardVisual, NovoBancoModal, CARD_COLORS, BANKS_LIST,
} from "../../components/dashboard/BankCarousel";
import { KeyboardAwareScroll } from "../../components/KeyboardAwareScroll";

type EditState = { id: string; nick: string; accountType: "corrente" | "poupanca" | "credito"; color: string; bank: string };

export default function ContasBancariasScreen() {
  const navigation = useNavigation();
  const [accounts, setAccounts]       = useState<BankAccount[]>([]);
  const [loading, setLoading]         = useState(true);
  const [addOpen, setAddOpen]         = useState(false);
  const [menuAcc, setMenuAcc]         = useState<BankAccount | null>(null);
  const [editState, setEditState]     = useState<EditState | null>(null);
  const [saving, setSaving]           = useState(false);
  const [deleting, setDeleting]       = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setAccounts(await listBankAccounts());
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openEdit(acc: BankAccount) {
    setMenuAcc(null);
    setEditState({
      id: acc.id,
      nick: acc.nick,
      bank: acc.bank,
      accountType: (acc.accountType as EditState["accountType"]) ?? "corrente",
      color: acc.face ?? "default",
    });
  }

  async function handleSaveEdit() {
    if (!editState || !editState.nick.trim()) { Alert.alert("Atenção", "Digite o apelido da conta."); return; }
    setSaving(true);
    const ok = await updateBankAccount(editState.id, {
      nick: editState.nick.trim(),
      accountType: editState.accountType,
      face: editState.color !== "default" ? editState.color : undefined,
    });
    setSaving(false);
    if (ok) { setEditState(null); void load(true); }
    else Alert.alert("Erro", "Não foi possível salvar.");
  }

  function confirmDelete(acc: BankAccount) {
    setMenuAcc(null);
    Alert.alert(
      `Excluir "${acc.nick || acc.bank}"?`,
      "Os lançamentos desta conta não serão afetados, mas a conta será removida.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir", style: "destructive",
          onPress: async () => {
            setDeleting(acc.id);
            const ok = await deleteBankAccount(acc.id);
            setDeleting(null);
            if (ok) void load(true);
            else Alert.alert("Erro", "Não foi possível excluir a conta.");
          },
        },
      ],
    );
  }

  const editPreviewAcc: BankAccount | null = editState ? {
    id: editState.id, userId: "", nick: editState.nick || editState.bank,
    bank: editState.bank, accountType: editState.accountType,
    last4: "0000", balanceCents: 0,
  } : null;

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Contas bancárias</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setAddOpen(true)} activeOpacity={0.8}>
          <Text style={s.addBtnTxt}>+ Nova</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#3B82F6" size="large" /></View>
      ) : accounts.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🏦</Text>
          <Text style={s.emptyTitle}>Nenhuma conta cadastrada</Text>
          <Text style={s.emptySub}>Toque em "+ Nova" para adicionar sua primeira conta.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {accounts.map(acc => (
            <View key={acc.id} style={s.card}>
              <BankCardVisual account={acc} hidden={false} showBalance />
              <View style={s.cardFooter}>
                <View style={s.cardInfo}>
                  <Text style={s.cardNick}>{acc.nick || acc.bank}</Text>
                  <Text style={s.cardType}>
                    {acc.accountType === "corrente" ? "Conta corrente" : acc.accountType === "poupanca" ? "Poupança" : "Cartão de crédito"}
                    {" · "}{fmt(acc.balanceCents)}
                  </Text>
                </View>
                <View style={s.cardActions}>
                  <TouchableOpacity style={s.actionBtn} onPress={() => openEdit(acc)} activeOpacity={0.7}>
                    <Text style={s.actionBtnTxt}>✏️ Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, s.actionBtnDelete]}
                    onPress={() => confirmDelete(acc)}
                    disabled={deleting === acc.id}
                    activeOpacity={0.7}
                  >
                    {deleting === acc.id
                      ? <ActivityIndicator size="small" color="#EF4444" />
                      : <Text style={s.actionBtnDeleteTxt}>🗑️ Excluir</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Adicionar nova conta */}
      <NovoBancoModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => { setAddOpen(false); void load(true); }}
      />

      {/* Editar conta */}
      <Modal visible={!!editState} transparent animationType="slide" onRequestClose={() => setEditState(null)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setEditState(null)} activeOpacity={1} />
          {editState && editPreviewAcc && (
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Editar conta</Text>
              <KeyboardAwareScroll keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                {/* Preview */}
                <View style={{ alignItems: "center", marginBottom: 16 }}>
                  <BankCardVisual
                    account={editPreviewAcc}
                    hidden={false}
                    bgOverride={editState.color !== "default" ? editState.color : undefined}
                    showBalance={false}
                  />
                </View>

                <Text style={s.fieldLabel}>Apelido da conta</Text>
                <TextInput
                  style={s.fieldInput}
                  value={editState.nick}
                  onChangeText={v => setEditState(e => e ? { ...e, nick: v } : e)}
                  placeholder="Ex: Conta pessoal"
                  placeholderTextColor="#475569"
                  autoFocus
                />

                <Text style={s.fieldLabel}>Tipo de conta</Text>
                <View style={s.typeRow}>
                  {(["corrente", "poupanca", "credito"] as const).map(t => {
                    const label = t === "corrente" ? "Corrente" : t === "poupanca" ? "Poupança" : "Crédito";
                    const active = editState.accountType === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setEditState(e => e ? { ...e, accountType: t } : e)}
                        style={[s.typeBtn, active && s.typeBtnActive]}
                        activeOpacity={0.8}
                      >
                        <Text style={[s.typeBtnTxt, active && s.typeBtnTxtActive]}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={s.fieldLabel}>Cor do cartão</Text>
                <View style={s.colorRow}>
                  {CARD_COLORS.map(c => {
                    const bankCfg = BANKS_LIST.find(b => b.name === editState.bank);
                    const active = editState.color === c.key;
                    return (
                      <TouchableOpacity
                        key={c.key}
                        onPress={() => setEditState(e => e ? { ...e, color: c.key } : e)}
                        style={[s.colorSwatch, active && s.colorSwatchActive]}
                        activeOpacity={0.8}
                      >
                        <View style={[s.colorSwatchInner, {
                          backgroundColor: c.key === "default" ? (bankCfg?.bg ?? "#334155") : c.key,
                        }]} />
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={s.modalBtns}>
                  <TouchableOpacity style={s.cancelBtn} onPress={() => setEditState(null)} activeOpacity={0.7}>
                    <Text style={s.cancelTxt}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.saveBtn} onPress={() => void handleSaveEdit()} disabled={saving} activeOpacity={0.85}>
                    {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveTxt}>Salvar</Text>}
                  </TouchableOpacity>
                </View>
              </KeyboardAwareScroll>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F172A" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backTxt: { color: "#60A5FA", fontSize: 32, fontWeight: "300", lineHeight: 40 },
  title: { flex: 1, color: "#F1F5F9", fontSize: 20, fontWeight: "800", textAlign: "center" },
  addBtn: { backgroundColor: "#3B82F6", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emptyTitle: { color: "#F1F5F9", fontSize: 16, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  emptySub: { color: "#64748B", fontSize: 14, textAlign: "center", lineHeight: 20 },
  scroll: { padding: 16, paddingBottom: 48 },

  card: { backgroundColor: "#1E293B", borderRadius: 20, marginBottom: 16, overflow: "hidden", borderWidth: 1, borderColor: "#334155" },
  cardFooter: { padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  cardInfo: { flex: 1 },
  cardNick: { color: "#F1F5F9", fontSize: 15, fontWeight: "700" },
  cardType: { color: "#64748B", fontSize: 12, marginTop: 2 },
  cardActions: { flexDirection: "row", gap: 8 },
  actionBtn: { backgroundColor: "#1E3A5F", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#3B82F633" },
  actionBtnTxt: { color: "#60A5FA", fontSize: 12, fontWeight: "700" },
  actionBtnDelete: { backgroundColor: "#EF444418", borderColor: "#EF444433" },
  actionBtnDeleteTxt: { color: "#EF4444", fontSize: 12, fontWeight: "700" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#1E293B", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.1)", maxHeight: "88%" },
  modalTitle: { color: "#F1F5F9", fontSize: 18, fontWeight: "800", marginBottom: 16 },

  fieldLabel: { color: "#64748B", fontSize: 12, fontWeight: "700", marginBottom: 8, marginTop: 8 },
  fieldInput: { backgroundColor: "#0F172A", borderRadius: 12, padding: 14, color: "#F1F5F9", fontSize: 15, borderWidth: 1, borderColor: "#334155", marginBottom: 4 },

  typeRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: "#0F172A", borderWidth: 1, borderColor: "#334155" },
  typeBtnActive: { backgroundColor: "#1D4ED8", borderColor: "#3B82F6" },
  typeBtnTxt: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  typeBtnTxtActive: { color: "#fff" },

  colorRow: { flexDirection: "row", gap: 10, marginBottom: 8, flexWrap: "wrap" },
  colorSwatch: { width: 44, height: 44, borderRadius: 14, borderWidth: 2, borderColor: "transparent", padding: 2 },
  colorSwatchActive: { borderColor: "#F1F5F9" },
  colorSwatchInner: { flex: 1, borderRadius: 10 },

  modalBtns: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center" },
  cancelTxt: { color: "#94A3B8", fontSize: 15, fontWeight: "600" },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#3B82F6", alignItems: "center" },
  saveTxt: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
