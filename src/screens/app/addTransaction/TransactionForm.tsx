import React, { useRef, useState, useEffect } from "react";
import {
  ActivityIndicator, Animated, Keyboard, Modal, Platform,
  ScrollView, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { BankAccount, FinanceCategoryOption, FinanceItem } from "../../../types/finance";
import { PAY_TYPES, TxType, f, m, fmtAmount as _fmtAmount, monthLabel } from "./shared";
import { CategoryTreeModal } from "../../../components/CategoryTreeModal";

type Props = {
  formSlide: Animated.Value;
  formType: TxType;
  editItem: FinanceItem | undefined;
  accent: string;

  // form fields
  title: string;        setTitle: (v: string) => void;
  amount: string;       setAmount: (v: string) => void;
  dateBR: string;       onDateChange: (text: string) => void;
  payType: string;      setPayType: (v: string) => void;
  paid: boolean;        setPaid: (v: boolean) => void;
  note: string;         setNote: (v: string) => void;
  saving: boolean;

  // categories
  categories: FinanceCategoryOption[];
  selectedCat: FinanceCategoryOption | null;
  setSelectedCat: (v: FinanceCategoryOption | null) => void;
  catModal: boolean;        setCatModal: (v: boolean) => void;

  // accounts
  accounts: BankAccount[];
  selectedAcc: BankAccount | null;
  setSelectedAcc: (v: BankAccount | null) => void;
  accModal: boolean;        setAccModal: (v: boolean) => void;

  // recurring
  isRecurring: boolean;
  setIsRecurring: React.Dispatch<React.SetStateAction<boolean>>;
  recurringMode: "forever" | "months";
  setRecurringMode: (v: "forever" | "months") => void;
  recurringMonths: string;
  setRecurringMonths: (v: string) => void;
  recurringAction: "edit" | "delete" | "unset" | null;
  setRecurringAction: (v: "edit" | "delete" | "unset" | null) => void;

  // recorrência: meses apagados na série (null = modal escondido)
  recurringGaps: string[] | null;
  onRefillConfirm: (recreate: boolean) => void;
  onRefillCancel: () => void;

  // recorrência: buracos detectados ao abrir (banner inline) + ação de desativar
  seriesGaps: string[];
  onFixGaps: () => void;
  onPerformUnset: (scope: "one" | "all") => Promise<void>;

  // tags
  tags: string; setTags: (v: string) => void;
  availableTags: string[];

  // delete
  deleteModal: boolean; setDeleteModal: (v: boolean) => void;

  // callbacks
  onClose: () => void;
  onSave: () => void;
  onPerformSave: (scope: "one" | "all") => Promise<void>;
  onPerformDelete: (scope: "one" | "all") => Promise<void>;
};

export default function TransactionForm({
  formSlide, formType, editItem, accent,
  title, setTitle, amount, setAmount, dateBR, onDateChange,
  payType, setPayType, paid, setPaid, note, setNote, tags, setTags, availableTags, saving,
  categories, selectedCat, setSelectedCat, catModal, setCatModal,
  accounts, selectedAcc, setSelectedAcc, accModal, setAccModal,
  isRecurring, setIsRecurring, recurringMode, setRecurringMode, recurringMonths, setRecurringMonths,
  recurringAction, setRecurringAction, deleteModal, setDeleteModal,
  recurringGaps, onRefillConfirm, onRefillCancel,
  seriesGaps, onFixGaps, onPerformUnset,
  onClose, onSave, onPerformSave, onPerformDelete,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);
  const [tagModal, setTagModal] = useState(false);
  const [tagSearch, setTagSearch] = useState("");

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", e => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const selectedTags = tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [];
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) setTags(selectedTags.filter(t => t !== tag).join(","));
    else setTags([...selectedTags, tag].join(","));
  };
  const filteredTags = availableTags.filter(t => t.toLowerCase().includes(tagSearch.trim().toLowerCase()));

  const parseBRDate = (str: string): Date => {
    const [d, mo, y] = str.split("/").map(Number);
    if (!d || !mo || !y) return new Date();
    return new Date(y, mo - 1, d);
  };
  const formatBRDate = (dt: Date): string =>
    `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;

  return (
    <Animated.View style={[f.root, { transform: [{ translateY: formSlide }] }]}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={f.header}>
          <TouchableOpacity onPress={onClose} style={f.backBtn}>
            <Text style={f.backTxt}>✕</Text>
          </TouchableOpacity>
          <Text style={f.headerTitle}>
            {editItem
              ? (formType === "RECEITA" ? "Editar receita" : "Editar despesa")
              : (formType === "RECEITA" ? "Nova receita"   : "Nova despesa")}
          </Text>
          {editItem && (
            <TouchableOpacity style={f.deleteBtn} onPress={() => {
              if (editItem.recurringGroupId) setRecurringAction("delete");
              else setDeleteModal(true);
            }}>
              <Text style={f.deleteTxt}>🗑</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[f.saveBtn, saving && { opacity: 0.6 }]}
            onPress={() => { Keyboard.dismiss(); onSave(); }}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={f.saveTxt}>Salvar</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[f.body, { paddingBottom: 60 + kbHeight }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Valor */}
          <View style={[f.amountBlock, { borderColor: accent + "44", backgroundColor: accent + "11" }]}>
            <Text style={f.currencySign}>R$</Text>
            <TextInput
              style={[f.amountInput, { color: accent }]}
              value={amount}
              onChangeText={v => setAmount(_fmtAmount(v))}
              keyboardType="numeric"
              placeholder="0,00"
              placeholderTextColor={accent + "55"}
              returnKeyType="done"
            />
          </View>

          {/* Status */}
          <View style={f.toggleRow}>
            <TouchableOpacity
              style={[f.toggleBtn, paid && { backgroundColor: accent + "22", borderColor: accent }]}
              onPress={() => setPaid(true)}
            >
              <Text style={[f.toggleTxt, paid && { color: accent }]}>
                {formType === "RECEITA" ? "✓  Recebido" : "✓  Pago"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[f.toggleBtn, !paid && { backgroundColor: "#F59E0B22", borderColor: "#F59E0B" }]}
              onPress={() => setPaid(false)}
            >
              <Text style={[f.toggleTxt, !paid && { color: "#F59E0B" }]}>
                {formType === "RECEITA" ? "⏱  A receber" : "⏱  A pagar"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Descrição */}
          <View style={f.field}>
            <Text style={f.label}>Descrição</Text>
            <TextInput
              style={f.input}
              value={title}
              onChangeText={setTitle}
              placeholder={formType === "RECEITA" ? "Ex: Salário, Freelance..." : "Ex: Aluguel, Mercado..."}
              placeholderTextColor="#475569"
              returnKeyType="next"
            />
          </View>

          {/* Data */}
          <View style={f.field}>
            <Text style={f.label}>Data</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                style={[f.input, { flex: 1 }]}
                value={dateBR}
                onChangeText={onDateChange}
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#475569"
                keyboardType="numeric"
                maxLength={10}
              />
              <TouchableOpacity
                style={[f.input, { width: 52, alignItems: "center", justifyContent: "center" }]}
                onPress={() => { Keyboard.dismiss(); setShowDatePicker(true); }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 20 }}>📅</Text>
              </TouchableOpacity>
            </View>
            {showDatePicker && (
              <DateTimePicker
                value={parseBRDate(dateBR)}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "calendar"}
                onChange={(event, selected) => {
                  setShowDatePicker(false);
                  if (event.type === "set" && selected) onDateChange(formatBRDate(selected));
                }}
              />
            )}
          </View>

          {/* Categoria */}
          <View style={f.field}>
            <Text style={f.label}>Categoria</Text>
            <TouchableOpacity style={f.selectBtn} onPress={() => setCatModal(true)}>
              {selectedCat ? (
                <View style={f.selectInner}>
                  <View style={[f.catDot, { backgroundColor: selectedCat.color + "33" }]}>
                    <Text style={{ fontSize: 14 }}>{selectedCat.icon}</Text>
                  </View>
                  <Text style={f.selectVal}>{selectedCat.name}</Text>
                </View>
              ) : (
                <Text style={f.selectPlaceholder}>Selecionar categoria</Text>
              )}
              <Text style={f.chevronTxt}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Forma de pagamento */}
          <View style={f.field}>
            <Text style={f.label}>Forma de pagamento</Text>
            <View style={f.chipRow}>
              {PAY_TYPES.map(pt => (
                <TouchableOpacity
                  key={pt.key}
                  style={[f.chip, payType === pt.key && { backgroundColor: accent + "22", borderColor: accent }]}
                  onPress={() => setPayType(pt.key)}
                >
                  <Text style={[f.chipTxt, payType === pt.key && { color: accent }]}>{pt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recorrência */}
          {editItem?.recurringGroupId ? (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#3B82F611", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#3B82F622", gap: 8 }}>
                <Text style={{ fontSize: 16 }}>🔄</Text>
                <Text style={{ color: "#60A5FA", fontSize: 13, fontWeight: "600", flex: 1 }}>Gasto fixo mensal</Text>
                <TouchableOpacity onPress={() => setRecurringAction("unset")} activeOpacity={0.7}>
                  <Text style={{ color: "#94A3B8", fontSize: 12, fontWeight: "700" }}>Desativar</Text>
                </TouchableOpacity>
              </View>

              {seriesGaps.length > 0 && (
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F59E0B14", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#F59E0B33", gap: 10 }}>
                  <Text style={{ fontSize: 16 }}>⚠️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#FBBF24", fontSize: 13, fontWeight: "700" }}>Faltam meses nesta série</Text>
                    <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
                      {seriesGaps.map(monthLabel).join(", ")} apagado{seriesGaps.length > 1 ? "s" : ""}.
                    </Text>
                  </View>
                  <TouchableOpacity onPress={onFixGaps} activeOpacity={0.8} style={{ backgroundColor: "#F59E0B", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Text style={{ color: "#0F172A", fontSize: 12, fontWeight: "800" }}>Corrigir</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <TouchableOpacity
                style={[f.toggleCard, isRecurring && f.toggleCardActive]}
                onPress={() => setIsRecurring(v => !v)}
                activeOpacity={0.8}
              >
                <View style={[f.toggleCardIcon, { backgroundColor: "#3B82F618" }]}>
                  <Text style={{ fontSize: 18 }}>🔄</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={f.toggleCardTitle}>Gasto fixo mensal</Text>
                  <Text style={f.toggleCardSub}>
                    {editItem ? "Marca como fixo e cria os próximos meses" : "Repete nos próximos meses automaticamente"}
                  </Text>
                </View>
                <View style={[f.switchTrack, isRecurring && { backgroundColor: "#3B82F6" }]}>
                  <View style={[f.switchThumb, isRecurring && { transform: [{ translateX: 18 }] }]} />
                </View>
              </TouchableOpacity>

              {isRecurring && (
                <>
                  <TouchableOpacity
                    style={[f.radioCard, recurringMode === "forever" && f.radioCardActive]}
                    onPress={() => setRecurringMode("forever")}
                    activeOpacity={0.8}
                  >
                    <View style={[f.radioCircle, recurringMode === "forever" && f.radioCircleActive]}>
                      {recurringMode === "forever" && <View style={f.radioDot} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={f.radioTitle}>Sem data para acabar</Text>
                      <Text style={f.radioSub}>Cria os próximos 12 meses agora.</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[f.radioCard, recurringMode === "months" && f.radioCardActive]}
                    onPress={() => setRecurringMode("months")}
                    activeOpacity={0.8}
                  >
                    <View style={[f.radioCircle, recurringMode === "months" && f.radioCircleActive]}>
                      {recurringMode === "months" && <View style={f.radioDot} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={f.radioTitle}>Por alguns meses</Text>
                      <Text style={f.radioSub}>Você escolhe a quantidade de parcelas mensais.</Text>
                    </View>
                  </TouchableOpacity>
                  {recurringMode === "months" && (
                    <View style={f.field}>
                      <Text style={f.label}>Quantidade de meses</Text>
                      <TextInput
                        style={f.input}
                        value={recurringMonths}
                        onChangeText={v => setRecurringMonths(v.replace(/\D/g, ""))}
                        keyboardType="numeric"
                        placeholder="12"
                        placeholderTextColor="#475569"
                        returnKeyType="done"
                      />
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Conta */}
          {accounts.length > 0 && (
            <View style={f.field}>
              <Text style={f.label}>Conta (opcional)</Text>
              <TouchableOpacity style={f.selectBtn} onPress={() => setAccModal(true)}>
                <Text style={selectedAcc ? f.selectVal : f.selectPlaceholder}>
                  {selectedAcc ? selectedAcc.nick || selectedAcc.bank : "Selecionar conta"}
                </Text>
                <Text style={f.chevronTxt}>›</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Tags */}
          <View style={f.field}>
            <Text style={f.label}>Tags (opcional)</Text>
            <TouchableOpacity style={f.selectBtn} onPress={() => { Keyboard.dismiss(); setTagSearch(""); setTagModal(true); }}>
              <Text style={selectedTags.length ? f.selectVal : f.selectPlaceholder}>
                {selectedTags.length ? selectedTags.map(t => `#${t}`).join("  ") : "Selecionar tags"}
              </Text>
              <Text style={f.chevronTxt}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Observação */}
          <View style={f.field}>
            <Text style={f.label}>Observação (opcional)</Text>
            <TextInput
              style={[f.input, { minHeight: 72, textAlignVertical: "top" }]}
              value={note}
              onChangeText={setNote}
              placeholder="Adicionar nota..."
              placeholderTextColor="#475569"
              multiline
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250)}
            />
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* ── Modal: categoria ──────────────────────────────────────── */}
      <CategoryTreeModal
        visible={catModal}
        onClose={() => setCatModal(false)}
        categories={categories}
        selectedCat={selectedCat}
        onSelect={c => { setSelectedCat(c); setCatModal(false); }}
      />

      {/* ── Modal: seletor de tags (busca nas cadastradas) ────────── */}
      <Modal visible={tagModal} transparent animationType="slide" onRequestClose={() => setTagModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,.6)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#0F172A", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: "#334155", maxHeight: "75%", paddingTop: 16, paddingBottom: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 12 }}>
              <Text style={{ color: "#F1F5F9", fontSize: 17, fontWeight: "800" }}>Tags</Text>
              <TouchableOpacity onPress={() => setTagModal(false)}>
                <Text style={{ color: "#60A5FA", fontSize: 15, fontWeight: "700" }}>Concluir</Text>
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
              <TextInput
                style={[f.input]}
                value={tagSearch}
                onChangeText={setTagSearch}
                placeholder="Pesquisar tags..."
                placeholderTextColor="#475569"
                autoCapitalize="none"
              />
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" style={{ paddingHorizontal: 20 }}>
              {availableTags.length === 0 ? (
                <Text style={{ color: "#64748B", fontSize: 14, textAlign: "center", paddingVertical: 24, lineHeight: 20 }}>
                  Nenhuma tag cadastrada ainda.{"\n"}Crie suas tags na aba Tags.
                </Text>
              ) : filteredTags.length === 0 ? (
                <Text style={{ color: "#64748B", fontSize: 14, textAlign: "center", paddingVertical: 24 }}>
                  Nenhuma tag encontrada para "{tagSearch}".
                </Text>
              ) : (
                filteredTags.map(tag => {
                  const isSel = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => toggleTag(tag)}
                      activeOpacity={0.7}
                      style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#1E293B" }}
                    >
                      <Text style={{ color: isSel ? "#93C5FD" : "#E2E8F0", fontSize: 15, fontWeight: isSel ? "700" : "500" }}>#{tag}</Text>
                      <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: isSel ? "#3B82F6" : "#334155", backgroundColor: isSel ? "#3B82F6" : "transparent", alignItems: "center", justifyContent: "center" }}>
                        {isSel && <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800" }}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modal: conta ─────────────────────────────────────────── */}
      <Modal visible={accModal} transparent animationType="slide" onRequestClose={() => setAccModal(false)}>
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.handle} />
            <View style={m.mHeader}>
              <Text style={m.mTitle}>Conta</Text>
              <TouchableOpacity onPress={() => setAccModal(false)}>
                <Text style={m.mClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
              <TouchableOpacity
                style={[m.row, !selectedAcc && { backgroundColor: "#3B82F618", borderColor: "#3B82F6" }]}
                onPress={() => { setSelectedAcc(null); setAccModal(false); }}
              >
                <Text style={m.rowName}>Sem conta específica</Text>
                {!selectedAcc && <Text style={[m.check, { color: "#3B82F6" }]}>✓</Text>}
              </TouchableOpacity>
              {accounts.map(a => (
                <TouchableOpacity
                  key={a.id}
                  style={[m.row, selectedAcc?.id === a.id && { backgroundColor: "#3B82F618", borderColor: "#3B82F6" }]}
                  onPress={() => { setSelectedAcc(a); setAccModal(false); }}
                >
                  <Text style={m.rowName}>{a.nick || a.bank}</Text>
                  {selectedAcc?.id === a.id && <Text style={[m.check, { color: "#3B82F6" }]}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modal: escopo recorrente ──────────────────────────────── */}
      <Modal visible={recurringAction !== null} transparent animationType="fade" onRequestClose={() => setRecurringAction(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,.65)", justifyContent: "center", alignItems: "center", padding: 28 }}>
          <View style={{ backgroundColor: "#1E293B", borderRadius: 20, padding: 24, width: "100%", borderWidth: 1, borderColor: "#334155" }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: "#3B82F618", alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 16, borderWidth: 1, borderColor: "#3B82F633" }}>
              <Text style={{ fontSize: 22 }}>🔄</Text>
            </View>
            <Text style={{ color: "#F1F5F9", fontSize: 17, fontWeight: "800", textAlign: "center", marginBottom: 8 }}>
              Gasto fixo mensal
            </Text>
            <Text style={{ color: "#64748B", fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 20 }}>
              {recurringAction === "delete"
                ? "Deseja excluir apenas este lançamento\nou todos os do grupo?"
                : recurringAction === "unset"
                ? "Deseja tirar a recorrência apenas deste\nmês ou de toda a série? (mantém os lançamentos)"
                : "Deseja alterar apenas este lançamento\nou todos os do grupo?"}
            </Text>
            <View style={{ gap: 10 }}>
              <TouchableOpacity
                style={{ backgroundColor: "#3B82F6", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
                activeOpacity={0.8}
                onPress={() => {
                  const action = recurringAction;
                  setRecurringAction(null);
                  void (action === "delete" ? onPerformDelete("one") : action === "unset" ? onPerformUnset("one") : onPerformSave("one"));
                }}
              >
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>Só este lançamento</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: "#0F172A", borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#334155" }}
                activeOpacity={0.8}
                onPress={() => {
                  const action = recurringAction;
                  setRecurringAction(null);
                  void (action === "delete" ? onPerformDelete("all") : action === "unset" ? onPerformUnset("all") : onPerformSave("all"));
                }}
              >
                <Text style={{ color: "#F1F5F9", fontSize: 14, fontWeight: "700" }}>Todos do grupo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ paddingVertical: 10, alignItems: "center" }} onPress={() => setRecurringAction(null)}>
                <Text style={{ color: "#64748B", fontSize: 14, fontWeight: "700" }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal: meses apagados na série (buracos) ──────────────── */}
      <Modal visible={recurringGaps !== null} transparent animationType="fade" onRequestClose={onRefillCancel}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,.65)", justifyContent: "center", alignItems: "center", padding: 28 }}>
          <View style={{ backgroundColor: "#1E293B", borderRadius: 20, padding: 24, width: "100%", borderWidth: 1, borderColor: "#334155" }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: "#F59E0B18", alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 16, borderWidth: 1, borderColor: "#F59E0B33" }}>
              <Text style={{ fontSize: 22 }}>🔄</Text>
            </View>
            <Text style={{ color: "#F1F5F9", fontSize: 17, fontWeight: "800", textAlign: "center", marginBottom: 8 }}>
              Meses apagados nesta série
            </Text>
            <Text style={{ color: "#64748B", fontSize: 14, textAlign: "center", marginBottom: 16, lineHeight: 20 }}>
              Encontramos meses faltando no gasto fixo. Deseja recriá-los ao atualizar?
            </Text>
            <View style={{ backgroundColor: "#0F172A", borderRadius: 12, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: "#334155", maxHeight: 140 }}>
              <ScrollView>
                {(recurringGaps ?? []).map(ym => (
                  <Text key={ym} style={{ color: "#FBBF24", fontSize: 13, fontWeight: "700", textAlign: "center", paddingVertical: 2 }}>
                    {monthLabel(ym)}
                  </Text>
                ))}
              </ScrollView>
            </View>
            <TouchableOpacity
              style={{ backgroundColor: "#3B82F6", borderRadius: 14, paddingVertical: 14, alignItems: "center", marginBottom: 10 }}
              activeOpacity={0.8}
              onPress={() => onRefillConfirm(true)}
            >
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>Sim, recriar os meses</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ backgroundColor: "#0F172A", borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#334155", marginBottom: 4 }}
              activeOpacity={0.8}
              onPress={() => onRefillConfirm(false)}
            >
              <Text style={{ color: "#F1F5F9", fontSize: 14, fontWeight: "700" }}>Não, só atualizar os existentes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ paddingVertical: 10, alignItems: "center" }} onPress={onRefillCancel}>
              <Text style={{ color: "#64748B", fontSize: 14, fontWeight: "700" }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal: confirmar exclusão ─────────────────────────────── */}
      <Modal visible={deleteModal} transparent animationType="fade" onRequestClose={() => setDeleteModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,.65)", justifyContent: "center", alignItems: "center", padding: 28 }}>
          <View style={{ backgroundColor: "#1E293B", borderRadius: 20, padding: 24, width: "100%", borderWidth: 1, borderColor: "#334155" }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: "#EF444418", alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 16, borderWidth: 1, borderColor: "#EF444433" }}>
              <Text style={{ fontSize: 22 }}>🗑</Text>
            </View>
            <Text style={{ color: "#F1F5F9", fontSize: 17, fontWeight: "800", textAlign: "center", marginBottom: 8 }}>
              Excluir lançamento
            </Text>
            <Text style={{ color: "#64748B", fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 20 }}>
              Tem certeza? Esta ação{"\n"}não pode ser desfeita.
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: "#0F172A", borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#334155" }}
                onPress={() => setDeleteModal(false)}
                activeOpacity={0.8}
              >
                <Text style={{ color: "#94A3B8", fontSize: 14, fontWeight: "700" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: "#EF4444", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
                onPress={() => void onPerformDelete("one")}
                activeOpacity={0.8}
              >
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}
