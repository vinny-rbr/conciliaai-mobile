import { useEffect, useRef, useState } from "react";
import { Animated, Text } from "react-native";
import NetInfo from "@react-native-community/netinfo";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const translateY = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setOffline(!(state.isConnected && state.isInternetReachable !== false));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: offline ? 0 : -50,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [offline, translateY]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9998,
        transform: [{ translateY }],
        backgroundColor: "#EF4444",
        paddingVertical: 12,
        alignItems: "center",
      }}
      pointerEvents="none"
    >
      <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
        Sem conexão com a internet
      </Text>
    </Animated.View>
  );
}
