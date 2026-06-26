import { useRef, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { apiUrl } from "../../lib/api";
import { useAppAlert } from "../../components/AppAlert";

type RouteParams = { email: string };

export default function VerifyEmailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { email } = route.params as RouteParams;

  const [code, setCode]               = useState("");
  const [loading, setLoading]         = useState(false);
  const [resending, setResending]     = useState(false);

  const inputRef = useRef<TextInput>(null);
  const { showAlert, AlertNode } = useAppAlert();

  async function handleConfirm() {
    if (code.length !== 6) {
      showAlert("Atenção", "Digite o código completo de 6 dígitos.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/verify-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.trim() }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        showAlert("Erro", (data.message as string) ?? "Código inválido ou expirado.");
        return;
      }
      showAlert(
        "E-mail confirmado!",
        "Faça seu login.",
        [{ text: "OK", onPress: () => navigation.navigate("Login" as never) }],
      );
    } catch {
      showAlert("Erro", "Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      const res = await fetch(apiUrl("/api/auth/resend-verification"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json() as { message?: string };
        showAlert("Erro", data.message ?? "Não foi possível reenviar o código.");
        return;
      }
      showAlert("Código reenviado", "Verifique sua caixa de entrada (e o spam).");
    } catch {
      showAlert("Erro", "Não foi possível conectar ao servidor.");
    } finally {
      setResending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={s.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={s.backTxt}>‹ Usar outro e-mail</Text>
        </TouchableOpacity>

        <Text style={s.title}>Verifique seu e-mail</Text>

        <Text style={s.emailHighlight}>{email}</Text>

        <Text style={s.instruction}>
          Digite o código de 6 dígitos que enviamos para o e-mail acima
        </Text>

        <TextInput
          ref={inputRef}
          style={s.codeInput}
          placeholder="000000"
          placeholderTextColor="#334155"
          keyboardType="numeric"
          maxLength={6}
          value={code}
          onChangeText={v => setCode(v.replace(/\D/g, "").slice(0, 6))}
          returnKeyType="done"
          onSubmitEditing={() => void handleConfirm()}
          autoFocus
        />

        <TouchableOpacity
          style={[s.btn, (loading || code.length < 6) && s.btnDisabled]}
          onPress={() => void handleConfirm()}
          disabled={loading || code.length < 6}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnTxt}>Confirmar</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={s.linkBtn}
          onPress={() => void handleResend()}
          disabled={resending}
          activeOpacity={0.7}
        >
          {resending
            ? <ActivityIndicator color="#60A5FA" size="small" />
            : <Text style={s.linkTxt}>Reenviar código</Text>}
        </TouchableOpacity>
      </ScrollView>
      {AlertNode}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F172A" },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: "center",
  },
  backBtn: { alignSelf: "flex-start", marginBottom: 36 },
  backTxt: { color: "#60A5FA", fontSize: 16, fontWeight: "600" },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#F1F5F9",
    textAlign: "center",
    marginBottom: 20,
  },
  emailHighlight: {
    fontSize: 15,
    fontWeight: "700",
    color: "#60A5FA",
    textAlign: "center",
    marginBottom: 12,
    backgroundColor: "#1E293B",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#334155",
    alignSelf: "stretch",
  },
  instruction: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 36,
  },
  codeInput: {
    backgroundColor: "#1E293B",
    color: "#60A5FA",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 36,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 14,
    borderWidth: 2,
    borderColor: "#3B82F6",
    alignSelf: "stretch",
    marginBottom: 28,
  },
  btn: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    alignSelf: "stretch",
  },
  btnDisabled: { opacity: 0.45 },
  btnTxt: { color: "#fff", fontWeight: "700", fontSize: 16 },
  linkBtn: { alignItems: "center", marginTop: 24, paddingVertical: 8 },
  linkTxt: { color: "#60A5FA", fontSize: 14, fontWeight: "600" },
});
