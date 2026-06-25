import { useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, LayoutAnimation, Platform, UIManager } from "react-native";
import type { FinanceCategoryOption } from "../../types/finance";
import { CARD_W } from "./constants";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function CategoryCard({
  cat, subs, onMenu, onLongPress, onSubMenu, childrenOf,
}: {
  cat: FinanceCategoryOption;
  subs: FinanceCategoryOption[];
  onMenu: (cat: FinanceCategoryOption) => void;
  onLongPress: () => void;
  onSubMenu?: (sub: FinanceCategoryOption) => void;
  childrenOf?: (id: string) => FinanceCategoryOption[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());
  const LIMIT = 4;
  const visibleSubs = expanded ? subs : subs.slice(0, LIMIT);
  const hiddenCount = subs.length - LIMIT;

  function toggleSub(subId: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSubs(prev => {
      const next = new Set(prev);
      if (next.has(subId)) { next.delete(subId); } else { next.add(subId); }
      return next;
    });
  }

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
          {visibleSubs.map(sub => {
            const grandchildren = childrenOf?.(sub.id) ?? [];
            const isOpen = expandedSubs.has(sub.id);
            return (
              <View key={sub.id}>
                <View style={c.chipRow}>
                  <TouchableOpacity
                    style={[c.chip, { flex: 1 }]}
                    activeOpacity={0.7}
                    onPress={e => { e.stopPropagation(); if (grandchildren.length > 0) toggleSub(sub.id); }}
                    hitSlop={4}
                  >
                    <View style={[c.chipDot, { backgroundColor: sub.color }]} />
                    <Text style={c.chipTxt} numberOfLines={1}>{sub.name}</Text>
                    {grandchildren.length > 0 && (
                      <Text style={c.chipArrow}>{isOpen ? "▲" : "▼"}</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={e => { e.stopPropagation(); onSubMenu?.(sub); }} hitSlop={8} style={c.chipMenuBtn}>
                    <Text style={c.chipEdit}>•••</Text>
                  </TouchableOpacity>
                </View>
                {isOpen && grandchildren.map(gc => (
                  <TouchableOpacity
                    key={gc.id}
                    style={c.grandchip}
                    activeOpacity={0.7}
                    onPress={e => { e.stopPropagation(); onSubMenu?.(gc); }}
                    hitSlop={4}
                  >
                    <View style={[c.chipDot, { backgroundColor: gc.color }]} />
                    <Text style={c.chipTxt} numberOfLines={1}>{gc.name}</Text>
                    <Text style={c.chipEdit}>•••</Text>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })}
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
  chipEdit: { color: "#334155", fontSize: 10, letterSpacing: 0.5 },
  grandchip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#0a1628", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, marginLeft: 16, marginTop: 3, borderLeftWidth: 2, borderLeftColor: "#3B82F6" },
  chipArrow: { color: "#60A5FA", fontSize: 9, fontWeight: "700" },
  chipRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  chipMenuBtn: { paddingHorizontal: 6, paddingVertical: 5 },
  moreBtn: { marginTop: 2, alignSelf: "flex-start" },
  moreTxt: { color: "#60a5fa", fontSize: 11, fontWeight: "600" },
});
