import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import type { DonutSlice } from "../DonutCounter";
import { CollapsePanel } from "./CollapsePanel";
import { catIcon } from "../../lib/catUtils";
import { fmt } from "../../lib/financeService";
import { dateLabel } from "../../lib/dateUtils";
import type { FinanceItem } from "../../types/finance";

export const CHART_COLORS = ["#3B82F6","#F59E0B","#10B981","#EF4444","#8B5CF6","#F97316","#06B6D4","#EC4899"];

export type SliceWithItems = DonutSlice & { items: FinanceItem[] };

export function ExpandableLegend({ slices }: { slices: SliceWithItems[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const total = slices.reduce((s, sl) => s + sl.value, 0);

  return (
    <View style={{ gap: 6, marginTop: 16, width: "100%" }}>
      {slices.map((sl, i) => {
        const isOpen = expanded === sl.label;
        return (
          <View key={i}>
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: "#1E293B", borderRadius: 12 }}
              onPress={() => setExpanded(isOpen ? null : sl.label)}
              activeOpacity={0.7}
            >
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: sl.color }} />
              <Text style={{ flex: 1, color: "#94A3B8", fontSize: 12, fontWeight: "600" }} numberOfLines={1}>{sl.label}</Text>
              <Text style={{ color: sl.color, fontSize: 12, fontWeight: "700" }}>{fmt(sl.value)}</Text>
              <Text style={{ color: "#475569", fontSize: 11, width: 34, textAlign: "right" }}>
                {total > 0 ? (sl.value / total * 100).toFixed(0) : 0}%
              </Text>
              <Text style={{ color: "#475569", fontSize: 14, marginLeft: 4 }}>{isOpen ? "▼" : "›"}</Text>
            </TouchableOpacity>

            <CollapsePanel isOpen={isOpen} contentHeight={sl.items.length === 0 ? 56 : Math.min(sl.items.length * 46, 46 * 10)}>
              <View style={{ backgroundColor: "#0F172A", borderRadius: 10 }}>
                {sl.items.length === 0
                  ? <Text style={{ color: "#475569", fontSize: 12, textAlign: "center", paddingVertical: 12 }}>Nenhum lançamento no período.</Text>
                  : (
                    <ScrollView
                      style={{ maxHeight: 44 * 10 }}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                    >
                      {sl.items.map((it, j) => (
                        <View key={it.id?.toString() ?? String(j)} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 7, paddingHorizontal: 8, gap: 8, borderBottomWidth: j < sl.items.length - 1 ? 1 : 0, borderBottomColor: "#1E293B" }}>
                          <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: sl.color + "22", justifyContent: "center", alignItems: "center" }}>
                            <Text style={{ fontSize: 13 }}>{catIcon(it.category)}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: "#F1F5F9", fontSize: 12, fontWeight: "600" }} numberOfLines={1}>{it.title}</Text>
                            <Text style={{ color: "#475569", fontSize: 10, marginTop: 1 }}>{it.category} · {dateLabel(it.dateISO)}</Text>
                          </View>
                          <Text style={{ color: sl.color, fontSize: 12, fontWeight: "700" }}>{fmt(it.amountCents)}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  )
                }
              </View>
            </CollapsePanel>
          </View>
        );
      })}
    </View>
  );
}
