import { View } from "react-native";

export function Sparkline({ vals, color }: { vals: number[]; color: string }) {
  const max = Math.max(...vals.map(Math.abs), 1);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, height: 24 }}>
      {vals.map((v, i) => (
        <View key={i} style={{
          width: 4, borderRadius: 2,
          height: Math.max(3, Math.round(24 * Math.abs(v) / max)),
          backgroundColor: color,
          opacity: 0.3 + (i / vals.length) * 0.7,
        }} />
      ))}
    </View>
  );
}
