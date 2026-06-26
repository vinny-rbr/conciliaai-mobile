import { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { FinanceCategoryOption } from "../types/finance";

function CatRow({ cat, depth, allCats, expandedIds, onToggle, selectedId, onSelect }: {
  cat: FinanceCategoryOption;
  depth: number;
  allCats: FinanceCategoryOption[];
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  selectedId: string | undefined;
  onSelect: (c: FinanceCategoryOption) => void;
}) {
  const children = allCats.filter(c => c.parentId === cat.id);
  const isSelected = selectedId === cat.id;
  const isOpen = expandedIds.has(cat.id);
  const indent = depth * 14;

  return (
    <>
      <View style={{ marginLeft: indent }}>
        <View style={r.rowWrap}>
          <TouchableOpacity
            style={[r.row, isSelected && { backgroundColor: cat.color + "18", borderColor: cat.color }]}
            onPress={() => onSelect(cat)}
            activeOpacity={0.7}
          >
            <View style={[r.dotWrap, { backgroundColor: cat.color + "33", width: depth === 0 ? 40 : 32, height: depth === 0 ? 40 : 32 }]}>
              <Text style={{ fontSize: depth === 0 ? 18 : 14 }}>{cat.icon}</Text>
            </View>
            <Text style={[r.name, depth > 0 && { fontSize: 13 }]} numberOfLines={1}>{cat.name}</Text>
            {isSelected && <Text style={[r.check, { color: cat.color }]}>✓</Text>}
          </TouchableOpacity>
          {children.length > 0 && (
            <TouchableOpacity onPress={() => onToggle(cat.id)} style={r.arrowBtn} hitSlop={12}>
              <Text style={r.arrow}>{isOpen ? "▲" : "▼"}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {isOpen && children.map(child => (
        <CatRow
          key={child.id}
          cat={child}
          depth={depth + 1}
          allCats={allCats}
          expandedIds={expandedIds}
          onToggle={onToggle}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

type Props = {
  visible: boolean;
  onClose: () => void;
  categories: FinanceCategoryOption[];
  selectedCat: FinanceCategoryOption | null;
  onSelect: (c: FinanceCategoryOption) => void;
};

export function CategoryTreeModal({ visible, onClose, categories, selectedCat, onSelect }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible && selectedCat?.parentId) {
      const ancestors = new Set<string>();
      let cur = categories.find(c => c.id === selectedCat.parentId);
      while (cur) {
        ancestors.add(cur.id);
        cur = cur.parentId ? categories.find(c => c.id === cur!.parentId) : undefined;
      }
      setExpandedIds(ancestors);
    } else if (!visible) {
      setExpandedIds(new Set());
    }
  }, [visible, selectedCat?.id]);

  const roots = categories.filter(c => !c.parentId);

  function toggle(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={r.overlay}>
        <View style={r.sheet}>
          <View style={r.handle} />
          <View style={r.header}>
            <Text style={r.title}>Categoria</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={r.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            {roots.length === 0 ? (
              <Text style={r.empty}>Nenhuma categoria cadastrada.</Text>
            ) : roots.map(cat => (
              <CatRow
                key={cat.id}
                cat={cat}
                depth={0}
                allCats={categories}
                expandedIds={expandedIds}
                onToggle={toggle}
                selectedId={selectedCat?.id}
                onSelect={c => { onSelect(c); onClose(); }}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const r = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: "rgba(0,0,0,.6)", justifyContent: "flex-end" },
  sheet:    { backgroundColor: "#0F172A", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "80%", paddingBottom: 24 },
  handle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: "#334155", alignSelf: "center", marginTop: 12, marginBottom: 4 },
  header:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14 },
  title:    { color: "#F1F5F9", fontSize: 16, fontWeight: "700" },
  closeBtn: { color: "#64748B", fontSize: 18, fontWeight: "700" },
  rowWrap:  { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  row:      { flex: 1, flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "transparent", backgroundColor: "#1E293B", gap: 10 },
  dotWrap:  { borderRadius: 10, alignItems: "center", justifyContent: "center" },
  name:     { color: "#F1F5F9", fontSize: 14, fontWeight: "600", flex: 1 },
  check:    { fontSize: 16, fontWeight: "800" },
  arrowBtn: { paddingHorizontal: 10, paddingVertical: 10, marginLeft: 6 },
  arrow:    { color: "#64748B", fontSize: 11, fontWeight: "700" },
  empty:    { color: "#64748B", textAlign: "center", marginTop: 32 },
});
