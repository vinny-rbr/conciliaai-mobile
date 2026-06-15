import { useEffect, useState, useRef, useMemo } from "react";
import { View, StyleSheet, Animated, PanResponder } from "react-native";
import type { FinanceCategoryOption } from "../../types/finance";
import { CARD_W, COL_GAP } from "./constants";
import { CategoryCard } from "./CategoryCard";

export type CardLayout = { x: number; y: number; w: number; h: number };

export function DraggableGrid({
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

const grid = StyleSheet.create({
  row: { flexDirection: "row", gap: COL_GAP, marginBottom: COL_GAP },
  cardWrap: { width: CARD_W },
  ghost: { position: "absolute", zIndex: 999, shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
});
