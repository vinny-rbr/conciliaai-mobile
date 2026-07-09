import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Animated, Keyboard,
  ScrollView, Text, TextInput, TouchableOpacity, View,
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
import { PAY_TYPES, todayBR, brToISO, formatAmount, parseCents, s } from "./lancarTransacao/shared";
import { CategoryModal, AccountModal } from "./lancarTransacao/Modals";
import { KeyboardAwareScroll } from "../../components/KeyboardAwareScroll";

type RouteP = RouteProp<RootStackParamList, "LancarTransacao">;

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
    if (!title.trim())       { Alert.alert("Atenção", "Digite uma descrição."); return; }
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
          type, title: title.trim(),
          category: selectedCat?.name ?? (isReceita ? "Receita" : "Despesa"),
          amountCents: parseCents(amount), dateISO,
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

  function handleAmountChange(text: string) { setAmount(formatAmount(text)); }

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
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveTxt}>Salvar</Text>}
          </TouchableOpacity>
        </View>

        <KeyboardAwareScroll contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
        </KeyboardAwareScroll>
      </SafeAreaView>

      <CategoryModal
        visible={catModal}
        onClose={() => setCatModal(false)}
        categories={categories}
        selectedCat={selectedCat}
        onSelect={c => { setSelectedCat(c); setCatModal(false); }}
      />
      <AccountModal
        visible={accModal}
        onClose={() => setAccModal(false)}
        accounts={accounts}
        selectedAcc={selectedAcc}
        onSelect={a => { setSelectedAcc(a); setAccModal(false); }}
      />
    </Animated.View>
  );
}
