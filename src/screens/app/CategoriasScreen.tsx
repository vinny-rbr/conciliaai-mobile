import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, Pressable,
  Dimensions, Animated, PanResponder, TouchableWithoutFeedback,
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
  id?: string; name: string; icon: string; color: string; parentId: string; type: TabType;
};
const EMPTY_EDIT: EditState = { name: "", icon: "💼", color: "#60a5fa", parentId: "", type: "RECEITA" };

const { width: SCREEN_W } = Dimensions.get("window");
const H_PAD = 16;
const COL_GAP = 12;
const CARD_W = (SCREEN_W - H_PAD * 2 - COL_GAP) / 2;

// ─── Draggable Grid ──────────────────────────────────────────────────────────

type CardLayout = { x: number; y: number; w: number; h: number };

function DraggableGrid({
  cats, childrenOf, onMenu, onReorder,
}: {
  cats: FinanceCategoryOption[];
  childrenOf: (id: string) => FinanceCategoryOption[];
  onMenu: (cat: FinanceCategoryOption) => void;
  onReorder: (ids: string[]) => void;
}) {
  const [orderIds, setOrderIds] = useState(() => cats.map(c => c.id));
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverSlot, setHoverSlot] = useState(-1);

  const orderRef = useRef(orderIds);
  orderRef.current = orderIds;
  const dragIdRef = useRef<string | null>(null);
  const cardViewRefs = useRef<Map<string, View | null>>(new Map());
  // Screen-space card layouts (from measureInWindow)
  const measuredLayouts = useRef<Map<string, CardLayout>>(new Map());
  // Screen-space position of the DraggableGrid container
  const containerScreenPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<View>(null);
  const panResponders = useRef<Map<string, ReturnType<typeof PanResponder.create>>>(new Map());
  const ghostLeft = useRef(new Animated.Value(0)).current;
  const ghostTop = useRef(new Animated.Value(0)).current;
  const ghostOpacity = useRef(new Animated.Value(0)).current;
  const hoverSlotRef = useRef(-1);

  useEffect(() => {
    setOrderIds(prev => {
      const existingIds = cats.map(c => c.id);
      const merged = prev.filter(id => existingIds.includes(id));
      const newIds = existingIds.filter(id => !merged.includes(id));
      return [...merged, ...newIds];
    });
    // Clear stale pan responders when cats change
    panResponders.current.clear();
  }, [cats]);

  const orderedCats = useMemo(
    () => orderIds.map(id => cats.find(c => c.id === id)).filter(Boolean) as FinanceCategoryOption[],
    [orderIds, cats],
  );

  // Find which slot the finger (screen coords) is closest to
  function findHoverSlot(screenX: number, screenY: number): number {
    const ids = orderRef.current;
    let best = -1;
    let bestDist = Infinity;
    ids.forEach((id, idx) => {
      const l = measuredLayouts.current.get(id);
      if (!l) return;
      const cx = l.x + l.w / 2;
      const cy = l.y + l.h / 2;
      const d = Math.sqrt((screenX - cx) ** 2 + (screenY - cy) ** 2);
      if (d < bestDist) { bestDist = d; best = idx; }
    });
    return best;
  }

  async function measureAll(): Promise<void> {
    // Measure container first so we can convert screen→relative coords
    await new Promise<void>(res => {
      containerRef.current?.measureInWindow((x, y) => {
        containerScreenPos.current = { x, y };
        res();
      });
    });
    // Measure each card
    return new Promise(resolve => {
      const ids = orderRef.current;
      let pending = ids.length;
      if (pending === 0) { resolve(); return; }
      ids.forEach(id => {
        const ref = cardViewRefs.current.get(id);
        if (!ref) { if (--pending === 0) resolve(); return; }
        ref.measureInWindow((x, y, w, h) => {
          measuredLayouts.current.set(id, { x, y, w, h });
          if (--pending === 0) resolve();
        });
      });
    });
  }

  function setGhostToCard(id: string, dx = 0, dy = 0) {
    const l = measuredLayouts.current.get(id);
    if (!l) return;
    // Convert screen coords → relative to container
    const relX = l.x - containerScreenPos.current.x + dx;
    const relY = l.y - containerScreenPos.current.y + dy;
    ghostLeft.setValue(relX);
    ghostTop.setValue(relY);
  }

  function getOrCreatePan(id: string) {
    if (panResponders.current.has(id)) return panResponders.current.get(id)!;

    let startScreenX = 0;
    let startScreenY = 0;

    const pan = PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => dragIdRef.current === id,
      onPanResponderGrant: (e) => {
        startScreenX = e.nativeEvent.pageX;
        startScreenY = e.nativeEvent.pageY;
        setGhostToCard(id);
      },
      onPanResponderMove: (_, gs) => {
        if (dragIdRef.current !== id) return;
        setGhostToCard(id, gs.dx, gs.dy);
        const slot = findHoverSlot(startScreenX + gs.dx, startScreenY + gs.dy);
        if (slot !== hoverSlotRef.current) {
          hoverSlotRef.current = slot;
          setHoverSlot(slot);
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (dragIdRef.current !== id) return;
        const slot = hoverSlotRef.current;
        const fromIdx = orderRef.current.indexOf(id);
        if (slot >= 0 && slot !== fromIdx) {
          const next = [...orderRef.current];
          next.splice(fromIdx, 1);
          next.splice(slot, 0, id);
          setOrderIds(next);
          onReorder(next);
        }
        endDrag();
      },
      onPanResponderTerminate: () => endDrag(),
    });

    panResponders.current.set(id, pan);
    return pan;
  }

  function endDrag() {
    dragIdRef.current = null;
    hoverSlotRef.current = -1;
    setDragId(null);
    setHoverSlot(-1);
    Animated.timing(ghostOpacity, { toValue: 0, duration: 150, useNativeDriver: false }).start();
  }

  async function handleLongPress(cat: FinanceCategoryOption) {
    await measureAll();
    const l = measuredLayouts.current.get(cat.id);
    if (!l) return;
    dragIdRef.current = cat.id;
    hoverSlotRef.current = orderRef.current.indexOf(cat.id);
    setGhostToCard(cat.id);
    ghostOpacity.setValue(0);
    setDragId(cat.id);
    setHoverSlot(hoverSlotRef.current);
    Animated.timing(ghostOpacity, { toValue: 1, duration: 120, useNativeDriver: false }).start();
  }

  const rows: Array<[FinanceCategoryOption, FinanceCategoryOption | null]> = [];
  for (let i = 0; i < orderedCats.length; i += 2) {
    rows.push([orderedCats[i], orderedCats[i + 1] ?? null]);
  }

  const dragCat = dragId ? cats.find(c => c.id === dragId) ?? null : null;

  return (
    <View ref={containerRef}>
      {rows.map(([a, b], rowIdx) => (
        <View key={`${a.id}-${b?.id ?? "empty"}-${rowIdx}`} style={grid.row}>
          {[a, b].map((cat, col) => {
            if (!cat) return <View key={`empty-${col}`} style={{ width: CARD_W }} />;
            const idx = orderedCats.indexOf(cat);
            const pan = getOrCreatePan(cat.id);
            return (
              <View
                key={cat.id}
                ref={r => { cardViewRefs.current.set(cat.id, r); }}
                style={[
                  grid.cardWrap,
                  dragId === cat.id && { opacity: 0.25 },
                  hoverSlot === idx && dragId !== cat.id && { opacity: 0.6 },
                ]}
                {...pan.panHandlers}
              >
                <CategoryCard
                  cat={cat}
                  subs={childrenOf(cat.id)}
                  onMenu={onMenu}
                  onLongPress={() => { void handleLongPress(cat); }}
                />
              </View>
            );
          })}
        </View>
      ))}

      {/* Ghost follows finger — position: absolute relative to this container */}
      {dragCat && (
        <Animated.View
          pointerEvents="none"
          style={[
            grid.ghost,
            { width: CARD_W, opacity: ghostOpacity, left: ghostLeft, top: ghostTop },
          ]}
        >
          <CategoryCard
            cat={dragCat}
            subs={childrenOf(dragCat.id)}
            onMenu={() => undefined}
            onLongPress={() => undefined}
          />
        </Animated.View>
      )}
    </View>
  );
}

// ─── ActionSheet ──────────────────────────────────────────────────────────────

function ActionSheet({
  cat,
  onClose,
  onEdit,
  onAddSub,
  onDelete,
}: {
  cat: FinanceCategoryOption | null;
  onClose: () => void;
  onEdit: () => void;
  onAddSub: () => void;
  onDelete: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const visible = cat !== null;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 300, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  const lastCatRef = useRef(cat);
  if (cat) lastCatRef.current = cat;
  const displayCat = cat ?? lastCatRef.current;

  function action(fn: () => void) {
    onClose();
    setTimeout(fn, 250);
  }

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[sheet.backdrop, { opacity: backdropAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[sheet.panel, { transform: [{ translateY: slideAnim }] }]}>
        <View style={sheet.handle} />

        <View style={sheet.titleRow}>
          {displayCat && <View style={[sheet.titleDot, { backgroundColor: displayCat.color }]} />}
          <Text style={sheet.titleTxt} numberOfLines={1}>{displayCat?.name ?? ""}</Text>
        </View>

        <View style={sheet.divider} />

        <TouchableOpacity style={sheet.item} onPress={() => action(onEdit)}>
          <Text style={sheet.itemIcon}>✏️</Text>
          <Text style={sheet.itemTxt}>Editar categoria</Text>
        </TouchableOpacity>

        <TouchableOpacity style={sheet.item} onPress={() => action(onAddSub)}>
          <Text style={sheet.itemIcon}>➕</Text>
          <Text style={sheet.itemTxt}>Adicionar subcategoria</Text>
        </TouchableOpacity>

        <View style={sheet.divider} />

        <TouchableOpacity style={sheet.item} onPress={() => action(onDelete)}>
          <Text style={sheet.itemIcon}>🗑️</Text>
          <Text style={[sheet.itemTxt, { color: "#EF4444" }]}>Excluir categoria</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[sheet.item, sheet.cancelItem]} onPress={onClose}>
          <Text style={sheet.cancelTxt}>Cancelar</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

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

      <ActionSheet
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

// ─── CategoryCard ─────────────────────────────────────────────────────────────

function CategoryCard({
  cat, subs, onMenu, onLongPress,
}: {
  cat: FinanceCategoryOption;
  subs: FinanceCategoryOption[];
  onMenu: (cat: FinanceCategoryOption) => void;
  onLongPress: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 4;
  const visibleSubs = expanded ? subs : subs.slice(0, LIMIT);
  const hiddenCount = subs.length - LIMIT;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={c.card}
      onLongPress={onLongPress}
      delayLongPress={400}
      onPress={() => onMenu(cat)}
    >
      <View style={c.topRow}>
        <View style={[c.iconWrap, { backgroundColor: cat.color + "30" }]}>
          <Text style={c.iconTxt}>{cat.icon}</Text>
        </View>
        <TouchableOpacity style={c.menuBtn} onPress={() => onMenu(cat)} hitSlop={8}>
          <Text style={c.menuDots}>•••</Text>
        </TouchableOpacity>
      </View>
      <Text style={c.catName} numberOfLines={2}>{cat.name}</Text>
      {subs.length > 0 && <Text style={c.subCount}>{subs.length} subcategor{subs.length === 1 ? "ia" : "ias"}</Text>}
      <View style={[c.bar, { backgroundColor: cat.color }]} />
      {subs.length > 0 && (
        <View style={c.chips}>
          {visibleSubs.map(sub => (
            <View key={sub.id} style={c.chip}>
              <View style={[c.chipDot, { backgroundColor: sub.color }]} />
              <Text style={c.chipTxt} numberOfLines={1}>{sub.name}</Text>
            </View>
          ))}
          {!expanded && hiddenCount > 0 && (
            <TouchableOpacity
              style={c.moreBtn}
              onPress={e => { e.stopPropagation(); setExpanded(true); }}
              hitSlop={8}
            >
              <Text style={c.moreTxt}>+{hiddenCount} mais</Text>
            </TouchableOpacity>
          )}
          {expanded && subs.length > LIMIT && (
            <TouchableOpacity
              style={c.moreBtn}
              onPress={e => { e.stopPropagation(); setExpanded(false); }}
              hitSlop={8}
            >
              <Text style={c.moreTxt}>ver menos ▲</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

const grid = StyleSheet.create({
  row: { flexDirection: "row", gap: COL_GAP, marginBottom: COL_GAP },
  cardWrap: { width: CARD_W },
  ghost: { position: "absolute", zIndex: 999, shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
});

const sheet = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  panel: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#1E293B", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#475569", alignSelf: "center", marginTop: 12, marginBottom: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 14 },
  titleDot: { width: 10, height: 10, borderRadius: 5 },
  titleTxt: { fontSize: 17, fontWeight: "700", color: "#F1F5F9", flex: 1 },
  divider: { height: 1, backgroundColor: "#334155", marginHorizontal: 20 },
  item: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 16 },
  itemIcon: { fontSize: 20, width: 28, textAlign: "center" },
  itemTxt: { fontSize: 16, color: "#F1F5F9", fontWeight: "500" },
  cancelItem: { marginTop: 8, justifyContent: "center" },
  cancelTxt: { fontSize: 16, color: "#64748B", fontWeight: "600", textAlign: "center", flex: 1 },
});

const c = StyleSheet.create({
  card: { width: CARD_W, backgroundColor: "#1E293B", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#334155" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iconTxt: { fontSize: 22 },
  menuBtn: { padding: 4 },
  menuDots: { color: "#64748B", fontSize: 13, letterSpacing: 1 },
  catName: { color: "#F1F5F9", fontSize: 14, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 },
  subCount: { color: "#64748B", fontSize: 11, marginBottom: 8 },
  bar: { height: 3, borderRadius: 2, marginBottom: 10 },
  chips: { gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#0F172A", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipTxt: { color: "#94A3B8", fontSize: 12, fontWeight: "500", flex: 1 },
  moreBtn: { marginTop: 2, alignSelf: "flex-start" },
  moreTxt: { color: "#60a5fa", fontSize: 11, fontWeight: "600" },
});
