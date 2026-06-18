import { createNavigationContainerRef } from "@react-navigation/native";

export type RootScreen = "Tabs" | "AddTransaction" | "Receitas" | "Despesas" | "Cartao" | "ImportarExtrato" | "LancarPorFoto" | "Perfil" | "Planos" | "Notificacoes";

export const navigationRef = createNavigationContainerRef<Record<RootScreen, undefined>>();

export function rootNavigate(name: RootScreen) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name);
  }
}
