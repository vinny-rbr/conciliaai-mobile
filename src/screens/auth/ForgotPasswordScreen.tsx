import { useRef, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { apiUrl } from "../../lib/api";

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();

  const [email, setEmail]               = useState("");
  const [code, setCode]                 = useState("");
  const [password, setPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [codeSent, setCodeSent]         = useState(false);
  const [loading, setLoading]           = useState(false);

  const codeRef    = useRef<TextInput>(null);
  const passRef    = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  async function handleRequestCode() {
    if (!email.trim()) { Alert.alert("Atenção", "Informe o e-mail cadastrado."); return; }
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) {
        const data = await res.json() as { message?: string };
        throw new Error(data.message ?? "Não foi possível enviar o código.");
      }
      setCodeSent(true);
      Alert.alert("Código enviado", "Se o e-mail estiver cadastrado, você receberá um código em instantes.");
    } catch (err) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Erro ao solicitar código.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!email.trim() || !code.trim() || !password || !confirmPassword) {
      Alert.alert("Atenção", "Preencha todos os campos.");
      return;
    }
    if (code.length !== 6) { Alert.alert("Atenção", "O código deve ter 6 dígitos."); return; }
    if (password !== confirmPassword) { Alert.alert("Atenção", "As senhas não conferem."); return; }
    if (password.length < 6) { Alert.alert("Atenção", "A senha deve ter pelo menos 6 caracteres."); return; }

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim(), password }),
      });
      if (!res.ok) {
        const data = await res.json() as { message?: string };
        throw new Error(data.message ?? "Não foi possível alterar a senha.");
      }
      Alert.alert("Senha alterada!", "Sua senha foi redefinida com sucesso. Faça login com a nova senha.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Erro ao alterar senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={s.backTxt}>‹ Voltar</Text>
        </TouchableOpacity>

        <Text style={s.title}>Esqueci minha senha</Text>
        <Text style={s.sub}>
          {codeSent
            ? "Digite o código de 6 dígitos enviado para o seu e-mail e crie uma nova senha."
            : "Informe seu e-mail e enviaremos um código para redefinir sua senha."}
        </Text>

        {/* E-mail */}
        <Text style={s.label}>E-mail</Text>
        <TextInput
          style={s.input}
          placeholder="voce@email.com"
          placeholderTextColor="#64748B"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          returnKeyType={codeSent ? "next" : "done"}
          onSubmitEditing={() => codeSent ? codeRef.current?.focus() : void handleRequestCode()}
          editable={!codeSent}
        />

        {/* Botão enviar código */}
        <TouchableOpacity
          style={[s.btn, codeSent && s.btnOutline]}
          onPress={() => void handleRequestCode()}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading && !codeSent
            ? <ActivityIndicator color="#fff" />
            : <Text style={[s.btnTxt, codeSent && s.btnOutlineTxt]}>
                {codeSent ? "Reenviar código" : "Enviar código"}
              </Text>}
        </TouchableOpacity>

        {codeSent && (
          <>
            {/* Código */}
            <Text style={[s.label, { marginTop: 24 }]}>Código de 6 dígitos</Text>
            <TextInput
              ref={codeRef}
              style={[s.input, s.codeInput]}
              placeholder="______"
              placeholderTextColor="#334155"
              keyboardType="numeric"
              maxLength={6}
              value={code}
              onChangeText={v => setCode(v.replace(/\D/g, "").slice(0, 6))}
              returnKeyType="next"
              onSubmitEditing={() => passRef.current?.focus()}
              autoFocus
            />

            {/* Nova senha */}
            <Text style={s.label}>Nova senha</Text>
            <View style={s.passwordRow}>
              <TextInput
                ref={passRef}
                style={[s.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#64748B"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
              />
              <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPassword(v => !v)} activeOpacity={0.7}>
                <Text style={s.eyeTxt}>{showPassword ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            </View>

            {/* Confirmar senha */}
            <Text style={s.label}>Confirmar nova senha</Text>
            <TextInput
              ref={confirmRef}
              style={s.input}
              placeholder="Repita a nova senha"
              placeholderTextColor="#64748B"
              secureTextEntry={!showPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              returnKeyType="done"
              onSubmitEditing={() => void handleResetPassword()}
            />

            {/* Indicador de senhas */}
            {password.length > 0 && confirmPassword.length > 0 && (
              <Text style={[s.matchHint, { color: password === confirmPassword ? "#4ADE80" : "#F87171" }]}>
                {password === confirmPassword ? "✓ Senhas conferem" : "✗ Senhas não conferem"}
              </Text>
            )}

            {/* Botão alterar senha */}
            <TouchableOpacity
              style={[s.btn, { marginTop: 8 }]}
              onPress={() => void handleResetPassword()}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnTxt}>Alterar senha</Text>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F172A" },
  inner: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 },
  backBtn: { marginBottom: 32, alignSelf: "flex-start" },
  backTxt: { color: "#60A5FA", fontSize: 16, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "800", color: "#F1F5F9", marginBottom: 10 },
  sub: { fontSize: 14, color: "#64748B", lineHeight: 21, marginBottom: 32 },
  label: { color: "#94A3B8", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  input: {
    backgroundColor: "#1E293B", color: "#F1F5F9", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    marginBottom: 16, borderWidth: 1, borderColor: "#334155",
  },
  codeInput: {
    textAlign: "center", fontSize: 28, fontWeight: "800",
    letterSpacing: 12, color: "#60A5FA", borderColor: "#3B82F6",
  },
  passwordRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  eyeBtn: { width: 48, height: 50, backgroundColor: "#1E293B", borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#334155" },
  eyeTxt: { fontSize: 18 },
  matchHint: { fontSize: 13, fontWeight: "600", marginBottom: 12, marginTop: -8 },
  btn: {
    backgroundColor: "#3B82F6", borderRadius: 12,
    paddingVertical: 15, alignItems: "center", marginTop: 4,
  },
  btnTxt: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnOutline: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#334155" },
  btnOutlineTxt: { color: "#64748B" },
});
