import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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

type CardBounds = { x: number; y: number; w: number; h: number };

export default function CategoriasScreen() {
  const [categories, setCategories] = useState<FinanceCategoryOption[]>([]);
  const [tab, setTab]               = useState<TabType>("RECEITA");
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [modalOpen, setModalOpen]   = useState(false);
  const [edit, setEdit]             = useState<EditState>(EMPTY_EDIT);
  const [menuCat, setMenuCat]       = useState<FinanceCategoryOption | null>(null);

  // Chip drag state
  const [draggingSubId, setDraggingSubId] = useState<string | null>(null);
  const [showChipGhost, setShowChipGhost] = useState(false);
  const [hoverCardId, setHoverCardId]     = useState<string | null>(null);
  const chipDragSub = useRef<FinanceCategoryOption | null>(null);
  const cardRefs    = useRef<Map<string, View | null>>(new Map());
  const cardBounds  = useRef<Map<string, CardBounds>>(new Map());
  const ghostX      = useRef(new Animated.Value(0)).current;
  const ghostY      = useRef(new Animated.Value(0)).current;
  const ghostScale  = useRef(new Animated.Value(0.9)).current;
  const ghostOpac   = useRef(new Animated.Value(0)).current;

  const isDragActive = draggingSubId !== null;

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

  const visible    = categories.filter(c => c.type === tab);
  const roots      = visible.filter(c => !c.parentId);
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

  function measureCards(): Promise<void> {
    return new Promise(resolve => {
      const ids = roots.map(r => r.id);
      let pending = ids.length;
      if (pending === 0) { resolve(); return; }
      ids.forEach(id => {
        const ref = cardRefs.current.get(id);
        if (!ref) { if (--pending === 0) resolve(); return; }
        ref.measureInWindow((x, y, w, h) => {
          cardBounds.current.set(id, { x, y, w, h });
          if (--pending === 0) resolve();
        });
      });
    });
  }

  function findTargetCard(pageX: number, pageY: number): string | null {
    for (const [id, b] of cardBounds.current.entries()) {
      if (pageX >= b.x && pageX <= b.x + b.w && pageY >= b.y && pageY <= b.y + b.h) {
        return id;
      }
    }
    // Closest by center distance as fallback
    let best: string | null = null;
    let bestDist = Infinity;
    for (const [id, b] of cardBounds.current.entries()) {
      const d = Math.sqrt((pageX - (b.x + b.w / 2)) ** 2 + (pageY - (b.y + b.h / 2)) ** 2);
      if (d < bestDist && d < b.w * 0.8) { bestDist = d; best = id; }
    }
    return best;
  }

  async function onChipDragStart(sub: FinanceCategoryOption, pageX: number, pageY: number) {
    chipDragSub.current = sub;
    await measureCards();
    setDraggingSubId(sub.id);
    ghostX.setValue(pageX - 60);
    ghostY.setValue(pageY - 16);
    ghostScale.setValue(0.8);
    ghostOpac.setValue(0);
    setShowChipGhost(true);
    Animated.parallel([
      Animated.timing(ghostOpac,  { toValue: 1,    duration: 160, useNativeDriver: true }),
      Animated.spring(ghostScale, { toValue: 1.08, useNativeDriver: true, tension: 280, friction: 7 }),
    ]).start();
  }

  function onChipDragMove(pageX: number, pageY: number) {
    ghostX.setValue(pageX - 60);
    ghostY.setValue(pageY - 16);

    // Track which card is under the finger for hover glow
    const target = findTargetCard(pageX, pageY);
    setHoverCardId(prev => (prev !== target ? target : prev));
  }

  async function onChipDragEnd(pageX: number, pageY: number) {
    const sub      = chipDragSub.current;
    const targetId = findTargetCard(pageX, pageY);
    chipDragSub.current = null;
    setHoverCardId(null);
    setDraggingSubId(null);

    if (!sub) { hideGhost(); return; }

    if (targetId && targetId !== sub.parentId) {
      const bounds = cardBounds.current.get(targetId);

      if (bounds) {
        // Ghost flies into the target card with a spring arc
        await new Promise<void>(resolve => {
          Animated.parallel([
            Animated.spring(ghostX, {
              toValue: bounds.x + 14,
              useNativeDriver: true,
              tension: 220,
              friction: 10,
            }),
            Animated.spring(ghostY, {
              toValue: bounds.y + bounds.h - 46,
              useNativeDriver: true,
              tension: 220,
              friction: 10,
            }),
            Animated.timing(ghostScale, { toValue: 0.65, duration: 280, useNativeDriver: true }),
          ]).start(() => resolve());
        });
      }

      // Dissolve ghost
      await new Promise<void>(resolve => {
        Animated.timing(ghostOpac, { toValue: 0, duration: 130, useNativeDriver: true }).start(() => resolve());
      });
      setShowChipGhost(false);

      // Optimistically update local state → triggers chip entrance bounce in target CategoryCard
      setCategories(prev => prev.map(c => c.id === sub.id ? { ...c, parentId: targetId } : c));

      // Persist to backend
      try {
        const updated = await updateFinanceCategory(sub.id, {
          name: sub.name, icon: sub.icon, color: sub.color, parentId: targetId,
        });
        setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
      } catch (err) {
        Alert.alert("Erro", err instanceof Error ? err.message : "Não foi possível mover a subcategoria.");
        void load();
      }
    } else {
      hideGhost();
    }
  }

  function onChipDragCancel() { hideGhost(); setHoverCardId(null); setDraggingSubId(null); chipDragSub.current = null; }

  function hideGhost() {
    Animated.timing(ghostOpac, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => setShowChipGhost(false));
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
              onMenu={c => setMenuCat(c)}
              onSubMenu={c => setMenuCat(c)}
              onReorder={() => undefined}
              onCardRef={(id, ref) => { cardRefs.current.set(id, ref); }}
              onChipDragStart={(sub, px, py) => { void onChipDragStart(sub, px, py); }}
              onChipDragMove={onChipDragMove}
              onChipDragEnd={(px, py) => { void onChipDragEnd(px, py); }}
              onChipDragCancel={onChipDragCancel}
              draggingSubId={draggingSubId}
              hoverCardId={hoverCardId}
              isDragActive={isDragActive}
            />
          )}
        </ScrollView>
      )}

      {/* Ghost chip — flies from source to target card */}
      {showChipGhost && chipDragSub.current && (
        <Animated.View
          pointerEvents="none"
          style={[
            gs.ghost,
            {
              opacity: ghostOpac,
              transform: [{ translateX: ghostX }, { translateY: ghostY }, { scale: ghostScale }],
            },
          ]}
        >
          <View style={[gs.dot, { backgroundColor: chipDragSub.current.color }]} />
          <Text style={gs.txt} numberOfLines={1}>{chipDragSub.current.name}</Text>
        </Animated.View>
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

const gs = StyleSheet.create({
  ghost: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#1E293B",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: "#3B82F6",
    shadowColor: "#3B82F6",
    shadowOpacity: 0.7,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 16,
    zIndex: 9999,
    maxWidth: 200,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  txt: { color: "#F1F5F9", fontSize: 13, fontWeight: "700" },
});
