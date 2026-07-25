import React, { useState } from "react";
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from "react-native";
import { rootNavigate } from "../navigation/rootNav";
import { startTrial } from "../lib/subscriptionService";

type Props = {
  visible: boolean;
  onClose: () => void;
  // Chamado após o trial iniciar com sucesso (ex.: refazer o salvamento).
  onTrialStarted?: () => void;
};

/**
 * Popup mostrado quando o usuário sem plano estoura o limite gratuito.
 * Oferece iniciar o trial de 15 dias ou ver os planos.
 */
export function PlanLimitModal({ visible, onClose, onTrialStarted }: Props) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const iniciarTrial = async () => {
    setErro(null);
    setLoading(true);
    const r = await startTrial();
    setLoading(false);
    if (r.ok) {
      onClose();
      onTrialStarted?.();
    } else {
      setErro(r.message ?? "Não foi possível iniciar o trial. Tente novamente.");
    }
  };

  const verPlanos = () => {
    onClose();
    rootNavigate("Planos");
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,.65)", justifyContent: "center", alignItems: "center", padding: 28 }}>
        <View style={{ backgroundColor: "#1E293B", borderRadius: 22, padding: 24, width: "100%", borderWidth: 1, borderColor: "#334155" }}>
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: "#3B82F618", alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 16, borderWidth: 1, borderColor: "#3B82F633" }}>
            <Text style={{ fontSize: 26 }}>🔒</Text>
          </View>

          <Text style={{ color: "#F1F5F9", fontSize: 18, fontWeight: "800", textAlign: "center", marginBottom: 10 }}>
            Limite gratuito atingido
          </Text>
          <Text style={{ color: "#94A3B8", fontSize: 14, textAlign: "center", marginBottom: 22, lineHeight: 20 }}>
            Você chegou ao limite do plano gratuito. Inicie um{"\n"}
            <Text style={{ color: "#60A5FA", fontWeight: "700" }}>trial de 15 dias grátis</Text> para continuar usando o app.
          </Text>

          {erro && (
            <Text style={{ color: "#F87171", fontSize: 13, textAlign: "center", marginBottom: 14 }}>{erro}</Text>
          )}

          <TouchableOpacity
            onPress={iniciarTrial}
            disabled={loading}
            activeOpacity={0.85}
            style={{ backgroundColor: "#3B82F6", borderRadius: 14, paddingVertical: 15, alignItems: "center", marginBottom: 10, opacity: loading ? 0.7 : 1 }}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>Iniciar trial de 15 dias grátis</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={verPlanos}
            disabled={loading}
            activeOpacity={0.85}
            style={{ backgroundColor: "#0F172A", borderRadius: 14, paddingVertical: 15, alignItems: "center", borderWidth: 1, borderColor: "#334155", marginBottom: 4 }}
          >
            <Text style={{ color: "#F1F5F9", fontSize: 15, fontWeight: "700" }}>Ver planos e preços</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} disabled={loading} style={{ paddingVertical: 12, alignItems: "center" }}>
            <Text style={{ color: "#64748B", fontSize: 14, fontWeight: "700" }}>Agora não</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
