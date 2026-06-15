import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { FinanceCategoryOption } from "../../types/finance";
import { CARD_W } from "./constants";

export function CategoryCard({
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
