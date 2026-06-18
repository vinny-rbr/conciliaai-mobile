import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, type AppStateStatus, Text, TouchableOpacity, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import type { ReactNode } from "react";

const BG_TS_KEY = "conciliaai_bg_ts";
const LOCK_AFTER_MS = 5 * 60 * 1000; // 5 min em background

export function BiometricGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    void init();
    const sub = AppState.addEventListener("change", onStateChange);
    return () => sub.remove();
  }, []);

  async function isAvailable() {
    const hw = await LocalAuthentication.hasHardwareAsync();
    if (!hw) return false;
    return LocalAuthentication.isEnrolledAsync();
  }

  async function prompt() {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Confirme sua identidade para continuar",
      cancelLabel: "Cancelar",
      fallbackLabel: "Usar PIN",
      disableDeviceFallback: false,
    });
    setLocked(!result.success);
  }

  async function init() {
    const available = await isAvailable();
    if (available) await prompt();
    setReady(true);
  }

  async function onStateChange(next: AppStateStatus) {
    const prev = appState.current;
    appState.current = next;

    if (prev.match(/inactive|background/) && next === "active") {
      if (!(await isAvailable())) return;
      const tsStr = await SecureStore.getItemAsync(BG_TS_KEY);
      const elapsed = tsStr ? Date.now() - parseInt(tsStr, 10) : Infinity;
      if (elapsed > LOCK_AFTER_MS) {
        setLocked(true);
        await prompt();
      }
    } else if (next.match(/inactive|background/)) {
      await SecureStore.setItemAsync(BG_TS_KEY, String(Date.now()));
    }
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: "#070d1a", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#3B82F6" size="large" />
      </View>
    );
  }

  if (locked) {
    return (
      <View style={{ flex: 1, backgroundColor: "#070d1a", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Text style={{ fontSize: 52, marginBottom: 24 }}>🔒</Text>
        <Text style={{ color: "#F1F5F9", fontSize: 20, fontWeight: "800", marginBottom: 8 }}>App bloqueado</Text>
        <Text style={{ color: "#64748B", fontSize: 14, textAlign: "center", marginBottom: 32 }}>
          Autentique-se para continuar usando o ConciliaAI
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: "#3B82F6", borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 }}
          onPress={() => void prompt()}
          activeOpacity={0.8}
        >
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Desbloquear</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}
