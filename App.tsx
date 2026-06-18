import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import Navigation from "./src/navigation";
import { ToastContainer } from "./src/components/Toast";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { OfflineBanner } from "./src/components/OfflineBanner";

export default function App() {
  return (
    <ErrorBoundary>
      <View style={{ flex: 1, backgroundColor: "#0F172A" }}>
        <StatusBar style="light" backgroundColor="#0F172A" />
        <AuthProvider>
          <Navigation />
        </AuthProvider>
        <ToastContainer />
        <OfflineBanner />
      </View>
    </ErrorBoundary>
  );
}
