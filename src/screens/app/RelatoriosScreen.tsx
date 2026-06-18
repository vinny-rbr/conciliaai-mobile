import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { fetchFinanceItems } from "../../lib/financeService";
import { getEmailFromAnySource } from "../../lib/auth";
import type { FinanceItem } from "../../types/finance";
import { REPORTS, SECTIONS, TIER_BADGE, TIER_COLOR, s, type Filter, type Report, type Tier } from "./relatorios/shared";
import { MiniSaldo, MiniDonut, MiniTopCat, MiniSparkline } from "./relatorios/MiniPreviews";

const UNLOCKED_EMAILS = ["vinnysousa1707@gmail.com"];

export default function RelatoriosScreen() {
  const navigation = useNavigation<any>();
  const [items,      setItems]      = useState<FinanceItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filter,     setFilter]     = useState<Filter>("todos");
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    void Promise.all([fetchFinanceItems(), getEmailFromAnySource()])
      .then(([it, email]) => {
        setItems(it);
        setIsUnlocked(!!email && UNLOCKED_EMAILS.includes(email));
      }).finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => REPORTS.filter(r => {
    if (filter === "gratis"  && r.tier !== "free")    return false;
    if (filter === "pro"     && r.tier !== "pro")     return false;
    if (filter === "premium" && r.tier !== "premium") return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) &&
                  !r.subtitle.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [filter, search]);

  const isFree = (r: Report) => r.tier === "free" || isUnlocked;

  function handleTap(r: Report) {
    if (!isFree(r)) return;
    navigation.navigate("RelatorioDetalhe", { type: r.id });
  }

  function renderPreview(r: Report) {
    if (!isFree(r)) return <Text style={s.lock}>🔒</Text>;
    if (!r.preview)        return <Text style={s.arrow}>›</Text>;
    if (loading)           return <ActivityIndicator size="small" color="#475569" />;
    switch (r.preview) {
      case "saldo":     return <MiniSaldo    items={items} />;
      case "donut":     return <MiniDonut    items={items} />;
      case "top-cat":   return <MiniTopCat   items={items} />;
      case "sparkline": return <MiniSparkline items={items} />;
      default:          return <Text style={s.arrow}>›</Text>;
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 60 }}>
          <Text style={s.backTxt}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Relatórios</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Buscar relatório…"
          placeholderTextColor="#475569"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Text style={{ color: "#475569", fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {(["todos","gratis","pro","premium"] as Filter[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterBtn, filter === f && s.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterTxt, filter === f && s.filterTxtActive]}>
              {f === "todos" ? "Todos" : f === "gratis" ? "Grátis" : f.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {SECTIONS.map(section => {
          const rows = visible.filter(r => r.section === section);
          if (rows.length === 0) return null;
          return (
            <View key={section} style={s.section}>
              <Text style={s.sectionTitle}>{section}</Text>
              {rows.map(r => (
                <TouchableOpacity
                  key={r.id}
                  style={[s.card, !isFree(r) && s.cardLocked]}
                  activeOpacity={isFree(r) ? 0.7 : 0.95}
                  onPress={() => handleTap(r)}
                >
                  <View style={[s.iconBox, { backgroundColor: r.iconBg }]}>
                    <Text style={s.iconTxt}>{r.icon}</Text>
                  </View>
                  <View style={s.cardBody}>
                    <View style={s.titleRow}>
                      <Text style={[s.cardTitle, r.tier !== "free" && s.cardTitleLocked]}>{r.title}</Text>
                      {TIER_BADGE[r.tier as Tier] && (
                        <View style={[s.badge, { backgroundColor: TIER_COLOR[r.tier as Tier] + "33", borderColor: TIER_COLOR[r.tier as Tier] + "88" }]}>
                          <Text style={[s.badgeTxt, { color: TIER_COLOR[r.tier as Tier] }]}>{TIER_BADGE[r.tier as Tier]}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.cardSub} numberOfLines={1}>{r.subtitle}</Text>
                  </View>
                  <View style={s.previewWrap}>{renderPreview(r)}</View>
                  {isFree(r) && <Text style={s.arrow}>›</Text>}
                </TouchableOpacity>
              ))}
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
