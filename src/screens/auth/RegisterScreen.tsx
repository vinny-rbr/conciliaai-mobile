import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation";
import { apiUrl } from "../../lib/api";
import { useAppAlert } from "../../components/AppAlert";
import { KeyboardAwareScroll } from "../../components/KeyboardAwareScroll";

export default function RegisterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { showAlert, AlertNode } = useAppAlert();
  const [name, setName]               = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password) {
      showAlert("Atenção", "Preencha nome, e-mail e senha.");
      return;
    }
    if (password.length < 6) {
      showAlert("Atenção", "A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      showAlert("Atenção", "As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        if (res.status === 409) {
          showAlert("E-mail já cadastrado", "Tente fazer login ou recupere sua senha.");
          return;
        }
        showAlert("Erro", (data.message as string) ?? "Não foi possível criar a conta.");
        return;
      }
      navigation.navigate("VerifyEmail", { email: email.trim().toLowerCase() });
    } catch {
      showAlert("Erro", "Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.root}>
      <KeyboardAwareScroll contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.logo}>Conciliaaí</Text>
        <Text style={s.title}>Criar conta</Text>
        <Text style={s.sub}>Comece a organizar seu dinheiro em minutos.</Text>

        <TextInput
          style={s.input}
          placeholder="Seu nome"
          placeholderTextColor="#64748B"
          autoCapitalize="words"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={s.input}
          placeholder="E-mail"
          placeholderTextColor="#64748B"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <View style={s.inputWrap}>
          <TextInput
            style={s.inputInner}
            placeholder="Senha (mínimo 6 caracteres)"
            placeholderTextColor="#64748B"
            secureTextEntry={!showPass}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={s.eye} onPress={() => setShowPass(v => !v)} activeOpacity={0.7}>
            <Text style={s.eyeTxt}>{showPass ? "👁‍🗨" : "👁"}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.inputWrap}>
          <TextInput
            style={s.inputInner}
            placeholder="Confirmar senha"
            placeholderTextColor="#64748B"
            secureTextEntry={!showConfirm}
            value={confirm}
            onChangeText={setConfirm}
          />
          <TouchableOpacity style={s.eye} onPress={() => setShowConfirm(v => !v)} activeOpacity={0.7}>
            <Text style={s.eyeTxt}>{showConfirm ? "👁‍🗨" : "👁"}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnTxt}>Criar conta</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={s.backBtn}>
          <Text style={s.backTxt}>Já tenho conta — Entrar</Text>
        </TouchableOpacity>
      </KeyboardAwareScroll>
      {AlertNode}
    </View>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: "#0F172A" },
  scroll:    { flexGrow: 1, justifyContent: "center", paddingHorizontal: 28, paddingVertical: 40 },
  logo:      { fontSize: 28, fontWeight: "800", color: "#60A5FA", textAlign: "center", marginBottom: 4 },
  title:     { fontSize: 22, fontWeight: "700", color: "#F1F5F9", textAlign: "center", marginBottom: 6 },
  sub:       { fontSize: 14, color: "#64748B", textAlign: "center", marginBottom: 32 },
  input: {
    backgroundColor: "#1E293B", color: "#F1F5F9", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    marginBottom: 14, borderWidth: 1, borderColor: "#334155",
  },
  inputWrap: {
    position: "relative",
    marginBottom: 14,
  },
  inputInner: {
    backgroundColor: "#1E293B", color: "#F1F5F9", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, paddingRight: 48,
    fontSize: 15, borderWidth: 1, borderColor: "#334155",
  },
  eye: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  eyeTxt: { fontSize: 18 },
  btn: {
    backgroundColor: "#3B82F6", borderRadius: 12,
    paddingVertical: 15, alignItems: "center", marginTop: 6,
  },
  btnTxt:  { color: "#fff", fontWeight: "700", fontSize: 16 },
  backBtn: { alignItems: "center", marginTop: 20 },
  backTxt: { color: "#60A5FA", fontSize: 14, fontWeight: "600" },
});
