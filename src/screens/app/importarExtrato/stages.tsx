import { useRef, useState } from "react";
import {
  ActivityIndicator, Modal, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import { TagsMultiSelect } from "../../../components/TagsMultiSelect";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import type { ParsedItem } from "../../../lib/ofxParser";
import type { BankAccount, FinanceCategoryOption } from "../../../types/finance";
import { fmt } from "../../../lib/financeService";
import { fmtDate, s } from "./shared";

type SelectedItem = ParsedItem & { selected: boolean };

// ── Pick ─────────────────────────────────────────────────────────────────────
type PickStepProps = { onPick: () => void; loading: boolean; onGoBack: () => void };

export function PickStep({ onPick, loading, onGoBack }: PickStepProps) {
  return (
    <>
      <View style={s.header}>
        <TouchableOpacity onPress={onGoBack} style={s.backBtn}>
          <Text style={s.backTxt}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Importar extrato</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={s.pickBody}>
        <View style={s.pickCard}>
          <Text style={s.pickIcon}>📄</Text>
          <Text style={s.pickTitle}>Selecione o arquivo do extrato</Text>
          <Text style={s.pickSub}>Formatos suportados:{"\n"}OFX · CSV</Text>
          <Text style={s.pickHint}>
            No seu banco, acesse "Exportar extrato" ou "Baixar OFX" e escolha o período desejado.
          </Text>
        </View>
        <TouchableOpacity style={s.pickBtn} activeOpacity={0.8} onPress={onPick} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.pickBtnTxt}>Escolher arquivo</Text>}
        </TouchableOpacity>
        <View style={s.bankRow}>
          {["Nubank","Itaú","BB","Inter","Bradesco","Caixa","Santander"].map(b => (
            <View key={b} style={s.bankChip}><Text style={s.bankChipTxt}>{b}</Text></View>
          ))}
        </View>
      </View>
    </>
  );
}

// ── Importing ─────────────────────────────────────────────────────────────────
type ImportingStepProps = { totalSel: number };

export function ImportingStep({ totalSel }: ImportingStepProps) {
  return (
    <View style={s.centerFull}>
      <ActivityIndicator color="#3B82F6" size="large" />
      <Text style={s.importingTxt}>Salvando lançamentos…</Text>
      <Text style={s.importingSub}>{totalSel} itens</Text>
    </View>
  );
}

// ── Done ─────────────────────────────────────────────────────────────────────
type DoneStepProps = { added: number; skipped: number; onGoBack: () => void };

export function DoneStep({ added, skipped, onGoBack }: DoneStepProps) {
  return (
    <View style={s.centerFull}>
      <Text style={s.doneIcon}>✓</Text>
      <Text style={s.doneTitle}>Importação concluída!</Text>
      <Text style={s.doneSub}>
        {added} lançamentos salvos{skipped > 0 ? ` · ${skipped} ignorados` : ""}
      </Text>
      <TouchableOpacity style={s.doneBtn} onPress={onGoBack}>
        <Text style={s.doneBtnTxt}>Voltar para o início</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Adjust ───────────────────────────────────────────────────────────────────
type AdjustStepProps = {
  bankCents: number;
  appCents: number;
  dateISO: string;
  onApply: () => void;
  onSkip: () => void;
};

export function AdjustStep({ bankCents, appCents, dateISO, onApply, onSkip }: AdjustStepProps) {
  const diff = bankCents - appCents;
  const isPositive = diff > 0;
  return (
    <View style={s.centerFull}>
      <Text style={{ fontSize: 40, marginBottom: 16 }}>⚖️</Text>
      <Text style={[s.doneTitle, { marginBottom: 8 }]}>Ajuste de saldo</Text>
      <Text style={{ color: "#94A3B8", fontSize: 13, textAlign: "center", marginBottom: 24, paddingHorizontal: 24, lineHeight: 20 }}>
        O saldo do banco em {fmtDate(dateISO)} difere do calculado no app.
      </Text>
      <View style={{ backgroundColor: "#1E293B", borderRadius: 16, padding: 20, width: "85%", marginBottom: 28, borderWidth: 1, borderColor: "#334155" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={{ color: "#94A3B8", fontSize: 13 }}>Saldo do banco</Text>
          <Text style={{ color: "#F1F5F9", fontSize: 14, fontWeight: "700" }}>{fmt(bankCents)}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={{ color: "#94A3B8", fontSize: 13 }}>Saldo calculado</Text>
          <Text style={{ color: "#F1F5F9", fontSize: 14, fontWeight: "700" }}>{fmt(appCents)}</Text>
        </View>
        <View style={{ height: 1, backgroundColor: "#334155", marginVertical: 4 }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
          <Text style={{ color: "#94A3B8", fontSize: 13 }}>Diferença</Text>
          <Text style={{ color: isPositive ? "#4ADE80" : "#F87171", fontSize: 15, fontWeight: "800" }}>
            {isPositive ? "+" : ""}{fmt(Math.abs(diff))}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={[s.doneBtn, { marginBottom: 12 }]} onPress={onApply} activeOpacity={0.85}>
        <Text style={s.doneBtnTxt}>Criar lançamento de ajuste</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSkip} activeOpacity={0.7}>
        <Text style={{ color: "#64748B", fontSize: 14, fontWeight: "600" }}>Pular</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Review ────────────────────────────────────────────────────────────────────
type ReviewStepProps = {
  items: SelectedItem[];
  accounts: BankAccount[];
  selAccId: string;
  setSelAccId: (id: string) => void;
  fileName: string;
  totalSel: number;
  toggleAll: () => void;
  toggleItem: (id: string) => void;
  onEditItem: (id: string, updates: Partial<SelectedItem>) => void;
  handleImport: () => void;
  onBack: () => void;
  availableTags: string[];
  allCategories: FinanceCategoryOption[];
};

type EditState = { id: string; title: string; type: "RECEITA" | "DESPESA"; amountStr: string; tags: string; category: string };

export function ReviewStep({
  items, accounts, selAccId, setSelAccId, fileName,
  totalSel, toggleAll, toggleItem, onEditItem, handleImport, onBack, availableTags, allCategories,
}: ReviewStepProps) {
  const receitas = items.filter(it => it.selected && it.type === "RECEITA");
  const despesas = items.filter(it => it.selected && it.type === "DESPESA");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const searchRef = useRef<TextInput>(null);

  const visible = searchQuery.trim()
    ? items.filter(it => {
        const q = searchQuery.trim().toLowerCase();
        return it.title.toLowerCase().includes(q) || fmt(it.amountCents).includes(q);
      })
    : items;

  const openEdit = (it: SelectedItem) => {
    setEditing({
      id: it.id,
      title: it.title,
      type: it.type,
      amountStr: (it.amountCents / 100).toFixed(2).replace(".", ","),
      tags: it.tags ?? "",
      category: it.category ?? "Outros",
    });
  };

  const saveEdit = () => {
    if (!editing) return;
    const cents = Math.round(Math.abs(parseFloat(editing.amountStr.replace(",", "."))) * 100);
    onEditItem(editing.id, {
      title: editing.title.trim() || "Lançamento",
      type: editing.type,
      amountCents: cents || 0,
      tags: editing.tags || undefined,
      category: editing.category || "Outros",
    });
    setEditing(null);
  };

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backTxt}>‹ Voltar</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Revisar importação</Text>
          <Text style={s.headerSub} numberOfLines={1}>{fileName}</Text>
        </View>
        <TouchableOpacity
          style={[ls.searchIconBtn, searchOpen && { backgroundColor: "#1E3A5F" }]}
          onPress={() => {
            if (searchOpen) { setSearchQuery(""); setSearchOpen(false); }
            else { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50); }
          }}
          activeOpacity={0.7}
        >
          <Svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke={searchOpen ? "#60A5FA" : "#94A3B8"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="11" cy="11" r="7" />
            <Path d="m20 20-3-3" />
          </Svg>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.importBtn}
          activeOpacity={0.8}
          onPress={handleImport}
          disabled={totalSel === 0}
        >
          <Text style={[s.importBtnTxt, totalSel === 0 && { opacity: 0.4 }]}>Importar {totalSel}</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      {searchOpen && (
        <View style={ls.searchBar}>
          <Svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="11" cy="11" r="7" />
            <Path d="m20 20-3-3" />
          </Svg>
          <TextInput
            ref={searchRef}
            style={ls.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar por nome ou valor…"
            placeholderTextColor="#475569"
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            autoComplete="off"
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
              <Text style={{ color: "#64748B", fontSize: 18 }}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Summary */}
      <View style={s.summary}>
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>Receitas</Text>
          <Text style={[s.summaryVal, { color: "#4ADE80" }]}>
            {receitas.length > 0 ? fmt(receitas.reduce((sum, i) => sum + i.amountCents, 0)) : "—"}
          </Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>Despesas</Text>
          <Text style={[s.summaryVal, { color: "#F87171" }]}>
            {despesas.length > 0 ? fmt(despesas.reduce((sum, i) => sum + i.amountCents, 0)) : "—"}
          </Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>Selecionados</Text>
          <Text style={s.summaryVal}>{totalSel}/{items.length}</Text>
        </View>
      </View>

      {/* Account selector */}
      {accounts.length > 0 && (
        <View style={s.accRow}>
          <Text style={s.accLabel}>Conta:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 4 }}>
            <TouchableOpacity onPress={() => setSelAccId("")} style={[s.accChip, !selAccId && s.accChipSel]}>
              <Text style={[s.accChipTxt, !selAccId && { color: "#fff" }]}>Nenhuma</Text>
            </TouchableOpacity>
            {accounts.map(a => (
              <TouchableOpacity key={a.id} onPress={() => setSelAccId(a.id)} style={[s.accChip, selAccId === a.id && s.accChipSel]}>
                <Text style={[s.accChipTxt, selAccId === a.id && { color: "#fff" }]}>{a.nick || a.bank}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Toggle all */}
      <View style={s.toggleAllRow}>
        <TouchableOpacity onPress={toggleAll} style={s.toggleAllBtn}>
          <Text style={s.toggleAllTxt}>
            {items.every(it => it.selected) ? "Desmarcar todos" : "Selecionar todos"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {visible.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Text style={{ color: "#64748B", fontSize: 14 }}>Nenhum resultado para "{searchQuery}"</Text>
          </View>
        ) : (
          visible.map(it => (
            <View key={it.id} style={[s.row, !it.selected && s.rowDimmed]}>
              {/* Checkbox — toca para marcar/desmarcar */}
              <TouchableOpacity onPress={() => toggleItem(it.id)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                <View style={[s.checkbox, it.selected && s.checkboxSel]}>
                  {it.selected && <Text style={s.checkMark}>✓</Text>}
                </View>
              </TouchableOpacity>

              {/* Corpo — toca para editar */}
              <TouchableOpacity style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }} onPress={() => openEdit(it)} activeOpacity={0.7}>
                <View style={s.rowInfo}>
                  <Text style={s.rowTitle} numberOfLines={1}>{it.title}</Text>
                  <Text style={s.rowDate}>{fmtDate(it.dateISO)}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 2 }}>
                  <Text style={[s.rowAmt, { color: it.type === "RECEITA" ? "#4ADE80" : "#F87171" }]}>
                    {it.type === "RECEITA" ? "+" : "-"}{fmt(it.amountCents)}
                  </Text>
                  <Text style={{ color: "#475569", fontSize: 10, fontWeight: "600" }}>✏️ editar</Text>
                </View>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={ls.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setEditing(null)} activeOpacity={1} />
          {editing && (
            <View style={ls.modalCard}>
              <Text style={ls.modalTitle}>Editar lançamento</Text>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={ls.fieldLabel}>Descrição</Text>
              <TextInput
                style={ls.fieldInput}
                value={editing.title}
                onChangeText={t => setEditing(e => e ? { ...e, title: t } : e)}
                placeholder="Descrição do lançamento"
                placeholderTextColor="#475569"
                autoFocus
              />

              <Text style={ls.fieldLabel}>Tipo</Text>
              <View style={ls.typePill}>
                <TouchableOpacity
                  style={[ls.typePillBtn, editing.type === "RECEITA" && ls.typePillBtnRec]}
                  onPress={() => setEditing(e => e ? { ...e, type: "RECEITA" } : e)}
                  activeOpacity={0.8}
                >
                  <Text style={[ls.typePillTxt, editing.type === "RECEITA" && { color: "#4ADE80" }]}>↑ Receita</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[ls.typePillBtn, editing.type === "DESPESA" && ls.typePillBtnDes]}
                  onPress={() => setEditing(e => e ? { ...e, type: "DESPESA" } : e)}
                  activeOpacity={0.8}
                >
                  <Text style={[ls.typePillTxt, editing.type === "DESPESA" && { color: "#F87171" }]}>↓ Despesa</Text>
                </TouchableOpacity>
              </View>

              <Text style={ls.fieldLabel}>Valor (R$)</Text>
              <TextInput
                style={ls.fieldInput}
                value={editing.amountStr}
                onChangeText={t => setEditing(e => e ? { ...e, amountStr: t } : e)}
                placeholder="0,00"
                placeholderTextColor="#475569"
                keyboardType="numeric"
              />

              <Text style={ls.fieldLabel}>Categoria</Text>
              <TouchableOpacity
                style={ls.catBtn}
                onPress={() => setCatModalOpen(true)}
                activeOpacity={0.8}
              >
                <Text style={ls.catBtnTxt}>{editing.category || "Outros"}</Text>
                <Text style={{ color: "#475569", fontSize: 18 }}>›</Text>
              </TouchableOpacity>

              <Text style={ls.fieldLabel}>Tags (opcional)</Text>
              <TagsMultiSelect
                value={editing.tags}
                onChange={v => setEditing(e => e ? { ...e, tags: v } : e)}
                availableTags={availableTags}
              />
              </ScrollView>

              <View style={ls.modalBtns}>
                <TouchableOpacity style={ls.cancelBtn} onPress={() => setEditing(null)} activeOpacity={0.7}>
                  <Text style={ls.cancelBtnTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={ls.confirmBtn} onPress={saveEdit} activeOpacity={0.85}>
                  <Text style={ls.confirmBtnTxt}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Category picker modal */}
      <Modal
        visible={catModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => { setCatModalOpen(false); setExpandedCatId(null); }}
      >
        <View style={ls.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => { setCatModalOpen(false); setExpandedCatId(null); }} activeOpacity={1} />
          {editing && (() => {
            const categories = allCategories.filter(c => c.type === editing.type);
            const rootCats = categories.filter(c => !c.parentId);
            return (
              <View style={[ls.modalCard, { maxHeight: "70%" }]}>
                <Text style={ls.modalTitle}>Categoria</Text>
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  {rootCats.map(c => {
                    const children = categories.filter(sub => sub.parentId === c.id);
                    const isExpanded = expandedCatId === c.id;
                    const isSelected = editing.category === c.name;
                    return (
                      <View key={c.id}>
                        <TouchableOpacity
                          style={[ls.catRow, isSelected && { backgroundColor: (c.color) + "18", borderColor: c.color }]}
                          onPress={() => {
                            if (children.length > 0) setExpandedCatId(isExpanded ? null : c.id);
                            else { setEditing(e => e ? { ...e, category: c.name } : e); setCatModalOpen(false); setExpandedCatId(null); }
                          }}
                          activeOpacity={0.8}
                        >
                          <View style={[ls.catDot, { backgroundColor: (c.color) + "33" }]}>
                            <Text style={{ fontSize: 18 }}>{c.icon}</Text>
                          </View>
                          <Text style={ls.catName}>{c.name}</Text>
                          {isSelected && <Text style={{ color: c.color, fontWeight: "800" }}>✓</Text>}
                          {children.length > 0 && (
                            <Text style={{ color: "#64748B", fontSize: 12, marginLeft: 4 }}>{isExpanded ? "▲" : "▼"}</Text>
                          )}
                        </TouchableOpacity>
                        {isExpanded && children.map(sub => (
                          <TouchableOpacity
                            key={sub.id}
                            style={[ls.catRow, { marginLeft: 16 }, editing.category === sub.name && { backgroundColor: (sub.color) + "18", borderColor: sub.color }]}
                            onPress={() => { setEditing(e => e ? { ...e, category: sub.name } : e); setCatModalOpen(false); setExpandedCatId(null); }}
                            activeOpacity={0.8}
                          >
                            <View style={[ls.catDot, { backgroundColor: (sub.color) + "33", width: 32, height: 32 }]}>
                              <Text style={{ fontSize: 14 }}>{sub.icon}</Text>
                            </View>
                            <Text style={[ls.catName, { fontSize: 13 }]}>{sub.name}</Text>
                            {editing.category === sub.name && <Text style={{ color: sub.color, fontWeight: "800" }}>✓</Text>}
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })}
                  {rootCats.length === 0 && (
                    <Text style={{ color: "#64748B", textAlign: "center", paddingVertical: 24, fontSize: 14 }}>
                      Nenhuma categoria encontrada
                    </Text>
                  )}
                </ScrollView>
              </View>
            );
          })()}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const ls = StyleSheet.create({
  searchIconBtn: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: "#1E293B",
    alignItems: "center", justifyContent: "center", marginRight: 6,
  },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 16, marginBottom: 6,
    backgroundColor: "#1E293B", borderRadius: 12, borderWidth: 1, borderColor: "#334155",
    paddingHorizontal: 12, paddingVertical: 9,
  },
  searchInput: { flex: 1, color: "#F1F5F9", fontSize: 14, padding: 0 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#1E293B", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.1)", gap: 4 },
  modalTitle: { color: "#F1F5F9", fontSize: 18, fontWeight: "800", marginBottom: 12 },

  fieldLabel: { color: "#64748B", fontSize: 12, fontWeight: "700", marginTop: 8, marginBottom: 4 },
  fieldInput: { backgroundColor: "#0F172A", borderRadius: 12, padding: 14, color: "#F1F5F9", fontSize: 15, borderWidth: 1, borderColor: "#334155" },

  typePill: { flexDirection: "row", backgroundColor: "#0F172A", borderRadius: 12, borderWidth: 1, borderColor: "#334155", overflow: "hidden" },
  typePillBtn: { flex: 1, paddingVertical: 10, alignItems: "center" },
  typePillBtnRec: { backgroundColor: "#14532D" },
  typePillBtnDes: { backgroundColor: "#7F1D1D" },
  typePillTxt: { fontSize: 14, fontWeight: "700", color: "#475569" },

  modalBtns: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center" },
  cancelBtnTxt: { color: "#94A3B8", fontSize: 15, fontWeight: "600" },
  confirmBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#3B82F6", alignItems: "center" },
  confirmBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "700" },

  catBtn: { backgroundColor: "#0F172A", borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#334155" },
  catBtnTxt: { flex: 1, color: "#F1F5F9", fontSize: 15 },
  catRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "transparent", marginBottom: 8, backgroundColor: "#0F172A", gap: 12 },
  catDot: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  catName: { flex: 1, color: "#F1F5F9", fontSize: 15, fontWeight: "600" },
});
