import { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";

type ToastType = "error" | "success" | "info";
type ToastMsg = { id: number; message: string; type: ToastType };

let _show: ((msg: string, type?: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = "error") {
  _show?.(message, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  useEffect(() => {
    _show = (message, type = "error") => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    };
    return () => { _show = null; };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <View style={{ position: "absolute", top: 60, left: 16, right: 16, zIndex: 9999 }} pointerEvents="none">
      {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
    </View>
  );
}

function ToastItem({ toast }: { toast: ToastMsg }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [opacity]);

  const bg = toast.type === "error" ? "#EF4444" : toast.type === "success" ? "#22C55E" : "#3B82F6";

  return (
    <Animated.View style={{
      opacity,
      backgroundColor: bg,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    }}>
      <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>{toast.message}</Text>
    </Animated.View>
  );
}
