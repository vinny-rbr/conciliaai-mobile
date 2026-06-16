import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { apiUrl } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { saveEmail } from "../../lib/auth";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Atenção", "Preencha e-mail e senha.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        Alert.alert("Erro", (data.message as string) ?? "Credenciais inválidas.");
        return;
      }
      const token = (data.token ?? data.accessToken ?? data.jwt) as string;
      if (!token) { Alert.alert("Erro", "Token não recebido."); return; }
      await saveEmail(email.trim().toLowerCase());
      await signIn(token, data.user as Record<string, unknown>, data.planName as string);
    } catch {
      Alert.alert("Erro", "Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.inner}>
        <Text style={s.logo}>Conciliaaí</Text>
        <Text style={s.sub}>Suas finanças sob controle</Text>

        <TextInput
          style={s.input}
          placeholder="E-mail"
          placeholderTextColor="#64748B"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={s.input}
          placeholder="Senha"
          placeholderTextColor="#64748B"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnTxt}>Entrar</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F172A" },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 28 },
  logo: { fontSize: 32, fontWeight: "800", color: "#60A5FA", textAlign: "center", marginBottom: 6 },
  sub: { fontSize: 14, color: "#64748B", textAlign: "center", marginBottom: 40 },
  input: {
    backgroundColor: "#1E293B", color: "#F1F5F9", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    marginBottom: 14, borderWidth: 1, borderColor: "#334155",
  },
  btn: {
    backgroundColor: "#3B82F6", borderRadius: 12,
    paddingVertical: 15, alignItems: "center", marginTop: 6,
  },
  btnTxt: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
