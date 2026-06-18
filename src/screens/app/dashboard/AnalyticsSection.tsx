import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import DonutCounter from "../../../components/DonutCounter";
import { CHART_COLORS, ExpandableLegend } from "../../../components/dashboard/ExpandableLegend";
import type { SliceWithItems } from "../../../components/dashboard/ExpandableLegend";
import { fmt } from "../../../lib/financeService";
import { catIcon } from "../../../lib/catUtils";
import type { FinanceItem } from "../../../types/finance";
import { type AnalyticsTab, s } from "./shared";

type AnalyticsContent =
  | { ratio: number; label: string }
  | { k: string; v: number }[];

type Props = {
  analyticsTab: AnalyticsTab;
  setAnalyticsTab: (tab: AnalyticsTab) => void;
  analyticsContent: AnalyticsContent;
  totRec: number;
  totDes: number;
  filteredItems: FinanceItem[];
};

export function AnalyticsSection({
  analyticsTab, setAnalyticsTab, analyticsContent, totRec, totDes, filteredItems,
}: Props) {
  return (
    <View style={s.analyticsCard}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.analyticsTabs}>
        {(["confronto", "gastos", "receitas", "pagamento"] as AnalyticsTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.analyticsTabBtn, analyticsTab === tab && s.analyticsTabActive]}
            onPress={() => setAnalyticsTab(tab)}
          >
            <Text style={[s.analyticsTabTxt, analyticsTab === tab && s.analyticsTabTxtActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {analyticsTab === "confronto" && (() => {
        const d = analyticsContent as { ratio: number; label: string };
        const pct = Math.round(d.ratio * 100);
        const slices: SliceWithItems[] = [
          { label: "Despesas", value: totDes, color: d.ratio > 0.9 ? "#EF4444" : d.ratio > 0.7 ? "#F59E0B" : "#F97316", items: filteredItems.filter(it => it.type === "DESPESA") },
          { label: "Receitas", value: totRec, color: "#10B981", items: filteredItems.filter(it => it.type === "RECEITA") },
        ];
        return (
          <View style={{ paddingTop: 16, alignItems: "center" }}>
            <DonutCounter key={analyticsTab} slices={slices} counterVal={pct} counterSuffix="%" centerSub="comprometido" />
            <ExpandableLegend slices={slices} />
          </View>
        );
      })()}

      {(analyticsTab === "gastos" || analyticsTab === "receitas" || analyticsTab === "pagamento") && (() => {
        const rows = analyticsContent as { k: string; v: number }[];
        if (rows.length === 0) return <Text style={s.emptyTxt}>Sem dados</Text>;
        const itemType = analyticsTab === "receitas" ? "RECEITA" : "DESPESA";
        const slices: SliceWithItems[] = rows.map((r, i) => ({
          label: `${catIcon(r.k)} ${r.k}`,
          value: r.v,
          color: CHART_COLORS[i % CHART_COLORS.length],
          items: analyticsTab === "pagamento"
            ? filteredItems.filter(it => {
                const lbl = it.paymentType === "pix" ? "Pix" : it.paymentType === "credit" ? "Crédito" : it.paymentType === "debit" ? "Débito" : "Dinheiro";
                return it.type === "DESPESA" && lbl === r.k;
              })
            : filteredItems.filter(it => it.type === itemType && it.category === r.k),
        }));
        return (
          <View style={{ paddingTop: 16, alignItems: "center" }}>
            <DonutCounter key={analyticsTab} slices={slices} counterVal={slices.reduce((sum, sl) => sum + sl.value, 0)} isCurrency centerSub="total" />
            <ExpandableLegend slices={slices} />
          </View>
        );
      })()}
    </View>
  );
}
