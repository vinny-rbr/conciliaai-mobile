import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";

export function SessionExpiredScreen() {
  const { signOut } = useAuth();

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const glowAnim  = useRef(new Animated.Value(0.4)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim,  { toValue: 1,   duration: 1800, useNativeDriver: true }),
        Animated.timing(glowAnim,  { toValue: 0.4, duration: 1800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 2200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 2200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={s.root}>
      <Animated.View style={[s.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

        {/* Ícone com glow */}
        <View style={s.iconOuter}>
          <Animated.View style={[s.glowRing, { opacity: glowAnim }]} />
          <Animated.View style={[s.iconWrap, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={s.iconEmoji}>🔐</Text>
          </Animated.View>
        </View>

        {/* Textos */}
        <Text style={s.title}>Sessão encerrada</Text>
        <Text style={s.subtitle}>
          Por sua segurança, encerramos a sessão automaticamente.{"\n"}
          Seus dados continuam guardados e protegidos com você.
        </Text>

        {/* Garantias */}
        <View style={s.pills}>
          <View style={s.pill}>
            <Text style={s.pillIcon}>🛡️</Text>
            <Text style={s.pillTxt}>Dados seguros</Text>
          </View>
          <View style={s.pill}>
            <Text style={s.pillIcon}>✅</Text>
            <Text style={s.pillTxt}>Nada foi perdido</Text>
          </View>
        </View>

        {/* Botão */}
        <TouchableOpacity style={s.btn} onPress={() => void signOut()} activeOpacity={0.85}>
          <Text style={s.btnTxt}>Entrar novamente</Text>
        </TouchableOpacity>

        <Text style={s.footer}>A Conciliai cuida do que é seu  ♡</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:     { flex: 1, backgroundColor: "#080E1C", justifyContent: "center" },
  content:  { alignItems: "center", paddingHorizontal: 36 },

  iconOuter: { width: 130, height: 130, alignItems: "center", justifyContent: "center", marginBottom: 36 },
  glowRing:  {
    position: "absolute", width: 130, height: 130, borderRadius: 65,
    backgroundColor: "#F59E0B22",
    shadowColor: "#F59E0B", shadowOpacity: 1, shadowRadius: 40, shadowOffset: { width: 0, height: 0 },
  },
  iconWrap:  {
    width: 90, height: 90, borderRadius: 28, backgroundColor: "#1A1F2E",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#F59E0B44",
    shadowColor: "#F59E0B", shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 0 },
  },
  iconEmoji: { fontSize: 40 },

  title: {
    color: "#F1F5F9", fontSize: 24, fontWeight: "800",
    textAlign: "center", marginBottom: 14, letterSpacing: 0.3,
  },
  subtitle: {
    color: "#64748B", fontSize: 15, lineHeight: 24,
    textAlign: "center", marginBottom: 28,
  },

  pills:   { flexDirection: "row", gap: 10, marginBottom: 40 },
  pill:    {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#111827", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: "#1E293B",
  },
  pillIcon: { fontSize: 13 },
  pillTxt:  { color: "#475569", fontSize: 12, fontWeight: "600" },

  btn: {
    width: "100%", backgroundColor: "#3B82F6", borderRadius: 16,
    paddingVertical: 16, alignItems: "center", marginBottom: 28,
    shadowColor: "#3B82F6", shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },
  btnTxt: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },

  footer: { color: "#1E293B", fontSize: 13, fontWeight: "500", letterSpacing: 0.4 },
});
