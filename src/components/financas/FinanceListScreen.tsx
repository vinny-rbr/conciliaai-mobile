import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Animated, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Svg, { Path, Polyline, Circle } from "react-native-svg";
import { fetchFinanceItems, deleteFinanceItem, fmt } from "../../lib/financeService";
import { addMonthsYM, ymToLabel } from "../../lib/dateUtils";
import { catIcon } from "../../lib/catUtils";
import type { FinanceItem } from "../../types/finance";
import type { RootStackParamList } from "../../navigation";

type Props = { type: "RECEITA" | "DESPESA" };
type NavProp = NativeStackNavigationProp<RootStackParamList>;

const WEEK = ["Domingo","Segunda-Feira","Terça-Feira","Quarta-Feira","Quinta-Feira","Sexta-Feira","Sábado"];
const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function fullDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${WEEK[date.getDay()]}, ${d} De ${MONTHS_PT[m - 1]}`;
}

function currentYM(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const TABS = [
  { name: "Home",        icon: "⌂",  label: "Início",    color: "#60A5FA", side: "left"  },
  { name: "Categorias",  icon: "◈",  label: "Categorias",color: "#A78BFA", side: "left"  },
  { name: "Grupos",      icon: "⊕",  label: "Grupos",    color: "#34D399", side: "right" },
  { name: "Planejamento",icon: "≡",  label: "Planos",    color: "#FBBF24", side: "right" },
] as const;

function FinanceItemRow({ it, isReceita, onPress }: { it: FinanceItem; isReceita: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={s.item}
        activeOpacity={0.9}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 300, friction: 20 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 300, friction: 20 }).start()}
        onPress={onPress}
      >
        <View style={[s.itemIcon, { backgroundColor: isReceita ? "rgba(74,222,128,.15)" : "rgba(248,113,113,.15)" }]}>
          <Text style={s.itemEmoji}>{catIcon(it.category)}</Text>
        </View>
        <View style={s.itemBody}>
          <Text style={s.itemTitle} numberOfLines={2}>{it.title}</Text>
          <Text style={s.itemCat}>{it.category}</Text>
        </View>
        <View style={s.itemRight}>
          <Text style={[s.itemAmt, { color: isReceita ? "#4ADE80" : "#F87171" }]}>
            {fmt(it.amountCents)}
          </Text>
          {it.status === "paid" && (
            <View style={[s.checkBadge, { backgroundColor: isReceita ? "rgba(74,222,128,.18)" : "rgba(96,165,250,.18)" }]}>
              <Text style={[s.checkTxt, { color: isReceita ? "#4ADE80" : "#60A5FA" }]}>✓</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function FinanceListScreen({ type }: Props) {
  const isReceita = type === "RECEITA";
  const navigation = useNavigation<NavProp>();
  const [all, setAll] = useState<FinanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(currentYM);
  const [deletingAll, setDeletingAll] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchAnim = useRef(new Animated.Value(0)).current;
  const searchRef = useRef<TextInput>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const data = await fetchFinanceItems();
    setAll(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => { void load(true); }, [load]));
  const onRefresh = useCallback(() => { setRefreshing(true); void load(true); }, [load]);

  const monthItems = useMemo(
    () => all.filter(it => it.type === type && it.dateISO.startsWith(month)),
    [all, type, month],
  );

  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return monthItems;
    return monthItems.filter(it =>
      it.title.toLowerCase().includes(q) ||
      it.category.toLowerCase().includes(q) ||
      fmt(it.amountCents).includes(q) ||
      it.amountCents.toString().includes(q.replace(/\D/g, "")),
    );
  }, [monthItems, searchQuery]);

  const paid   = useMemo(() => visible.filter(it => it.status === "paid"),   [visible]);
  const unpaid = useMemo(() => visible.filter(it => it.status !== "paid"),   [visible]);
  const totalPaid   = paid.reduce((s, it) => s + it.amountCents, 0);
  const totalUnpaid = unpaid.reduce((s, it) => s + it.amountCents, 0);

  const groups = useMemo(() => {
    const map = new Map<string, FinanceItem[]>();
    for (const it of visible) {
      const g = map.get(it.dateISO) ?? [];
      g.push(it);
      map.set(it.dateISO, g);
    }
    return [...map.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({
        date,
        items,
        total: items.reduce((s, it) => s + it.amountCents, 0),
      }));
  }, [visible]);

  const today = currentYM();
  const maxMonth = addMonthsYM(today, 12);
  const canNext = month < maxMonth;

  const toggleSearch = () => {
    if (searchOpen) {
      setSearchQuery("");
      Animated.timing(searchAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start(() => setSearchOpen(false));
    } else {
      setSearchOpen(true);
      Animated.timing(searchAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start(() => searchRef.current?.focus());
    }
  };

  const handleDeleteAll = () => {
    if (monthItems.length === 0) return;
    Alert.alert(
      `Apagar ${monthItems.length} lançamento${monthItems.length !== 1 ? "s" : ""}?`,
      `Todos os ${isReceita ? "receitas" : "despesas"} de ${ymToLabel(month)} serão removidos permanentemente.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar tudo",
          style: "destructive",
          onPress: async () => {
            setDeletingAll(true);
            await Promise.all(monthItems.map(it => deleteFinanceItem(it.id)));
            await load(true);
            setDeletingAll(false);
          },
        },
      ],
    );
  };

  const handleFabPress = () => {
    navigation.navigate("AddTransaction", { defaultType: type });
  };

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.typePill}>
          <TouchableOpacity
            style={[s.typePillBtn, isReceita && s.typePillBtnActive, isReceita && { backgroundColor: "#166534" }]}
            onPress={() => { if (!isReceita) navigation.replace("Receitas"); }}
            activeOpacity={0.8}
          >
            <Text style={[s.typePillTxt, isReceita && { color: "#4ADE80" }]}>↑ Receitas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.typePillBtn, !isReceita && s.typePillBtnActive, !isReceita && { backgroundColor: "#7F1D1D" }]}
            onPress={() => { if (isReceita) navigation.replace("Despesas"); }}
            activeOpacity={0.8}
          >
            <Text style={[s.typePillTxt, !isReceita && { color: "#F87171" }]}>↓ Despesas</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Month nav */}
      <View style={s.monthNav}>
        <TouchableOpacity style={s.monthBtn} onPress={() => setMonth(m => addMonthsYM(m, -1))}>
          <Text style={s.monthBtnTxt}>‹</Text>
        </TouchableOpacity>
        <View style={s.monthCenter}>
          <Text style={s.monthLabel}>{ymToLabel(month).split(" ")[0]}</Text>
          <Text style={s.monthYear}>{ymToLabel(month).split(" ")[1]}</Text>
        </View>
        <TouchableOpacity
          style={[s.monthBtn, !canNext && { opacity: 0.3 }]}
          onPress={() => canNext && setMonth(m => addMonthsYM(m, 1))}
          disabled={!canNext}
        >
          <Text style={s.monthBtnTxt}>›</Text>
        </TouchableOpacity>

        {/* Search icon */}
        <TouchableOpacity style={[s.monthBtn, { marginLeft: 4 }, searchOpen && { backgroundColor: "#1E3A5F" }]} onPress={toggleSearch} activeOpacity={0.7}>
          <Svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke={searchOpen ? "#60A5FA" : "#94A3B8"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="11" cy="11" r="7" />
            <Path d="m20 20-3-3" />
          </Svg>
        </TouchableOpacity>

        {/* Delete all icon */}
        {monthItems.length > 0 && (
          <TouchableOpacity style={[s.monthBtn, { marginLeft: 4 }]} onPress={handleDeleteAll} disabled={deletingAll} activeOpacity={0.7}>
            {deletingAll
              ? <ActivityIndicator size="small" color="#F87171" />
              : (
                <Svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#F87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <Polyline points="3 6 5 6 21 6" />
                  <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <Path d="M10 11v6M14 11v6M9 6V4h6v2" />
                </Svg>
              )
            }
          </TouchableOpacity>
        )}
      </View>

      {/* Search bar */}
      {searchOpen && (
        <Animated.View style={[s.searchBar, { opacity: searchAnim, transform: [{ translateY: searchAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }]}>
          <Svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="11" cy="11" r="7" />
            <Path d="m20 20-3-3" />
          </Svg>
          <TextInput
            ref={searchRef}
            style={s.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar por nome, categoria ou valor…"
            placeholderTextColor="#475569"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
              <Text style={{ color: "#64748B", fontSize: 18, lineHeight: 20 }}>×</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* Summary */}
      <View style={s.summaryRow}>
        <View style={s.summaryCard}>
          <View style={s.summaryTop}>
            <Text style={s.summaryIcon}>⏱</Text>
            <Text style={s.summaryLbl}>{isReceita ? "A receber" : "A pagar"}</Text>
          </View>
          <Text style={[s.summaryVal, { color: "#F59E0B" }]}>{fmt(totalUnpaid)}</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryCard}>
          <View style={s.summaryTop}>
            <Text style={s.summaryIcon}>✓</Text>
            <Text style={s.summaryLbl}>{isReceita ? "Recebido" : "Pago"}</Text>
          </View>
          <Text style={[s.summaryVal, { color: isReceita ? "#4ADE80" : "#60A5FA" }]}>{fmt(totalPaid)}</Text>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={s.center}><ActivityIndicator color="#3B82F6" size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60A5FA" />}
        >
          {groups.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 60 }}>
              <Text style={{ fontSize: 44, marginBottom: 16 }}>{searchQuery ? "🔍" : (isReceita ? "💰" : "💸")}</Text>
              <Text style={{ color: "#F1F5F9", fontSize: 16, fontWeight: "700", marginBottom: 8 }}>
                {searchQuery ? "Nenhum resultado" : "Nenhum lançamento"}
              </Text>
              <Text style={{ color: "#64748B", fontSize: 14, textAlign: "center", lineHeight: 20, maxWidth: 260 }}>
                {searchQuery
                  ? `Sem resultados para "${searchQuery}"`
                  : `Não há ${isReceita ? "receitas" : "despesas"} em ${ymToLabel(month)}`}
              </Text>
            </View>
          ) : (
            groups.map(({ date, items, total }) => (
              <View key={date}>
                <View style={s.dateHeader}>
                  <Text style={s.dateLabel}>{fullDateLabel(date)}</Text>
                  <Text style={s.dateTotal}>{fmt(total)}</Text>
                </View>
                {items.map(it => (
                  <FinanceItemRow
                    key={it.id}
                    it={it}
                    isReceita={isReceita}
                    onPress={() => navigation.navigate("AddTransaction", { editItem: it })}
                  />
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Tab bar */}
      <View style={s.tabBarWrapper} pointerEvents="box-none">
        <View style={s.pillRow}>
          <View style={s.halfLeft}>
            {TABS.filter(t => t.side === "left").map(t => (
              <TouchableOpacity key={t.name} style={s.tab} activeOpacity={0.7} onPress={() => navigation.navigate("Tabs")}>
                <Text style={[s.tabIcon, { color: "#475569" }]}>{t.icon}</Text>
                <Text style={[s.tabLabel, { color: "#475569" }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.halfRight}>
            {TABS.filter(t => t.side === "right").map(t => (
              <TouchableOpacity key={t.name} style={s.tab} activeOpacity={0.7} onPress={() => navigation.navigate("Tabs")}>
                <Text style={[s.tabIcon, { color: "#475569" }]}>{t.icon}</Text>
                <Text style={[s.tabLabel, { color: "#475569" }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Animated.View style={[s.fabWrap]} pointerEvents="box-none">
          <TouchableOpacity style={s.fab} activeOpacity={0.85} onPress={handleFabPress}>
            <Text style={s.fabTxt}>+</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const PILL_BG   = "#0F172A";
const PILL_BORD = "#1E293B";

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F172A" },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, alignItems: "center" },
  typePill: { flexDirection: "row", backgroundColor: "#1E293B", borderRadius: 14, borderWidth: 1, borderColor: "#334155", overflow: "hidden" },
  typePillBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 20, alignItems: "center" },
  typePillBtnActive: { borderRadius: 12 },
  typePillTxt: { fontSize: 15, fontWeight: "800", color: "#475569" },

  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, gap: 4 },
  monthBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#1E293B", alignItems: "center", justifyContent: "center" },
  monthBtnTxt: { color: "#60A5FA", fontSize: 20, fontWeight: "700", lineHeight: 24 },
  monthCenter: { alignItems: "center", minWidth: 120, marginHorizontal: 8 },
  monthLabel: { color: "#F1F5F9", fontSize: 18, fontWeight: "800" },
  monthYear: { color: "#64748B", fontSize: 13, fontWeight: "500", marginTop: 1 },

  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: "#1E293B", borderRadius: 14, borderWidth: 1, borderColor: "#334155",
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, color: "#F1F5F9", fontSize: 14, fontWeight: "500", padding: 0 },

  summaryRow: { flexDirection: "row", marginHorizontal: 16, backgroundColor: "#1E293B", borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: "#334155" },
  summaryCard: { flex: 1, padding: 16 },
  summaryDivider: { width: 1, backgroundColor: "#334155", marginVertical: 12 },
  summaryTop: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  summaryIcon: { fontSize: 14, color: "#94A3B8" },
  summaryLbl: { color: "#94A3B8", fontSize: 13, fontWeight: "600" },
  summaryVal: { fontSize: 18, fontWeight: "800" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { paddingHorizontal: 16, paddingBottom: 120 },

  dateHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, paddingHorizontal: 4 },
  dateLabel: { color: "#94A3B8", fontSize: 13, fontWeight: "700" },
  dateTotal: { color: "#64748B", fontSize: 13 },

  item: { flexDirection: "row", alignItems: "center", backgroundColor: "#1E293B", borderRadius: 14, padding: 14, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: "#334155" },
  itemIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  itemEmoji: { fontSize: 20 },
  itemBody: { flex: 1 },
  itemTitle: { color: "#F1F5F9", fontSize: 14, fontWeight: "600", lineHeight: 20 },
  itemCat: { color: "#64748B", fontSize: 12, marginTop: 2 },
  itemRight: { alignItems: "flex-end", gap: 6 },
  itemAmt: { fontSize: 15, fontWeight: "700" },
  checkBadge: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  checkTxt: { fontSize: 12, fontWeight: "800" },

  tabBarWrapper: { position: "absolute", bottom: 20, left: 12, right: 12, alignItems: "center" },
  pillRow: { width: "100%", flexDirection: "row", shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
  halfLeft: { flex: 1, flexDirection: "row", backgroundColor: PILL_BG, borderTopLeftRadius: 28, borderBottomLeftRadius: 28, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderWidth: 1, borderRightWidth: 0, borderColor: PILL_BORD, paddingVertical: 10, paddingLeft: 4, paddingRight: 4, marginRight: -1, zIndex: 1 },
  halfRight: { flex: 1, flexDirection: "row", backgroundColor: PILL_BG, borderTopRightRadius: 28, borderBottomRightRadius: 28, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderWidth: 1, borderLeftWidth: 0, borderColor: PILL_BORD, paddingVertical: 10, paddingLeft: 4, paddingRight: 4 },
  tab: { flex: 1, alignItems: "center", gap: 3, paddingVertical: 4 },
  tabIcon:  { fontSize: 18, fontWeight: "600" },
  tabLabel: { fontSize: 10, fontWeight: "700" },

  fabWrap: { position: "absolute", top: -16, alignSelf: "center" },
  fab: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#3B82F6", justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#1e3a8a", shadowColor: "#3B82F6", shadowOpacity: 0.65, shadowRadius: 18, shadowOffset: { width: 0, height: 4 }, elevation: 16 },
  fabTxt: { color: "#fff", fontSize: 30, fontWeight: "300", lineHeight: 34 },
});
