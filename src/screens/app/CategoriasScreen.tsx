import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { FinanceCategoryOption } from "../../types/finance";
import {
  listFinanceCategories,
  createFinanceCategory,
  updateFinanceCategory,
  deleteFinanceCategory,
} from "../../lib/financeCategoriesService";

type TabType = "RECEITA" | "DESPESA";

const ICONS = [
  "💼","💵","📈","🍽️","🚗","🏠","📚","🎁","🛡️","✈️","🏦","🛍️","🚲","📱",
  "🧹","🎂","🧮","🎥","📷","🍬","🛒","💻","🏋️","🎮","⛽","❤️","🏥","🌲",
  "🦷","🏆","🔒","🌎","🐾","💎","🏀","🎤","🎵","🧾","📌","☁️","💡","🗺️",
];

const COLORS = [
  "#60a5fa","#22c55e","#f59e0b","#ef4444","#8b5cf6",
  "#06b6d4","#ec4899","#84cc16","#64748b","#f97316",
];

type EditState = {
  id?: string;
  name: string;
  icon: string;
  color: string;
  parentId: string;
  type: TabType;
};

const EMPTY_EDIT: EditState = {
  name: "", icon: "💼", color: "#60a5fa", parentId: "", type: "RECEITA",
};

export default function CategoriasScreen() {
  const [categories, setCategories] = useState<FinanceCategoryOption[]>([]);
  const [tab, setTab] = useState<TabType>("RECEITA");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [edit, setEdit] = useState<EditState>(EMPTY_EDIT);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setCategories(await listFinanceCategories());
    } catch {
      Alert.alert("Erro", "Não foi possível carregar as categorias.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visible = categories.filter(c => c.type === tab);
  const roots = visible.filter(c => !c.parentId);
  const childrenOf = (parentId: string) => visible.filter(c => c.parentId === parentId);

  function openCreate(parentId = "", type: TabType = tab) {
    setEdit({ ...EMPTY_EDIT, parentId, type });
    setModalOpen(true);
  }

  function openEdit(cat: FinanceCategoryOption) {
    setEdit({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      parentId: cat.parentId ?? "",
      type: cat.type,
    });
    setModalOpen(true);
  }

  function onLongPress(cat: FinanceCategoryOption) {
    Alert.alert(cat.name, undefined, [
      { text: "Editar", onPress: () => openEdit(cat) },
      {
        text: "Adicionar subcategoria",
        onPress: () => openCreate(cat.id, cat.type),
      },
      {
        text: "Excluir", style: "destructive",
        onPress: () => {
          Alert.alert(
            "Excluir categoria",
            `Tem certeza que deseja excluir "${cat.name}"? As subcategorias serão desvinculadas.`,
            [
              { text: "Cancelar", style: "cancel" },
              {
                text: "Excluir", style: "destructive",
                onPress: async () => {
                  try {
                    await deleteFinanceCategory(cat.id);
                    setCategories(prev => prev.filter(c => c.id !== cat.id));
                  } catch (err) {
                    Alert.alert("Erro", err instanceof Error ? err.message : "Não foi possível excluir.");
                  }
                },
              },
            ],
          );
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  async function handleSave() {
    if (!edit.name.trim()) {
      Alert.alert("Atenção", "Digite o nome da categoria.");
      return;
    }
    try {
      setSaving(true);
      if (edit.id) {
        const updated = await updateFinanceCategory(edit.id, {
          name: edit.name.trim(),
          icon: edit.icon,
          color: edit.color,
        });
        setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
      } else {
        const created = await createFinanceCategory({
          type: edit.type,
          name: edit.name.trim(),
          parentId: edit.parentId || null,
          icon: edit.icon,
          color: edit.color,
        });
        setCategories(prev => [...prev, created]);
      }
      setModalOpen(false);
    } catch (err) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  const parentOptions = visible.filter(c => !c.parentId && c.id !== edit.id);

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Categorias</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => openCreate()}>
          <Text style={s.addBtnTxt}>+ Nova</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(["RECEITA", "DESPESA"] as TabType[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[s.tab, tab === t && s.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>
              {t === "RECEITA" ? "Recebimentos" : "Gastos"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color="#3B82F6" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          {roots.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyTxt}>Nenhuma categoria cadastrada.</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => openCreate()}>
                <Text style={s.emptyBtnTxt}>+ Criar primeira categoria</Text>
              </TouchableOpacity>
            </View>
          ) : (
            roots.map(root => (
              <View key={root.id}>
                <TouchableOpacity
                  style={s.catRow}
                  onLongPress={() => onLongPress(root)}
                  delayLongPress={400}
                  onPress={() => onLongPress(root)}
                >
                  <View style={[s.dot, { backgroundColor: root.color }]} />
                  <Text style={s.catIcon}>{root.icon}</Text>
                  <Text style={s.catName}>{root.name}</Text>
                  <Text style={s.catChevron}>›</Text>
                </TouchableOpacity>
                {childrenOf(root.id).map(sub => (
                  <TouchableOpacity
                    key={sub.id}
                    style={s.subRow}
                    onLongPress={() => onLongPress(sub)}
                    delayLongPress={400}
                    onPress={() => onLongPress(sub)}
                  >
                    <View style={s.subIndent} />
                    <View style={[s.dot, s.dotSm, { backgroundColor: sub.color }]} />
                    <Text style={s.subName}>{sub.name}</Text>
                    <Text style={s.catChevron}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Create / Edit modal */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{edit.id ? "Editar categoria" : "Nova categoria"}</Text>
            <Pressable onPress={() => setModalOpen(false)}>
              <Text style={s.modalClose}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={s.modalBody}>
            {/* Tipo (só na criação) */}
            {!edit.id && (
              <View style={s.field}>
                <Text style={s.label}>Tipo</Text>
                <View style={s.tabs}>
                  {(["RECEITA", "DESPESA"] as TabType[]).map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[s.tab, edit.type === t && s.tabActive]}
                      onPress={() => setEdit(e => ({ ...e, type: t, parentId: "" }))}
                    >
                      <Text style={[s.tabTxt, edit.type === t && s.tabTxtActive]}>
                        {t === "RECEITA" ? "Recebimento" : "Gasto"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Nome */}
            <View style={s.field}>
              <Text style={s.label}>Nome</Text>
              <TextInput
                style={s.input}
                value={edit.name}
                onChangeText={v => setEdit(e => ({ ...e, name: v }))}
                placeholder="Ex: Alimentação"
                placeholderTextColor="#475569"
                autoFocus
              />
            </View>

            {/* Ícone */}
            <View style={s.field}>
              <Text style={s.label}>Ícone</Text>
              <View style={s.iconGrid}>
                {ICONS.map(ic => (
                  <TouchableOpacity
                    key={ic}
                    style={[s.iconOpt, edit.icon === ic && { borderColor: edit.color, borderWidth: 2 }]}
                    onPress={() => setEdit(e => ({ ...e, icon: ic }))}
                  >
                    <Text style={s.iconOptTxt}>{ic}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Cor */}
            <View style={s.field}>
              <Text style={s.label}>Cor</Text>
              <View style={s.colorRow}>
                {COLORS.map(col => (
                  <TouchableOpacity
                    key={col}
                    style={[s.colorOpt, { backgroundColor: col }, edit.color === col && s.colorOptSel]}
                    onPress={() => setEdit(e => ({ ...e, color: col }))}
                  />
                ))}
              </View>
            </View>

            {/* Categoria pai (só na criação e se tiver opções) */}
            {!edit.id && parentOptions.length > 0 && (
              <View style={s.field}>
                <Text style={s.label}>Subcategoria de (opcional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  <TouchableOpacity
                    style={[s.parentChip, !edit.parentId && s.parentChipSel]}
                    onPress={() => setEdit(e => ({ ...e, parentId: "" }))}
                  >
                    <Text style={[s.parentChipTxt, !edit.parentId && s.parentChipTxtSel]}>Raiz</Text>
                  </TouchableOpacity>
                  {parentOptions.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[s.parentChip, edit.parentId === p.id && s.parentChipSel]}
                      onPress={() => setEdit(e => ({ ...e, parentId: p.id }))}
                    >
                      <Text style={[s.parentChipTxt, edit.parentId === p.id && s.parentChipTxtSel]}>
                        {p.icon} {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={() => { void handleSave(); }} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnTxt}>Salvar</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F172A" },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#F1F5F9" },
  addBtn: { backgroundColor: "#3B82F6", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },

  tabs: { flexDirection: "row", marginHorizontal: 20, marginBottom: 12, backgroundColor: "#1E293B", borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  tabActive: { backgroundColor: "#3B82F6" },
  tabTxt: { color: "#64748B", fontWeight: "600", fontSize: 14 },
  tabTxtActive: { color: "#fff" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  list: { paddingHorizontal: 20, paddingBottom: 32 },

  empty: { alignItems: "center", marginTop: 60, gap: 16 },
  emptyTxt: { color: "#64748B", fontSize: 15 },
  emptyBtn: { backgroundColor: "#1E293B", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: "#334155" },
  emptyBtnTxt: { color: "#3B82F6", fontWeight: "700", fontSize: 14 },

  catRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#1E293B",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    marginBottom: 8, gap: 10,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotSm: { width: 8, height: 8, borderRadius: 4 },
  catIcon: { fontSize: 18 },
  catName: { flex: 1, color: "#F1F5F9", fontSize: 15, fontWeight: "600" },
  catChevron: { color: "#475569", fontSize: 18 },

  subRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#1E293B",
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    marginBottom: 6, gap: 8,
  },
  subIndent: { width: 20 },
  subName: { flex: 1, color: "#94A3B8", fontSize: 14, fontWeight: "500" },

  modal: { flex: 1, backgroundColor: "#0F172A" },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "#1E293B",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#F1F5F9" },
  modalClose: { fontSize: 18, color: "#64748B", padding: 4 },
  modalBody: { padding: 20, gap: 20 },

  field: { gap: 8 },
  label: { color: "#94A3B8", fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    backgroundColor: "#1E293B", borderRadius: 10, padding: 14,
    color: "#F1F5F9", fontSize: 16, borderWidth: 1, borderColor: "#334155",
  },

  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  iconOpt: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: "#1E293B",
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#334155",
  },
  iconOptTxt: { fontSize: 22 },

  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  colorOpt: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: "transparent" },
  colorOptSel: { borderColor: "#fff", transform: [{ scale: 1.2 }] },

  parentChip: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: "#1E293B", borderWidth: 1, borderColor: "#334155", marginRight: 8,
  },
  parentChipSel: { borderColor: "#3B82F6", backgroundColor: "#1D4ED8" },
  parentChipTxt: { color: "#94A3B8", fontSize: 14, fontWeight: "500" },
  parentChipTxtSel: { color: "#fff" },

  saveBtn: { backgroundColor: "#3B82F6", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  saveBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
