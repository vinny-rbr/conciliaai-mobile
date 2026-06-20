import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation";
import { fetchFinanceItems, fmt } from "../../lib/financeService";
import type { FinanceItem } from "../../types/finance";
import { getToken } from "../../lib/auth";
import { apiUrl } from "../../lib/api";
import { getKnownTags, addKnownTag, removeKnownTag, renameKnownTag } from "../../lib/tagsStore";

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

type TagModal = { mode: "create"; value: string } | { mode: "rename"; oldTag: string; value: string } | null;

export default function TagsScreen() {
  const navigation = useNavigation<NavProp>();
  const [loading, setLoading]       = useState(true);
  const [items, setItems]           = useState<FinanceItem[]>([]);
  const [stats, setStats]           = useState<TagStat[]>([]);
  const [knownTags, setKnownTags]   = useState<string[]>([]);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [tagModal, setTagModal]     = useState<TagModal>(null);
  const [saving, setSaving]         = useState(false);
  const inputRef = useRef<TextInput>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const [data, known] = await Promise.all([fetchFinanceItems(), getKnownTags()]);
    setItems(data);
    setStats(buildStats(data));
    setKnownTags(known);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => { void load(true); }, [load]));

  const tagNamesInItems = new Set(stats.map(s => s.tag));
  const orphanTags = knownTags.filter(t => !tagNamesInItems.has(t));

  const deleteTag = (tag: string) => {
    const affected = items.filter(it => it.tags?.split(",").map(t => t.trim()).includes(tag));
    Alert.alert(
      `Remover tag "#${tag}"?`,
      affected.length > 0
        ? `Será removida de ${affected.length} lançamento${affected.length !== 1 ? "s" : ""}.`
        : "Esta tag não está em nenhum lançamento.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover", style: "destructive",
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
            await removeKnownTag(tag);
            setDeleting(null);
            void load(true);
          },
        },
      ],
    );
  };

  const openRename = (tag: string) => {
    setTagModal({ mode: "rename", oldTag: tag, value: tag });
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const openCreate = () => {
    setTagModal({ mode: "create", value: "" });
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSave = async () => {
    if (!tagModal) return;
    const newName = tagModal.value.trim().toLowerCase().replace(/,/g, "").replace(/\s+/g, "-");
    if (!newName) { Alert.alert("Digite o nome da tag."); return; }
    setSaving(true);

    if (tagModal.mode === "create") {
      await addKnownTag(newName);
    } else {
      const oldTag = tagModal.oldTag;
      if (newName === oldTag) { setTagModal(null); setSaving(false); return; }
      const affected = items.filter(it => it.tags?.split(",").map(t => t.trim()).includes(oldTag));
      const token = await getToken();
      await Promise.all(affected.map(it => {
        const newTags = it.tags!.split(",").map(t => t.trim()).map(t => t === oldTag ? newName : t).join(",");
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
      await renameKnownTag(oldTag, newName);
    }

    setSaving(false);
    setTagModal(null);
    void load(true);
  };

  const totalReceitas = stats.reduce((s, t) => s + t.receitas, 0);
  const totalDespesas = stats.reduce((s, t) => s + t.despesas, 0);
  const hasAny = stats.length > 0 || orphanTags.length > 0;

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Tags</Text>
        <TouchableOpacity style={s.addBtn} onPress={openCreate} activeOpacity={0.8}>
          <Text style={s.addBtnTxt}>+ Nova</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#3B82F6" size="large" /></View>
      ) : !hasAny ? (
        <View style={s.center}>
          <Text style={{ fontSize: 44, marginBottom: 16 }}>🏷️</Text>
          <Text style={s.emptyTitle}>Nenhuma tag ainda</Text>
          <Text style={s.emptySub}>Toque em "+ Nova" para criar sua primeira tag, ou adicione tags ao criar lançamentos.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {stats.length > 0 && (
            <View style={s.summaryCard}>
              <View style={s.summaryRow}>
                <View style={s.summaryItem}>
                  <Text style={s.summaryLbl}>Tags</Text>
                  <Text style={[s.summaryVal, { color: "#60A5FA" }]}>{stats.length + orphanTags.length}</Text>
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
          )}

          {stats.length > 0 && <Text style={s.sectionTitle}>Relatório por tag</Text>}

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
                  <TouchableOpacity style={s.editBtn} onPress={() => openRename(stat.tag)} activeOpacity={0.7}>
                    <Text style={s.editBtnTxt}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.deleteBtn} onPress={() => deleteTag(stat.tag)} disabled={!!deleting} activeOpacity={0.7}>
                    {isDeleting ? <ActivityIndicator size="small" color="#EF4444" /> : <Text style={s.deleteBtnTxt}>✕</Text>}
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

          {orphanTags.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { marginTop: 8 }]}>Tags sem lançamentos</Text>
              {orphanTags.map(tag => (
                <View key={tag} style={[s.card, { flexDirection: "row", alignItems: "center" }]}>
                  <View style={[s.tagBadge, { flex: 1 }]}>
                    <Text style={s.tagBadgeTxt}>#{tag}</Text>
                  </View>
                  <TouchableOpacity style={s.editBtn} onPress={() => openRename(tag)} activeOpacity={0.7}>
                    <Text style={s.editBtnTxt}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.deleteBtn} onPress={() => deleteTag(tag)} disabled={!!deleting} activeOpacity={0.7}>
                    <Text style={s.deleteBtnTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* Create / Rename modal */}
      <Modal visible={!!tagModal} transparent animationType="slide" onRequestClose={() => setTagModal(null)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setTagModal(null)} activeOpacity={1} />
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>
              {tagModal?.mode === "create" ? "Nova tag" : `Renomear #${tagModal?.mode === "rename" ? tagModal.oldTag : ""}`}
            </Text>
            <TextInput
              ref={inputRef}
              style={s.modalInput}
              value={tagModal?.value ?? ""}
              onChangeText={v => setTagModal(prev => prev ? { ...prev, value: v } : prev)}
              placeholder="Nome da tag (ex: viagem)"
              placeholderTextColor="#475569"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              returnKeyType="done"
              onSubmitEditing={() => void handleSave()}
            />
            <Text style={s.modalHint}>Letras minúsculas, sem vírgulas. Espaços viram traços.</Text>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setTagModal(null)} activeOpacity={0.7}>
                <Text style={s.cancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={() => void handleSave()} activeOpacity={0.85} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmTxt}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F172A" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backTxt: { color: "#60A5FA", fontSize: 32, fontWeight: "300", lineHeight: 40 },
  title: { flex: 1, color: "#F1F5F9", fontSize: 20, fontWeight: "800", textAlign: "center" },
  addBtn: { backgroundColor: "#3B82F6", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },
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
  tagBadge: { backgroundColor: "#1E3A5F", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: "#3B82F644", alignSelf: "flex-start" },
  tagBadgeTxt: { color: "#93C5FD", fontSize: 14, fontWeight: "700" },
  cardCount: { flex: 1, color: "#64748B", fontSize: 12 },
  editBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#1E3A5F", alignItems: "center", justifyContent: "center" },
  editBtnTxt: { fontSize: 14 },
  deleteBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#EF444418", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#EF444433" },
  deleteBtnTxt: { color: "#EF4444", fontSize: 14, fontWeight: "700" },

  statsRow: { flexDirection: "row", gap: 8 },
  statBox: { flex: 1, backgroundColor: "#0F172A", borderRadius: 10, padding: 10, gap: 3, borderWidth: 1, borderColor: "#1E293B" },
  statLbl: { color: "#64748B", fontSize: 11, fontWeight: "600" },
  statVal: { fontSize: 13, fontWeight: "700" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#1E293B", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.1)", gap: 12 },
  modalTitle: { color: "#F1F5F9", fontSize: 18, fontWeight: "800" },
  modalInput: { backgroundColor: "#0F172A", borderRadius: 12, padding: 14, color: "#F1F5F9", fontSize: 16, borderWidth: 1, borderColor: "#334155" },
  modalHint: { color: "#475569", fontSize: 12 },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center" },
  cancelTxt: { color: "#94A3B8", fontSize: 15, fontWeight: "600" },
  confirmBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#3B82F6", alignItems: "center" },
  confirmTxt: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
