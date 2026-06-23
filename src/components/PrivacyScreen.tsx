import { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus, StyleSheet, View } from "react-native";

// Cobre a tela quando o app vai para background — impede que o iOS/Android
// capture dados financeiros no screenshot do app switcher.
export function PrivacyScreen() {
  const [covered, setCovered] = useState(false);
  const current = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "inactive" || next === "background") {
        setCovered(true);
      } else if (next === "active") {
        setCovered(false);
      }
      current.current = next;
    });
    return () => sub.remove();
  }, []);

  if (!covered) return null;

  return <View style={[StyleSheet.absoluteFill, styles.cover]} />;
}

const styles = StyleSheet.create({
  cover: {
    backgroundColor: "#0F172A",
    zIndex: 9999,
  },
});
