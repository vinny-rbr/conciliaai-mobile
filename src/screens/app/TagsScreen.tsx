import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation";
import { fetchFinanceItems, fmt } from "../../lib/financeService";
import type { FinanceItem } from "../../types/finance";
import { getToken } from "../../lib/auth";
import { apiUrl } from "../../lib/api";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type TagStat = { tag: string; count: number; receitas: number; despesas: number };

function buildStats(items: FinanceItem[]): TagStat[] {
  const map = new Map<string, TagStat>();
  for (const it of items) {
    if (!it.tags) continue;
    for (const raw of it.tags.split(",")) {
      const tag = raw.trim();
      if (!tag) continue;
      const s = map.get(tag) ?? { tag, count: 0, receitas: 0, despesas: 0 };
      s.count++;
      if (it.type === "RECEITA") s.receitas += it.amountCents;
      else s.despesas += it.amountCents;
      map.set(tag, s);
    }
  }
  return [...map.values()].sort((a, b) => (b.receitas + b.despesas) - (a.receitas + a.despesas) || a.tag.localeCompare(b.tag));
}

export default function TagsScreen() {
  const navigation = useNavigation<NavProp>();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FinanceItem[]>([]);
  const [stats, setStats] = useState<TagStat[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const data = await fetchFinanceItems();
    setItems(data);
    setStats(buildStats(data));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => { void load(true); }, [load]));

  const deleteTag = (tag: string) => {
    const affected = items.filter(it => it.tags?.split(",").map(t => t.trim()).includes(tag));
    Alert.alert(
      `Remover tag "#${tag}"?`,
      `Será removida de ${affected.length} lançamento${affected.length !== 1 ? "s" : ""}.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            setDeleting(tag);
            const token = await getToken();
            await Promise.all(affected.map(it => {
              const newTags = it.tags!.split(",").map(t => t.trim()).filter(t => t && t !== tag).join(",") || null;
              return fetch(apiUrl(`/api/finance/${it.id}`), {
                method: "PUT",
                headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: it.type, title: it.title, category: it.category,
                  amountCents: it.amountCents, date: it.dateISO,
                  paymentType: it.paymentType, status: it.status,
                  accountId: it.accountId ?? null, note: it.note ?? null,
                  tags: newTags,
                }),
              });
            }));
            setDeleting(null);
            void load(true);
          },
        },
      ],
    );
  };

  const totalReceitas = stats.reduce((s, t) => s + t.receitas, 0);
  const totalDespesas = stats.reduce((s, t) => s + t.despesas, 0);

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Tags</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#3B82F6" size="large" /></View>
      ) : stats.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 44, marginBottom: 16 }}>🏷️</Text>
          <Text style={s.emptyTitle}>Nenhuma tag cadastrada</Text>
          <Text style={s.emptySub}>Adicione tags ao criar ou editar lançamentos para vê-las aqui.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Resumo geral */}
          <View style={s.summaryCard}>
            <View style={s.summaryRow}>
              <View style={s.summaryItem}>
                <Text style={s.summaryLbl}>Tags cadastradas</Text>
                <Text style={[s.summaryVal, { color: "#60A5FA" }]}>{stats.length}</Text>
              </View>
              <View style={s.summaryDivider} />
              <View style={s.summaryItem}>
                <Text style={s.summaryLbl}>Receitas tagadas</Text>
                <Text style={[s.summaryVal, { color: "#4ADE80" }]}>{fmt(totalReceitas)}</Text>
              </View>
              <View style={s.summaryDivider} />
              <View style={s.summaryItem}>
                <Text style={s.summaryLbl}>Despesas tagadas</Text>
                <Text style={[s.summaryVal, { color: "#F87171" }]}>{fmt(totalDespesas)}</Text>
              </View>
            </View>
          </View>

          <Text style={s.sectionTitle}>Relatório por tag</Text>

          {stats.map(stat => {
            const net = stat.receitas - stat.despesas;
            const isDeleting = deleting === stat.tag;
            return (
              <View key={stat.tag} style={s.card}>
                <View style={s.cardHeader}>
                  <View style={s.tagBadge}>
                    <Text style={s.tagBadgeTxt}>#{stat.tag}</Text>
                  </View>
                  <Text style={s.cardCount}>{stat.count} lançamento{stat.count !== 1 ? "s" : ""}</Text>
                  <TouchableOpacity
                    style={s.deleteBtn}
                    onPress={() => deleteTag(stat.tag)}
                    disabled={!!deleting}
                    activeOpacity={0.7}
                  >
                    {isDeleting
                      ? <ActivityIndicator size="small" color="#EF4444" />
                      : <Text style={s.deleteBtnTxt}>✕</Text>}
                  </TouchableOpacity>
                </View>

                <View style={s.statsRow}>
                  {stat.receitas > 0 && (
                    <View style={s.statBox}>
                      <Text style={s.statLbl}>Receitas</Text>
                      <Text style={[s.statVal, { color: "#4ADE80" }]}>+{fmt(stat.receitas)}</Text>
                    </View>
                  )}
                  {stat.despesas > 0 && (
                    <View style={s.statBox}>
                      <Text style={s.statLbl}>Despesas</Text>
                      <Text style={[s.statVal, { color: "#F87171" }]}>−{fmt(stat.despesas)}</Text>
                    </View>
                  )}
                  <View style={[s.statBox, { backgroundColor: net >= 0 ? "#14532D22" : "#7F1D1D22", borderColor: net >= 0 ? "#4ADE8033" : "#F8717133" }]}>
                    <Text style={s.statLbl}>Saldo</Text>
                    <Text style={[s.statVal, { color: net >= 0 ? "#4ADE80" : "#F87171" }]}>
                      {net >= 0 ? "+" : "−"}{fmt(Math.abs(net))}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F172A" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backTxt: { color: "#60A5FA", fontSize: 32, fontWeight: "300", lineHeight: 40 },
  title: { flex: 1, color: "#F1F5F9", fontSize: 20, fontWeight: "800", textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emptyTitle: { color: "#F1F5F9", fontSize: 16, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  emptySub: { color: "#64748B", fontSize: 14, textAlign: "center", lineHeight: 20 },
  scroll: { padding: 16, paddingBottom: 48 },

  summaryCard: { backgroundColor: "#1E293B", borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#334155" },
  summaryRow: { flexDirection: "row" },
  summaryItem: { flex: 1, alignItems: "center", gap: 6 },
  summaryDivider: { width: 1, backgroundColor: "#334155", marginVertical: 4 },
  summaryLbl: { color: "#64748B", fontSize: 11, fontWeight: "600", textAlign: "center" },
  summaryVal: { fontSize: 15, fontWeight: "800" },

  sectionTitle: { color: "#94A3B8", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },

  card: { backgroundColor: "#1E293B", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#334155", gap: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  tagBadge: { flex: 1, backgroundColor: "#1E3A5F", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: "#3B82F644", alignSelf: "flex-start" },
  tagBadgeTxt: { color: "#93C5FD", fontSize: 14, fontWeight: "700" },
  cardCount: { color: "#64748B", fontSize: 12 },
  deleteBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#EF444418", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#EF444433" },
  deleteBtnTxt: { color: "#EF4444", fontSize: 14, fontWeight: "700" },

  statsRow: { flexDirection: "row", gap: 8 },
  statBox: { flex: 1, backgroundColor: "#0F172A", borderRadius: 10, padding: 10, gap: 3, borderWidth: 1, borderColor: "#1E293B" },
  statLbl: { color: "#64748B", fontSize: 11, fontWeight: "600" },
  statVal: { fontSize: 13, fontWeight: "700" },
});
