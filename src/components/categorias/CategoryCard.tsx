import { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  PanResponder, Platform, UIManager, LayoutAnimation, Animated,
} from "react-native";
import type { FinanceCategoryOption } from "../../types/finance";
import { CARD_W } from "./constants";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CHIP_SLOT_H = 34;

export function CategoryCard({
  cat, subs, onMenu, onLongPress, onSubMenu, childrenOf,
  onChipDragStart, onChipDragMove, onChipDragEnd, onChipDragCancel, draggingSubId,
  isHovered, isDragActive,
}: {
  cat: FinanceCategoryOption;
  subs: FinanceCategoryOption[];
  onMenu: (cat: FinanceCategoryOption) => void;
  onLongPress: () => void;
  onSubMenu?: (sub: FinanceCategoryOption) => void;
  childrenOf?: (id: string) => FinanceCategoryOption[];
  onChipDragStart?: (sub: FinanceCategoryOption, pageX: number, pageY: number) => void;
  onChipDragMove?: (pageX: number, pageY: number) => void;
  onChipDragEnd?: (pageX: number, pageY: number) => void;
  onChipDragCancel?: () => void;
  draggingSubId?: string | null;
  isHovered?: boolean;
  isDragActive?: boolean;
}) {
  const [expanded, setExpanded]       = useState(false);
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());
  const [subOrder, setSubOrder]       = useState<string[]>(() => subs.map(s => s.id));
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
  const LIMIT = 4;

  // Card hover glow (useNativeDriver:false — opacity on overlay)
  const glowAnim = useRef(new Animated.Value(0)).current;
  // Card dim when another card is being hovered (useNativeDriver:true — opacity)
  const dimAnim  = useRef(new Animated.Value(1)).current;
  // Chip entrance spring scale
  const chipEnterScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(glowAnim, { toValue: isHovered ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [isHovered, glowAnim]);

  useEffect(() => {
    Animated.timing(dimAnim, {
      toValue: isDragActive && !isHovered ? 0.55 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isDragActive, isHovered, dimAnim]);

  // Sync subOrder + detect newly added chip → entrance bounce
  useEffect(() => {
    setSubOrder(prev => {
      const existingSet = new Set(subs.map(s => s.id));
      const kept  = prev.filter(id => existingSet.has(id));
      const added = subs.filter(s => !kept.includes(s.id)).map(s => s.id);
      if (added.length > 0) {
        const id = added[0];
        LayoutAnimation.configureNext({
          duration: 300,
          update: { type: LayoutAnimation.Types.spring, springDamping: 0.65 },
          create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
          delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
        });
        chipEnterScale.setValue(0);
        setNewlyAddedId(id);
        Animated.spring(chipEnterScale, {
          toValue: 1, tension: 280, friction: 6, useNativeDriver: true,
        }).start(() => setNewlyAddedId(null));
      }
      return [...kept, ...added];
    });
  }, [subs, chipEnterScale]);

  const orderedSubs    = subOrder.map(id => subs.find(s => s.id === id)).filter(Boolean) as FinanceCategoryOption[];
  const visibleSubs    = expanded ? orderedSubs : orderedSubs.slice(0, LIMIT);
  const hiddenCount    = orderedSubs.length - LIMIT;

  // Drag refs
  const chipDragRef      = useRef<string | null>(null);
  const dragStartSlot    = useRef(-1);
  const hoverSlotRef     = useRef(-1);
  const orderedSubsRef   = useRef<FinanceCategoryOption[]>(orderedSubs);
  orderedSubsRef.current = orderedSubs;
  const cbRef = useRef({ onChipDragMove, onChipDragEnd, onChipDragCancel });
  cbRef.current = { onChipDragMove, onChipDragEnd, onChipDragCancel };

  function reorderChip(id: string, toSlot: number) {
    setSubOrder(prev => {
      const fromIdx = prev.indexOf(id);
      if (fromIdx < 0 || fromIdx === toSlot) return prev;
      LayoutAnimation.configureNext({
        duration: 260,
        create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
        update: { type: LayoutAnimation.Types.spring, springDamping: 0.6 },
        delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      });
      const next = [...prev];
      next.splice(fromIdx, 1);
      next.splice(toSlot, 0, id);
      return next;
    });
  }

  const chipAreaPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder:  () => chipDragRef.current !== null,
    onPanResponderMove: (e, gs) => {
      if (!chipDragRef.current) return;
      cbRef.current.onChipDragMove?.(e.nativeEvent.pageX, e.nativeEvent.pageY);
      const maxSlot = Math.max(0, orderedSubsRef.current.length - 1);
      const rawSlot = dragStartSlot.current + Math.round(gs.dy / CHIP_SLOT_H);
      const slot    = Math.max(0, Math.min(maxSlot, rawSlot));
      if (slot !== hoverSlotRef.current) {
        hoverSlotRef.current = slot;
        reorderChip(chipDragRef.current, slot);
      }
    },
    onPanResponderRelease: (e) => {
      if (!chipDragRef.current) return;
      cbRef.current.onChipDragEnd?.(e.nativeEvent.pageX, e.nativeEvent.pageY);
      chipDragRef.current   = null;
      hoverSlotRef.current  = -1;
      dragStartSlot.current = -1;
    },
    onPanResponderTerminate: () => {
      if (chipDragRef.current) cbRef.current.onChipDragCancel?.();
      chipDragRef.current   = null;
      hoverSlotRef.current  = -1;
      dragStartSlot.current = -1;
    },
  })).current;

  function toggleSub(subId: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSubs(prev => {
      const next = new Set(prev);
      if (next.has(subId)) { next.delete(subId); } else { next.add(subId); }
      return next;
    });
  }

  return (
    <Animated.View style={[c.card, { opacity: dimAnim }]}>
      {/* Blue glow overlay when this card is the drop target */}
      {isDragActive && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, c.glowOverlay, { opacity: glowAnim }]}
        />
      )}

      <TouchableOpacity
        activeOpacity={0.85}
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
        {subs.length > 0 && (
          <Text style={c.subCount}>{subs.length} subcategor{subs.length === 1 ? "ia" : "ias"}</Text>
        )}
        <View style={[c.bar, { backgroundColor: cat.color }]} />
      </TouchableOpacity>

      {subs.length > 0 && (
        <View {...chipAreaPan.panHandlers}>
          <View style={c.chips}>
            {visibleSubs.map((sub, idx) => {
              const grandchildren = childrenOf?.(sub.id) ?? [];
              const isOpen     = expandedSubs.has(sub.id);
              const isDragging = draggingSubId === sub.id;
              const isNew      = newlyAddedId === sub.id;
              return (
                <Animated.View
                  key={sub.id}
                  style={[
                    { opacity: isDragging ? 0.2 : 1 },
                    isNew && { transform: [{ scale: chipEnterScale }] },
                  ]}
                >
                  <View style={c.chipRow}>
                    <TouchableOpacity
                      style={[c.chip, { flex: 1 }]}
                      activeOpacity={0.7}
                      delayLongPress={450}
                      onPress={() => { if (grandchildren.length > 0) toggleSub(sub.id); }}
                      onLongPress={(e) => {
                        chipDragRef.current   = sub.id;
                        dragStartSlot.current = idx;
                        hoverSlotRef.current  = idx;
                        onChipDragStart?.(sub, e.nativeEvent.pageX, e.nativeEvent.pageY);
                      }}
                      hitSlop={4}
                    >
                      <View style={[c.chipDot, { backgroundColor: sub.color }]} />
                      <Text style={c.chipTxt} numberOfLines={1}>{sub.name}</Text>
                      {grandchildren.length > 0 && (
                        <Text style={c.chipArrow}>{isOpen ? "▲" : "▼"}</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onSubMenu?.(sub)} hitSlop={8} style={c.chipMenuBtn}>
                      <Text style={c.chipEdit}>•••</Text>
                    </TouchableOpacity>
                  </View>

                  {isOpen && grandchildren.map(gc => (
                    <TouchableOpacity
                      key={gc.id}
                      style={c.grandchip}
                      activeOpacity={0.7}
                      onPress={() => onSubMenu?.(gc)}
                      hitSlop={4}
                    >
                      <View style={[c.chipDot, { backgroundColor: gc.color }]} />
                      <Text style={c.chipTxt} numberOfLines={1}>{gc.name}</Text>
                      <Text style={c.chipEdit}>•••</Text>
                    </TouchableOpacity>
                  ))}
                </Animated.View>
              );
            })}

            {!expanded && hiddenCount > 0 && (
              <TouchableOpacity style={c.moreBtn} onPress={() => setExpanded(true)} hitSlop={8}>
                <Text style={c.moreTxt}>+{hiddenCount} mais</Text>
              </TouchableOpacity>
            )}
            {expanded && orderedSubs.length > LIMIT && (
              <TouchableOpacity style={c.moreBtn} onPress={() => setExpanded(false)} hitSlop={8}>
                <Text style={c.moreTxt}>ver menos ▲</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const c = StyleSheet.create({
  card: { width: CARD_W, backgroundColor: "#1E293B", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#334155", overflow: "hidden" },
  glowOverlay: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#3B82F6",
    backgroundColor: "rgba(59,130,246,0.07)",
    // iOS glow
    shadowColor: "#3B82F6",
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iconTxt: { fontSize: 22 },
  menuBtn: { padding: 4 },
  menuDots: { color: "#64748B", fontSize: 13, letterSpacing: 1 },
  catName: { color: "#F1F5F9", fontSize: 14, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 },
  subCount: { color: "#64748B", fontSize: 11, marginBottom: 8 },
  bar: { height: 3, borderRadius: 2, marginBottom: 10 },
  chips: { gap: 6 },
  chipRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#0F172A", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipTxt: { color: "#94A3B8", fontSize: 12, fontWeight: "500", flex: 1 },
  chipEdit: { color: "#334155", fontSize: 10, letterSpacing: 0.5 },
  chipArrow: { color: "#60A5FA", fontSize: 9, fontWeight: "700" },
  chipMenuBtn: { paddingHorizontal: 6, paddingVertical: 5 },
  grandchip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#0a1628", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, marginLeft: 16, marginTop: 3, borderLeftWidth: 2, borderLeftColor: "#3B82F6" },
  moreBtn: { marginTop: 2, alignSelf: "flex-start" },
  moreTxt: { color: "#60a5fa", fontSize: 11, fontWeight: "600" },
});
