import { createNavigationContainerRef } from "@react-navigation/native";

export type RootScreen = "Tabs" | "AddTransaction" | "Receitas" | "Despesas" | "Cartao" | "ImportarExtrato" | "LancarPorFoto" | "Perfil" | "Planos" | "Notificacoes" | "ContasBancarias" | "Tags" | "Relatorios" | "Busca";

export const navigationRef = createNavigationContainerRef<Record<RootScreen, undefined>>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rootNavigate(name: RootScreen, params?: any) {
  if (navigationRef.isReady()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigationRef.navigate as any)(name, params);
  }
}
