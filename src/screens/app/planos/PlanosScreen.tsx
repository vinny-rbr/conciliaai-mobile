import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Svg, { Path } from "react-native-svg";
import { getToken, getUser } from "../../../lib/auth";
import { apiUrl } from "../../../lib/api";
import { showToast } from "../../../components/Toast";

type Plan = {
  id: string;
  name: string;
  priceCents: number;
  monthlyTransactionLimit: number | null;
  subcategoryLimit: number | null;
  groupLimit: number | null;
};

function fmtBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function planFeatures(plan: Plan): string[] {
  return [
    plan.monthlyTransactionLimit === null
      ? "Lançamentos ilimitados por mês"
      : `Até ${plan.monthlyTransactionLimit} lançamentos/mês`,
    plan.subcategoryLimit === null
      ? "Subcategorias ilimitadas"
      : plan.subcategoryLimit === 0
        ? "Sem subcategorias"
        : `Até ${plan.subcategoryLimit} subcategoria${plan.subcategoryLimit !== 1 ? "s" : ""}`,
    plan.groupLimit === null
      ? "Grupos ilimitados"
      : plan.groupLimit === 0
        ? "Participa de grupos (sem criar)"
        : `Até ${plan.groupLimit} grupo${plan.groupLimit !== 1 ? "s" : ""}`,
    "Dashboard e módulos financeiros completos",
  ];
}

export default function PlanosScreen() {
  const navigation = useNavigation();
  const [plans, setPlans]               = useState<Plan[]>([]);
  const [loading, setLoading]           = useState(true);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [cpfInput, setCpfInput]         = useState("");
  const [cpfError, setCpfError]         = useState("");
  const [showCpfModal, setShowCpfModal] = useState(false);
  const [verifying, setVerifying]       = useState(false);

  const awaitingPayment = useRef(false);
  const appStateRef     = useRef(AppState.currentState);
  const pollInterval    = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (prev.match(/inactive|background/) && next === "active" && awaitingPayment.current) {
        awaitingPayment.current = false;
        void startPolling();
      }
    });
    return () => {
      sub.remove();
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, []);

  async function startPolling() {
    setVerifying(true);
    let attempts = 0;
    const token = await getToken();
    if (!token) { setVerifying(false); return; }

    pollInterval.current = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(apiUrl("/api/subscriptions/me"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json() as { subscriptionStatus?: string; hasActiveSubscription?: boolean };
          if (data.subscriptionStatus?.toLowerCase() === "active" || data.hasActiveSubscription === true) {
            clearInterval(pollInterval.current!);
            setVerifying(false);
            showToast("Assinatura ativada com sucesso! 🎉", "success");
            setTimeout(() => navigation.goBack(), 1500);
            return;
          }
        }
      } catch { /* aguarda próxima tentativa */ }

      if (attempts >= 12) {
        clearInterval(pollInterval.current!);
        setVerifying(false);
        Alert.alert(
          "Pagamento em processamento",
          "Se o pagamento foi confirmado, sua assinatura será ativada em alguns minutos. Feche e reabra o app para atualizar.",
        );
      }
    }, 5000);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/plans"));
      if (res.ok) setPlans(await res.json() as Plan[]);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleAssinar(planId: string) {
    const token = await getToken();
    if (!token) return;
    const user = await getUser();
    const cpf = (typeof user?.cpfCnpj === "string" ? user.cpfCnpj : "").replace(/\D/g, "");
    if (!cpf || cpf.length !== 11) {
      setPendingPlanId(planId);
      setCpfInput("");
      setCpfError("");
      setShowCpfModal(true);
      return;
    }
    await checkout(planId, cpf, token);
  }

  async function handleCpfConfirm() {
    const digits = cpfInput.replace(/\D/g, "");
    if (digits.length !== 11) { setCpfError("CPF inválido. Informe os 11 dígitos."); return; }
    if (!pendingPlanId) return;
    setShowCpfModal(false);
    const token = await getToken();
    if (token) await checkout(pendingPlanId, digits, token);
  }

  async function checkout(planId: string, cpf: string, token: string) {
    setLoadingPlanId(planId);
    try {
      const res = await fetch(apiUrl("/api/payments/checkout"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId, cpfCnpj: cpf }),
      });
      if (res.ok) {
        const data = await res.json() as { invoiceUrl?: string };
        if (data.invoiceUrl) {
          awaitingPayment.current = true;
          await Linking.openURL(data.invoiceUrl);
        } else {
          Alert.alert("Pagamento", "Link de pagamento não disponível. Tente novamente.");
        }
      } else {
        Alert.alert("Erro", "Não foi possível iniciar o pagamento. Tente novamente.");
      }
    } catch {
      Alert.alert("Erro", "Não foi possível conectar ao servidor.");
    }
    setLoadingPlanId(null);
  }

  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}><ActivityIndicator color="#3B82F6" size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#cdddf7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M14 6l-6 6 6 6" />
          </Svg>
          <Text style={s.backTxt}>Voltar</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Planos</Text>
        <View style={{ width: 54 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.heroTitle}>Acesso premium</Text>
        <Text style={s.heroSub}>Ative seu plano e libere toda a experiência sem bloqueios.</Text>

        {plans.map((plan) => {
          const isRec     = plan.name.toLowerCase().includes("pro");
          const isLoading = loadingPlanId === plan.id;
          return (
            <View key={plan.id} style={[s.planCard, isRec && s.planCardRec]}>
              <View style={s.planHeader}>
                <View>
                  <Text style={s.planLabel}>Plano</Text>
                  <Text style={s.planName}>{plan.name}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  {isRec && (
                    <View style={s.recBadge}>
                      <Text style={s.recBadgeTxt}>Recomendado</Text>
                    </View>
                  )}
                  <Text style={[s.planPrice, isRec && { color: "#dbeafe" }]}>
                    {fmtBRL(plan.priceCents)}
                    <Text style={s.planPriceUnit}>/mês</Text>
                  </Text>
                </View>
              </View>

              <View style={s.featureWrap}>
                <Text style={s.featureListTitle}>Inclui</Text>
                {planFeatures(plan).map((feat, i) => (
                  <View key={i} style={s.featureRow}>
                    <Svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="#5eead4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M5 12l4.5 4.5L19 7" />
                    </Svg>
                    <Text style={s.featureTxt}>{feat}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[s.assinarBtn, isRec && s.assinarBtnRec, (!!loadingPlanId) && { opacity: 0.5 }]}
                onPress={() => void handleAssinar(plan.id)}
                disabled={!!loadingPlanId}
                activeOpacity={0.85}
              >
                {isLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.assinarBtnTxt}>Assinar</Text>}
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Verificando pagamento overlay */}
      {verifying && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(7,13,26,0.92)", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <ActivityIndicator color="#3B82F6" size="large" />
          <Text style={{ color: "#F1F5F9", fontSize: 16, fontWeight: "700" }}>Verificando pagamento...</Text>
          <Text style={{ color: "#64748B", fontSize: 13, textAlign: "center", maxWidth: 260 }}>
            Aguarde enquanto confirmamos sua assinatura
          </Text>
        </View>
      )}

      {/* CPF Modal */}
      <Modal visible={showCpfModal} transparent animationType="slide" onRequestClose={() => setShowCpfModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowCpfModal(false)} activeOpacity={1} />
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Informe seu CPF</Text>
            <Text style={s.modalSub}>Necessário para emitir o boleto/PIX de pagamento</Text>
            <TextInput
              style={[s.modalInput, cpfError ? { borderColor: "#F87171" } : {}]}
              value={cpfInput}
              onChangeText={t => { setCpfInput(t); setCpfError(""); }}
              placeholder="000.000.000-00"
              placeholderTextColor="#475569"
              keyboardType="numeric"
              maxLength={14}
              returnKeyType="done"
              onSubmitEditing={() => void handleCpfConfirm()}
              autoFocus
            />
            {cpfError ? <Text style={s.modalError}>{cpfError}</Text> : null}
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowCpfModal(false)} activeOpacity={0.7}>
                <Text style={s.cancelBtnTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={() => void handleCpfConfirm()} activeOpacity={0.85}>
                <Text style={s.confirmBtnTxt}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: "#070d1a" },
  center:      { flex: 1, justifyContent: "center", alignItems: "center" },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, paddingTop: 6, paddingBottom: 10 },
  backBtn:     { flexDirection: "row", alignItems: "center", gap: 2 },
  backTxt:     { color: "#cdddf7", fontSize: 14, fontWeight: "600" },
  headerTitle: { color: "#F1F5F9", fontSize: 15, fontWeight: "700" },
  scroll:      { paddingHorizontal: 18, paddingTop: 8 },

  heroTitle: { color: "#F8FAFC", fontSize: 26, fontWeight: "800", letterSpacing: -0.5, marginBottom: 6 },
  heroSub:   { color: "#93a7c6", fontSize: 14, fontWeight: "500", marginBottom: 24, lineHeight: 20 },

  planCard:    { backgroundColor: "rgba(15,23,42,0.65)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(148,163,184,0.18)", padding: 16, marginBottom: 14 },
  planCardRec: { backgroundColor: "rgba(30,64,175,0.22)", borderColor: "rgba(96,165,250,0.45)", shadowColor: "#2563EB", shadowRadius: 30, shadowOpacity: 0.2, shadowOffset: { width: 0, height: 8 } },
  planHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  planLabel:   { color: "#64748B", fontSize: 13, fontWeight: "500", marginBottom: 2 },
  planName:    { color: "#F1F5F9", fontSize: 20, fontWeight: "800" },
  recBadge:    { backgroundColor: "rgba(96,165,250,0.16)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, marginBottom: 4 },
  recBadgeTxt: { color: "#bfdbfe", fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  planPrice:   { color: "#bfdbfe", fontSize: 24, fontWeight: "800" },
  planPriceUnit: { fontSize: 13, fontWeight: "500", color: "#64748B" },

  featureWrap:      { marginBottom: 16 },
  featureListTitle: { color: "#64748B", fontSize: 13, fontWeight: "500", marginBottom: 10 },
  featureRow:       { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 7 },
  featureTxt:       { color: "#F1F5F9", fontSize: 14, lineHeight: 20, flex: 1 },

  assinarBtn:    { backgroundColor: "#3b82f6", padding: 13, borderRadius: 12, alignItems: "center" },
  assinarBtnRec: { backgroundColor: "#60a5fa" },
  assinarBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "700" },

  modalOverlay:  { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCard:     { backgroundColor: "#1E293B", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  modalTitle:    { color: "#F1F5F9", fontSize: 18, fontWeight: "800", marginBottom: 6 },
  modalSub:      { color: "#64748B", fontSize: 13, fontWeight: "500", marginBottom: 18, lineHeight: 18 },
  modalInput:    { backgroundColor: "#0F172A", borderRadius: 12, padding: 14, color: "#F1F5F9", fontSize: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", marginBottom: 8 },
  modalError:    { color: "#F87171", fontSize: 12, fontWeight: "600", marginBottom: 8 },
  modalBtns:     { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn:     { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center" },
  cancelBtnTxt:  { color: "#94A3B8", fontSize: 15, fontWeight: "600" },
  confirmBtn:    { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#3B82F6", alignItems: "center" },
  confirmBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
