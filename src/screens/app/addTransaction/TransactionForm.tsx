import React from "react";
import {
  ActivityIndicator, Animated, Keyboard, Modal,
  ScrollView, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { BankAccount, FinanceCategoryOption, FinanceItem } from "../../../types/finance";
import { PAY_TYPES, TxType, f, m, fmtAmount as _fmtAmount } from "./shared";

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
  rootCats: FinanceCategoryOption[];
  selectedCat: FinanceCategoryOption | null;
  setSelectedCat: (v: FinanceCategoryOption | null) => void;
  catModal: boolean;        setCatModal: (v: boolean) => void;
  expandedCatId: string | null;
  setExpandedCatId: (v: string | null) => void;

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
  recurringAction: "edit" | "delete" | null;
  setRecurringAction: (v: "edit" | "delete" | null) => void;

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
  payType, setPayType, paid, setPaid, note, setNote, saving,
  categories, rootCats, selectedCat, setSelectedCat, catModal, setCatModal, expandedCatId, setExpandedCatId,
  accounts, selectedAcc, setSelectedAcc, accModal, setAccModal,
  isRecurring, setIsRecurring, recurringMode, setRecurringMode, recurringMonths, setRecurringMonths,
  recurringAction, setRecurringAction, deleteModal, setDeleteModal,
  onClose, onSave, onPerformSave, onPerformDelete,
}: Props) {
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

        <ScrollView contentContainerStyle={f.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
            <TextInput
              style={f.input}
              value={dateBR}
              onChangeText={onDateChange}
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#475569"
              keyboardType="numeric"
              maxLength={10}
            />
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
          {!editItem ? (
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
                  <Text style={f.toggleCardSub}>Repete nos próximos meses automaticamente</Text>
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
          ) : editItem.recurringGroupId ? (
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#3B82F611", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#3B82F622", gap: 8 }}>
              <Text style={{ fontSize: 16 }}>🔄</Text>
              <Text style={{ color: "#60A5FA", fontSize: 13, fontWeight: "600", flex: 1 }}>Gasto fixo mensal</Text>
            </View>
          ) : null}

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
            />
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* ── Modal: categoria ──────────────────────────────────────── */}
      <Modal
        visible={catModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setCatModal(false); setExpandedCatId(null); }}
      >
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.handle} />
            <View style={m.mHeader}>
              <Text style={m.mTitle}>Categoria</Text>
              <TouchableOpacity onPress={() => { setCatModal(false); setExpandedCatId(null); }}>
                <Text style={m.mClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
              {rootCats.length === 0
                ? <Text style={m.empty}>Nenhuma categoria.</Text>
                : rootCats.map(c => {
                    const children   = categories.filter(sub => sub.parentId === c.id);
                    const isExpanded = expandedCatId === c.id;
                    const isSelected = selectedCat?.id === c.id;
                    return (
                      <View key={c.id}>
                        <TouchableOpacity
                          style={[m.row, isSelected && { backgroundColor: c.color + "18", borderColor: c.color }]}
                          onPress={() => {
                            if (children.length > 0) setExpandedCatId(isExpanded ? null : c.id);
                            else { setSelectedCat(c); setCatModal(false); setExpandedCatId(null); }
                          }}
                        >
                          <View style={[f.catDot, { backgroundColor: c.color + "33" }]}>
                            <Text style={{ fontSize: 18 }}>{c.icon}</Text>
                          </View>
                          <Text style={[m.rowName, { flex: 1 }]}>{c.name}</Text>
                          {isSelected && <Text style={[m.check, { color: c.color }]}>✓</Text>}
                          {children.length > 0 && (
                            <Text style={{ color: "#64748B", fontSize: 12, marginLeft: 4 }}>
                              {isExpanded ? "▲" : "▼"}
                            </Text>
                          )}
                        </TouchableOpacity>
                        {isExpanded && children.map(sub => (
                          <TouchableOpacity
                            key={sub.id}
                            style={[m.row, { marginLeft: 16, marginTop: -4 }, selectedCat?.id === sub.id && { backgroundColor: sub.color + "18", borderColor: sub.color }]}
                            onPress={() => { setSelectedCat(sub); setCatModal(false); setExpandedCatId(null); }}
                          >
                            <View style={[f.catDot, { backgroundColor: sub.color + "33", width: 36, height: 36 }]}>
                              <Text style={{ fontSize: 15 }}>{sub.icon}</Text>
                            </View>
                            <Text style={[m.rowName, { flex: 1, fontSize: 13 }]}>{sub.name}</Text>
                            {selectedCat?.id === sub.id && <Text style={[m.check, { color: sub.color }]}>✓</Text>}
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })
              }
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
                : "Deseja alterar apenas este lançamento\nou todos os do grupo?"}
            </Text>
            <View style={{ gap: 10 }}>
              <TouchableOpacity
                style={{ backgroundColor: "#3B82F6", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
                activeOpacity={0.8}
                onPress={() => {
                  const action = recurringAction;
                  setRecurringAction(null);
                  void (action === "delete" ? onPerformDelete("one") : onPerformSave("one"));
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
                  void (action === "delete" ? onPerformDelete("all") : onPerformSave("all"));
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
