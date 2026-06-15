import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RelatoriosScreen() {
  return (
    <SafeAreaView style={s.root}>
      <View style={s.content}>
        <Text style={s.title}>Relatórios</Text>
        <Text style={s.sub}>Em construção 🚧</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F172A" },
  content: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: "800", color: "#F1F5F9", marginBottom: 8 },
  sub: { fontSize: 14, color: "#64748B" },
});
