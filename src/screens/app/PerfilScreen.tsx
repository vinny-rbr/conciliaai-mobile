import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";

export default function PerfilScreen() {
  const { signOut } = useAuth();

  function handleLogout() {
    Alert.alert("Sair", "Deseja sair da conta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.content}>
        <Text style={s.title}>Perfil</Text>
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutTxt}>Sair da conta</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F172A" },
  content: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: "800", color: "#F1F5F9", marginBottom: 24 },
  logoutBtn: {
    backgroundColor: "#1E293B", borderRadius: 12, padding: 16,
    alignItems: "center", borderWidth: 1, borderColor: "#EF4444",
  },
  logoutTxt: { color: "#EF4444", fontWeight: "700", fontSize: 15 },
});
