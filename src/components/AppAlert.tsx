import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Audio } from "expo-av";

const ALERT_SOUNDS: Record<string, ReturnType<typeof require>> = {
  error:   require("../../assets/sounds/blare.mp3"),
  warning: require("../../assets/sounds/wink.mp3"),
  success: require("../../assets/sounds/twinkle.mp3"),
  info:    require("../../assets/sounds/notification_bell.mp3"),
};

async function playAlertSound(variant: string) {
  try {
    const { sound } = await Audio.Sound.createAsync(ALERT_SOUNDS[variant], { shouldPlay: true, volume: 1 });
    sound.setOnPlaybackStatusUpdate(s => {
      if (s.isLoaded && s.didJustFinish) sound.unloadAsync();
    });
  } catch { /* silently ignore */ }
}

export type AlertButton = { text: string; onPress?: () => void; style?: "default" | "cancel" | "destructive" };

type AlertState = { title: string; message?: string; buttons: AlertButton[] } | null;

type AlertVariant = "error" | "warning" | "success" | "info";

function detectVariant(title: string): AlertVariant {
  const t = title.toLowerCase();
  if (t.includes("erro")) return "error";
  if (t.includes("atenção") || t.includes("atencao")) return "warning";
  if (
    t.includes("!") || t.includes("confirmado") || t.includes("enviado") ||
    t.includes("alterada") || t.includes("reenviado") || t.includes("criada")
  ) return "success";
  return "info";
}

const VARIANTS = {
  error:   { icon: "✕", color: "#EF4444", bg: "#EF444414", border: "#EF444430" },
  warning: { icon: "!", color: "#F59E0B", bg: "#F59E0B14", border: "#F59E0B30" },
  success: { icon: "✓", color: "#22C55E", bg: "#22C55E14", border: "#22C55E30" },
  info:    { icon: "i", color: "#60A5FA", bg: "#3B82F614", border: "#3B82F630" },
};

export function useAppAlert() {
  const [state, setState] = useState<AlertState>(null);
  const scaleAnim = useRef(new Animated.Value(0.86)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state) {
      scaleAnim.setValue(0.86);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 12, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 160, useNativeDriver: true }),
      ]).start();
      void playAlertSound(detectVariant(state.title));
    }
  }, [state]);

  const showAlert = useCallback((title: string, message?: string, buttons?: AlertButton[]) => {
    setState({ title, message, buttons: buttons ?? [{ text: "OK" }] });
  }, []);

  function dismiss(onPress?: () => void) {
    Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setState(null);
      onPress?.();
    });
  }

  const AlertNode = state ? (() => {
    const variant = detectVariant(state.title);
    const cfg     = VARIANTS[variant];
    const multi   = state.buttons.length > 1;

    return (
      <Modal transparent visible animationType="none" onRequestClose={() => dismiss()}>
        <Animated.View style={[a.overlay, { opacity: fadeAnim }]}>
          <Animated.View style={[a.card, { transform: [{ scale: scaleAnim }] }]}>

            {/* Ícone */}
            <View style={[a.iconCircle, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
              <Text style={[a.iconTxt, { color: cfg.color }]}>{cfg.icon}</Text>
            </View>

            {/* Textos */}
            <Text style={a.title}>{state.title}</Text>
            {state.message ? (
              <Text style={a.message}>{state.message}</Text>
            ) : null}

            {/* Botões */}
            <View style={[a.btnRow, multi && { flexDirection: "row", gap: 10 }]}>
              {state.buttons.map((btn, i) => {
                const isPrimary     = i === state.buttons.length - 1 && btn.style !== "cancel";
                const isCancel      = btn.style === "cancel";
                const isDestructive = btn.style === "destructive";
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      a.btn,
                      multi && { flex: 1 },
                      isPrimary     && [a.btnPrimary,     { backgroundColor: cfg.color }],
                      isCancel      && a.btnCancel,
                      isDestructive && a.btnDestructive,
                    ]}
                    onPress={() => dismiss(btn.onPress)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      a.btnTxt,
                      isPrimary     && a.btnPrimaryTxt,
                      isCancel      && a.btnCancelTxt,
                      isDestructive && a.btnDestructiveTxt,
                    ]}>
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    );
  })() : null;

  return { showAlert, AlertNode };
}

const a = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    backgroundColor: "#1E293B",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    marginBottom: 20,
  },
  iconTxt: { fontSize: 28, fontWeight: "800" },

  title:   { color: "#F1F5F9", fontSize: 18, fontWeight: "800", textAlign: "center", marginBottom: 10, letterSpacing: 0.2 },
  message: { color: "#64748B", fontSize: 14, textAlign: "center", lineHeight: 21, marginBottom: 4 },

  btnRow:  { marginTop: 24, width: "100%" },
  btn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#334155",
  },
  btnTxt:  { color: "#94A3B8", fontSize: 15, fontWeight: "700" },

  btnPrimary:    { borderWidth: 0 },
  btnPrimaryTxt: { color: "#fff" },

  btnCancel:    { backgroundColor: "transparent" },
  btnCancelTxt: { color: "#64748B" },

  btnDestructive:    { backgroundColor: "#EF444414", borderColor: "#EF444430" },
  btnDestructiveTxt: { color: "#EF4444" },
});
