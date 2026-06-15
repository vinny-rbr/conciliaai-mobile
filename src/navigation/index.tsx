import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../context/AuthContext";
import CustomTabBar from "./CustomTabBar";

import LoginScreen from "../screens/auth/LoginScreen";
import DashboardScreen from "../screens/app/DashboardScreen";
import CategoriasScreen from "../screens/app/CategoriasScreen";
import GruposScreen from "../screens/app/GruposScreen";
import PlanejamentoScreen from "../screens/app/PlanejamentoScreen";
import AddTransactionScreen from "../screens/app/AddTransactionScreen";

export type AuthStackParamList = { Login: undefined };
export type AppTabParamList = {
  Home: undefined;
  Categorias: undefined;
  Add: undefined;
  Grupos: undefined;
  Planejamento: undefined;
};
export type RootStackParamList = {
  Tabs: undefined;
  AddTransaction: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppTab = createBottomTabNavigator<AppTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

function TabNavigator() {
  return (
    <AppTab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarStyle: { display: "none" } }}
    >
      <AppTab.Screen name="Home" component={DashboardScreen} />
      <AppTab.Screen name="Categorias" component={CategoriasScreen} />
      <AppTab.Screen name="Add" component={AddTransactionScreen} />
      <AppTab.Screen name="Grupos" component={GruposScreen} />
      <AppTab.Screen name="Planejamento" component={PlanejamentoScreen} />
    </AppTab.Navigator>
  );
}

function AppNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0F172A" } }}>
      <RootStack.Screen name="Tabs" component={TabNavigator} />
      <RootStack.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{ presentation: "modal", animation: "none", contentStyle: { backgroundColor: "#0F172A" } }}
      />
    </RootStack.Navigator>
  );
}

export default function Navigation() {
  const { isLoggedIn } = useAuth();
  return (
    <NavigationContainer theme={{ dark: true, colors: { background: "#0F172A", card: "#0F172A", text: "#F1F5F9", border: "#1E293B", primary: "#3B82F6", notification: "#EF4444" }, fonts: { regular: { fontFamily: "System", fontWeight: "400" }, medium: { fontFamily: "System", fontWeight: "500" }, bold: { fontFamily: "System", fontWeight: "700" }, heavy: { fontFamily: "System", fontWeight: "900" } } }}>
      {isLoggedIn ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
