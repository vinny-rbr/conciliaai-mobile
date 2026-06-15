import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import Navigation from "./src/navigation";

export default function App() {
  return (
    <View style={{ flex: 1, backgroundColor: "#0F172A" }}>
      <StatusBar style="light" backgroundColor="#0F172A" />
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    </View>
  );
}
