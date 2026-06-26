import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { leftTranslateX, rightTranslateX, fabScale, fabOpacity } from "./tabBarScroll";
import { fabRotation, fabTranslate, openFabAnim } from "./fabAnimState";
import { getGroupFabAction } from "./groupFabAction";

const ICONS: Record<string, string> = {
  Home: "⌂", Categorias: "◈", Grupos: "⊕", Planejamento: "≡",
};
const LABELS: Record<string, string> = {
  Home: "Início", Categorias: "Categorias", Grupos: "Grupos", Planejamento: "Planos",
};
const TAB_COLORS: Record<string, string> = {
  Home: "#60A5FA", Categorias: "#A78BFA", Grupos: "#34D399", Planejamento: "#FBBF24",
};

const PILL_BG    = "#0F172A";
const PILL_BORD  = "#1E293B";

export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

function renderTab(route: typeof state.routes[0]) {
    const index = state.routes.indexOf(route);
    const isFocused = state.index === index;
    const color = isFocused ? (TAB_COLORS[route.name] ?? "#60A5FA") : "#475569";

    const onPress = () => {
      const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
    };

    return (
      <TouchableOpacity key={route.key} style={s.tab} onPress={onPress} activeOpacity={0.7}>
        <Text style={[s.icon, { color }]}>{ICONS[route.name]}</Text>
        <Text style={[s.label, { color }]}>{LABELS[route.name]}</Text>
        {isFocused && <View style={[s.dot, { backgroundColor: color }]} />}
      </TouchableOpacity>
    );
  }

  const leftRoutes  = state.routes.filter(r => r.name === "Home" || r.name === "Categorias");
  const rightRoutes = state.routes.filter(r => r.name === "Grupos" || r.name === "Planejamento");

  return (
    <View style={[s.wrapper, { bottom: Math.max(insets.bottom + 8, 20) }]}>
      {/* Pill como dois lados que se tocam — parecem uma só */}
      <View style={s.pillRow}>
        {/* Metade esquerda — arredondada só na esquerda */}
        <Animated.View style={[s.halfLeft, { transform: [{ translateX: leftTranslateX }] }]}>
          {leftRoutes.map(renderTab)}
        </Animated.View>

        {/* Metade direita — arredondada só na direita */}
        <Animated.View style={[s.halfRight, { transform: [{ translateX: rightTranslateX }] }]}>
          {rightRoutes.map(renderTab)}
        </Animated.View>
      </View>

      {/* FAB flutuando por cima da junção central */}
      <Animated.View
        style={[
          s.fabWrap,
          {
            transform: [
              { scale: fabScale },
              { translateY: fabTranslate },
            ],
            opacity: fabOpacity,
          },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={s.fab}
          activeOpacity={0.85}
          onPress={() => {
            const groupAction = getGroupFabAction();
            const onGrupos = state.routes[state.index]?.name === "Grupos";
            if (groupAction && onGrupos) {
              groupAction();
            } else {
              openFabAnim();
              setTimeout(() => navigation.getParent()?.navigate("AddTransaction" as never), 120);
            }
          }}
        >
          <Animated.Text
            style={[
              s.fabTxt,
              {
                transform: [{
                  rotate: fabRotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "45deg"],
                  }),
                }],
              },
            ]}
          >
            +
          </Animated.Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 20,
    left: 12,
    right: 12,
    alignItems: "center",
  },

  pillRow: {
    width: "100%",
    flexDirection: "row",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },

  halfLeft: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: PILL_BG,
    borderTopLeftRadius: 28,
    borderBottomLeftRadius: 28,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: PILL_BORD,
    paddingVertical: 10,
    paddingLeft: 4,
    paddingRight: 4,
    marginRight: -1,  // fecha o gap de 1px entre as metades
    zIndex: 1,
  },

  halfRight: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: PILL_BG,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderWidth: 1,
    borderLeftWidth: 0,    // sem borda no meio — parece uma pill só
    borderColor: PILL_BORD,
    paddingVertical: 10,
    paddingLeft: 4,
    paddingRight: 4,
  },

  tab: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingVertical: 4,
  },
  icon:  { fontSize: 18, fontWeight: "600" },
  label: { fontSize: 10, fontWeight: "700" },
  dot:   { width: 4, height: 4, borderRadius: 2, marginTop: 1 },

  fabWrap: {
    position: "absolute",
    top: -16,
    alignSelf: "center",
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#1e3a8a",
    shadowColor: "#3B82F6",
    shadowOpacity: 0.65,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 16,
  },
  fabTxt: { color: "#fff", fontSize: 30, fontWeight: "300", lineHeight: 34 },
});
