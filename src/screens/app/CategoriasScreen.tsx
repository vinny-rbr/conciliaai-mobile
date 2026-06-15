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
import { H_PAD } from "../../components/categorias/constants";
import { CategoryActionSheet } from "../../components/categorias/CategoryActionSheet";
import { DraggableGrid } from "../../components/categorias/DraggableGrid";

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
  id?: string; name: string; icon: string; color: string; parentId: string; type: TabType;
};
const EMPTY_EDIT: EditState = { name: "", icon: "💼", color: "#60a5fa", parentId: "", type: "RECEITA" };

export default function CategoriasScreen() {
  const [categories, setCategories] = useState<FinanceCategoryOption[]>([]);
  const [tab, setTab] = useState<TabType>("RECEITA");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [edit, setEdit] = useState<EditState>(EMPTY_EDIT);
  const [menuCat, setMenuCat] = useState<FinanceCategoryOption | null>(null);

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
  const childrenOf = useCallback(
    (parentId: string) => categories.filter(c => c.parentId === parentId),
    [categories],
  );

  function openCreate(parentId = "", type: TabType = tab) {
    setEdit({ ...EMPTY_EDIT, parentId, type });
    setModalOpen(true);
  }

  function openEdit(cat: FinanceCategoryOption) {
    setEdit({ id: cat.id, name: cat.name, icon: cat.icon, color: cat.color, parentId: cat.parentId ?? "", type: cat.type });
    setModalOpen(true);
  }

  function onMenuPress(cat: FinanceCategoryOption) {
    setMenuCat(cat);
  }

  async function handleDelete(cat: FinanceCategoryOption) {
    Alert.alert("Excluir categoria", `Excluir "${cat.name}"?`, [
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
    ]);
  }

  async function handleSave() {
    if (!edit.name.trim()) { Alert.alert("Atenção", "Digite o nome."); return; }
    try {
      setSaving(true);
      if (edit.id) {
        const updated = await updateFinanceCategory(edit.id, { name: edit.name.trim(), icon: edit.icon, color: edit.color });
        setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
      } else {
        const created = await createFinanceCategory({ type: edit.type, name: edit.name.trim(), parentId: edit.parentId || null, icon: edit.icon, color: edit.color });
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
      <View style={s.header}>
        <Text style={s.headerTitle}>Categorias</Text>
      </View>

      <View style={s.tabBar}>
        {(["RECEITA", "DESPESA"] as TabType[]).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>
              {t === "RECEITA" ? "Recebimentos" : "Gastos"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#3B82F6" size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} scrollEventThrottle={16}>
          <TouchableOpacity style={s.newCard} onPress={() => openCreate()}>
            <View style={s.newIconWrap}><Text style={s.newIconTxt}>+</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.newCardTitle}>Nova categoria</Text>
              <Text style={s.newCardSub}>Segure um card para reposicionar</Text>
            </View>
          </TouchableOpacity>

          {roots.length === 0 ? (
            <View style={s.empty}><Text style={s.emptyTxt}>Nenhuma categoria ainda.</Text></View>
          ) : (
            <DraggableGrid
              cats={roots}
              childrenOf={childrenOf}
              onMenu={onMenuPress}
              onReorder={() => undefined}
            />
          )}
        </ScrollView>
      )}

      <CategoryActionSheet
        cat={menuCat}
        onClose={() => setMenuCat(null)}
        onEdit={() => { if (menuCat) openEdit(menuCat); }}
        onAddSub={() => { if (menuCat) openCreate(menuCat.id, menuCat.type); }}
        onDelete={() => { if (menuCat) void handleDelete(menuCat); }}
      />

      {/* Modal */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{edit.id ? "Editar categoria" : "Nova categoria"}</Text>
            <Pressable onPress={() => setModalOpen(false)}><Text style={s.modalClose}>✕</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled">
            {!edit.id && (
              <View style={s.field}>
                <Text style={s.label}>Tipo</Text>
                <View style={s.tabBar}>
                  {(["RECEITA", "DESPESA"] as TabType[]).map(t => (
                    <TouchableOpacity key={t} style={[s.tab, edit.type === t && s.tabActive]} onPress={() => setEdit(e => ({ ...e, type: t, parentId: "" }))}>
                      <Text style={[s.tabTxt, edit.type === t && s.tabTxtActive]}>{t === "RECEITA" ? "Recebimento" : "Gasto"}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            <View style={s.field}>
              <Text style={s.label}>Nome</Text>
              <TextInput style={s.input} value={edit.name} onChangeText={v => setEdit(e => ({ ...e, name: v }))} placeholder="Ex: Alimentação" placeholderTextColor="#475569" autoFocus />
            </View>
            <View style={s.field}>
              <Text style={s.label}>Ícone</Text>
              <View style={s.iconGrid}>
                {ICONS.map(ic => (
                  <TouchableOpacity key={ic} style={[s.iconOpt, edit.icon === ic && { borderColor: edit.color, borderWidth: 2 }]} onPress={() => setEdit(e => ({ ...e, icon: ic }))}>
                    <Text style={s.iconOptTxt}>{ic}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={s.field}>
              <Text style={s.label}>Cor</Text>
              <View style={s.colorRow}>
                {COLORS.map(col => (
                  <TouchableOpacity key={col} style={[s.colorOpt, { backgroundColor: col }, edit.color === col && s.colorOptSel]} onPress={() => setEdit(e => ({ ...e, color: col }))} />
                ))}
              </View>
            </View>
            {!edit.id && parentOptions.length > 0 && (
              <View style={s.field}>
                <Text style={s.label}>Subcategoria de (opcional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  <TouchableOpacity style={[s.parentChip, !edit.parentId && s.parentChipSel]} onPress={() => setEdit(e => ({ ...e, parentId: "" }))}>
                    <Text style={[s.parentChipTxt, !edit.parentId && s.parentChipTxtSel]}>Raiz</Text>
                  </TouchableOpacity>
                  {parentOptions.map(p => (
                    <TouchableOpacity key={p.id} style={[s.parentChip, edit.parentId === p.id && s.parentChipSel]} onPress={() => setEdit(e => ({ ...e, parentId: p.id }))}>
                      <Text style={[s.parentChipTxt, edit.parentId === p.id && s.parentChipTxtSel]}>{p.icon} {p.name}</Text>
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
  root: { flex: 1, backgroundColor: "#0A1628" },
  header: { paddingHorizontal: H_PAD, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#F1F5F9" },
  tabBar: { flexDirection: "row", marginHorizontal: H_PAD, marginBottom: 16, backgroundColor: "#1E293B", borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: "center" },
  tabActive: { backgroundColor: "#3B82F6" },
  tabTxt: { color: "#64748B", fontWeight: "600", fontSize: 14 },
  tabTxtActive: { color: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { paddingHorizontal: H_PAD, paddingBottom: 40 },
  newCard: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, borderColor: "#3B82F6", borderStyle: "dashed", borderRadius: 14, padding: 14, marginBottom: 14, backgroundColor: "rgba(59,130,246,0.06)" },
  newIconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#3B82F6", alignItems: "center", justifyContent: "center" },
  newIconTxt: { color: "#fff", fontSize: 22, fontWeight: "700", lineHeight: 26 },
  newCardTitle: { color: "#F1F5F9", fontWeight: "700", fontSize: 15 },
  newCardSub: { color: "#64748B", fontSize: 12, marginTop: 2 },
  empty: { alignItems: "center", marginTop: 40 },
  emptyTxt: { color: "#64748B", fontSize: 15 },
  modal: { flex: 1, backgroundColor: "#0F172A" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#1E293B" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#F1F5F9" },
  modalClose: { fontSize: 18, color: "#64748B", padding: 4 },
  modalBody: { padding: 20, gap: 20 },
  field: { gap: 8 },
  label: { color: "#94A3B8", fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: "#1E293B", borderRadius: 10, padding: 14, color: "#F1F5F9", fontSize: 16, borderWidth: 1, borderColor: "#334155" },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  iconOpt: { width: 44, height: 44, borderRadius: 10, backgroundColor: "#1E293B", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#334155" },
  iconOptTxt: { fontSize: 22 },
  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  colorOpt: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: "transparent" },
  colorOptSel: { borderColor: "#fff", transform: [{ scale: 1.2 }] },
  parentChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#1E293B", borderWidth: 1, borderColor: "#334155", marginRight: 8 },
  parentChipSel: { borderColor: "#3B82F6", backgroundColor: "#1D4ED8" },
  parentChipTxt: { color: "#94A3B8", fontSize: 14, fontWeight: "500" },
  parentChipTxtSel: { color: "#fff" },
  saveBtn: { backgroundColor: "#3B82F6", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  saveBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
