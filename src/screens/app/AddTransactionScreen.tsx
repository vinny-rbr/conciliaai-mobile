import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { closeFabAnim } from "../../navigation/fabAnimState";
import { fetchFinanceItems } from "../../lib/financeService";
import { listBankAccounts } from "../../lib/bankAccountsService";

const SCREEN_H = Dimensions.get("window").height;

type Action = { icon: string; color: string; title: string; subtitle: string; badge?: string };

const QUICK: Action[] = [
  { icon: "↑", color: "#22C55E", title: "Receita",  subtitle: "" },
  { icon: "↓", color: "#EF4444", title: "Despesa",  subtitle: "" },
  { icon: "↓", color: "#F59E0B", title: "Cartão",   subtitle: "" },
];

const MORE: Action[] = [
  { icon: "🏦", color: "#3B82F6", title: "Novo banco",             subtitle: "Cadastrar conta ou cartão" },
  { icon: "💳", color: "#F59E0B", title: "Novo cartão de crédito", subtitle: "Limite, fatura e vencimento" },
  { icon: "⬇",  color: "#6366F1", title: "Importar extrato",       subtitle: "OFX, CSV, XLSX ou PDF" },
  { icon: "⇅",  color: "#14B8A6", title: "Transferência",          subtitle: "Mover entre suas contas" },
  { icon: "📷", color: "#3B82F6", title: "Lançar por foto",        subtitle: "IA lê o recibo automaticamente", badge: "NOVO" },
  { icon: "📊", color: "#8B5CF6", title: "Relatórios",             subtitle: "Gráficos e exportar PDF" },
];

const STAGGER = 50;

type Summary = { saldo: number; receitas: number; despesas: number };

function fmt(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AddTransactionScreen() {
  const navigation = useNavigation();
  const [summary, setSummary] = useState<Summary | null>(null);
  const slideAnim   = useRef(new Animated.Value(SCREEN_H)).current;
  const cardY       = useRef(new Animated.Value(30)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  // Slide in on mount
  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 18 }).start();
  }, []);

  useEffect(() => {
    // Card aparece sempre
    Animated.parallel([
      Animated.spring(cardY,       { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    // Busca saldo igual ao DashboardScreen
    (async () => {
      try {
        const [items, accounts] = await Promise.all([fetchFinanceItems(), listBankAccounts()]);
        const ym = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; })();
        let rec = 0, des = 0, cumRec = 0, cumDes = 0;
        for (const it of items) {
          if (it.dateISO.startsWith(ym)) {
            if (it.type === "RECEITA") rec += it.amountCents;
            if (it.type === "DESPESA") des += it.amountCents;
          }
          if (it.type === "RECEITA") cumRec += it.amountCents;
          if (it.type === "DESPESA") cumDes += it.amountCents;
        }
        const stored = accounts.reduce((s, a) => s + a.balanceCents, 0);
        const saldo  = accounts.length > 0 && stored !== 0 ? stored : (cumRec - cumDes);
        setSummary({ saldo, receitas: rec, despesas: des });
      } catch {}
    })();
  }, []);

  // Animações dos quick buttons (escalam de 0)
  const quickAnims = useRef(QUICK.map(() => new Animated.Value(0))).current;

  // Animações dos cards (alternado esquerda/direita)
  const cardAnims = useRef(MORE.map(() => ({
    x: new Animated.Value(0), opacity: new Animated.Value(0),
  }))).current;

  // Header desliza de cima
  const headerY       = useRef(new Animated.Value(-40)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    cardAnims.forEach((a, i) => {
      a.x.setValue(i % 2 === 0 ? -320 : 320);
      a.opacity.setValue(0);
    });
    quickAnims.forEach(a => a.setValue(0));
    headerY.setValue(-40);
    headerOpacity.setValue(0);

    Animated.parallel([
      // Header entra de cima
      Animated.spring(headerY,       { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(headerOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),

      // Quick actions aparecem com escala escalonada
      Animated.stagger(80, quickAnims.map(a =>
        Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 })
      )),

      // Cards entram alternados com delay
      Animated.sequence([
        Animated.delay(180),
        Animated.stagger(STAGGER, cardAnims.map(a =>
          Animated.parallel([
            Animated.spring(a.x, { toValue: 0, useNativeDriver: true, tension: 70, friction: 11 }),
            Animated.timing(a.opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
          ])
        )),
      ]),
    ]).start();
  }, []);

  const handleClose = () => {
    closeFabAnim();
    Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 320, useNativeDriver: true }).start();
    setTimeout(() => navigation.goBack(), 260);
  };

  return (
    <Animated.View style={[s.root, { transform: [{ translateY: slideAnim }] }]}>
      <View style={s.overlay} />

      {/* Card de saldo no espaço acima do sheet */}
      <Animated.View style={[s.balanceCard, { transform: [{ translateY: cardY }], opacity: cardOpacity }]}>
          <View style={s.balanceTop}>
            <Text style={s.balanceLabel}>Saldo em contas</Text>
            <Text style={s.balanceMes}>
              {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </Text>
          </View>
          <Text style={s.balanceVal}>{summary ? fmt(summary.saldo) : "—"}</Text>
          <View style={s.balanceRow}>
            <View style={s.balanceItem}>
              <Text style={s.balanceItemIcon}>↑</Text>
              <View>
                <Text style={s.balanceItemLbl}>Receitas</Text>
                <Text style={[s.balanceItemVal, { color: "#22C55E" }]}>
                  {summary ? fmt(summary.receitas) : "—"}
                </Text>
              </View>
            </View>
            <View style={s.balanceDivider} />
            <View style={s.balanceItem}>
              <Text style={s.balanceItemIcon}>↓</Text>
              <View>
                <Text style={s.balanceItemLbl}>Despesas</Text>
                <Text style={[s.balanceItemVal, { color: "#EF4444" }]}>
                  {summary ? fmt(summary.despesas) : "—"}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

      <SafeAreaView style={s.sheet} edges={["bottom"]}>
        {/* Handle */}
        <View style={s.handle} />

        {/* Header */}
        <Animated.View style={[s.header, { transform: [{ translateY: headerY }], opacity: headerOpacity }]}>
          <View>
            <Text style={s.headerTitle}>Ações rápidas</Text>
            <Text style={s.headerSub}>O que deseja fazer agora?</Text>
          </View>
          <TouchableOpacity style={s.closeBtn} onPress={handleClose} activeOpacity={0.8}>
            <Text style={s.closeTxt}>✕</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Quick 3 */}
        <View style={s.quickRow}>
          {QUICK.map((q, i) => (
            <Animated.View key={i} style={{ transform: [{ scale: quickAnims[i] }], flex: 1, alignItems: "center" }}>
              <TouchableOpacity style={[s.quickBtn, { backgroundColor: q.color + "22", borderColor: q.color + "55" }]}
                activeOpacity={0.7} onPress={handleClose}>
                <Text style={[s.quickIcon, { color: q.color }]}>{q.icon}</Text>
              </TouchableOpacity>
              <Text style={[s.quickLabel, { color: q.color }]}>{q.title}</Text>
            </Animated.View>
          ))}
        </View>

        {/* Divider */}
        <View style={s.dividerRow}>
          <View style={s.dividerLine} />
          <Text style={s.dividerTxt}>Mais opções</Text>
          <View style={s.dividerLine} />
        </View>

        {/* Lista */}
        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          {MORE.map((a, i) => (
            <Animated.View key={i}
              style={{ transform: [{ translateX: cardAnims[i].x }], opacity: cardAnims[i].opacity }}>
              <TouchableOpacity style={s.item} activeOpacity={0.7} onPress={handleClose}>
                <View style={[s.iconWrap, { backgroundColor: a.color + "22" }]}>
                  <Text style={[s.iconTxt, { color: a.color, fontSize: a.icon.length === 1 ? 20 : 17 }]}>{a.icon}</Text>
                </View>
                <View style={s.texts}>
                  <View style={s.titleRow}>
                    <Text style={s.itemTitle}>{a.title}</Text>
                    {a.badge && <View style={s.badge}><Text style={s.badgeTxt}>{a.badge}</Text></View>}
                  </View>
                  <Text style={s.subtitle}>{a.subtitle}</Text>
                </View>
                <Text style={s.chevron}>›</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: "#0F172A" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0F172A" },

  balanceCard: {
    position: "absolute",
    top: 46,
    left: 16,
    right: 16,
    backgroundColor: "#1E3A8A",
    borderRadius: 16,
    padding: 12,
    shadowColor: "#3B82F6",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  balanceTop:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  balanceLabel:{ fontSize: 11, color: "#93C5FD", fontWeight: "600" },
  balanceMes:  { fontSize: 10, color: "#60A5FA", textTransform: "capitalize" },
  balanceVal:  { fontSize: 20, fontWeight: "800", color: "#fff", marginBottom: 8 },
  balanceRow:  { flexDirection: "row", alignItems: "center" },
  balanceItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  balanceItemIcon: { fontSize: 14, color: "#fff" },
  balanceItemLbl:  { fontSize: 10, color: "#93C5FD" },
  balanceItemVal:  { fontSize: 12, fontWeight: "700" },
  balanceDivider:  { width: 1, height: 28, backgroundColor: "#3B82F633", marginHorizontal: 8 },

  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#0F172A",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: "92%",
  },

  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#334155", alignSelf: "center",
    marginTop: 12, marginBottom: 4,
  },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#F1F5F9" },
  headerSub:   { fontSize: 12, color: "#64748B", marginTop: 2 },

  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#1E293B",
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "#334155",
  },
  closeTxt: { color: "#94A3B8", fontSize: 16, fontWeight: "700" },

  quickRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  quickBtn: {
    width: 68, height: 68, borderRadius: 20,
    justifyContent: "center", alignItems: "center",
    borderWidth: 1.5, marginBottom: 6,
  },
  quickIcon:  { fontSize: 28, fontWeight: "700" },
  quickLabel: { fontSize: 12, fontWeight: "700" },

  dividerRow:  { flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginBottom: 12, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#1E293B" },
  dividerTxt:  { fontSize: 11, color: "#475569", fontWeight: "600" },

  list: { paddingHorizontal: 16, paddingBottom: 24 },

  item: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#1E293B", borderRadius: 14,
    padding: 13, marginBottom: 8, gap: 12,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  iconTxt:  { fontWeight: "700" },
  texts:    { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemTitle:{ fontSize: 14, fontWeight: "700", color: "#F1F5F9" },
  subtitle: { fontSize: 12, color: "#64748B", marginTop: 2 },
  badge:    { backgroundColor: "#22C55E22", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTxt: { fontSize: 10, fontWeight: "800", color: "#22C55E" },
  chevron:  { fontSize: 20, color: "#334155" },
});
