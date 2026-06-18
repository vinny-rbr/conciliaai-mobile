import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

type State = { hasError: boolean };

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: "#070d1a", alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 48, marginBottom: 24 }}>😕</Text>
          <Text style={{ color: "#F1F5F9", fontSize: 20, fontWeight: "800", marginBottom: 8 }}>Algo deu errado</Text>
          <Text style={{ color: "#64748B", fontSize: 14, textAlign: "center", marginBottom: 32 }}>
            Ocorreu um erro inesperado. Tente novamente.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: "#3B82F6", borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 }}
            onPress={() => this.setState({ hasError: false })}
            activeOpacity={0.8}
          >
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
