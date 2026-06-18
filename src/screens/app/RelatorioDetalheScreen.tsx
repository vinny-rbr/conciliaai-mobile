import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { fetchFinanceItems } from "../../lib/financeService";
import { listBankAccounts } from "../../lib/bankAccountsService";
import type { FinanceItem } from "../../types/finance";
import type { BankAccount } from "../../types/finance";
import { c, PERIOD_OPTIONS, REPORT_TITLES, lastNMonths } from "./relatorioDetalhe/shared";
import {
  EntradasSaidas, GastosCat, MaioresGastos, FluxoCaixa,
  PorConta, PorCartao, ComparativoMeses, OrcamentoRealizado,
  DreSimplificado, PorGrupo, RelatorioAnual, ExtratContador,
} from "./relatorioDetalhe/reports";

export default function RelatorioDetalheScreen() {
  const navigation = useNavigation();
  const route      = useRoute<any>();
  const type: string = route.params?.type ?? "entradas-saidas";

  const [items,     setItems]     = useState<FinanceItem[]>([]);
  const [accounts,  setAccounts]  = useState<BankAccount[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [period,    setPeriod]    = useState(3);

  const months = useMemo(() => lastNMonths(period), [period]);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const [it, ac] = await Promise.all([fetchFinanceItems(), listBankAccounts()]);
      setItems(it); setAccounts(ac);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function renderContent() {
    switch (type) {
      case "entradas-saidas":   return <EntradasSaidas   items={items} months={months} />;
      case "gastos-categoria":  return <GastosCat         items={items} months={months} />;
      case "maiores-gastos":    return <MaioresGastos     items={items} months={months} />;
      case "fluxo-caixa":       return <FluxoCaixa        items={items} months={months} />;
      case "por-conta":         return <PorConta          items={items} months={months} accounts={accounts} />;
      case "por-cartao":        return <PorCartao         items={items} months={months} accounts={accounts} />;
      case "comparativo-meses": return <ComparativoMeses  items={items} />;
      case "orcamento-realizado":return <OrcamentoRealizado items={items} months={months} />;
      case "dre":               return <DreSimplificado   items={items} months={months} />;
      case "por-grupo":         return <PorGrupo          items={items} months={months} />;
      case "relatorio-anual":   return <RelatorioAnual    items={items} />;
      case "extrato-contador":  return <ExtratContador    items={items} months={months} />;
      default:                  return <Text style={c.empty}>Relatório não disponível.</Text>;
    }
  }

  return (
    <SafeAreaView style={c.root}>
      <View style={c.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={c.backTxt}>‹ Relatórios</Text>
        </TouchableOpacity>
        <Text style={c.headerTitle} numberOfLines={1}>{REPORT_TITLES[type] ?? type}</Text>
        <View style={{ width: 80 }} />
      </View>

      {!["relatorio-anual", "comparativo-meses"].includes(type) && (
        <View style={c.periodRow}>
          {PERIOD_OPTIONS.map(o => (
            <TouchableOpacity key={o.months} style={[c.periodBtn, period === o.months && c.periodBtnA]} onPress={() => setPeriod(o.months)}>
              <Text style={[c.periodTxt, period === o.months && c.periodTxtA]}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#3B82F6" size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={c.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#3B82F6" />}
        >
          {renderContent()}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
