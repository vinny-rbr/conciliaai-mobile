import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Animated, Keyboard, Modal,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { listFinanceCategories } from "../../lib/financeCategoriesService";
import { listBankAccounts } from "../../lib/bankAccountsService";
import { apiUrl } from "../../lib/api";
import { getToken } from "../../lib/auth";
import type { FinanceCategoryOption, BankAccount } from "../../types/finance";
import type { RootStackParamList } from "../../navigation";
import { closeFabAnim } from "../../navigation/fabAnimState";

type RouteP = RouteProp<RootStackParamList, "LancarTransacao">;

const PAY_TYPES = [
  { key: "pix",     label: "Pix" },
  { key: "cash",    label: "Dinheiro" },
  { key: "debit",   label: "Débito" },
  { key: "credit",  label: "Crédito" },
];

function todayBR(): string {
  const d = new Date();
  return [
    String(d.getDate()).padStart(2, "0"),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getFullYear()),
  ].join("/");
}

function brToISO(br: string): string | null {
  const [d, m, y] = br.split("/");
  if (!d || !m || !y || y.length !== 4) return null;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function formatAmount(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function parseCents(formatted: string): number {
  const digits = formatted.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

export default function LancarTransacaoScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteP>();
  const type = route.params?.type ?? "RECEITA";
  const isReceita = type === "RECEITA";

  const accent = isReceita ? "#22C55E" : "#EF4444";

  const [title, setTitle]         = useState("");
  const [amount, setAmount]       = useState("");
  const [dateBR, setDateBR]       = useState(todayBR);
  const [payType, setPayType]     = useState("pix");
  const [paid, setPaid]           = useState(true);
  const [note, setNote]           = useState("");
  const [saving, setSaving]       = useState(false);

  const [categories, setCategories]   = useState<FinanceCategoryOption[]>([]);
  const [selectedCat, setSelectedCat] = useState<FinanceCategoryOption | null>(null);
  const [catModal, setCatModal]       = useState(false);

  const [accounts, setAccounts]       = useState<BankAccount[]>([]);
  const [selectedAcc, setSelectedAcc] = useState<BankAccount | null>(null);
  const [accModal, setAccModal]       = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 18 }).start();
    void loadData();
  }, []);

  const loadData = useCallback(async () => {
    const [cats, accs] = await Promise.all([
      listFinanceCategories().catch(() => [] as FinanceCategoryOption[]),
      listBankAccounts().catch(() => [] as BankAccount[]),
    ]);
    setCategories(cats.filter(c => c.type === type));
    setAccounts(accs);
    if (accs.length === 1) setSelectedAcc(accs[0]);
  }, [type]);

  const handleClose = useCallback(() => {
    closeFabAnim();
    navigation.goBack();
  }, [navigation]);

  async function handleSave() {
    if (!title.trim())  { Alert.alert("Atenção", "Digite uma descrição."); return; }
    if (!parseCents(amount)) { Alert.alert("Atenção", "Digite o valor."); return; }
    const dateISO = brToISO(dateBR);
    if (!dateISO) { Alert.alert("Atenção", "Data inválida. Use DD/MM/AAAA."); return; }

    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(apiUrl("/api/finance"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim(),
          category: selectedCat?.name ?? (isReceita ? "Receita" : "Despesa"),
          amountCents: parseCents(amount),
          dateISO,
          paymentType: payType,
          status: paid ? "paid" : "pending",
          accountId: selectedAcc?.id ?? null,
          note: note.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null) as { message?: string } | null;
        throw new Error(err?.message ?? `Erro ${res.status}`);
      }
      handleClose();
    } catch (e) {
      Alert.alert("Erro", e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  function handleAmountChange(text: string) {
    setAmount(formatAmount(text));
  }

  function handleDateChange(text: string) {
    let digits = text.replace(/\D/g, "").slice(0, 8);
    if (digits.length >= 5) digits = `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`;
    else if (digits.length >= 3) digits = `${digits.slice(0,2)}/${digits.slice(2)}`;
    setDateBR(digits);
  }

  const filteredCats = categories.filter(c => !c.parentId);
  const subCats = selectedCat ? categories.filter(c => c.parentId === selectedCat.id) : [];

  return (
    <Animated.View style={[s.root, { opacity: slideAnim }]}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={handleClose} style={s.backBtn}>
            <Text style={s.backTxt}>✕</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>{isReceita ? "Nova receita" : "Nova despesa"}</Text>
          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.6 }]}
            onPress={() => { Keyboard.dismiss(); void handleSave(); }}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.saveTxt}>Salvar</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={s.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Amount hero */}
          <View style={[s.amountBlock, { borderColor: accent + "44", backgroundColor: accent + "11" }]}>
            <Text style={s.currencySign}>R$</Text>
            <TextInput
              style={[s.amountInput, { color: accent }]}
              value={amount}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
              placeholder="0,00"
              placeholderTextColor={accent + "55"}
              returnKeyType="done"
            />
          </View>

          {/* Paid toggle */}
          <View style={s.toggleRow}>
            <TouchableOpacity
              style={[s.toggleBtn, paid && { backgroundColor: accent + "22", borderColor: accent }]}
              onPress={() => setPaid(true)}
            >
              <Text style={[s.toggleTxt, paid && { color: accent }]}>
                {isReceita ? "✓  Recebido" : "✓  Pago"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.toggleBtn, !paid && { backgroundColor: "#F59E0B22", borderColor: "#F59E0B" }]}
              onPress={() => setPaid(false)}
            >
              <Text style={[s.toggleTxt, !paid && { color: "#F59E0B" }]}>
                {isReceita ? "⏱  A receber" : "⏱  A pagar"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={s.field}>
            <Text style={s.label}>Descrição</Text>
            <TextInput
              style={s.input}
              value={title}
              onChangeText={setTitle}
              placeholder={isReceita ? "Ex: Salário, Freelance..." : "Ex: Aluguel, Mercado..."}
              placeholderTextColor="#475569"
              returnKeyType="next"
            />
          </View>

          {/* Date */}
          <View style={s.field}>
            <Text style={s.label}>Data</Text>
            <TextInput
              style={s.input}
              value={dateBR}
              onChangeText={handleDateChange}
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#475569"
              keyboardType="numeric"
              maxLength={10}
              returnKeyType="done"
            />
          </View>

          {/* Category */}
          <View style={s.field}>
            <Text style={s.label}>Categoria</Text>
            <TouchableOpacity style={s.selectBtn} onPress={() => setCatModal(true)}>
              {selectedCat ? (
                <View style={s.selectInner}>
                  <View style={[s.catDot, { backgroundColor: selectedCat.color }]}>
                    <Text style={{ fontSize: 14 }}>{selectedCat.icon}</Text>
                  </View>
                  <Text style={s.selectVal}>{selectedCat.name}</Text>
                </View>
              ) : (
                <Text style={s.selectPlaceholder}>Selecionar categoria</Text>
              )}
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
            {/* Subcategory chips */}
            {subCats.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {subCats.map(sc => (
                  <TouchableOpacity key={sc.id} style={[s.subChip, { borderColor: sc.color + "66" }]}>
                    <Text style={{ color: sc.color, fontSize: 12 }}>{sc.icon} {sc.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Payment type */}
          <View style={s.field}>
            <Text style={s.label}>Forma de pagamento</Text>
            <View style={s.chipRow}>
              {PAY_TYPES.map(pt => (
                <TouchableOpacity
                  key={pt.key}
                  style={[s.chip, payType === pt.key && { backgroundColor: accent + "22", borderColor: accent }]}
                  onPress={() => setPayType(pt.key)}
                >
                  <Text style={[s.chipTxt, payType === pt.key && { color: accent }]}>{pt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Account */}
          {accounts.length > 0 && (
            <View style={s.field}>
              <Text style={s.label}>Conta (opcional)</Text>
              <TouchableOpacity style={s.selectBtn} onPress={() => setAccModal(true)}>
                <Text style={selectedAcc ? s.selectVal : s.selectPlaceholder}>
                  {selectedAcc ? selectedAcc.nick || selectedAcc.bank : "Selecionar conta"}
                </Text>
                <Text style={s.chevron}>›</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Note */}
          <View style={s.field}>
            <Text style={s.label}>Observação (opcional)</Text>
            <TextInput
              style={[s.input, { minHeight: 72, textAlignVertical: "top" }]}
              value={note}
              onChangeText={setNote}
              placeholder="Adicionar nota..."
              placeholderTextColor="#475569"
              multiline
            />
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Category Modal */}
      <Modal visible={catModal} transparent animationType="slide" onRequestClose={() => setCatModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Categoria</Text>
              <TouchableOpacity onPress={() => setCatModal(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
              {filteredCats.length === 0 ? (
                <Text style={s.emptyTxt}>Nenhuma categoria cadastrada.</Text>
              ) : (
                filteredCats.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.catRow, selectedCat?.id === c.id && { backgroundColor: c.color + "18", borderColor: c.color }]}
                    onPress={() => { setSelectedCat(c); setCatModal(false); }}
                  >
                    <View style={[s.catDot, { backgroundColor: c.color + "33" }]}>
                      <Text style={{ fontSize: 18 }}>{c.icon}</Text>
                    </View>
                    <Text style={s.catName}>{c.name}</Text>
                    {selectedCat?.id === c.id && <Text style={[s.checkMark, { color: c.color }]}>✓</Text>}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Account Modal */}
      <Modal visible={accModal} transparent animationType="slide" onRequestClose={() => setAccModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Conta</Text>
              <TouchableOpacity onPress={() => setAccModal(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
              <TouchableOpacity
                style={[s.catRow, !selectedAcc && { backgroundColor: "#3B82F618", borderColor: "#3B82F6" }]}
                onPress={() => { setSelectedAcc(null); setAccModal(false); }}
              >
                <Text style={s.catName}>Sem conta específica</Text>
                {!selectedAcc && <Text style={[s.checkMark, { color: "#3B82F6" }]}>✓</Text>}
              </TouchableOpacity>
              {accounts.map(a => (
                <TouchableOpacity
                  key={a.id}
                  style={[s.catRow, selectedAcc?.id === a.id && { backgroundColor: "#3B82F618", borderColor: "#3B82F6" }]}
                  onPress={() => { setSelectedAcc(a); setAccModal(false); }}
                >
                  <Text style={s.catName}>{a.nick || a.bank}</Text>
                  {selectedAcc?.id === a.id && <Text style={[s.checkMark, { color: "#3B82F6" }]}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A1628" },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#1E293B", alignItems: "center", justifyContent: "center" },
  backTxt: { color: "#94A3B8", fontSize: 16, fontWeight: "700" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "#F1F5F9" },
  saveBtn: { backgroundColor: "#3B82F6", borderRadius: 10, paddingHorizontal: 18, paddingVertical: 9, minWidth: 72, alignItems: "center" },
  saveTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },

  body: { paddingHorizontal: 16, paddingBottom: 40, gap: 20 },

  amountBlock: { borderRadius: 18, borderWidth: 1.5, flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, gap: 6 },
  currencySign: { color: "#94A3B8", fontSize: 22, fontWeight: "700" },
  amountInput: { flex: 1, fontSize: 36, fontWeight: "800", letterSpacing: 0.5 },

  toggleRow: { flexDirection: "row", gap: 10 },
  toggleBtn: { flex: 1, borderRadius: 12, borderWidth: 1.5, borderColor: "#334155", paddingVertical: 12, alignItems: "center" },
  toggleTxt: { fontSize: 13, fontWeight: "700", color: "#64748B" },

  field: { gap: 6 },
  label: { color: "#94A3B8", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: "#1E293B", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: "#F1F5F9", fontSize: 15, borderWidth: 1, borderColor: "#334155" },

  selectBtn: { backgroundColor: "#1E293B", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#334155" },
  selectInner: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  selectVal: { color: "#F1F5F9", fontSize: 15, flex: 1 },
  selectPlaceholder: { color: "#475569", fontSize: 15, flex: 1 },
  chevron: { color: "#475569", fontSize: 20 },

  catDot: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  subChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#334155", marginRight: 8, backgroundColor: "#1E293B" },

  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: "#334155", backgroundColor: "#1E293B" },
  chipTxt: { color: "#64748B", fontSize: 13, fontWeight: "600" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#0F172A", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "75%", paddingBottom: 24 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#334155", alignSelf: "center", marginTop: 12 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16 },
  modalTitle: { fontSize: 17, fontWeight: "800", color: "#F1F5F9" },
  modalClose: { color: "#64748B", fontSize: 18, padding: 4 },

  catRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "transparent", marginBottom: 8, backgroundColor: "#1E293B", gap: 12 },
  catName: { flex: 1, color: "#F1F5F9", fontSize: 15, fontWeight: "600" },
  checkMark: { fontSize: 16, fontWeight: "800" },
  emptyTxt: { color: "#64748B", textAlign: "center", marginTop: 24 },
});
