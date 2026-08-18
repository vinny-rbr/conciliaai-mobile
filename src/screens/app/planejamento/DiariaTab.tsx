import React, { useCallback, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  TextInput, KeyboardAvoidingView, Platform, RefreshControl,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as SecureStore from "expo-secure-store";
import { useFocusEffect } from "@react-navigation/native";
import { fmt } from "../../../lib/financeService";
import { KeyboardAwareScroll } from "../../../components/KeyboardAwareScroll";
import {
  WorkType, DiariaView, DiariaExpense, DiariaLog, DiariaPerfil,
  WORK_TYPES, DIARIA_KEY, DIARIA_LOGS_KEY,
  fmtBRL, parseCents, curYM, uid, s, monthLabel,
} from "./shared";

// ── Local design tokens ─────────────────────────────────────────────
const C = {
  card:        "#131c2e" as const,
  cardBorder:  "rgba(148,163,184,0.10)" as const,
  hero:        "#0F2038" as const,
  heroBorder:  "rgba(59,130,246,0.40)" as const,
  innerCard:   "rgba(7,12,22,0.60)" as const,
  inputBg:     "#0a1220" as const,
  accent:      "#3b82f6" as const,
  accentBg:    "rgba(59,130,246,0.13)" as const,
  accentBorder:"rgba(59,130,246,0.40)" as const,
  green:       "#4ade80" as const,
  greenBg:     "rgba(34,197,94,0.14)" as const,
  greenBorder: "rgba(34,197,94,0.18)" as const,
  greenCard:   "#0f2038" as const,
  red:         "#f87171" as const,
  amber:       "#fbbf24" as const,
  slate:       "#94a3b8" as const,
  muted:       "#64748b" as const,
  dim:         "#475569" as const,
  text:        "#e2e8f0" as const,
  white:       "#f8fafc" as const,
};

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View style={[{ backgroundColor: C.card, borderRadius: 22, borderWidth: 1, borderColor: C.cardBorder, padding: 18 }, style]}>
      {children}
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={{ color: C.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.4, paddingHorizontal: 4 }}>
      {children}
    </Text>
  );
}

function PrefixInput({
  prefix, value, onChange, placeholder, prefixColor,
}: {
  prefix: string; value: string; onChange: (v: string) => void;
  placeholder: string; prefixColor?: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.inputBg, borderWidth: 1, borderColor: "rgba(148,163,184,0.12)", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13 }}>
      <Text style={{ color: prefixColor ?? C.muted, fontSize: 17, fontWeight: "700", marginRight: 8 }}>{prefix}</Text>
      <TextInput
        style={{ flex: 1, color: C.white, fontSize: 19, fontWeight: "700", padding: 0 }}
        placeholder={placeholder}
        placeholderTextColor={C.dim}
        keyboardType="numeric"
        value={value}
        onChangeText={onChange}
      />
    </View>
  );
}

function BreakdownRow({ dot, label, value, valueColor }: { dot: string; label: string; value: string; valueColor?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 11, borderBottomWidth: 1, borderColor: "rgba(148,163,184,0.09)" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
        <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: dot }} />
        <Text style={{ color: "#cbd5e1", fontSize: 14, fontWeight: "500" }}>{label}</Text>
      </View>
      <Text style={{ color: valueColor ?? C.text, fontSize: 14, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

function ResumoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 9, borderBottomWidth: 1, borderColor: "rgba(148,163,184,0.07)" }}>
      <Text style={{ color: C.slate, fontSize: 13, fontWeight: "500" }}>{label}</Text>
      <Text style={{ color: valueColor ?? C.text, fontSize: 13, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

// ── Props ──────────────────────────────────────────────────────────
type Props = { refreshing: boolean; onRefresh: () => void };

export default function DiariaTab({ refreshing, onRefresh }: Props) {
  const [workType,         setWorkType]       = useState<WorkType>("outro");
  const [workDays,         setWorkDays]       = useState(22);
  const [fuelCents,        setFuelCents]      = useState(0);
  const [maintenanceCents, setMaintCents]     = useState(0);
  const [platformCutPct,   setPlatformCutPct] = useState(25);
  const [liquidMeta,       setLiquidMeta]     = useState(0);
  const [diariaExpenses,   setDiariaExpenses] = useState<DiariaExpense[]>([]);
  const [diariaView,       setDiariaView]     = useState<DiariaView>("meta");
  const [diariaLogs,       setDiariaLogs]     = useState<DiariaLog[]>([]);
  const [selMonth,         setSelMonth]       = useState(curYM());   // mês em consulta (YYYY-MM)
  const [logModal,         setLogModal]       = useState<{ date: string; current?: number } | null>(null);
  const [logVal,           setLogVal]         = useState("");
  const [showDatePicker,   setShowDatePicker] = useState(false);
  const [workDaysList,     setWorkDaysList]   = useState<number[]>([]);
  const [workDaysCalModal, setWorkDaysCalModal] = useState(false);
  const [selectedDays,     setSelectedDays]   = useState<number[]>([]);
  const [tempWorkDays,     setTempWorkDays]   = useState(22);
  const [addExpModal,      setAddExpModal]    = useState(false);
  const [editExpItem,      setEditExpItem]    = useState<DiariaExpense | null>(null);
  const [expName,          setExpName]        = useState("");
  const [expVal,           setExpVal]         = useState("");

  // local input states (shown in place — no separate modal for these)
  const [liquidInput,  setLiquidInput]  = useState("");
  const [fuelInput,    setFuelInput]    = useState("");
  const [maintInput,   setMaintInput]   = useState("");

  useFocusEffect(useCallback(() => {
    async function loadDiaria() {
      const [dRaw, lRaw] = await Promise.all([
        SecureStore.getItemAsync(DIARIA_KEY),
        SecureStore.getItemAsync(DIARIA_LOGS_KEY(selMonth)),
      ]);
      setDiariaLogs(lRaw ? JSON.parse(lRaw) as DiariaLog[] : []);
      if (dRaw) {
        const d = JSON.parse(dRaw) as DiariaPerfil;
        const wt   = d.workType ?? "outro";
        const wd   = d.workDays ?? 22;
        const fc   = d.fuelCents ?? 0;
        const mc   = d.maintenanceCents ?? 0;
        const pct  = d.platformCutPct ?? 25;
        const liq  = d.liquidMeta ?? 0;
        setWorkType(wt); setWorkDays(wd); setFuelCents(fc); setMaintCents(mc);
        setPlatformCutPct(pct); setLiquidMeta(liq); setDiariaExpenses(d.expenses ?? []);
        setWorkDaysList(d.workDaysList ?? []);
        setLiquidInput(liq > 0 ? fmtBRL(String(liq)) : "");
        setFuelInput(fc > 0 ? fmtBRL(String(fc)) : "");
        setMaintInput(mc > 0 ? fmtBRL(String(mc)) : "");
      }
    }
    void loadDiaria();
  }, [selMonth]));

  async function saveDiaria(patch: Partial<DiariaPerfil>) {
    const next: DiariaPerfil = {
      workType: patch.workType ?? workType,
      workDays: patch.workDays ?? workDays,
      workDaysList: patch.workDaysList !== undefined ? patch.workDaysList : workDaysList,
      fuelCents: patch.fuelCents ?? fuelCents,
      maintenanceCents: patch.maintenanceCents ?? maintenanceCents,
      platformCutPct: patch.platformCutPct ?? platformCutPct,
      liquidMeta: patch.liquidMeta ?? liquidMeta,
      expenses: patch.expenses ?? diariaExpenses,
    };
    if (patch.workType !== undefined) setWorkType(patch.workType);
    if (patch.workDays !== undefined) setWorkDays(patch.workDays);
    if (patch.workDaysList !== undefined) setWorkDaysList(patch.workDaysList);
    if (patch.fuelCents !== undefined) setFuelCents(patch.fuelCents);
    if (patch.maintenanceCents !== undefined) setMaintCents(patch.maintenanceCents);
    if (patch.platformCutPct !== undefined) setPlatformCutPct(patch.platformCutPct);
    if (patch.liquidMeta !== undefined) setLiquidMeta(patch.liquidMeta);
    if (patch.expenses !== undefined) setDiariaExpenses(patch.expenses);
    await SecureStore.setItemAsync(DIARIA_KEY, JSON.stringify(next));
  }

  function openWorkDaysModal() {
    setSelectedDays([...workDaysList]);
    setTempWorkDays(workDays);
    setWorkDaysCalModal(true);
  }

  function toggleDay(day: number) {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  }

  async function confirmWorkDaysModal() {
    if (selectedDays.length > 0) {
      await saveDiaria({ workDays: selectedDays.length, workDaysList: selectedDays });
    } else {
      await saveDiaria({ workDays: tempWorkDays, workDaysList: [] });
    }
    setWorkDaysCalModal(false);
  }

  function buildMonthGrid(): (number | null)[] {
    const now = new Date();
    const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const firstWd = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const cells: (number | null)[] = Array(firstWd).fill(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  function openAddExp(item?: DiariaExpense) {
    setEditExpItem(item ?? null);
    setExpName(item?.name ?? "");
    setExpVal(item ? fmtBRL(String(item.amountCents)) : "");
    setAddExpModal(true);
  }

  async function confirmAddExp() {
    const cents = parseCents(expVal);
    if (!expName.trim() || !cents) { setAddExpModal(false); return; }
    const next = editExpItem
      ? diariaExpenses.map(e => e.id === editExpItem.id ? { ...e, name: expName.trim(), amountCents: cents } : e)
      : [...diariaExpenses, { id: uid(), name: expName.trim(), amountCents: cents }];
    await saveDiaria({ expenses: next });
    setAddExpModal(false);
  }

  async function deleteExp(id: string) {
    await saveDiaria({ expenses: diariaExpenses.filter(e => e.id !== id) });
  }

  function todayISO() { return new Date().toISOString().slice(0, 10); }

  function openLogModal(date?: string) {
    const d = date ?? todayISO();
    const existing = diariaLogs.find(l => l.date === d);
    setLogModal({ date: d, current: existing?.earnedCents });
    setLogVal(existing ? fmtBRL(String(existing.earnedCents)) : "");
  }

  // Abre o modal já no dia mais recente (<= hoje, dentro do mês) que ainda não
  // tem registro — para "adicionar outro dia" sem trombar com o de hoje.
  function openAddLogModal() {
    const now = new Date();
    const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const d = new Date(todayISO() + "T12:00:00");
    for (let i = 0; i < 40; i++) {
      const iso = d.toISOString().slice(0, 10);
      if (iso < firstOfMonth) break;
      if (!diariaLogs.find(l => l.date === iso)) { openLogModal(iso); return; }
      d.setDate(d.getDate() - 1);
    }
    openLogModal(); // todos os dias já registrados → abre hoje
  }

  async function confirmLog() {
    if (!logModal) return;
    const cents = parseCents(logVal);
    const next = diariaLogs.filter(l => l.date !== logModal.date);
    if (cents > 0) next.push({ date: logModal.date, earnedCents: cents });
    next.sort((a, b) => b.date.localeCompare(a.date));
    setDiariaLogs(next);
    await SecureStore.setItemAsync(DIARIA_LOGS_KEY(selMonth), JSON.stringify(next));
    setLogModal(null); setLogVal("");
  }

  async function deleteLog(date: string) {
    const next = diariaLogs.filter(l => l.date !== date);
    setDiariaLogs(next);
    await SecureStore.setItemAsync(DIARIA_LOGS_KEY(selMonth), JSON.stringify(next));
  }

  function changeLogDate(delta: number) {
    if (!logModal) return;
    const d = new Date(logModal.date + "T12:00:00");
    d.setDate(d.getDate() + delta);
    const newDate = d.toISOString().slice(0, 10);
    if (newDate > todayISO()) return;
    const existing = diariaLogs.find(l => l.date === newDate);
    setLogModal({ date: newDate, current: existing?.earnedCents });
    setLogVal(existing ? fmtBRL(String(existing.earnedCents)) : "");
  }

  // ── Calculations ──────────────────────────────────────────────────
  const wt               = WORK_TYPES.find(w => w.type === workType)!;
  const totalFixedCents  = diariaExpenses.reduce((a, e) => a + e.amountCents, 0);
  const totalMonthly     = totalFixedCents + liquidMeta + (wt.hasFuel ? fuelCents + maintenanceCents : 0);
  const dailyNet         = totalMonthly / Math.max(1, workDays);
  const dailyGross       = wt.hasPlatform && platformCutPct > 0 ? dailyNet / (1 - platformCutPct / 100) : dailyNet;
  const dailyFuel        = wt.hasFuel ? fuelCents / Math.max(1, workDays) : 0;
  const dailyMaint       = wt.hasFuel ? maintenanceCents / Math.max(1, workDays) : 0;
  const dailyBills       = totalFixedCents / Math.max(1, workDays);
  const dailyLiquid      = liquidMeta / Math.max(1, workDays);
  const dailyCut         = dailyGross - dailyNet;
  const grossMonth       = Math.round(dailyGross * workDays);
  const platformMonth    = Math.round(dailyCut * workDays);
  const oper             = wt.hasFuel ? fuelCents + maintenanceCents : 0;

  const totalEarned      = diariaLogs.reduce((a, l) => a + l.earnedCents, 0);
  const daysLogged       = diariaLogs.length;
  const avgEarned        = daysLogged > 0 ? Math.round(totalEarned / daysLogged) : 0;
  const monthlyGoal      = grossMonth;
  const todayLog         = diariaLogs.find(l => l.date === todayISO());
  const remainingDays    = Math.max(0, workDays - daysLogged);
  const remainingToEarn  = Math.max(0, monthlyGoal - totalEarned);
  const adjustedDaily    = remainingDays > 0 ? Math.ceil(remainingToEarn / remainingDays) : 0;
  const dailyDiff        = adjustedDaily - Math.round(dailyGross);
  const hasAdj           = daysLogged > 0 && remainingDays > 0 && Math.abs(dailyDiff) >= 1;
  const displayGoal      = hasAdj ? adjustedDaily : Math.round(dailyGross);

  const refreshCtrl = <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />;

  const MONTHS_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const selMonthLabel = (() => { const [y, m] = selMonth.split("-").map(Number); return `${MONTHS_FULL[(m || 1) - 1]} ${y}`; })();
  function shiftMonth(delta: number) {
    const [y, m] = selMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const ny = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (ny > curYM()) return; // não passa do mês atual
    setSelMonth(ny);
  }

  return (
    <>
      {/* ── Segmented toggle ──────────────────────────────────── */}
      <View style={{ flexDirection: "row", marginHorizontal: 18, marginTop: 8, marginBottom: 4, backgroundColor: "#0d1626", borderWidth: 1, borderColor: "rgba(148,163,184,0.08)", borderRadius: 16, padding: 5, gap: 4 }}>
        {(["meta", "registro", "relatorios"] as DiariaView[]).map(v => {
          const active = diariaView === v;
          const label = v === "meta" ? "Configurar" : v === "registro" ? "Registro" : "Relatórios";
          return (
            <TouchableOpacity key={v} onPress={() => setDiariaView(v)} style={{ flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: "center", backgroundColor: active ? "#1b2840" : "transparent" }}>
              <Text style={{ color: active ? C.white : C.muted, fontSize: 13, fontWeight: active ? "700" : "500" }}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Navegação de mês (Registro / Relatórios) ──────────── */}
      {diariaView !== "meta" && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18, marginHorizontal: 18, marginTop: 2, marginBottom: 6 }}>
          <TouchableOpacity onPress={() => shiftMonth(-1)} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#1b2840", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: C.accent, fontSize: 20, fontWeight: "700" }}>‹</Text>
          </TouchableOpacity>
          <Text style={{ color: C.white, fontSize: 15, fontWeight: "700", minWidth: 140, textAlign: "center" }}>{selMonthLabel}</Text>
          <TouchableOpacity onPress={() => shiftMonth(1)} disabled={selMonth >= curYM()} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#1b2840", alignItems: "center", justifyContent: "center", opacity: selMonth >= curYM() ? 0.35 : 1 }}>
            <Text style={{ color: C.accent, fontSize: 20, fontWeight: "700" }}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ══════════════ META VIEW ══════════════════════════════ */}
      {diariaView === "meta" && (
        <KeyboardAwareScroll style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 100, gap: 16 }} refreshControl={refreshCtrl} showsVerticalScrollIndicator={false}>

          {/* Tipo de trabalho */}
          <Card>
            <SectionLabel>TIPO DE TRABALHO</SectionLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14, marginHorizontal: -18 }} contentContainerStyle={{ gap: 11, paddingHorizontal: 18, paddingBottom: 4 }}>
              {WORK_TYPES.map(w => {
                const on = w.type === workType;
                return (
                  <TouchableOpacity key={w.type} onPress={() => void saveDiaria({ workType: w.type })}
                    style={{ width: 86, alignItems: "center", gap: 11, paddingVertical: 15, paddingHorizontal: 8, borderRadius: 18, borderWidth: 1.5,
                      backgroundColor: on ? C.accentBg : "#0d1626",
                      borderColor: on ? C.accentBorder : "rgba(148,163,184,0.10)" }}>
                    <View style={{ width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center",
                      backgroundColor: on ? C.accentBg : "rgba(148,163,184,0.08)" }}>
                      <Text style={{ fontSize: 22 }}>{w.emoji}</Text>
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: on ? "700" : "600", color: on ? C.accent : C.slate, textAlign: "center" }}>{w.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Card>

          {/* Dias trabalhados */}
          <Card style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontSize: 15, fontWeight: "600" }}>Dias trabalhados</Text>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                {workDaysList.length > 0 ? `dias ${workDaysList.slice(0, 5).join(", ")}${workDaysList.length > 5 ? "…" : ""}` : "por mês"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <TouchableOpacity onPress={openWorkDaysModal}
                style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 18 }}>📅</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void saveDiaria({ workDays: Math.max(1, workDays - 1), workDaysList: [] })}
                style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "#0d1626", borderWidth: 1, borderColor: "rgba(148,163,184,0.12)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: C.slate, fontSize: 22, fontWeight: "700", lineHeight: 28 }}>−</Text>
              </TouchableOpacity>
              <Text style={{ color: C.white, fontSize: 22, fontWeight: "800", minWidth: 34, textAlign: "center" }}>{workDays}</Text>
              <TouchableOpacity onPress={() => void saveDiaria({ workDays: Math.min(31, workDays + 1), workDaysList: [] })}
                style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: C.accent, fontSize: 22, fontWeight: "700", lineHeight: 28 }}>+</Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* Contas fixas */}
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4 }}>
              <SectionLabel>CONTAS FIXAS MENSAIS</SectionLabel>
              <TouchableOpacity onPress={() => openAddExp()}>
                <Text style={{ color: C.accent, fontSize: 13, fontWeight: "700" }}>+ Adicionar</Text>
              </TouchableOpacity>
            </View>
            {diariaExpenses.length === 0 ? (
              <TouchableOpacity onPress={() => openAddExp()}
                style={{ backgroundColor: C.card, borderRadius: 22, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(148,163,184,0.20)", alignItems: "center", paddingVertical: 22 }}>
                <Text style={{ color: C.dim, fontSize: 13 }}>Adicione suas contas fixas (aluguel, luz, água…)</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ backgroundColor: C.card, borderRadius: 22, borderWidth: 1, borderColor: C.cardBorder, paddingHorizontal: 18, paddingTop: 6 }}>
                {diariaExpenses.map((e) => (
                  <TouchableOpacity key={e.id} onPress={() => openAddExp(e)}
                    style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderColor: "rgba(148,163,184,0.07)" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: C.red }} />
                      <Text style={{ color: C.text, fontSize: 15, fontWeight: "500" }}>{e.name}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                      <Text style={{ color: C.red, fontSize: 15, fontWeight: "700" }}>{fmt(e.amountCents)}</Text>
                      <TouchableOpacity onPress={() => void deleteExp(e.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={{ color: C.dim, fontSize: 18 }}>×</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 }}>
                  <Text style={{ color: C.slate, fontSize: 14, fontWeight: "600" }}>Total fixo</Text>
                  <Text style={{ color: C.red, fontSize: 16, fontWeight: "800" }}>{fmt(totalFixedCents)}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Meta líquida */}
          <View style={{ gap: 10 }}>
            <SectionLabel>META LÍQUIDA</SectionLabel>
            <View style={{ backgroundColor: C.greenCard, borderRadius: 22, borderWidth: 1, borderColor: C.greenBorder, padding: 18 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 12 }}>
                <View style={{ width: 26, height: 26, borderRadius: 9, backgroundColor: C.greenBg, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 14 }}>💰</Text>
                </View>
                <Text style={{ color: "#cbd5e1", fontSize: 13, fontWeight: "600" }}>Quero ficar com (líquido)/mês</Text>
              </View>
              <PrefixInput
                prefix="R$" prefixColor={C.green}
                value={liquidInput}
                placeholder="0,00"
                onChange={v => {
                  setLiquidInput(fmtBRL(v));
                  void saveDiaria({ liquidMeta: parseCents(v) });
                }}
              />
              <Text style={{ color: C.dim, fontSize: 12, marginTop: 8 }}>O que sobra livre depois de pagar tudo</Text>
            </View>
          </View>

          {/* Custos de operação */}
          {wt.hasFuel && (
            <View style={{ gap: 10 }}>
              <SectionLabel>CUSTOS DE OPERAÇÃO</SectionLabel>
              <Card style={{ gap: 16 }}>
                <View>
                  <Text style={{ color: C.slate, fontSize: 13, fontWeight: "500", marginBottom: 8 }}>Combustível estimado/mês</Text>
                  <PrefixInput
                    prefix="R$" value={fuelInput} placeholder="0,00"
                    onChange={v => { setFuelInput(fmtBRL(v)); void saveDiaria({ fuelCents: parseCents(v) }); }}
                  />
                </View>
                <View>
                  <Text style={{ color: C.slate, fontSize: 13, fontWeight: "500", marginBottom: 8 }}>Reserva manutenção/mês</Text>
                  <PrefixInput
                    prefix="R$" value={maintInput} placeholder="0,00"
                    onChange={v => { setMaintInput(fmtBRL(v)); void saveDiaria({ maintenanceCents: parseCents(v) }); }}
                  />
                  <Text style={{ color: C.dim, fontSize: 12, marginTop: 7 }}>
                    Recomendado: R${Math.round(totalMonthly * 0.1 / 100)},00 – {Math.round(totalMonthly * 0.15 / 100)},00/mês (10–15%)
                  </Text>
                </View>
                {wt.hasPlatform && (
                  <View style={{ gap: 9 }}>
                    <Text style={{ color: C.slate, fontSize: 13, fontWeight: "500" }}>Comissão da plataforma (%)</Text>
                    <View style={{ flexDirection: "row", gap: 7 }}>
                      {[0, 20, 25, 27, 30].map(pct => {
                        const on = pct === platformCutPct;
                        return (
                          <TouchableOpacity key={pct} onPress={() => void saveDiaria({ platformCutPct: pct })}
                            style={{ flex: 1, alignItems: "center", paddingVertical: 11, borderRadius: 12, borderWidth: 1.5,
                              backgroundColor: on ? C.accentBg : C.inputBg,
                              borderColor: on ? C.accentBorder : "rgba(148,163,184,0.10)" }}>
                            <Text style={{ color: on ? C.accent : C.muted, fontSize: 13, fontWeight: "700" }}>
                              {pct === 0 ? "Nenhuma" : `${pct}%`}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {/* Custom % */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: C.inputBg, borderWidth: 1, borderColor: "rgba(148,163,184,0.12)", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13 }}>
                        <TextInput
                          style={{ flex: 1, color: C.white, fontSize: 16, fontWeight: "700", padding: 0 }}
                          placeholder="Outro %"
                          placeholderTextColor={C.dim}
                          keyboardType="numeric"
                          value={![0, 20, 25, 27, 30].includes(platformCutPct) ? String(platformCutPct) : ""}
                          onChangeText={v => {
                            const n = Math.min(99, parseInt(v.replace(/\D/g, "") || "0", 10));
                            void saveDiaria({ platformCutPct: n });
                          }}
                        />
                        <Text style={{ color: C.muted, fontSize: 14, fontWeight: "700" }}>%</Text>
                      </View>
                    </View>
                  </View>
                )}
              </Card>
            </View>
          )}

          {/* Hero — SUA META DIÁRIA */}
          {totalMonthly > 0 && (
            <View style={{ backgroundColor: C.hero, borderRadius: 24, borderWidth: 1, borderColor: C.heroBorder, padding: 22, overflow: "hidden" }}>
              {/* Glow blob */}
              <View pointerEvents="none" style={{ position: "absolute", top: -60, right: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(59,130,246,0.12)" }} />

              <Text style={{ color: "#93a3bd", fontSize: 11, fontWeight: "800", letterSpacing: 1.6, marginBottom: 10 }}>SUA META DIÁRIA</Text>

              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, marginBottom: 4 }}>
                <Text style={{ color: C.accent, fontSize: 22, fontWeight: "700", marginBottom: 6 }}>R$</Text>
                <Text style={{ color: C.white, fontSize: 46, fontWeight: "800", letterSpacing: -1, lineHeight: 52 }}>
                  {(displayGoal / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <Text style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>por dia de trabalho ({workDays} dias/mês)</Text>

              {/* Breakdown */}
              <View>
                {dailyBills > 0 && <BreakdownRow dot="#3b82f6" label="Contas fixas"   value={`${fmt(Math.round(dailyBills))}/dia`} />}
                {dailyLiquid > 0 && <BreakdownRow dot="#22c55e" label="Meta líquida"  value={`${fmt(Math.round(dailyLiquid))}/dia`} valueColor={C.green} />}
                {dailyFuel > 0 && <BreakdownRow dot="#ef4444"  label="Combustível"   value={`${fmt(Math.round(dailyFuel))}/dia`} />}
                {dailyMaint > 0 && <BreakdownRow dot="#f59e0b" label="Manutenção"    value={`${fmt(Math.round(dailyMaint))}/dia`} />}
                {dailyCut > 0 && <BreakdownRow dot="#fbbf24"   label={`Comissão (${platformCutPct}%)`} value={`${fmt(Math.round(dailyCut))}/dia`} valueColor={C.amber} />}
                {hasAdj && (
                  <BreakdownRow
                    dot={dailyDiff > 0 ? "#f59e0b" : "#22c55e"}
                    label={dailyDiff > 0 ? "⚠ Ajuste (meta não batida)" : "✓ Ajuste (dias acima)"}
                    value={`${dailyDiff > 0 ? "+" : "−"}${fmt(Math.abs(dailyDiff))}/dia`}
                    valueColor={dailyDiff > 0 ? "#f59e0b" : C.green}
                  />
                )}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 14, paddingBottom: 2 }}>
                  <Text style={{ color: C.accent, fontSize: 15, fontWeight: "800" }}>Precisa faturar</Text>
                  <Text style={{ color: C.accent, fontSize: 15, fontWeight: "800" }}>{fmt(displayGoal)}/dia</Text>
                </View>
              </View>

              {/* Resumo mensal */}
              <View style={{ marginTop: 16, padding: 16, backgroundColor: C.innerCard, borderWidth: 1, borderColor: "rgba(148,163,184,0.07)", borderRadius: 16 }}>
                <Text style={{ color: C.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.4, marginBottom: 10 }}>RESUMO MENSAL</Text>
                <ResumoRow label="Faturamento bruto"        value={fmt(grossMonth)} />
                {platformMonth > 0 && <ResumoRow label="− Comissão plataforma"     value={`−${fmt(platformMonth)}`} valueColor={C.amber} />}
                {oper > 0 && <ResumoRow label="− Combustível + manutenção" value={`−${fmt(oper)}`}         valueColor={C.red} />}
                {totalFixedCents > 0 && <ResumoRow label="− Contas fixas"           value={`−${fmt(totalFixedCents)}`} valueColor={C.red} />}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12, paddingBottom: 2 }}>
                  <Text style={{ color: C.green, fontSize: 14, fontWeight: "800" }}>Fica líquido</Text>
                  <Text style={{ color: C.green, fontSize: 14, fontWeight: "800" }}>{fmt(liquidMeta)}</Text>
                </View>
              </View>
            </View>
          )}

          {totalMonthly === 0 && (
            <View style={s.emptyCard}>
              <Text style={{ fontSize: 36, marginBottom: 10 }}>💰</Text>
              <Text style={s.emptyTitle}>Configure seu perfil</Text>
              <Text style={s.emptyTxt}>Adicione suas contas fixas acima para ver a meta diária.</Text>
            </View>
          )}
        </KeyboardAwareScroll>
      )}

      {/* ══════════════ REGISTRO VIEW ══════════════════════════ */}
      {diariaView === "registro" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 100, gap: 16 }} refreshControl={refreshCtrl} showsVerticalScrollIndicator={false}>

          {/* GANHOU NO MÊS */}
          {monthlyGoal > 0 && (
            <View style={{ backgroundColor: C.hero, borderRadius: 24, borderWidth: 1, borderColor: C.heroBorder, padding: 22 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <View>
                  <Text style={{ color: "#93a3bd", fontSize: 11, fontWeight: "800", letterSpacing: 1.4 }}>GANHOU NO MÊS</Text>
                  <Text style={{ color: totalEarned >= monthlyGoal ? C.green : C.accent, fontSize: 32, fontWeight: "800", letterSpacing: -1, marginTop: 6 }}>
                    {fmt(totalEarned)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: C.muted, fontSize: 12 }}>Meta mensal</Text>
                  <Text style={{ color: C.text, fontSize: 15, fontWeight: "700", marginTop: 4 }}>{fmt(monthlyGoal)}</Text>
                </View>
              </View>
              {/* Progress bar */}
              <View style={{ height: 11, borderRadius: 99, backgroundColor: "rgba(7,12,22,0.7)", overflow: "hidden" }}>
                <View style={{ height: "100%", width: `${Math.min(100, Math.round(monthlyGoal > 0 ? totalEarned / monthlyGoal * 100 : 0))}%`, backgroundColor: totalEarned >= monthlyGoal ? C.green : C.accent, borderRadius: 99 }} />
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
                <Text style={{ color: C.muted, fontSize: 12 }}>{daysLogged} dias registrados</Text>
                <Text style={{ color: totalEarned >= monthlyGoal ? C.green : C.accent, fontSize: 12, fontWeight: "700" }}>
                  {monthlyGoal > 0 ? `${Math.round((totalEarned / monthlyGoal) * 100)}%` : "—"}
                </Text>
              </View>
            </View>
          )}

          {/* Stats row */}
          {daysLogged > 0 && (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.cardBorder, padding: 16, alignItems: "center", gap: 5 }}>
                <Text style={{ color: C.muted, fontSize: 12 }}>Média/dia</Text>
                <Text style={{ color: C.amber, fontSize: 19, fontWeight: "800" }}>{fmt(avgEarned)}</Text>
                <Text style={{ color: C.dim, fontSize: 11 }}>meta: {fmt(Math.round(dailyGross))}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.cardBorder, padding: 16, alignItems: "center", gap: 5 }}>
                <Text style={{ color: C.muted, fontSize: 12 }}>Falta para meta</Text>
                <Text style={{ color: totalEarned >= monthlyGoal ? C.green : C.red, fontSize: 19, fontWeight: "800" }}>
                  {totalEarned >= monthlyGoal ? "Atingida!" : fmt(monthlyGoal - totalEarned)}
                </Text>
                <Text style={{ color: C.dim, fontSize: 11 }}>{remainingDays} dias restantes</Text>
              </View>
            </View>
          )}

          {/* Hoje */}
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ color: C.muted, fontSize: 13, fontWeight: "600" }}>Hoje</Text>
                {todayLog
                  ? <Text style={{ color: todayLog.earnedCents >= displayGoal ? C.green : C.amber, fontSize: 22, fontWeight: "800", marginTop: 4 }}>
                      {fmt(todayLog.earnedCents)}
                    </Text>
                  : <Text style={{ color: C.dim, fontSize: 13, marginTop: 4 }}>Não registrado ainda</Text>
                }
              </View>
              <TouchableOpacity onPress={() => openLogModal()}
                style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder }}>
                <Text style={{ color: C.accent, fontSize: 13, fontWeight: "700" }}>
                  {todayLog ? "Editar" : "+ Registrar"}
                </Text>
              </TouchableOpacity>
            </View>
            {todayLog && dailyGross > 0 && (() => {
              const hit = todayLog.earnedCents >= displayGoal;
              const pct = Math.min(100, Math.round((todayLog.earnedCents / displayGoal) * 100));
              return (
                <View style={{ marginTop: 14, gap: 8 }}>
                  <View style={{ height: 7, borderRadius: 99, backgroundColor: C.inputBg, overflow: "hidden" }}>
                    <View style={{ height: "100%", width: `${pct}%`, backgroundColor: hit ? C.green : C.amber, borderRadius: 99 }} />
                  </View>
                  <Text style={{ color: C.muted, fontSize: 12 }}>
                    {hit
                      ? `Bateu a meta! + ${fmt(todayLog.earnedCents - displayGoal)} acima`
                      : `Faltam ${fmt(displayGoal - todayLog.earnedCents)} para bater a meta`}
                  </Text>
                </View>
              );
            })()}
          </Card>

          {/* Histórico */}
          {daysLogged === 0 ? (
            <View style={s.emptyCard}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>📅</Text>
              <Text style={s.emptyTitle}>Nenhum dia registrado</Text>
              <Text style={s.emptyTxt}>Registre quanto ganhou hoje para acompanhar o mês.</Text>
              <TouchableOpacity onPress={openAddLogModal}
                style={{ marginTop: 14, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12, backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder }}>
                <Text style={{ color: C.accent, fontSize: 13, fontWeight: "700" }}>+ Adicionar dia</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ backgroundColor: C.card, borderRadius: 22, borderWidth: 1, borderColor: C.cardBorder, paddingHorizontal: 18, paddingTop: 6, paddingBottom: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 }}>
                <Text style={{ color: C.muted, fontSize: 13, fontWeight: "600" }}>Histórico do mês</Text>
                <TouchableOpacity onPress={openAddLogModal}
                  style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder }}>
                  <Text style={{ color: C.accent, fontSize: 12, fontWeight: "700" }}>+ Adicionar dia</Text>
                </TouchableOpacity>
              </View>
              {diariaLogs.map((log, i) => {
                const isToday = log.date === todayISO();
                const [, m, d] = log.date.split("-");
                const dateLabel = `${d}/${m}` + (isToday ? " (hoje)" : "");
                const hit  = dailyGross > 0 && log.earnedCents >= Math.round(dailyGross);
                const diff = log.earnedCents - Math.round(dailyGross);
                return (
                  <View key={log.date} style={{ flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 12, borderBottomWidth: i < diariaLogs.length - 1 ? 1 : 0, borderColor: "rgba(148,163,184,0.07)" }}>
                    <View style={{ width: 9, height: 9, borderRadius: 99, backgroundColor: hit ? C.green : "#f59e0b" }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.text, fontSize: 14, fontWeight: "600" }}>{dateLabel}</Text>
                      {dailyGross > 0 && (
                        <Text style={{ color: hit ? "rgba(74,222,128,0.6)" : "rgba(251,191,36,0.6)", fontSize: 11, marginTop: 2 }}>
                          {hit ? `+${fmt(diff)} acima da meta` : `${fmt(Math.abs(diff))} abaixo da meta`}
                        </Text>
                      )}
                    </View>
                    <Text style={{ color: hit ? C.green : C.amber, fontSize: 15, fontWeight: "800" }}>{fmt(log.earnedCents)}</Text>
                    <TouchableOpacity onPress={() => openLogModal(log.date)} style={{ padding: 4 }}>
                      <Text style={{ color: C.dim, fontSize: 12 }}>✎</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => void deleteLog(log.date)} style={{ padding: 4 }}>
                      <Text style={{ color: C.dim, fontSize: 16 }}>×</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* ══════════════ RELATÓRIOS VIEW ═══════════════════════ */}
      {diariaView === "relatorios" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 100, gap: 16 }} refreshControl={refreshCtrl} showsVerticalScrollIndicator={false}>

          {/* Summary hero */}
          <View style={{ backgroundColor: C.hero, borderRadius: 24, borderWidth: 1, borderColor: C.heroBorder, padding: 22 }}>
            <Text style={{ color: "#93a3bd", fontSize: 11, fontWeight: "800", letterSpacing: 1.6, marginBottom: 14 }}>RESUMO DO MÊS</Text>

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
              <View style={{ flex: 1, backgroundColor: C.innerCard, borderRadius: 16, padding: 14, gap: 4 }}>
                <Text style={{ color: C.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>ACUMULADO</Text>
                <Text style={{ color: C.green, fontSize: 22, fontWeight: "800" }}>{fmt(totalEarned)}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: C.innerCard, borderRadius: 16, padding: 14, gap: 4 }}>
                <Text style={{ color: C.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>META MÊS</Text>
                <Text style={{ color: C.accent, fontSize: 22, fontWeight: "800" }}>{grossMonth > 0 ? fmt(grossMonth) : "—"}</Text>
              </View>
            </View>

            {grossMonth > 0 && (
              <>
                <View style={{ backgroundColor: C.innerCard, borderRadius: 14, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <Text style={{ color: C.slate, fontSize: 13, fontWeight: "600" }}>Diferença acumulada</Text>
                  <Text style={{ color: totalEarned >= grossMonth ? C.green : C.red, fontSize: 15, fontWeight: "800" }}>
                    {totalEarned >= grossMonth ? "+" : ""}{fmt(totalEarned - grossMonth)}
                  </Text>
                </View>
                <View style={{ height: 10, borderRadius: 99, backgroundColor: "rgba(7,12,22,0.7)", overflow: "hidden", marginBottom: 8 }}>
                  <View style={{ height: "100%", width: `${Math.min(100, Math.round(totalEarned / grossMonth * 100))}%`, backgroundColor: totalEarned >= grossMonth ? C.green : C.accent, borderRadius: 99 }} />
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: C.muted, fontSize: 12 }}>{daysLogged} dias registrados</Text>
                  <Text style={{ color: totalEarned >= grossMonth ? C.green : C.accent, fontSize: 12, fontWeight: "700" }}>
                    {Math.round(totalEarned / grossMonth * 100)}%
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Meta ajustada */}
          {(() => {
            if (grossMonth <= 0 || dailyGross <= 0) return null;
            const todayDay = new Date().getDate();
            const remainingDays = workDaysList.length > 0
              ? workDaysList.filter(d => d > todayDay).length
              : Math.max(0, workDays - daysLogged);
            if (remainingDays <= 0) return null;
            const falta = Math.max(0, grossMonth - totalEarned);
            if (falta <= 0) return null;
            const metaAjustada = Math.ceil(falta / remainingDays);
            const acima = metaAjustada > Math.round(dailyGross);
            return (
              <View style={{ backgroundColor: acima ? "rgba(239,68,68,0.08)" : "rgba(74,222,128,0.08)", borderRadius: 20, borderWidth: 1, borderColor: acima ? "rgba(239,68,68,0.25)" : "rgba(74,222,128,0.25)", padding: 18, gap: 8 }}>
                <Text style={{ color: acima ? C.red : C.green, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 }}>META AJUSTADA</Text>
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
                  <Text style={{ color: acima ? C.red : C.green, fontSize: 28, fontWeight: "800", lineHeight: 32 }}>{fmt(metaAjustada)}</Text>
                  <Text style={{ color: acima ? "rgba(239,68,68,0.7)" : "rgba(74,222,128,0.7)", fontSize: 13, fontWeight: "600", marginBottom: 2 }}>/dia</Text>
                </View>
                <Text style={{ color: C.muted, fontSize: 12 }}>
                  para fechar o mês na meta nos próximos <Text style={{ color: C.text, fontWeight: "700" }}>{remainingDays} dias</Text> de trabalho
                </Text>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 2 }}>
                  <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 10, padding: 10, alignItems: "center" }}>
                    <Text style={{ color: C.muted, fontSize: 10, fontWeight: "700" }}>FALTA GANHAR</Text>
                    <Text style={{ color: C.text, fontSize: 14, fontWeight: "800", marginTop: 2 }}>{fmt(falta)}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 10, padding: 10, alignItems: "center" }}>
                    <Text style={{ color: C.muted, fontSize: 10, fontWeight: "700" }}>META ORIGINAL</Text>
                    <Text style={{ color: C.dim, fontSize: 14, fontWeight: "800", marginTop: 2 }}>{fmt(Math.round(dailyGross))}/dia</Text>
                  </View>
                </View>
              </View>
            );
          })()}

          {/* Média vs Meta stat cards */}
          {daysLogged > 0 && (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.cardBorder, padding: 16, alignItems: "center", gap: 5 }}>
                <Text style={{ color: C.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>MÉDIA/DIA</Text>
                <Text style={{ color: C.amber, fontSize: 18, fontWeight: "800" }}>{fmt(avgEarned)}</Text>
                {dailyGross > 0 && (
                  <Text style={{ color: avgEarned >= Math.round(dailyGross) ? C.green : C.red, fontSize: 11, fontWeight: "600" }}>
                    {avgEarned >= Math.round(dailyGross) ? "↑ acima" : "↓ abaixo"} da meta
                  </Text>
                )}
              </View>
              {dailyGross > 0 && (
                <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.cardBorder, padding: 16, alignItems: "center", gap: 5 }}>
                  <Text style={{ color: C.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>META/DIA</Text>
                  <Text style={{ color: C.accent, fontSize: 18, fontWeight: "800" }}>{fmt(Math.round(dailyGross))}</Text>
                  <Text style={{ color: C.dim, fontSize: 11 }}>bruto esperado</Text>
                </View>
              )}
            </View>
          )}

          {/* Per-day breakdown table — projeção */}
          {workDaysList.length === 0 && diariaLogs.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>📊</Text>
              <Text style={s.emptyTitle}>Sem registros</Text>
              <Text style={s.emptyTxt}>Registre seus ganhos na aba Registro ou selecione os dias de trabalho para ver a projeção.</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: C.card, borderRadius: 22, borderWidth: 1, borderColor: C.cardBorder, overflow: "hidden" }}>
              {/* header */}
              <View style={{ flexDirection: "row", paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderColor: "rgba(148,163,184,0.12)" }}>
                <Text style={{ flex: 1, color: C.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.6 }}>DIA</Text>
                <Text style={{ flex: 1.2, color: C.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.6, textAlign: "right" }}>META</Text>
                <Text style={{ flex: 1.2, color: C.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.6, textAlign: "right" }}>PREVISÃO</Text>
                <Text style={{ flex: 1.2, color: C.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.6, textAlign: "right" }}>REALIZADO</Text>
                <Text style={{ flex: 1, color: C.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.6, textAlign: "right" }}>DIFER.</Text>
              </View>
              {(() => {
                const ym = selMonth;
                const todayDay = new Date().getDate();
                const metaDay = Math.round(dailyGross);

                // Monta lista de linhas
                type Row = { date: string; earned: number; hasLog: boolean; isProjection: boolean };
                let rows: Row[] = [];

                if (workDaysList.length > 0) {
                  rows = workDaysList.map(dayNum => {
                    const dateStr = `${ym}-${String(dayNum).padStart(2, "0")}`;
                    const log = diariaLogs.find(l => l.date === dateStr);
                    return {
                      date: dateStr,
                      earned: log?.earnedCents ?? 0,
                      hasLog: log !== undefined,
                      isProjection: dayNum > todayDay,
                    };
                  });
                } else {
                  rows = [...diariaLogs]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map(log => ({ date: log.date, earned: log.earnedCents, hasLog: true, isProjection: false }));
                }

                let running = 0;
                return rows.map((row, i) => {
                  running += metaDay;
                  const [, mm, dd] = row.date.split("-");
                  const isToday = row.date === todayISO();
                  const diff = row.hasLog && metaDay > 0 ? row.earned - metaDay : null;
                  const hit = diff !== null && diff >= 0;
                  return (
                    <View key={row.date} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderColor: "rgba(148,163,184,0.07)", opacity: row.isProjection ? 0.55 : 1 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: isToday ? C.accent : C.text, fontSize: 12, fontWeight: isToday ? "700" : "600" }}>{dd}/{mm}</Text>
                        {isToday && <Text style={{ color: C.accent, fontSize: 8, fontWeight: "800", letterSpacing: 0.5 }}>HOJE</Text>}
                        {row.isProjection && <Text style={{ color: C.muted, fontSize: 8, fontWeight: "700", letterSpacing: 0.5 }}>PROJ.</Text>}
                      </View>
                      <Text style={{ flex: 1.2, color: C.dim, fontSize: 11, fontWeight: "600", textAlign: "right" }}>{metaDay > 0 ? fmt(metaDay) : "—"}</Text>
                      <Text style={{ flex: 1.2, color: C.slate, fontSize: 11, fontWeight: "600", textAlign: "right" }}>{fmt(running)}</Text>
                      <Text style={{ flex: 1.2, color: row.hasLog ? (hit ? C.green : C.amber) : C.dim, fontSize: 12, fontWeight: "700", textAlign: "right" }}>
                        {fmt(row.earned)}
                      </Text>
                      <Text style={{ flex: 1, color: diff === null ? C.dim : hit ? C.green : C.red, fontSize: 11, fontWeight: "700", textAlign: "right" }}>
                        {diff === null ? "—" : `${hit ? "+" : ""}${fmt(diff)}`}
                      </Text>
                    </View>
                  );
                });
              })()}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── MODAL: Dias de trabalho ──────────────────────────── */}
      <Modal visible={workDaysCalModal} transparent animationType="fade" onRequestClose={() => setWorkDaysCalModal(false)}>
        <View style={s.overlay}>
          <View style={[s.modal, { maxHeight: "88%" }]}>
            <Text style={s.modalTitle}>Dias de trabalho</Text>
            <Text style={[s.modalSub, { marginTop: -4 }]}>{monthLabel()} · toque para marcar os dias</Text>

            {/* Cabeçalho semana */}
            <View style={{ flexDirection: "row", marginTop: 4 }}>
              {["D","S","T","Q","Q","S","S"].map((d, i) => (
                <Text key={i} style={{ flex: 1, textAlign: "center", color: C.muted, fontSize: 11, fontWeight: "700" }}>{d}</Text>
              ))}
            </View>

            {/* Grade dos dias */}
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {buildMonthGrid().map((day, i) => {
                const sel = day !== null && selectedDays.includes(day);
                return (
                  <TouchableOpacity
                    key={i}
                    disabled={day === null}
                    onPress={() => day !== null && toggleDay(day)}
                    style={{
                      width: `${100 / 7}%`, aspectRatio: 1,
                      alignItems: "center", justifyContent: "center",
                    }}>
                    {day !== null && (
                      <View style={{
                        width: 34, height: 34, borderRadius: 17,
                        backgroundColor: sel ? C.accent : "transparent",
                        borderWidth: sel ? 0 : 1,
                        borderColor: "rgba(148,163,184,0.15)",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <Text style={{ color: sel ? "#fff" : C.text, fontSize: 13, fontWeight: sel ? "800" : "500" }}>{day}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Ações rápidas */}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => { const t = new Date().getDate(); setSelectedDays(prev => prev.includes(t) ? prev.filter(d => d !== t) : [...prev, t].sort((a,b) => a-b)); }}
                style={{ flex: 1, backgroundColor: "#0d1626", borderRadius: 8, borderWidth: 1, borderColor: "rgba(148,163,184,0.12)", paddingVertical: 7, alignItems: "center" }}>
                <Text style={{ color: C.muted, fontSize: 12, fontWeight: "600" }}>Hoje</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSelectedDays([])}
                style={{ flex: 1, backgroundColor: "#0d1626", borderRadius: 8, borderWidth: 1, borderColor: "rgba(148,163,184,0.12)", paddingVertical: 7, alignItems: "center" }}>
                <Text style={{ color: C.muted, fontSize: 12, fontWeight: "600" }}>Limpar</Text>
              </TouchableOpacity>
            </View>

            {/* Separador */}
            <View style={{ height: 1, backgroundColor: "rgba(148,163,184,0.10)", marginVertical: 4 }} />

            {/* Contador manual */}
            <Text style={{ color: C.muted, fontSize: 12, textAlign: "center" }}>
              {selectedDays.length > 0
                ? `${selectedDays.length} dias selecionados`
                : "Ou ajuste o número diretamente:"}
            </Text>
            {selectedDays.length === 0 && (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 }}>
                <TouchableOpacity
                  onPress={() => setTempWorkDays(d => Math.max(1, d - 1))}
                  style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "#0d1626", borderWidth: 1, borderColor: "rgba(148,163,184,0.12)", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: C.slate, fontSize: 22, fontWeight: "700", lineHeight: 28 }}>−</Text>
                </TouchableOpacity>
                <Text style={{ color: C.white, fontSize: 28, fontWeight: "800", minWidth: 40, textAlign: "center" }}>{tempWorkDays}</Text>
                <TouchableOpacity
                  onPress={() => setTempWorkDays(d => Math.min(31, d + 1))}
                  style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: C.accent, fontSize: 22, fontWeight: "700", lineHeight: 28 }}>+</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.btnCancel} onPress={() => setWorkDaysCalModal(false)}>
                <Text style={s.btnCancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnConfirm} onPress={() => void confirmWorkDaysModal()}>
                <Text style={s.btnConfirmTxt}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: Ganho do dia ──────────────────────────────── */}
      <Modal visible={logModal !== null} transparent animationType="fade" onRequestClose={() => setLogModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={s.overlay}>
            <View style={s.modal}>
              <Text style={s.modalTitle}>Ganho do dia</Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                <TouchableOpacity onPress={() => changeLogDate(-1)} style={{ padding: 8, marginLeft: -8 }}>
                  <Text style={{ color: C.accent, fontSize: 24, fontWeight: "700" }}>‹</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ alignItems: "center" }}>
                  <Text style={{ color: C.accent, fontSize: 15, fontWeight: "700", textDecorationLine: "underline" }}>
                    {logModal?.date ? logModal.date.split("-").reverse().slice(0, 2).join("/") : ""}
                  </Text>
                  {dailyGross > 0 && (
                    <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>meta: {fmt(Math.round(dailyGross))}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => changeLogDate(1)}
                  disabled={logModal?.date === todayISO()}
                  style={{ padding: 8, marginRight: -8 }}>
                  <Text style={{ color: logModal?.date === todayISO() ? C.dim : C.accent, fontSize: 24, fontWeight: "700" }}>›</Text>
                </TouchableOpacity>
              </View>
              {showDatePicker && logModal && (
                <DateTimePicker
                  value={new Date(logModal.date + "T12:00:00")}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "calendar"}
                  maximumDate={new Date()}
                  onChange={(_e, selected) => {
                    setShowDatePicker(false);
                    if (!selected) return;
                    const newDate = selected.toISOString().slice(0, 10);
                    const existing = diariaLogs.find(l => l.date === newDate);
                    setLogModal({ date: newDate, current: existing?.earnedCents });
                    setLogVal(existing ? fmtBRL(String(existing.earnedCents)) : "");
                  }}
                />
              )}
              <TextInput style={s.input} placeholder="Quanto você ganhou hoje? (R$)" placeholderTextColor={C.dim} keyboardType="numeric" value={logVal} onChangeText={v => setLogVal(fmtBRL(v))} autoFocus />
              <View style={s.modalBtns}>
                <TouchableOpacity style={s.btnCancel} onPress={() => { setLogModal(null); setLogVal(""); }}>
                  <Text style={s.btnCancelTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnConfirm} onPress={() => void confirmLog()}>
                  <Text style={s.btnConfirmTxt}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL: Conta fixa ────────────────────────────────── */}
      <Modal visible={addExpModal} transparent animationType="fade" onRequestClose={() => setAddExpModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={s.overlay}>
            <View style={s.modal}>
              <Text style={s.modalTitle}>{editExpItem ? "Editar conta" : "Nova conta fixa"}</Text>
              <TextInput style={s.input} placeholder="Nome (ex: Aluguel, Luz, Água…)" placeholderTextColor={C.dim} value={expName} onChangeText={setExpName} autoFocus />
              <TextInput style={s.input} placeholder="Valor mensal (R$)" placeholderTextColor={C.dim} keyboardType="numeric" value={expVal} onChangeText={v => setExpVal(fmtBRL(v))} />
              <View style={s.modalBtns}>
                <TouchableOpacity style={s.btnCancel} onPress={() => setAddExpModal(false)}>
                  <Text style={s.btnCancelTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnConfirm} onPress={() => void confirmAddExp()}>
                  <Text style={s.btnConfirmTxt}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
