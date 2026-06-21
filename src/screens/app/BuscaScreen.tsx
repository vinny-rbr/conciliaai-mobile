import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, FlatList, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { fetchFinanceItems, fmt } from "../../lib/financeService";
import { rootNavigate } from "../../navigation/rootNav";
import { catIcon } from "../../lib/catUtils";
import type { FinanceItem } from "../../types/finance";

type Filter = "TODOS" | "RECEITA" | "DESPESA";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "TODOS",   label: "Todos"    },
  { key: "RECEITA", label: "Receitas" },
  { key: "DESPESA", label: "Despesas" },
];

function fmtDate(iso: string) {
  return iso.slice(0, 10).split("-").reverse().join("/").slice(0, 5);
}

function ResultRow({ item, onPress }: { item: FinanceItem; onPress: () => void }) {
  const isRec   = item.type === "RECEITA";
  const icon    = catIcon(item.category) ?? (isRec ? "↑" : "↓");
  const color   = isRec ? "#22C55E" : "#EF4444";
  const bgColor = isRec ? "#22C55E15" : "#EF444415";

  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.iconWrap, { backgroundColor: bgColor }]}>
        <Text style={[s.iconTxt, { color }]}>{icon}</Text>
      </View>
      <View style={s.rowInfo}>
        <Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={s.rowMeta} numberOfLines={1}>
          {item.category}  ·  {fmtDate(item.dateISO)}
          {item.note ? `  ·  ${item.note}` : ""}
        </Text>
      </View>
      <Text style={[s.rowAmt, { color }]}>
        {isRec ? "+" : "-"}{fmt(item.amountCents)}
      </Text>
    </TouchableOpacity>
  );
}

export default function BuscaScreen() {
  const navigation = useNavigation();
  const inputRef   = useRef<TextInput>(null);

  const [query,   setQuery]   = useState("");
  const [items,   setItems]   = useState<FinanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<Filter>("TODOS");

  useEffect(() => {
    fetchFinanceItems()
      .then(setItems)
      .catch(() => {/* ignore */})
      .finally(() => setLoading(false));
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items.filter(it => {
      if (filter !== "TODOS" && it.type !== filter) return false;
      return (
        it.title.toLowerCase().includes(q) ||
        (it.category ?? "").toLowerCase().includes(q) ||
        (it.note ?? "").toLowerCase().includes(q) ||
        fmt(it.amountCents).replace(/\s/g, "").includes(q.replace(/\s/g, ""))
      );
    }).slice(0, 60);
  }, [query, items, filter]);

  const handleSelect = useCallback((item: FinanceItem) => {
    navigation.goBack();
    setTimeout(() => rootNavigate("AddTransaction", { editItem: item }), 50);
  }, [navigation]);

  const trimmed = query.trim();

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backTxt}>✕</Text>
        </TouchableOpacity>
        <View style={s.inputWrap}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={s.input}
            placeholder="Buscar transações..."
            placeholderTextColor="#475569"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} style={s.clearBtn}>
              <Text style={s.clearTxt}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.chip, filter === f.key && s.chipActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[s.chipTxt, filter === f.key && s.chipTxtActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color="#3B82F6" size="large" />
        </View>
      ) : !trimmed ? (
        <View style={s.center}>
          <Text style={s.emptyIcon}>🔍</Text>
          <Text style={s.emptyTitle}>Busca global</Text>
          <Text style={s.emptySub}>Título, categoria, nota ou valor</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyIcon}>😕</Text>
          <Text style={s.emptyTitle}>Nenhum resultado</Text>
          <Text style={s.emptySub}>para "{trimmed}"</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={it => it.id}
          contentContainerStyle={s.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <ResultRow item={item} onPress={() => handleSelect(item)} />
          )}
          ListHeaderComponent={
            <Text style={s.countTxt}>
              {results.length} resultado{results.length !== 1 ? "s" : ""}
              {results.length === 60 ? " (mostrando 60)" : ""}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#0F172A" },

  // header
  header:   { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 4, paddingBottom: 10, gap: 10 },
  backBtn:  { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  backTxt:  { color: "#64748B", fontSize: 16, fontWeight: "700" },
  inputWrap:{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#1E293B", borderRadius: 14, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: "#334155", gap: 8 },
  searchIcon:{ fontSize: 14 },
  input:    { flex: 1, color: "#F1F5F9", fontSize: 15 },
  clearBtn: { padding: 4 },
  clearTxt: { color: "#475569", fontSize: 13 },

  // filters
  filterRow:{ flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 10 },
  chip:     { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: "#1E293B", borderWidth: 1.5, borderColor: "#334155" },
  chipActive:{ backgroundColor: "#1D4ED822", borderColor: "#3B82F6" },
  chipTxt:  { color: "#64748B", fontSize: 13, fontWeight: "600" },
  chipTxtActive: { color: "#60A5FA", fontWeight: "700" },

  // empty / loading
  center:    { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle:{ color: "#F1F5F9", fontSize: 17, fontWeight: "700", marginBottom: 4 },
  emptySub:  { color: "#475569", fontSize: 14 },

  // list
  list:     { paddingHorizontal: 16, paddingBottom: 40 },
  countTxt: { color: "#475569", fontSize: 12, marginBottom: 10 },

  // row
  row:      { flexDirection: "row", alignItems: "center", backgroundColor: "#1E293B", borderRadius: 14, padding: 13, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: "#334155" },
  iconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iconTxt:  { fontSize: 18, fontWeight: "700" },
  rowInfo:  { flex: 1, gap: 3 },
  rowTitle: { color: "#F1F5F9", fontSize: 14, fontWeight: "700" },
  rowMeta:  { color: "#475569", fontSize: 11 },
  rowAmt:   { fontSize: 13, fontWeight: "800", textAlign: "right" },
});
