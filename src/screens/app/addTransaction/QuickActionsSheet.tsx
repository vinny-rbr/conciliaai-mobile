import React from "react";
import { Animated, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NovoBancoModal } from "../../../components/dashboard/BankCarousel";
import TransferenciaModal from "../../../components/TransferenciaModal";
import { MORE, QUICK, Summary, fmtBRL, s } from "./shared";

type Props = {
  summary: Summary | null;
  slideAnim: Animated.Value;
  cardY: Animated.Value;
  cardOpacity: Animated.Value;
  quickAnims: Animated.Value[];
  cardAnims: { x: Animated.Value; opacity: Animated.Value }[];
  headerY: Animated.Value;
  headerOp: Animated.Value;
  showNovoBanco: boolean;
  setShowNovoBanco: (v: boolean) => void;
  showTransferencia: boolean;
  setShowTransferencia: (v: boolean) => void;
  onClose: (target?: "Receitas" | "Despesas" | "Cartao") => void;
  onNavigate: (title: string) => void;
};

export default function QuickActionsSheet({
  summary, slideAnim, cardY, cardOpacity, quickAnims, cardAnims, headerY, headerOp,
  showNovoBanco, setShowNovoBanco, showTransferencia, setShowTransferencia,
  onClose, onNavigate,
}: Props) {
  return (
    <>
      <NovoBancoModal
        visible={showNovoBanco}
        onClose={() => setShowNovoBanco(false)}
        onSaved={() => setShowNovoBanco(false)}
      />
      <TransferenciaModal
        visible={showTransferencia}
        onClose={() => setShowTransferencia(false)}
      />

      <Animated.View style={[s.root, { transform: [{ translateY: slideAnim }] }]}>
        <View style={s.overlay} />

        <Animated.View style={[s.balanceCard, { transform: [{ translateY: cardY }], opacity: cardOpacity }]}>
          <View style={s.balanceTop}>
            <Text style={s.balanceLabel}>Saldo em contas</Text>
            <Text style={s.balanceMes}>{new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</Text>
          </View>
          <Text style={s.balanceVal}>{summary ? fmtBRL(summary.saldo) : "—"}</Text>
          <View style={s.balanceRow}>
            <View style={s.balanceItem}>
              <Text style={s.balanceItemIcon}>↑</Text>
              <View>
                <Text style={s.balanceItemLbl}>Receitas</Text>
                <Text style={[s.balanceItemVal, { color: "#22C55E" }]}>{summary ? fmtBRL(summary.receitas) : "—"}</Text>
              </View>
            </View>
            <View style={s.balanceDivider} />
            <View style={s.balanceItem}>
              <Text style={s.balanceItemIcon}>↓</Text>
              <View>
                <Text style={s.balanceItemLbl}>Despesas</Text>
                <Text style={[s.balanceItemVal, { color: "#EF4444" }]}>{summary ? fmtBRL(summary.despesas) : "—"}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <SafeAreaView style={s.sheet} edges={["bottom"]}>
          <View style={s.handle} />

          <Animated.View style={[s.header, { transform: [{ translateY: headerY }], opacity: headerOp }]}>
            <View>
              <Text style={s.headerTitle}>Ações rápidas</Text>
              <Text style={s.headerSub}>O que deseja fazer agora?</Text>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={() => onClose()} activeOpacity={0.8}>
              <Text style={s.closeTxt}>✕</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={s.quickRow}>
            {QUICK.map((q, i) => (
              <Animated.View key={i} style={{ transform: [{ scale: quickAnims[i] }], flex: 1, alignItems: "center" }}>
                <TouchableOpacity
                  style={[s.quickBtn, { backgroundColor: q.color + "22", borderColor: q.color + "55" }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if      (q.title === "Receita") onClose("Receitas");
                    else if (q.title === "Despesa") onClose("Despesas");
                    else if (q.title === "Cartão")  onClose("Cartao");
                    else onClose();
                  }}
                >
                  <Text style={[s.quickIcon, { color: q.color }]}>{q.icon}</Text>
                </TouchableOpacity>
                <Text style={[s.quickLabel, { color: q.color }]}>{q.title}</Text>
              </Animated.View>
            ))}
          </View>

          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerTxt}>Mais opções</Text>
            <View style={s.dividerLine} />
          </View>

          <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
            {MORE.map((a, i) => (
              <Animated.View key={i} style={{ transform: [{ translateX: cardAnims[i].x }], opacity: cardAnims[i].opacity }}>
                <TouchableOpacity
                  style={s.item}
                  activeOpacity={0.7}
                  onPress={() => {
                    if      (a.title === "Novo cartão de crédito") onClose("Cartao");
                    else if (a.title === "Novo banco")             setShowNovoBanco(true);
                    else if (a.title === "Transferência")          setShowTransferencia(true);
                    else onNavigate(a.title);
                  }}
                >
                  <View style={[s.iconWrap, { backgroundColor: a.color + "22" }]}>
                    <Text style={[s.iconTxt, { color: a.color, fontSize: a.icon.length === 1 ? 20 : 17 }]}>{a.icon}</Text>
                  </View>
                  <View style={s.texts}>
                    <View style={s.titleRow}>
                      <Text style={s.itemTitle}>{a.title}</Text>
                      {"badge" in a && a.badge && (
                        <View style={s.badge}><Text style={s.badgeTxt}>{a.badge}</Text></View>
                      )}
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
    </>
  );
}
