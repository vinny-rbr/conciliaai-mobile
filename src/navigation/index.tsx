import { NavigationContainer } from "@react-navigation/native";
import { navigationRef } from "./rootNav";
import { BiometricGate } from "../components/BiometricGate";
import type { FinanceItem } from "../types/finance";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../context/AuthContext";
import CustomTabBar from "./CustomTabBar";

import LoginScreen from "../screens/auth/LoginScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import DashboardScreen from "../screens/app/DashboardScreen";
import CategoriasScreen from "../screens/app/CategoriasScreen";
import GruposScreen from "../screens/app/GruposScreen";
import PlanejamentoScreen from "../screens/app/PlanejamentoScreen";
import AddTransactionScreen from "../screens/app/AddTransactionScreen";
import ReceitasScreen from "../screens/app/ReceitasScreen";
import DespesasScreen from "../screens/app/DespesasScreen";
import CartaoScreen from "../screens/app/CartaoScreen";
import ImportarExtratoScreen from "../screens/app/ImportarExtratoScreen";
import LancarPorFotoScreen from "../screens/app/LancarPorFotoScreen";
import RelatoriosScreen from "../screens/app/RelatoriosScreen";
import RelatorioDetalheScreen from "../screens/app/RelatorioDetalheScreen";
import PerfilScreen from "../screens/app/PerfilScreen";
import PlanosScreen from "../screens/app/planos/PlanosScreen";
import NotificacoesScreen from "../screens/app/notificacoes/NotificacoesScreen";
import TagsScreen from "../screens/app/TagsScreen";
import LancarTransacaoScreen from "../screens/app/LancarTransacaoScreen";
import ContasBancariasScreen from "../screens/app/ContasBancariasScreen";
import FluxoCaixaScreen from "../screens/app/FluxoCaixaScreen";
import BuscaScreen from "../screens/app/BuscaScreen";
import { SessionExpiredScreen } from "../screens/auth/SessionExpiredScreen";
import VerifyEmailScreen from "../screens/auth/VerifyEmailScreen";

export type AuthStackParamList = { Login: undefined; ForgotPassword: undefined; Register: undefined; VerifyEmail: { email: string } };
export type AppTabParamList = {
  Home: undefined;
  Categorias: undefined;
  Add: undefined;
  Grupos: undefined;
  Planejamento: undefined;
};
export type RootStackParamList = {
  Tabs: undefined;
  AddTransaction: { defaultType?: "RECEITA" | "DESPESA"; editItem?: FinanceItem } | undefined;
  Receitas: undefined;
  Despesas: undefined;
  Cartao: undefined;
  ImportarExtrato: undefined;
  LancarPorFoto: undefined;
  Relatorios: undefined;
  RelatorioDetalhe: { type: string };
  Perfil: undefined;
  Planos: undefined;
  Notificacoes: undefined;
  Tags: undefined;
  LancarTransacao: { type: "RECEITA" | "DESPESA" } | undefined;
  ContasBancarias: undefined;
  FluxoCaixa: undefined;
  Busca: undefined;
};

const AuthStack  = createNativeStackNavigator<AuthStackParamList>();
const AppTab     = createBottomTabNavigator<AppTabParamList>();
const RootStack  = createNativeStackNavigator<RootStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ headerShown: false }} />
    </AuthStack.Navigator>
  );
}

function TabNavigator() {
  return (
    <AppTab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarStyle: { display: "none" } }}
    >
      <AppTab.Screen name="Home"         component={DashboardScreen} />
      <AppTab.Screen name="Categorias"   component={CategoriasScreen} />
      <AppTab.Screen name="Add"          component={AddTransactionScreen} />
      <AppTab.Screen name="Grupos"       component={GruposScreen} />
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
      <RootStack.Screen name="Receitas"  component={ReceitasScreen} />
      <RootStack.Screen name="Despesas"  component={DespesasScreen} />
      <RootStack.Screen name="Cartao"           component={CartaoScreen} />
      <RootStack.Screen name="ImportarExtrato"  component={ImportarExtratoScreen} />
      <RootStack.Screen name="LancarPorFoto"    component={LancarPorFotoScreen} />
      <RootStack.Screen name="Relatorios"       component={RelatoriosScreen} />
      <RootStack.Screen name="RelatorioDetalhe" component={RelatorioDetalheScreen} />
      <RootStack.Screen name="Perfil"           component={PerfilScreen} />
      <RootStack.Screen name="Planos"           component={PlanosScreen} />
      <RootStack.Screen name="Notificacoes"     component={NotificacoesScreen} />
      <RootStack.Screen name="Tags"             component={TagsScreen} />
      <RootStack.Screen name="LancarTransacao"  component={LancarTransacaoScreen} />
      <RootStack.Screen name="ContasBancarias" component={ContasBancariasScreen} />
      <RootStack.Screen name="FluxoCaixa"      component={FluxoCaixaScreen} />
      <RootStack.Screen
        name="Busca"
        component={BuscaScreen}
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
    </RootStack.Navigator>
  );
}

export default function Navigation() {
  const { isLoggedIn, tokenExpired } = useAuth();
  return (
    <NavigationContainer
      ref={navigationRef}
      theme={{ dark: true, colors: { background: "#0F172A", card: "#0F172A", text: "#F1F5F9", border: "#1E293B", primary: "#3B82F6", notification: "#EF4444" }, fonts: { regular: { fontFamily: "System", fontWeight: "400" }, medium: { fontFamily: "System", fontWeight: "500" }, bold: { fontFamily: "System", fontWeight: "700" }, heavy: { fontFamily: "System", fontWeight: "900" } } }}
    >
      {isLoggedIn
        ? tokenExpired
          ? <SessionExpiredScreen />
          : <BiometricGate><AppNavigator /></BiometricGate>
        : <AuthNavigator />}
    </NavigationContainer>
  );
}
