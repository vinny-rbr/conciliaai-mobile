import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { FinanceCategoryOption } from "../../types/finance";
import {
  listFinanceCategories,
  createFinanceCategory,
  updateFinanceCategory,
  deleteFinanceCategory,
} from "../../lib/financeCategoriesService";
import { CategoryActionSheet } from "../../components/categorias/CategoryActionSheet";
import { DraggableGrid } from "../../components/categorias/DraggableGrid";
import { EMPTY_EDIT, s, type EditState, type TabType } from "./categorias/shared";
import { EditModal } from "./categorias/EditModal";

export default function CategoriasScreen() {
  const [categories, setCategories] = useState<FinanceCategoryOption[]>([]);
  const [tab, setTab]               = useState<TabType>("RECEITA");
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [modalOpen, setModalOpen]   = useState(false);
  const [edit, setEdit]             = useState<EditState>(EMPTY_EDIT);
  const [menuCat, setMenuCat]       = useState<FinanceCategoryOption | null>(null);

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
            <DraggableGrid cats={roots} childrenOf={childrenOf} onMenu={c => setMenuCat(c)} onReorder={() => undefined} />
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

      <EditModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        edit={edit}
        setEdit={setEdit}
        saving={saving}
        onSave={() => void handleSave()}
        parentOptions={parentOptions}
      />
    </SafeAreaView>
  );
}
