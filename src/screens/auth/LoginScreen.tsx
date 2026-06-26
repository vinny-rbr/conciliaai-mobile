import { useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { apiUrl } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { saveEmail } from "../../lib/auth";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

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
      <Animated.View style={[s.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
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
        <View style={s.passwordWrapper}>
          <TextInput
            style={[s.input, { paddingRight: 48 }]}
            placeholder="Senha"
            placeholderTextColor="#64748B"
            secureTextEntry={!showPass}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPass(v => !v)} activeOpacity={0.7}>
            <Text style={s.eyeIcon}>{showPass ? "🙈" : "👁"}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnTxt}>Entrar</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword" as never)} activeOpacity={0.7} style={s.forgotBtn}>
          <Text style={s.forgotTxt}>Esqueci minha senha</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Register" as never)} activeOpacity={0.7} style={s.registerBtn}>
          <Text style={s.registerTxt}>Não tem conta? <Text style={s.registerLink}>Criar conta</Text></Text>
        </TouchableOpacity>
      </Animated.View>
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
  forgotBtn:    { alignItems: "center", marginTop: 20 },
  forgotTxt:    { color: "#60A5FA", fontSize: 14, fontWeight: "600" },
  registerBtn:  { alignItems: "center", marginTop: 12 },
  registerTxt:  { color: "#94A3B8", fontSize: 14 },
  registerLink: { color: "#60A5FA", fontWeight: "700" },
  passwordWrapper: { position: "relative" },
  eyeBtn: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 14,
    justifyContent: "center",
  },
  eyeIcon: { fontSize: 18 },
});
