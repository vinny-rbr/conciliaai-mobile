import { Text, TouchableOpacity, View } from "react-native";
import { fmt } from "../../../lib/financeService";
import { addMonthsYM, ymToLabel } from "../../../lib/dateUtils";
import { rootNavigate } from "../../../navigation/rootNav";
import { s } from "./shared";

type HeroData = { rec: number; des: number; saldo: number };

type Props = {
  heroData: HeroData;
  balanceHidden: boolean;
  setBalanceHidden: (fn: (h: boolean) => boolean) => void;
  heroMonth: string;
  setHeroMonth: (fn: (m: string) => string) => void;
  currentMonthYM: string;
  setCalendarOpen: (v: boolean) => void;
};

export function HeroCard({
  heroData, balanceHidden, setBalanceHidden,
  heroMonth, setHeroMonth, currentMonthYM, setCalendarOpen,
}: Props) {
  return (
    <View style={s.heroCard}>
      <View style={s.heroTop}>
        <Text style={s.heroBalLabel}>Saldo em contas</Text>
        <View style={s.monthNav}>
          <TouchableOpacity
            onPress={() => setHeroMonth(m => addMonthsYM(m, -1))}
            disabled={heroMonth <= addMonthsYM(currentMonthYM, -23)}
            style={s.monthBtn}
          >
            <Text style={s.monthBtnTxt}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCalendarOpen(true)} activeOpacity={0.7}>
            <Text style={s.monthLabel}>{ymToLabel(heroMonth)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setHeroMonth(m => addMonthsYM(m, 1))}
            disabled={heroMonth >= currentMonthYM}
            style={s.monthBtn}
          >
            <Text style={s.monthBtnTxt}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.heroBalRow}>
        <View>
          <Text style={[s.heroBal, { color: heroData.saldo < 0 ? "#FFCBC6" : "#fff" }]}>
            {balanceHidden ? "R$ •••••" : fmt(Math.abs(heroData.saldo))}
          </Text>
          <Text style={s.heroAccountsHint}>receitas − despesas acumuladas</Text>
        </View>
        <TouchableOpacity onPress={() => setBalanceHidden(h => !h)} style={s.eyeBtn}>
          <Text style={{ fontSize: 18 }}>{balanceHidden ? "🙈" : "👁"}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <View
          style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(0,0,0,.18)", borderRadius: 14, padding: 14 }}
          onStartShouldSetResponder={() => true}
          onResponderRelease={() => rootNavigate("Receitas")}
        >
          <View style={[s.heroStatIc, { backgroundColor: "rgba(74,222,128,.25)" }]}>
            <Text style={{ color: "#4ADE80", fontSize: 11, fontWeight: "800" }}>↑</Text>
          </View>
          <View>
            <Text style={s.heroStatLbl}>Receitas</Text>
            <Text style={[s.heroStatVal, { color: "#4ADE80" }]}>
              {balanceHidden ? "•••" : fmt(heroData.rec)}
            </Text>
          </View>
        </View>
        <View
          style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(0,0,0,.18)", borderRadius: 14, padding: 14 }}
          onStartShouldSetResponder={() => true}
          onResponderRelease={() => rootNavigate("Despesas")}
        >
          <View style={[s.heroStatIc, { backgroundColor: "rgba(248,113,113,.25)" }]}>
            <Text style={{ color: "#F87171", fontSize: 11, fontWeight: "800" }}>↓</Text>
          </View>
          <View>
            <Text style={s.heroStatLbl}>Despesas</Text>
            <Text style={[s.heroStatVal, { color: "#F87171" }]}>
              {balanceHidden ? "•••" : fmt(heroData.des)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
