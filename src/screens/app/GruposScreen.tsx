import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, ActivityIndicator, Alert, RefreshControl,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import {
  listGroups, createGroup, deleteGroup,
  fetchMembers, addMember, removeMember,
  fetchExpenses, fetchBalances, createExpense, updateExpense, deleteExpense,
  recordSettlement, createPersonalExpense, deletePersonalExpense, fetchPersonalExpenseAmount, cleanupLegacyExpenseType,
} from "../../lib/groupsService";
import { getEmailFromAnySource } from "../../lib/auth";
import { fmt, fetchFinanceItems } from "../../lib/financeService";
import { listBankAccounts } from "../../lib/bankAccountsService";
import type { GroupDto, GroupMember, GroupExpense, GroupMemberBalance, ExpenseParticipantInput } from "../../lib/groupsService";
import Svg, { Circle, Path } from "react-native-svg";
import { setGroupFabAction } from "../../navigation/groupFabAction";
import { useFocusEffect } from "@react-navigation/native";

// ── Types ───────────────────────────────────────────────────────────
type SplitMode = "SALARY" | "MANUAL";
type DetailTab  = "resumo" | "despesas" | "saldos" | "membros";
type ExpTab     = "avulsa" | "casa";

// ── Storage helpers (split config per group) ─────────────────────────
function storageKey(groupId: string, suffix: string) {
  return `conciliaai.g.${groupId}.${suffix}`;
}
async function loadSplitMode(groupId: string): Promise<SplitMode> {
  const v = await SecureStore.getItemAsync(storageKey(groupId, "mode")).catch(() => null);
  return v === "MANUAL" ? "MANUAL" : "SALARY";
}
async function saveSplitMode(groupId: string, mode: SplitMode) {
  await SecureStore.setItemAsync(storageKey(groupId, "mode"), mode).catch(() => {});
}
async function loadSalaries(groupId: string): Promise<Record<string, number>> {
  const raw = await SecureStore.getItemAsync(storageKey(groupId, "sal")).catch(() => null);
  try { return raw ? (JSON.parse(raw) as Record<string, number>) : {}; } catch { return {}; }
}
async function saveSalaries(groupId: string, s: Record<string, number>) {
  await SecureStore.setItemAsync(storageKey(groupId, "sal"), JSON.stringify(s)).catch(() => {});
}
async function loadPercents(groupId: string): Promise<Record<string, number>> {
  const raw = await SecureStore.getItemAsync(storageKey(groupId, "pct")).catch(() => null);
  try { return raw ? (JSON.parse(raw) as Record<string, number>) : {}; } catch { return {}; }
}
async function savePercents(groupId: string, p: Record<string, number>) {
  await SecureStore.setItemAsync(storageKey(groupId, "pct"), JSON.stringify(p)).catch(() => {});
}

// ── Helpers ──────────────────────────────────────────────────────────
const AVATAR_COLORS = ["#3B82F6","#8B5CF6","#F59E0B","#10B981","#EF4444","#EC4899","#14B8A6","#F97316"];

function memberLabel(m: GroupMember) { return m.displayName ?? m.name ?? m.email ?? "Membro"; }
function memberInitials(m: GroupMember) { return memberLabel(m).slice(0, 2).toUpperCase(); }
function avatarColor(idx: number)  { return AVATAR_COLORS[idx % AVATAR_COLORS.length]; }

function fmtDate(iso: string) {
  return iso.slice(0, 10).split("-").reverse().join("/");
}
function monthKey(iso: string) { return iso.slice(0, 7); }
function currentMonthKey() { return new Date().toISOString().slice(0, 7); }
function monthLabelBR(ym: string) {
  const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const [y, m] = ym.split("-");
  return `${MONTHS[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}

function fmtBRL(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (!d) return "";
  return (parseInt(d, 10) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}
function parseCents(brl: string): number {
  return parseInt(brl.replace(/\D/g, "") || "0", 10);
}

// Distributes amountCents proportionally according to weights (0–1), fixing rounding on last member.
function computeParticipants(
  members: GroupMember[],
  weights: Record<string, number>,
  totalCents: number,
): ExpenseParticipantInput[] {
  const active = members.filter(m => (weights[m.userId] ?? 0) > 0);
  if (!active.length) return [];

  let assigned = 0;
  const parts: ExpenseParticipantInput[] = members.map(m => {
    const w = weights[m.userId] ?? 0;
    if (w === 0) return { userId: m.userId, shareCents: 0, isExcluded: true };
    const share = Math.round(totalCents * w);
    assigned += share;
    return { userId: m.userId, shareCents: share, isExcluded: false };
  });

  // Fix rounding difference on the last active member
  const diff = totalCents - assigned;
  if (diff !== 0) {
    const last = parts.slice().reverse().find(p => !p.isExcluded);
    if (last) last.shareCents += diff;
  }

  return parts;
}

type Settlement = { fromId: string; from: string; toId: string; to: string; cents: number };
function computeSettlements(bal: GroupMemberBalance[]): Settlement[] {
  const creds = bal.filter(b => b.balanceCents > 0).map(b => ({ ...b }));
  const debts = bal.filter(b => b.balanceCents < 0).map(b => ({ ...b }));
  const res: Settlement[] = [];
  let i = 0, j = 0;
  while (i < debts.length && j < creds.length) {
    const d = debts[i], c = creds[j];
    const amt = Math.min(Math.abs(d.balanceCents), c.balanceCents);
    if (amt > 0) res.push({ fromId: d.userId, from: d.name, toId: c.userId, to: c.name, cents: amt });
    d.balanceCents += amt; c.balanceCents -= amt;
    if (d.balanceCents === 0) i++;
    if (c.balanceCents === 0) j++;
  }
  return res;
}

// ── Sub-components ────────────────────────────────────────────────────
function AvatarCircle({ label, idx, size = 44 }: { label: string; idx: number; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 3, backgroundColor: avatarColor(idx), alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontSize: size * 0.3, fontWeight: "900" }}>{label.slice(0, 2).toUpperCase()}</Text>
    </View>
  );
}

function SectionLabel({ title }: { title: string }) {
  return <Text style={s.secLabel}>{title}</Text>;
}

const DONUT_SIZE = 204;
const DONUT_RO   = 90;   // outer radius
const DONUT_RI   = 56;   // inner radius
const DONUT_GAP  = 0.045; // gap between slices (radians)

type DonutSlice = { id: string; label: string; amountCents: number; colorIdx: number };

function polar(cx: number, cy: number, r: number, a: number) {
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function arcPath(cx: number, cy: number, ro: number, ri: number, sa: number, ea: number) {
  const os = polar(cx, cy, ro, sa), oe = polar(cx, cy, ro, ea);
  const is = polar(cx, cy, ri, ea), ie = polar(cx, cy, ri, sa);
  const lg = ea - sa > Math.PI ? 1 : 0;
  return `M${os.x} ${os.y} A${ro} ${ro} 0 ${lg} 1 ${oe.x} ${oe.y} L${is.x} ${is.y} A${ri} ${ri} 0 ${lg} 0 ${ie.x} ${ie.y}Z`;
}

function DonutChart({ slices, total, selectedId, onSelect }: {
  slices: DonutSlice[];
  total: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!total || slices.length === 0) return null;

  const cx = DONUT_SIZE / 2, cy = DONUT_SIZE / 2;
  const hasSel = selectedId !== null;
  const sel    = slices.find(s => s.id === selectedId) ?? null;

  let angle = -Math.PI / 2;
  const paths = slices.map(sl => {
    const span = (sl.amountCents / total) * 2 * Math.PI;
    const isSel = sl.id === selectedId;
    const sa = angle + DONUT_GAP / 2;
    const ea = angle + span - DONUT_GAP / 2;
    angle += span;
    const ro = isSel ? DONUT_RO + 8 : DONUT_RO;
    return { ...sl, sa, ea, isSel, ro };
  });

  return (
    <View style={{ alignItems: "center", gap: 14 }}>
      {/* SVG donut — each Path is its own touch target */}
      <View style={{ width: DONUT_SIZE, height: DONUT_SIZE }}>
        <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
          {/* Track */}
          <Circle cx={cx} cy={cy} r={(DONUT_RO + DONUT_RI) / 2}
            fill="none" stroke="#162032" strokeWidth={DONUT_RO - DONUT_RI} />
          {paths.map(p => (
            <Path
              key={p.id}
              d={arcPath(cx, cy, p.ro, DONUT_RI, p.sa, p.ea)}
              fill={avatarColor(p.colorIdx)}
              opacity={hasSel && !p.isSel ? 0.15 : 1}
              onPress={() => onSelect(p.isSel ? null : p.id)}
            />
          ))}
        </Svg>
        {/* Center */}
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          {sel ? (
            <>
              <Text style={{ color: avatarColor(sel.colorIdx), fontSize: 17, fontWeight: "900" }}>{fmt(sel.amountCents)}</Text>
              <Text style={{ color: "#64748B", fontSize: 9, marginTop: 3, maxWidth: DONUT_RI * 1.7, textAlign: "center" }} numberOfLines={2}>
                {sel.label}
              </Text>
            </>
          ) : (
            <>
              <Text style={{ color: "#F1F5F9", fontSize: 18, fontWeight: "900" }}>{fmt(total)}</Text>
              <Text style={{ color: "#475569", fontSize: 10, marginTop: 2 }}>total mês</Text>
            </>
          )}
        </View>
      </View>

      {/* Compact dot legend — always visible */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        {slices.map(sl => {
          const isSel = sl.id === selectedId;
          return (
            <TouchableOpacity key={sl.id} activeOpacity={0.75}
              onPress={() => onSelect(isSel ? null : sl.id)}
              style={{
                width: 22, height: 22, borderRadius: 11,
                backgroundColor: avatarColor(sl.colorIdx),
                opacity: hasSel && !isSel ? 0.22 : 1,
                borderWidth: isSel ? 3 : 0,
                borderColor: "#fff",
              }}
            />
          );
        })}
      </View>

      {/* Expand toggle */}
      <TouchableOpacity onPress={() => setExpanded(v => !v)}
        style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 2 }}>
        <Text style={{ color: "#475569", fontSize: 11, fontWeight: "700" }}>
          {expanded ? "Ocultar lista" : "Ver lista de despesas"}
        </Text>
        <Text style={{ color: "#475569", fontSize: 10 }}>{expanded ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {/* Expanded list */}
      {expanded && (
        <View style={{ width: "100%", gap: 5 }}>
          {slices.map(sl => {
            const isSel = sl.id === selectedId;
            return (
              <TouchableOpacity key={sl.id} activeOpacity={0.75}
                onPress={() => onSelect(isSel ? null : sl.id)}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 9,
                  padding: 10, borderRadius: 11,
                  backgroundColor: isSel ? avatarColor(sl.colorIdx) + "1A" : "#0F172A",
                  borderWidth: 1, borderColor: isSel ? avatarColor(sl.colorIdx) + "88" : "transparent",
                  opacity: hasSel && !isSel ? 0.38 : 1,
                }}
              >
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: avatarColor(sl.colorIdx) }} />
                <Text style={{ color: "#CBD5E1", fontSize: 12, flex: 1, fontWeight: "600" }} numberOfLines={1}>{sl.label}</Text>
                <Text style={{ color: "#F1F5F9", fontSize: 13, fontWeight: "800" }}>{fmt(sl.amountCents)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function ModalSheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function TabBar<T extends string>({ tabs, active, onChange }: {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (t: T) => void;
}) {
  return (
    <View style={s.tabRow}>
      {tabs.map(t => (
        <TouchableOpacity key={t.key} style={[s.tabBtn, active === t.key && s.tabBtnA]} onPress={() => onChange(t.key)}>
          <Text style={[s.tabTxt, active === t.key && s.tabTxtA]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────────
export default function GruposScreen() {
  // ── Groups list ──────────────────────────────────────────────────
  const [groups,     setGroups]     = useState<GroupDto[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Selected group ───────────────────────────────────────────────
  const [selected,   setSelected]   = useState<GroupDto | null>(null);
  const [detailTab,  setDetailTab]  = useState<DetailTab>("resumo");
  const [members,    setMembers]    = useState<GroupMember[]>([]);
  const [expenses,   setExpenses]   = useState<GroupExpense[]>([]);
  const [balances,   setBalances]   = useState<GroupMemberBalance[]>([]);
  const [detailLoad, setDetailLoad] = useState(false);

  // ── Current user in group context ────────────────────────────────
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [primaryAccountId,   setPrimaryAccountId]   = useState<string | null>(null);
  const [primaryAccountName, setPrimaryAccountName] = useState<string | null>(null);
  const [myPaidAccountName,  setMyPaidAccountName]  = useState<string | null>(null);

  // ── Donut selection ─────────────────────────────────────────────
  const [selectedDonutId, setSelectedDonutId] = useState<string | null>(null);

  // ── Split config ─────────────────────────────────────────────────
  const [splitMode,  setSplitMode]  = useState<SplitMode>("SALARY");
  const [salaries,   setSalaries]   = useState<Record<string, number>>({});
  const [percents,   setPercents]   = useState<Record<string, number>>({});

  // ── Modals ───────────────────────────────────────────────────────
  const [showCreate,     setShowCreate]     = useState(false);
  const [newGroupName,   setNewGroupName]   = useState("");
  const [creatingGroup,  setCreatingGroup]  = useState(false);

  const [showExp,       setShowExp]       = useState(false);
  const [editingExp,    setEditingExp]    = useState<GroupExpense | null>(null);
  const [expTab,        setExpTab]        = useState<ExpTab>("avulsa");
  const [expDesc,       setExpDesc]       = useState("");
  const [expHouseName,  setExpHouseName]  = useState("");
  const [expAmount,     setExpAmount]     = useState("");
  const [expDate,       setExpDate]       = useState(new Date().toISOString().slice(0, 10));
  const [expPaidBy,     setExpPaidBy]     = useState("");
  const [savingExp,     setSavingExp]     = useState(false);

  const [showBase,      setShowBase]      = useState(false);
  const [confirmPay,    setConfirmPay]    = useState<{ title?: string; label: string; confirmLabel?: string; danger?: boolean; onConfirm: () => Promise<void> } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  // expenseId created when creditor confirms payment — persisted to avoid double payment
  const [myPaidExpenseId,    setMyPaidExpenseId]    = useState<string | null>(null);
  const [myPaidAmountCents,  setMyPaidAmountCents]  = useState<number | null>(null);
  const [editSalaries,  setEditSalaries]  = useState<Record<string, string>>({});
  const [editPercents,  setEditPercents]  = useState<Record<string, string>>({});
  const [savingBase,    setSavingBase]    = useState(false);

  const [showAddMem,    setShowAddMem]    = useState(false);
  const [memEmail,      setMemEmail]      = useState("");
  const [memDisplayName,setMemDisplayName]= useState("");
  const [addingMem,     setAddingMem]     = useState(false);

  const [showInvite,    setShowInvite]    = useState(false);
  const [inviteCode,    setInviteCode]    = useState("");
  const [joiningInvite, setJoiningInvite] = useState(false);

  // ── Load groups ──────────────────────────────────────────────────
  const loadGroups = useCallback(async (quiet = false) => {
    if (!quiet) setLoadingGroups(true); else setRefreshing(true);
    try { setGroups(await listGroups()); }
    catch (e) { Alert.alert("Erro", e instanceof Error ? e.message : "Erro ao carregar grupos."); }
    finally { setLoadingGroups(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    void loadGroups();
    void listBankAccounts().then(accs => {
      const first = accs.find(a => a.accountType !== "credito") ?? accs[0];
      if (first) { setPrimaryAccountId(first.id); setPrimaryAccountName(first.nick || first.bank); }
    });
    // One-time cleanup: delete legacy finance items with type "expense"/"income" (lowercase)
    // created during early testing before type was normalized to "DESPESA"/"RECEITA"
    void SecureStore.getItemAsync("conciliaai.cleanup.legacyType.v1").then(done => {
      if (done) return;
      void cleanupLegacyExpenseType().then(n => {
        if (n >= 0) void SecureStore.setItemAsync("conciliaai.cleanup.legacyType.v1", "1");
      });
    });
  }, []);

  // Register FAB action while inside a group detail; clear when back to list
  useEffect(() => {
    if (selected) {
      setGroupFabAction(() => openCreateExp());
    } else {
      setGroupFabAction(null);
    }
    return () => { setGroupFabAction(null); };
  }, [selected, myUserId, members]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear FAB when navigating away from this tab (tabs stay mounted in React Navigation)
  useFocusEffect(useCallback(() => {
    return () => { setGroupFabAction(null); };
  }, []));

  // ── Load detail ──────────────────────────────────────────────────
  const loadDetail = useCallback(async (g: GroupDto) => {
    setDetailLoad(true);
    try {
      const [memRes, expRes, balRes] = await Promise.all([
        fetchMembers(g.id), fetchExpenses(g.id), fetchBalances(g.id),
      ]);
      const mems = memRes.members;
      setMembers(mems);
      setExpenses(expRes.items.sort((a, b) => b.date.localeCompare(a.date)));
      setBalances(balRes.members);
      if (mems.length > 0 && !expPaidBy) setExpPaidBy(mems[0].userId);

      // Identify current user among group members
      const myEmail = await getEmailFromAnySource();
      const me = mems.find(m => m.email?.toLowerCase() === myEmail?.toLowerCase());
      if (me) setMyUserId(me.userId);

      // Load split config from storage, fall back to API salaries
      const [mode, sal, pct] = await Promise.all([
        loadSplitMode(g.id),
        loadSalaries(g.id),
        loadPercents(g.id),
      ]);
      setSplitMode(mode);
      const mergedSal: Record<string, number> = {};
      mems.forEach(m => { mergedSal[m.userId] = sal[m.userId] ?? m.salaryCents ?? 0; });
      setSalaries(mergedSal);
      setPercents(pct);
    } catch { /* ignore */ }
    finally { setDetailLoad(false); }
  }, [expPaidBy]);

  function openGroup(g: GroupDto) {
    setSelected(g); setDetailTab("resumo");
    setMyPaidExpenseId(null); setMyPaidAmountCents(null); setMyPaidAccountName(null);
    void Promise.all([
      SecureStore.getItemAsync(`conciliaai.g.${g.id}.mypaid`),
      SecureStore.getItemAsync(`conciliaai.g.${g.id}.mypacc`),
      SecureStore.getItemAsync(`conciliaai.g.${g.id}.mypaidamt`),
    ]).then(async ([expId, accName, paidAmt]) => {
      if (expId) setMyPaidExpenseId(expId);
      if (accName) setMyPaidAccountName(accName);
      if (paidAmt) {
        setMyPaidAmountCents(parseInt(paidAmt, 10));
      } else if (expId) {
        // Old payment — amount not yet tracked. Search in full finance list.
        const amt = await fetchPersonalExpenseAmount(expId).catch(() => null)
          ?? await fetchFinanceItems().then(items => items.find(i => i.id === expId)?.amountCents ?? null).catch(() => null);
        if (amt !== null) {
          setMyPaidAmountCents(amt);
          await SecureStore.setItemAsync(`conciliaai.g.${g.id}.mypaidamt`, String(amt)).catch(() => {});
        }
      }
    });
    void loadDetail(g);
  }

  function closeDetail() {
    setSelected(null); setMembers([]); setExpenses([]); setBalances([]);
    setSelectedDonutId(null); setMyPaidExpenseId(null); setMyPaidAmountCents(null); setMyPaidAccountName(null);
  }

  // ── Month split calculation ───────────────────────────────────────
  const monthExpenses = useMemo(
    () => expenses.filter(e => monthKey(e.date) === currentMonthKey()),
    [expenses]
  );
  const monthTotal = useMemo(
    () => monthExpenses.reduce((s, e) => s + e.amountCents, 0),
    [monthExpenses]
  );

  const weights = useMemo((): Record<string, number> => {
    if (splitMode === "SALARY") {
      const total = Object.values(salaries).reduce((s, v) => s + v, 0);
      if (!total) return {};
      const w: Record<string, number> = {};
      Object.entries(salaries).forEach(([id, sal]) => { w[id] = sal / total; });
      return w;
    } else {
      const total = Object.values(percents).reduce((s, v) => s + v, 0);
      if (!total) return {};
      const w: Record<string, number> = {};
      Object.entries(percents).forEach(([id, pct]) => { w[id] = pct / 100; });
      return w;
    }
  }, [splitMode, salaries, percents]);

  const monthSplit = useMemo(() => {
    return members.map((m, i) => ({
      member: m,
      idx: i,
      weight: weights[m.userId] ?? 0,
      shouldPay: Math.round(monthTotal * (weights[m.userId] ?? 0)),
    })).sort((a, b) => b.shouldPay - a.shouldPay);
  }, [members, weights, monthTotal]);

  const canCalculate = useMemo(() => {
    if (splitMode === "SALARY") return Object.values(salaries).some(v => v > 0);
    const sum = Object.values(percents).reduce((s, v) => s + v, 0);
    return Math.abs(sum - 100) < 0.5;
  }, [splitMode, salaries, percents]);

  const avgPerPerson = members.length > 0 ? Math.round(monthTotal / members.length) : 0;
  const settlements  = useMemo(() => computeSettlements(balances), [balances]);

  // Donut: one slice per expense in the current month
  const donutSlices = useMemo<DonutSlice[]>(() =>
    monthExpenses.map((exp, i) => ({
      id: exp.id,
      label: exp.description,
      amountCents: exp.amountCents,
      colorIdx: i,
    })),
    [monthExpenses]
  );

  // Expense whose slice is currently selected
  const selectedExpense = useMemo(
    () => selectedDonutId ? monthExpenses.find(e => e.id === selectedDonutId) ?? null : null,
    [selectedDonutId, monthExpenses]
  );

  // ── Create / Delete group ────────────────────────────────────────
  async function handleCreateGroup() {
    if (!newGroupName.trim()) return;
    setCreatingGroup(true);
    try {
      await createGroup(newGroupName.trim());
      setNewGroupName(""); setShowCreate(false);
      await loadGroups(true);
    } catch (e) { Alert.alert("Erro", e instanceof Error ? e.message : "Erro ao criar."); }
    finally { setCreatingGroup(false); }
  }

  async function handleDeleteGroup(g: GroupDto) {
    Alert.alert(`Excluir "${g.name}"?`, "Isso removerá todas as despesas e membros.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: async () => {
        try {
          await deleteGroup(g.id);
          if (selected?.id === g.id) closeDetail();
          await loadGroups(true);
        } catch (e) { Alert.alert("Erro", e instanceof Error ? e.message : "Erro ao excluir."); }
      }},
    ]);
  }

  // ── Expense CRUD ─────────────────────────────────────────────────
  function openCreateExp() {
    setEditingExp(null);
    setExpTab("avulsa"); setExpDesc(""); setExpHouseName("");
    setExpAmount(""); setExpDate(new Date().toISOString().slice(0, 10));
    setExpPaidBy(myUserId ?? members[0]?.userId ?? "");
    setShowExp(true);
  }

  function openEditExp(exp: GroupExpense) {
    setEditingExp(exp);
    setExpTab("avulsa");
    setExpDesc(exp.description);
    setExpAmount(fmtBRL(String(exp.amountCents)));
    setExpDate(exp.date.slice(0, 10));
    setExpPaidBy(exp.paidByUserId);
    setShowExp(true);
  }

  function buildExpDescription(): string {
    if (expTab === "casa") {
      const label = monthLabelBR(currentMonthKey());
      return `${expHouseName.trim()} — ${label}`;
    }
    return expDesc.trim();
  }

  async function handleSaveExp() {
    if (!selected) return;
    const desc  = buildExpDescription();
    const cents = parseCents(expAmount);
    if (!desc) { Alert.alert("Informe a descrição."); return; }
    if (!cents) { Alert.alert("Informe o valor."); return; }
    // For Casa mode the field is hidden — auto-use the current user (launcher)
    const paidBy = expPaidBy || myUserId || members[0]?.userId;
    if (!paidBy) { Alert.alert("Não foi possível identificar o pagador."); return; }

    // Compute participant splits from configured rateio (if set)
    const participants = canCalculate
      ? computeParticipants(members, weights, cents)
      : undefined;

    setSavingExp(true);
    try {
      if (editingExp) {
        await updateExpense(editingExp.id, { description: desc, amountCents: cents, date: expDate + "T00:00:00.000Z", paidByUserId: paidBy, participants });
      } else {
        await createExpense({ groupId: selected.id, description: desc, amountCents: cents, date: expDate + "T00:00:00.000Z", paidByUserId: paidBy, participants });
      }
      setShowExp(false);
      await loadDetail(selected);
    } catch (e) { Alert.alert("Erro", e instanceof Error ? e.message : "Não foi possível salvar."); }
    finally { setSavingExp(false); }
  }

  function handleDeleteExp(exp: GroupExpense) {
    if (!selected) return;
    setConfirmPay({
      title: "Excluir despesa?",
      label: `"${exp.description}" — ${fmt(exp.amountCents)}\n\nEssa ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
      danger: true,
      onConfirm: async () => {
        await deleteExpense(exp.id);
        await loadDetail(selected);
      },
    });
  }

  // ── Mark settlement as paid ──────────────────────────────────────
  function handleMarkPaid(st: Settlement) {
    if (!selected) return;
    setConfirmPay({
      label: `Pagar ${fmt(st.cents)} para ${st.to}?\n\nSerá lançado como saída na sua conta.`,
      onConfirm: async () => {
        await recordSettlement(selected.id, {
          fromUserId: st.fromId, toUserId: st.toId,
          amountCents: st.cents, date: new Date().toISOString(),
        });
        const { id } = await createPersonalExpense({
          title: `Acerto grupo "${selected.name}" → ${st.to}`,
          amountCents: st.cents,
          date: new Date().toISOString().slice(0, 10),
          category: "Transferências",
          accountId: primaryAccountId ?? undefined,
        });
        setMyPaidExpenseId(id);
        setMyPaidAmountCents(st.cents);
        setMyPaidAccountName(primaryAccountName);
        await SecureStore.setItemAsync(`conciliaai.g.${selected.id}.mypaid`, id);
        await SecureStore.setItemAsync(`conciliaai.g.${selected.id}.mypaidamt`, String(st.cents));
        if (primaryAccountName) await SecureStore.setItemAsync(`conciliaai.g.${selected.id}.mypacc`, primaryAccountName);
        await loadDetail(selected);
      },
    });
  }

  function handleCreditorPaid(shareCents: number) {
    if (!selected) return;
    setConfirmPay({
      label: `Registrar sua parte de ${fmt(shareCents)} no grupo?\n\nSerá lançado como saída na sua conta.`,
      onConfirm: async () => {
        const { id } = await createPersonalExpense({
          title: `Minha parte grupo "${selected.name}"`,
          amountCents: shareCents,
          date: new Date().toISOString().slice(0, 10),
          category: "Transferências",
          accountId: primaryAccountId ?? undefined,
        });
        setMyPaidExpenseId(id);
        setMyPaidAmountCents(shareCents);
        setMyPaidAccountName(primaryAccountName);
        await SecureStore.setItemAsync(`conciliaai.g.${selected.id}.mypaid`, id);
        await SecureStore.setItemAsync(`conciliaai.g.${selected.id}.mypaidamt`, String(shareCents));
        if (primaryAccountName) await SecureStore.setItemAsync(`conciliaai.g.${selected.id}.mypacc`, primaryAccountName);
        await loadDetail(selected);
      },
    });
  }

  function handlePayRemaining(remainingCents: number, totalCents: number) {
    if (!selected) return;
    setConfirmPay({
      label: `Complementar com ${fmt(remainingCents)}?\n\nSerá lançado como saída na sua conta.`,
      onConfirm: async () => {
        const { id } = await createPersonalExpense({
          title: `Complemento grupo "${selected.name}"`,
          amountCents: remainingCents,
          date: new Date().toISOString().slice(0, 10),
          category: "Transferências",
          accountId: primaryAccountId ?? undefined,
        });
        setMyPaidExpenseId(id);
        setMyPaidAmountCents(totalCents);
        setMyPaidAccountName(primaryAccountName);
        await SecureStore.setItemAsync(`conciliaai.g.${selected.id}.mypaid`, id);
        await SecureStore.setItemAsync(`conciliaai.g.${selected.id}.mypaidamt`, String(totalCents));
        if (primaryAccountName) await SecureStore.setItemAsync(`conciliaai.g.${selected.id}.mypacc`, primaryAccountName);
        await loadDetail(selected);
      },
    });
  }

  function handleEstornar() {
    if (!selected || !myPaidExpenseId) return;
    setConfirmPay({
      title: "Estornar pagamento",
      label: `Isso vai remover o lançamento da sua conta e marcar sua parte como pendente novamente.`,
      confirmLabel: "Estornar",
      onConfirm: async () => {
        await deletePersonalExpense(myPaidExpenseId);
        await SecureStore.deleteItemAsync(`conciliaai.g.${selected.id}.mypaid`);
        await SecureStore.deleteItemAsync(`conciliaai.g.${selected.id}.mypacc`);
        await SecureStore.deleteItemAsync(`conciliaai.g.${selected.id}.mypaidamt`);
        setMyPaidExpenseId(null);
        setMyPaidAmountCents(null);
        setMyPaidAccountName(null);
        await loadDetail(selected);
      },
    });
  }

  // ── Base config ──────────────────────────────────────────────────
  function openBaseConfig() {
    const sal: Record<string, string> = {};
    const pct: Record<string, string> = {};
    members.forEach(m => {
      sal[m.userId] = salaries[m.userId] ? String(salaries[m.userId] / 100) : "";
      pct[m.userId] = percents[m.userId] ? String(percents[m.userId]) : "";
    });
    setEditSalaries(sal); setEditPercents(pct);
    setShowBase(true);
  }

  async function handleSaveBase() {
    if (!selected) return;
    if (splitMode === "MANUAL") {
      const sum = Object.values(editPercents).reduce((s, v) => s + parseFloat(v.replace(",", ".") || "0"), 0);
      if (Math.abs(sum - 100) > 0.5) { Alert.alert("Os percentuais precisam somar 100%."); return; }
    }
    setSavingBase(true);
    try {
      const newSal: Record<string, number> = {};
      const newPct: Record<string, number> = {};
      members.forEach(m => {
        newSal[m.userId] = Math.round(parseFloat(editSalaries[m.userId]?.replace(",", ".") || "0") * 100);
        newPct[m.userId] = parseFloat(editPercents[m.userId]?.replace(",", ".") || "0");
      });
      setSalaries(newSal); setPercents(newPct);
      await Promise.all([
        saveSplitMode(selected.id, splitMode),
        saveSalaries(selected.id, newSal),
        savePercents(selected.id, newPct),
      ]);
      setShowBase(false);
    } catch { Alert.alert("Erro ao salvar configuração."); }
    finally { setSavingBase(false); }
  }

  function handleEqualSplit() {
    const n = members.length;
    if (!n) return;
    const pct = (100 / n).toFixed(2);
    const newPct: Record<string, string> = {};
    members.forEach(m => { newPct[m.userId] = pct; });
    setEditPercents(newPct);
  }

  const percentSum = useMemo(
    () => Object.values(editPercents).reduce((s, v) => s + parseFloat(v.replace(",", ".") || "0"), 0),
    [editPercents]
  );

  // ── Member CRUD ──────────────────────────────────────────────────
  async function handleAddMember() {
    if (!selected || !memEmail.trim()) return;
    setAddingMem(true);
    try {
      await addMember(selected.id, memEmail.trim().toLowerCase());
      setMemEmail(""); setMemDisplayName(""); setShowAddMem(false);
      Alert.alert("Convite enviado", "A pessoa receberá um código para entrar no grupo.");
      await loadDetail(selected);
    } catch (e) { Alert.alert("Erro", e instanceof Error ? e.message : "Erro ao convidar."); }
    finally { setAddingMem(false); }
  }

  async function handleRemoveMember(m: GroupMember) {
    if (!selected) return;
    Alert.alert("Remover membro?", memberLabel(m), [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: async () => {
        try { await removeMember(selected.id, m.id); await loadDetail(selected); }
        catch (e) { Alert.alert("Erro", e instanceof Error ? e.message : "Erro ao remover."); }
      }},
    ]);
  }

  async function handleJoinInvite() {
    if (!inviteCode.trim()) return;
    setJoiningInvite(true);
    try {
      const { getToken } = await import("../../lib/auth");
      const token = await getToken();
      const r = await fetch("https://conciliaai-api.onrender.com/api/groups/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ code: inviteCode.trim() }),
      });
      if (!r.ok) throw new Error("Código inválido ou expirado.");
      setInviteCode(""); setShowInvite(false);
      Alert.alert("Sucesso", "Você entrou no grupo!");
      await loadGroups(true);
    } catch (e) { Alert.alert("Erro", e instanceof Error ? e.message : "Erro ao aceitar convite."); }
    finally { setJoiningInvite(false); }
  }

  // ══════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ══════════════════════════════════════════════════════════════════
  if (!selected) return (
    <SafeAreaView style={s.root}>
      <View style={s.listHeader}>
        <Text style={s.listTitle}>Grupos</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={s.hdrBtn2} onPress={() => setShowInvite(true)}>
            <Text style={s.hdrBtn2Txt}>Entrar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.hdrBtn} onPress={() => setShowCreate(true)}>
            <Text style={s.hdrBtnTxt}>+ Novo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loadingGroups ? (
        <View style={s.center}><ActivityIndicator color="#3B82F6" size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.listScroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadGroups(true)} tintColor="#3B82F6" />}
          showsVerticalScrollIndicator={false}
        >
          {groups.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={s.emptyEmoji}>👥</Text>
              <Text style={s.emptyTitle}>Nenhum grupo ainda</Text>
              <Text style={s.emptySub}>Crie um grupo para dividir despesas com amigos, família ou colegas de trabalho.</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => setShowCreate(true)}>
                <Text style={s.emptyBtnTxt}>Criar primeiro grupo</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowInvite(true)} style={{ marginTop: 12 }}>
                <Text style={{ color: "#60A5FA", fontSize: 14, fontWeight: "700" }}>Tenho um código de convite</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {groups.map((g, i) => (
                <TouchableOpacity
                  key={g.id} style={s.groupCard} activeOpacity={0.8}
                  onPress={() => openGroup(g)}
                  onLongPress={() => void handleDeleteGroup(g)}
                >
                  <AvatarCircle label={g.name} idx={i} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.groupName}>{g.name}</Text>
                    {g.createdAtUtc && <Text style={s.groupSub}>Criado em {fmtDate(g.createdAtUtc.slice(0, 10))}</Text>}
                  </View>
                  <Text style={s.arrow}>›</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* Create group modal */}
      <ModalSheet visible={showCreate} onClose={() => setShowCreate(false)}>
        <Text style={s.modalTitle}>Novo grupo</Text>
        <Text style={s.modalSub}>Dê um nome ao grupo para começar.</Text>
        <TextInput
          style={s.modalInput} placeholder="Ex: Casa, Viagem Europa, Trabalho…"
          placeholderTextColor="#475569" value={newGroupName} onChangeText={setNewGroupName}
          autoFocus returnKeyType="done" onSubmitEditing={() => void handleCreateGroup()}
        />
        <View style={s.modalBtns}>
          <TouchableOpacity style={s.btnCancel} onPress={() => { setNewGroupName(""); setShowCreate(false); }}>
            <Text style={s.btnCancelTxt}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnConfirm, (!newGroupName.trim() || creatingGroup) && { opacity: 0.4 }]}
            onPress={() => void handleCreateGroup()} disabled={!newGroupName.trim() || creatingGroup}>
            {creatingGroup ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnConfirmTxt}>Criar</Text>}
          </TouchableOpacity>
        </View>
      </ModalSheet>

      {/* Join invite modal */}
      <ModalSheet visible={showInvite} onClose={() => setShowInvite(false)}>
        <Text style={s.modalTitle}>Código de convite</Text>
        <Text style={s.modalSub}>Insira o código que você recebeu por e-mail.</Text>
        <TextInput
          style={s.modalInput} placeholder="Cole o código aqui"
          placeholderTextColor="#475569" value={inviteCode} onChangeText={setInviteCode}
          autoCapitalize="none" autoFocus
        />
        <View style={s.modalBtns}>
          <TouchableOpacity style={s.btnCancel} onPress={() => { setInviteCode(""); setShowInvite(false); }}>
            <Text style={s.btnCancelTxt}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnConfirm, (!inviteCode.trim() || joiningInvite) && { opacity: 0.4 }]}
            onPress={() => void handleJoinInvite()} disabled={!inviteCode.trim() || joiningInvite}>
            {joiningInvite ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnConfirmTxt}>Entrar</Text>}
          </TouchableOpacity>
        </View>
      </ModalSheet>
    </SafeAreaView>
  );

  // ══════════════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ══════════════════════════════════════════════════════════════════
  const TABS = [
    { key: "resumo"   as DetailTab, label: "Resumo"    },
    { key: "despesas" as DetailTab, label: "Despesas"  },
    { key: "saldos"   as DetailTab, label: "Acertos"   },
    { key: "membros"  as DetailTab, label: "Membros"   },
  ];

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.detailHeader}>
        <TouchableOpacity onPress={closeDetail} style={{ width: 70 }}>
          <Text style={s.backTxt}>‹ Grupos</Text>
        </TouchableOpacity>
        <Text style={s.detailTitle} numberOfLines={1}>{selected.name}</Text>
        <TouchableOpacity
          style={{ width: 70, alignItems: "flex-end" }}
          onPress={() => Alert.alert(selected.name, "Opções", [
            { text: "Adicionar despesa", onPress: openCreateExp },
            { text: "Convidar membro", onPress: () => setShowAddMem(true) },
            { text: "Configurar rateio", onPress: openBaseConfig },
            { text: "Excluir grupo", style: "destructive", onPress: () => void handleDeleteGroup(selected) },
            { text: "Cancelar", style: "cancel" },
          ])}
        >
          <Text style={{ color: "#60A5FA", fontSize: 22, fontWeight: "300" }}>⋯</Text>
        </TouchableOpacity>
      </View>

      {/* Stats strip */}
      <View style={s.statsStrip}>
        {[
          [fmt(monthTotal), monthLabelBR(currentMonthKey())],
          [String(monthExpenses.length), "despesas/mês"],
          [String(members.length), "membros"],
        ].map(([val, lbl], i) => (
          <React.Fragment key={lbl}>
            {i > 0 && <View style={s.statDiv} />}
            <View style={s.statItem}>
              <Text style={s.statVal}>{val}</Text>
              <Text style={s.statLbl}>{lbl}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* Tabs */}
      <TabBar tabs={TABS} active={detailTab} onChange={setDetailTab} />

      {detailLoad ? (
        <View style={s.center}><ActivityIndicator color="#3B82F6" size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.detailScroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={detailLoad} onRefresh={() => void loadDetail(selected)} tintColor="#3B82F6" />}
        >

          {/* ═══ RESUMO ═══ */}
          {detailTab === "resumo" && (
            <View style={{ gap: 12 }}>
              {/* Split mode header — top of resumo */}
              <View style={s.splitHeader}>
                <View>
                  <Text style={s.splitTitle}>Rateio do mês</Text>
                  <Text style={s.splitSub}>{splitMode === "SALARY" ? "Proporcional ao salário" : "Percentual manual"}</Text>
                </View>
                <TouchableOpacity style={s.configBtn} onPress={openBaseConfig}>
                  <Text style={s.configBtnTxt}>Configurar</Text>
                </TouchableOpacity>
              </View>

              {/* Metrics */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                {[
                  ["Gasto no mês", fmt(monthTotal), "#3B82F6"],
                  ["Média/pessoa", fmt(avgPerPerson), "#8B5CF6"],
                ].map(([lbl, val, col]) => (
                  <View key={lbl} style={[s.metricCard, { borderColor: (col as string) + "44" }]}>
                    <Text style={s.metricLbl}>{lbl}</Text>
                    <Text style={[s.metricVal, { color: col as string }]}>{val}</Text>
                  </View>
                ))}
              </View>

              {/* Donut — one slice per expense; tapping a legend item shows its detail */}
              {monthTotal > 0 && (
                <View style={{ backgroundColor: "#1E293B", borderRadius: 18, padding: 16, gap: 14, borderWidth: 1, borderColor: "#334155" }}>
                  <Text style={{ color: "#94A3B8", fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 }}>
                    {monthLabelBR(currentMonthKey())} · toque para detalhar
                  </Text>
                  <DonutChart
                    slices={donutSlices}
                    total={monthTotal}
                    selectedId={selectedDonutId}
                    onSelect={setSelectedDonutId}
                  />

                  {/* Detail card for selected expense */}
                  {selectedExpense && (
                    <View style={{ backgroundColor: "#0F172A", borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: avatarColor(donutSlices.findIndex(s => s.id === selectedExpense.id)) + "55" }}>
                      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: "#F1F5F9", fontSize: 14, fontWeight: "800" }}>{selectedExpense.description}</Text>
                          <Text style={{ color: "#475569", fontSize: 11, marginTop: 3 }}>
                            {fmtDate(selectedExpense.date.slice(0, 10))} · Pago por{" "}
                            <Text style={{ color: "#60A5FA", fontWeight: "700" }}>{selectedExpense.paidByName}</Text>
                          </Text>
                        </View>
                        <Text style={{ color: "#F1F5F9", fontSize: 16, fontWeight: "900" }}>{fmt(selectedExpense.amountCents)}</Text>
                      </View>

                      {selectedExpense.participants.filter(p => !p.isExcluded).length > 0 && (
                        <>
                          <View style={{ height: 1, backgroundColor: "#1E293B" }} />
                          <Text style={{ color: "#64748B", fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 }}>Divisão</Text>
                          {selectedExpense.participants.filter(p => !p.isExcluded).map(p => (
                            <View key={p.userId} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                              <Text style={{ color: "#CBD5E1", fontSize: 13 }}>{p.name}</Text>
                              <Text style={{ color: "#60A5FA", fontSize: 13, fontWeight: "800" }}>{fmt(p.shareCents)}</Text>
                            </View>
                          ))}
                        </>
                      )}
                    </View>
                  )}
                </View>
              )}

              {!canCalculate ? (
                <View style={s.configNudge}>
                  <Text style={s.nudgeIcon}>⚙️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.nudgeTitle}>Configure o rateio</Text>
                    <Text style={s.nudgeSub}>
                      {splitMode === "SALARY"
                        ? "Insira os salários dos membros para calcular a divisão proporcional."
                        : "Defina os percentuais de cada membro (devem somar 100%)."}
                    </Text>
                  </View>
                </View>
              ) : monthTotal === 0 ? (
                <View style={s.configNudge}>
                  <Text style={s.nudgeIcon}>🧾</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.nudgeTitle}>Sem despesas este mês</Text>
                    <Text style={s.nudgeSub}>Adicione despesas para ver o rateio.</Text>
                  </View>
                </View>
              ) : (
                <>
                  <SectionLabel title={`Quanto cada um deve pagar — ${monthLabelBR(currentMonthKey())}`} />
                  {monthSplit.map(({ member, idx, weight, shouldPay }) => (
                    <View key={member.userId} style={s.splitRow}>
                      <AvatarCircle label={memberLabel(member)} idx={idx} size={36} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={s.splitName}>{memberLabel(member)}</Text>
                        <Text style={s.splitPct}>{Math.round(weight * 100)}% do total</Text>
                      </View>
                      <Text style={s.splitAmt}>{fmt(shouldPay)}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

          {/* ═══ DESPESAS ═══ */}
          {detailTab === "despesas" && (
            <View style={{ gap: 10 }}>
              <TouchableOpacity style={s.primaryBtn} onPress={openCreateExp}>
                <Text style={s.primaryBtnTxt}>+ Adicionar despesa</Text>
              </TouchableOpacity>

              {expenses.length === 0 ? (
                <View style={s.emptyWrap}>
                  <Text style={s.emptyEmoji}>🧾</Text>
                  <Text style={s.emptyTitle}>Sem despesas ainda</Text>
                  <Text style={s.emptySub}>Adicione a primeira despesa do grupo.</Text>
                </View>
              ) : expenses.map(exp => (
                <TouchableOpacity key={exp.id} style={s.expCard} activeOpacity={0.85}
                  onPress={() => openEditExp(exp)}
                  onLongPress={() => void handleDeleteExp(exp)}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={s.expTitle} numberOfLines={1}>{exp.description}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={s.expMeta}>{fmtDate(exp.date.slice(0, 10))}</Text>
                      <Text style={s.dot}>·</Text>
                      <Text style={s.expMeta}>
                        Pago por <Text style={{ color: "#60A5FA", fontWeight: "700" }}>{exp.paidByName}</Text>
                      </Text>
                    </View>
                    {exp.participants.filter(p => !p.isExcluded).length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ flexDirection: "row", gap: 4 }}>
                          {exp.participants.filter(p => !p.isExcluded).map(p => (
                            <View key={p.userId} style={s.pChip}>
                              <Text style={s.pChipTxt}>{p.name.split(" ")[0]} </Text>
                              <Text style={{ color: "#94A3B8", fontSize: 10 }}>{fmt(p.shareCents)}</Text>
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    )}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={s.expAmt}>{fmt(exp.amountCents)}</Text>
                    <Text style={s.expEditHint}>toque p/ editar</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ═══ ACERTOS ═══ */}
          {detailTab === "saldos" && (
            <View style={{ gap: 12 }}>
              {balances.length === 0 ? (
                <View style={s.emptyWrap}>
                  <Text style={s.emptyEmoji}>🤝</Text>
                  <Text style={s.emptyTitle}>Tudo quitado</Text>
                  <Text style={s.emptySub}>Adicione despesas para ver quem deve o quê.</Text>
                </View>
              ) : (
                <>
                  {/* ── Status de pagamento de cada membro ── */}
                  <SectionLabel title="Quem já pagou sua parte" />
                  {balances.map((b, i) => {
                    const isMe    = b.userId === myUserId;
                    const isPaidByApi = b.balanceCents === 0;
                    const iMeRegistered = isMe && myPaidExpenseId !== null;
                    // How much the local user has actually paid vs what they owe now
                    // paidAmt=null means old payment where amount wasn't yet tracked → skip partial detection
                    const paidAmt   = myPaidAmountCents;
                    const remaining = (iMeRegistered && paidAmt !== null) ? Math.max(0, b.totalOwesCents - paidAmt) : 0;
                    const iMeFullyPaid = iMeRegistered && (paidAmt === null || remaining < 50);
                    const iMePartial   = iMeRegistered && paidAmt !== null && remaining >= 50;
                    const showPago = isPaidByApi || iMeFullyPaid;
                    // Settlement where this member owes (is the FROM payer)
                    const st = settlements.find(s => s.fromId === b.userId);
                    return (
                      <View key={b.userId} style={[s.acertoCard, isMe && s.acertoCardMe]}>
                        <AvatarCircle label={b.name} idx={i} size={40} />
                        <View style={{ flex: 1, gap: 3, paddingLeft: 4 }}>
                          <Text style={[s.balName, isMe && { color: "#60A5FA" }]} numberOfLines={1}>
                            {b.name}{isMe ? " (você)" : ""}
                          </Text>
                          <Text style={{ color: "#64748B", fontSize: 12 }}>
                            parte: <Text style={{ color: "#F1F5F9", fontWeight: "700" }}>{fmt(b.totalOwesCents)}</Text>
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          {showPago ? (
                            <TouchableOpacity
                              activeOpacity={isMe ? 0.7 : 1}
                              onPress={() => { if (isMe) handleEstornar(); }}
                              style={{ backgroundColor: "#14532D55", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#22C55E44" }}
                            >
                              <Text style={{ color: "#22C55E", fontSize: 12, fontWeight: "800" }}>✓ Pago{isMe ? " · estornar" : ""}</Text>
                              {isMe && myPaidAccountName ? (
                                <Text style={{ color: "#22C55E88", fontSize: 10, marginTop: 2 }}>{myPaidAccountName}</Text>
                              ) : null}
                            </TouchableOpacity>
                          ) : iMePartial ? (
                            <View style={{ alignItems: "flex-end", gap: 4 }}>
                              <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => handlePayRemaining(remaining, b.totalOwesCents)}
                                style={{ backgroundColor: "#92400E55", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#F59E0B66" }}
                              >
                                <Text style={{ color: "#F59E0B", fontSize: 12, fontWeight: "800" }}>+ {fmt(remaining)}</Text>
                              </TouchableOpacity>
                              <Text style={{ color: "#F59E0B88", fontSize: 10 }}>{fmt(paidAmt ?? 0)} pago</Text>
                            </View>
                          ) : isMe ? (
                            <TouchableOpacity style={s.pagueiBtn} activeOpacity={0.8}
                              onPress={() => st ? void handleMarkPaid(st) : void handleCreditorPaid(b.totalOwesCents)}>
                              <Text style={s.pagueiTxt}>Paguei ✓</Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={{ backgroundColor: "#1E293B", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#334155" }}>
                              <Text style={{ color: "#475569", fontSize: 12, fontWeight: "700" }}>aguardando</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}

                  {/* ── Posição de cada membro (secundário) ── */}
                  <SectionLabel title="Posição individual" />
                  {balances.map((b, i) => {
                    const balCol = b.balanceCents > 0 ? "#22C55E" : b.balanceCents < 0 ? "#EF4444" : "#22C55E";
                    const isMe = b.userId === myUserId;
                    return (
                      <View key={b.userId} style={[s.balCard, isMe && { borderColor: "#3B82F644" }]}>
                        <AvatarCircle label={b.name} idx={i} size={40} />
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={[s.balName, isMe && { color: "#60A5FA" }]}>{b.name}{isMe ? " (você)" : ""}</Text>
                          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                            <Text style={s.balMeta}>Pagou <Text style={{ color: "#22C55E", fontWeight: "700" }}>{fmt(b.totalPaidCents)}</Text></Text>
                          </View>
                        </View>
                        <View style={{ alignItems: "flex-end", gap: 2 }}>
                          {/* Main: each person's own share */}
                          <Text style={{ color: "#F1F5F9", fontSize: 16, fontWeight: "900" }}>
                            {fmt(b.totalOwesCents)}
                          </Text>
                          <Text style={{ color: "#64748B", fontSize: 10 }}>sua parte</Text>
                          {/* Secondary: net balance */}
                          {b.balanceCents !== 0 && (
                            <Text style={{ color: balCol, fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                              {b.balanceCents > 0 ? `+${fmt(b.balanceCents)} a receber` : `${fmt(b.balanceCents)} a pagar`}
                            </Text>
                          )}
                          {b.balanceCents === 0 && (
                            <Text style={{ color: "#22C55E", fontSize: 11, fontWeight: "700", marginTop: 2 }}>✓ quitado</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
            </View>
          )}

          {/* ═══ MEMBROS ═══ */}
          {detailTab === "membros" && (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity style={[s.primaryBtn, { flex: 1 }]} onPress={() => setShowAddMem(true)}>
                  <Text style={s.primaryBtnTxt}>+ Convidar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.primaryBtn, { flex: 1, backgroundColor: "#1E293B", borderWidth: 1, borderColor: "#334155" }]} onPress={openBaseConfig}>
                  <Text style={[s.primaryBtnTxt, { color: "#94A3B8" }]}>⚙ Rateio</Text>
                </TouchableOpacity>
              </View>

              {members.length === 0 ? (
                <View style={s.emptyWrap}>
                  <Text style={s.emptyEmoji}>👤</Text>
                  <Text style={s.emptyTitle}>Apenas você</Text>
                  <Text style={s.emptySub}>Convide pessoas pelo e-mail delas.</Text>
                </View>
              ) : members.map((m, i) => {
                const sal = salaries[m.userId];
                const pct = percents[m.userId];
                return (
                  <TouchableOpacity key={m.id} style={s.memberCard} activeOpacity={0.85}
                    onLongPress={() => void handleRemoveMember(m)}
                  >
                    <AvatarCircle label={memberLabel(m)} idx={i} size={42} />
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={s.memberName}>{memberLabel(m)}</Text>
                      {m.email && <Text style={s.memberEmail}>{m.email}</Text>}
                      {splitMode === "SALARY" && sal ? (
                        <Text style={{ color: "#64748B", fontSize: 10 }}>Salário: {fmt(sal)}</Text>
                      ) : splitMode === "MANUAL" && pct ? (
                        <Text style={{ color: "#64748B", fontSize: 10 }}>{pct}% do rateio</Text>
                      ) : null}
                    </View>
                    <View style={[s.roleBadge, m.role === "Admin" && s.roleBadgeAdmin]}>
                      <Text style={[s.roleTxt, m.role === "Admin" && s.roleTxtAdmin]}>{m.role}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ═══ MODAL: Criar/editar despesa ═══ */}
      <ModalSheet visible={showExp} onClose={() => setShowExp(false)}>
        <Text style={s.modalTitle}>{editingExp ? "Editar despesa" : "Nova despesa"}</Text>

        {!editingExp && (
          <View style={s.expTabRow}>
            {([["avulsa","Avulsa"],["casa","Casa/Recorrente"]] as [ExpTab,string][]).map(([k,l]) => (
              <TouchableOpacity key={k} style={[s.expTabBtn, expTab === k && s.expTabBtnA]} onPress={() => setExpTab(k)}>
                <Text style={[s.expTabTxt, expTab === k && s.expTabTxtA]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {expTab === "casa" && !editingExp ? (
          <>
            <Text style={s.fieldLbl}>Nome da conta</Text>
            <TextInput style={s.modalInput} placeholder="Ex: Aluguel, Condomínio…" placeholderTextColor="#475569"
              value={expHouseName} onChangeText={setExpHouseName} />
          </>
        ) : (
          <>
            <Text style={s.fieldLbl}>Descrição</Text>
            <TextInput style={s.modalInput} placeholder="Ex: Jantar, Uber, Mercado…" placeholderTextColor="#475569"
              value={expDesc} onChangeText={setExpDesc} autoFocus />
          </>
        )}

        <Text style={s.fieldLbl}>Valor</Text>
        <View style={s.amtRow}>
          <Text style={s.amtSign}>R$</Text>
          <TextInput style={s.amtInput} value={expAmount} onChangeText={t => setExpAmount(fmtBRL(t))}
            placeholder="0,00" placeholderTextColor="#475569" keyboardType="numeric" />
        </View>

        <Text style={s.fieldLbl}>Data</Text>
        <TextInput style={[s.modalInput, { marginBottom: 14 }]} value={expDate} onChangeText={setExpDate}
          placeholder="AAAA-MM-DD" placeholderTextColor="#475569" />

        {editingExp && (
          <TouchableOpacity
            style={s.btnDelete}
            onPress={() => {
              setShowExp(false);
              setTimeout(() => void handleDeleteExp(editingExp), 300);
            }}
          >
            <Text style={s.btnDeleteTxt}>Excluir despesa</Text>
          </TouchableOpacity>
        )}

        <View style={s.modalBtns}>
          <TouchableOpacity style={s.btnCancel} onPress={() => setShowExp(false)}>
            <Text style={s.btnCancelTxt}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnConfirm, savingExp && { opacity: 0.5 }]}
            onPress={() => void handleSaveExp()} disabled={savingExp}>
            {savingExp ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnConfirmTxt}>{editingExp ? "Salvar" : "Adicionar"}</Text>}
          </TouchableOpacity>
        </View>
      </ModalSheet>

      {/* ═══ MODAL: Configurar rateio ═══ */}
      <ModalSheet visible={showBase} onClose={() => setShowBase(false)}>
        <Text style={s.modalTitle}>Configurar rateio</Text>

        {/* Mode toggle */}
        <View style={[s.expTabRow, { marginBottom: 16 }]}>
          {([["SALARY","Por salário"],["MANUAL","Por percentual"]] as [SplitMode,string][]).map(([k,l]) => (
            <TouchableOpacity key={k} style={[s.expTabBtn, splitMode === k && s.expTabBtnA]} onPress={() => setSplitMode(k)}>
              <Text style={[s.expTabTxt, splitMode === k && s.expTabTxtA]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
          {members.map((m, i) => (
            <View key={m.userId} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <AvatarCircle label={memberLabel(m)} idx={i} size={34} />
              <Text style={{ color: "#CBD5E1", fontSize: 13, flex: 1 }} numberOfLines={1}>{memberLabel(m)}</Text>
              {splitMode === "SALARY" ? (
                <View style={s.baseInput}>
                  <Text style={s.basePre}>R$</Text>
                  <TextInput
                    style={s.baseField}
                    value={editSalaries[m.userId] ?? ""}
                    onChangeText={v => setEditSalaries(p => ({ ...p, [m.userId]: v }))}
                    keyboardType="decimal-pad" placeholder="0"
                    placeholderTextColor="#475569"
                  />
                </View>
              ) : (
                <View style={s.baseInput}>
                  <TextInput
                    style={s.baseField}
                    value={editPercents[m.userId] ?? ""}
                    onChangeText={v => setEditPercents(p => ({ ...p, [m.userId]: v }))}
                    keyboardType="decimal-pad" placeholder="0"
                    placeholderTextColor="#475569"
                  />
                  <Text style={s.basePre}>%</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {splitMode === "MANUAL" && (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <Text style={{ color: Math.abs(percentSum - 100) < 0.5 ? "#22C55E" : "#F59E0B", fontSize: 13, fontWeight: "700" }}>
              Total: {percentSum.toFixed(1)}% {Math.abs(percentSum - 100) < 0.5 ? "✓" : "(deve ser 100%)"}
            </Text>
            <TouchableOpacity onPress={handleEqualSplit}>
              <Text style={{ color: "#60A5FA", fontSize: 12, fontWeight: "700" }}>Dividir igual</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={s.modalBtns}>
          <TouchableOpacity style={s.btnCancel} onPress={() => setShowBase(false)}>
            <Text style={s.btnCancelTxt}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnConfirm, savingBase && { opacity: 0.5 }]}
            onPress={() => void handleSaveBase()} disabled={savingBase}>
            {savingBase ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnConfirmTxt}>Salvar</Text>}
          </TouchableOpacity>
        </View>
      </ModalSheet>

      {/* ═══ MODAL: Convidar membro ═══ */}
      <ModalSheet visible={showAddMem} onClose={() => setShowAddMem(false)}>
        <Text style={s.modalTitle}>Convidar membro</Text>
        <Text style={s.modalSub}>A pessoa precisa ter uma conta no app.</Text>
        <Text style={s.fieldLbl}>E-mail</Text>
        <TextInput style={s.modalInput} placeholder="email@exemplo.com" placeholderTextColor="#475569"
          value={memEmail} onChangeText={setMemEmail} keyboardType="email-address" autoCapitalize="none" autoFocus />
        <Text style={s.fieldLbl}>Nome (opcional)</Text>
        <TextInput style={s.modalInput} placeholder="Nome para exibição" placeholderTextColor="#475569"
          value={memDisplayName} onChangeText={setMemDisplayName} />
        <View style={s.modalBtns}>
          <TouchableOpacity style={s.btnCancel} onPress={() => { setMemEmail(""); setMemDisplayName(""); setShowAddMem(false); }}>
            <Text style={s.btnCancelTxt}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnConfirm, (!memEmail.trim() || addingMem) && { opacity: 0.4 }]}
            onPress={() => void handleAddMember()} disabled={!memEmail.trim() || addingMem}>
            {addingMem ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnConfirmTxt}>Convidar</Text>}
          </TouchableOpacity>
        </View>
      </ModalSheet>

      {/* ═══ MODAL: Confirmar pagamento ═══ */}
      <ModalSheet visible={!!confirmPay} onClose={() => { if (!confirmLoading) setConfirmPay(null); }}>
        <Text style={s.modalTitle}>{confirmPay?.title ?? "Confirmar pagamento"}</Text>
        <Text style={{ color: "#94A3B8", fontSize: 14, lineHeight: 22, marginBottom: 28 }}>
          {confirmPay?.label ?? ""}
        </Text>
        <View style={s.modalBtns}>
          <TouchableOpacity style={s.btnCancel} onPress={() => setConfirmPay(null)} disabled={confirmLoading}>
            <Text style={s.btnCancelTxt}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btnConfirm, confirmPay?.danger && { backgroundColor: "#DC2626" }, confirmLoading && { opacity: 0.5 }]}
            disabled={confirmLoading}
            onPress={async () => {
              if (!confirmPay) return;
              setConfirmLoading(true);
              try {
                await confirmPay.onConfirm();
                setConfirmPay(null);
              } catch (e) {
                Alert.alert("Erro", e instanceof Error ? e.message : "Não foi possível registrar.");
              } finally {
                setConfirmLoading(false);
              }
            }}
          >
            {confirmLoading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.btnConfirmTxt}>{confirmPay?.confirmLabel ?? "Confirmar"}</Text>}
          </TouchableOpacity>
        </View>
      </ModalSheet>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#0A1628" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  arrow:  { color: "#334155", fontSize: 24 },
  dot:    { color: "#334155", fontSize: 14 },

  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  listTitle:  { color: "#F1F5F9", fontSize: 28, fontWeight: "900" },
  hdrBtn:     { backgroundColor: "#1D4ED8", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  hdrBtnTxt:  { color: "#fff", fontSize: 13, fontWeight: "800" },
  hdrBtn2:    { backgroundColor: "#1E293B", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: "#334155" },
  hdrBtn2Txt: { color: "#94A3B8", fontSize: 13, fontWeight: "700" },

  listScroll: { padding: 16, paddingTop: 4 },

  groupCard:  { backgroundColor: "#1E293B", borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 10, borderWidth: 1, borderColor: "#334155" },
  groupName:  { color: "#F1F5F9", fontSize: 16, fontWeight: "800" },
  groupSub:   { color: "#475569", fontSize: 12, marginTop: 2 },

  emptyWrap:  { alignItems: "center", paddingVertical: 48, gap: 10 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { color: "#F1F5F9", fontSize: 18, fontWeight: "800" },
  emptySub:   { color: "#64748B", fontSize: 13, textAlign: "center", lineHeight: 20, paddingHorizontal: 24 },
  emptyBtn:   { backgroundColor: "#1D4ED8", borderRadius: 14, paddingHorizontal: 24, paddingVertical: 13, marginTop: 6 },
  emptyBtnTxt:{ color: "#fff", fontSize: 15, fontWeight: "800" },

  // Detail
  detailHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1E293B" },
  backTxt:      { color: "#94A3B8", fontSize: 14 },
  detailTitle:  { flex: 1, color: "#F1F5F9", fontSize: 16, fontWeight: "800", textAlign: "center" },

  statsStrip: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1E293B" },
  statItem:   { flex: 1, alignItems: "center" },
  statVal:    { color: "#F1F5F9", fontSize: 14, fontWeight: "800" },
  statLbl:    { color: "#475569", fontSize: 10, fontWeight: "600", marginTop: 2 },
  statDiv:    { width: 1, backgroundColor: "#1E293B" },

  tabRow:   { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  tabBtn:   { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: "#1E293B", alignItems: "center", borderWidth: 1.5, borderColor: "#1E293B" },
  tabBtnA:  { borderColor: "#3B82F6", backgroundColor: "#1D4ED822" },
  tabTxt:   { color: "#64748B", fontSize: 11, fontWeight: "700" },
  tabTxtA:  { color: "#60A5FA" },

  detailScroll: { padding: 14, paddingBottom: 60 },
  secLabel:     { color: "#64748B", fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", marginTop: 4, marginBottom: 4 },

  // Metrics
  metricCard:  { flex: 1, backgroundColor: "#1E293B", borderRadius: 14, padding: 14, borderWidth: 1 },
  metricLbl:   { color: "#64748B", fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 4 },
  metricVal:   { fontSize: 17, fontWeight: "800" },

  // Split
  splitHeader: { backgroundColor: "#1E293B", borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#334155" },
  splitTitle:  { color: "#F1F5F9", fontSize: 14, fontWeight: "700" },
  splitSub:    { color: "#64748B", fontSize: 11, marginTop: 2 },
  configBtn:   { backgroundColor: "#1D4ED8", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  configBtnTxt:{ color: "#fff", fontSize: 12, fontWeight: "800" },
  configNudge: { backgroundColor: "#1E293B", borderRadius: 14, padding: 14, flexDirection: "row", gap: 10, alignItems: "flex-start", borderWidth: 1, borderColor: "#334155" },
  nudgeIcon:   { fontSize: 22 },
  nudgeTitle:  { color: "#F1F5F9", fontSize: 13, fontWeight: "700", marginBottom: 3 },
  nudgeSub:    { color: "#64748B", fontSize: 12, lineHeight: 18 },
  splitRow:    { backgroundColor: "#1E293B", borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#334155" },
  splitName:   { color: "#F1F5F9", fontSize: 13, fontWeight: "700" },
  splitPct:    { color: "#64748B", fontSize: 11 },
  splitAmt:    { color: "#60A5FA", fontSize: 15, fontWeight: "900" },

  // Expenses
  primaryBtn:    { backgroundColor: "#1D4ED8", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  primaryBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "800" },
  expCard:       { backgroundColor: "#1E293B", borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 12, borderWidth: 1, borderColor: "#334155" },
  expTitle:      { color: "#F1F5F9", fontSize: 14, fontWeight: "700" },
  expMeta:       { color: "#64748B", fontSize: 11 },
  expAmt:        { color: "#F1F5F9", fontSize: 15, fontWeight: "800" },
  expEditHint:   { color: "#334155", fontSize: 9 },
  pChip:         { backgroundColor: "#0F172A", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexDirection: "row", alignItems: "center" },
  pChipTxt:      { color: "#60A5FA", fontSize: 10, fontWeight: "700" },

  // Balances
  balCard:  { backgroundColor: "#1E293B", borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#334155" },
  balName:  { color: "#F1F5F9", fontSize: 14, fontWeight: "700" },
  balMeta:  { color: "#64748B", fontSize: 11 },
  settlRow:    { backgroundColor: "#1E293B", borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#334155" },
  settlTxt:    { fontSize: 14, lineHeight: 22, flex: 1 },
  acertoCard:  { backgroundColor: "#1E293B", borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#334155" },
  acertoCardMe:{ borderColor: "#F59E0B55", backgroundColor: "#1A1500" },
  acertoAmt:   { color: "#4ADE80", fontSize: 20, fontWeight: "900" },
  pagueiBtn:   { backgroundColor: "#16532244", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: "#22C55E88" },
  pagueiTxt:   { color: "#4ADE80", fontSize: 12, fontWeight: "800" },

  // Members
  memberCard:     { backgroundColor: "#1E293B", borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#334155" },
  memberName:     { color: "#F1F5F9", fontSize: 14, fontWeight: "700" },
  memberEmail:    { color: "#64748B", fontSize: 11 },
  roleBadge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: "#1E293B", borderWidth: 1, borderColor: "#334155" },
  roleBadgeAdmin: { backgroundColor: "#1D4ED822", borderColor: "#3B82F644" },
  roleTxt:        { color: "#64748B", fontSize: 11, fontWeight: "700" },
  roleTxtAdmin:   { color: "#60A5FA" },

  // Modals
  modalOverlay:  { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalSheet:    { backgroundColor: "#0F172A", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: "92%" },
  modalHandle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: "#334155", alignSelf: "center", marginBottom: 18 },
  modalTitle:    { color: "#F1F5F9", fontSize: 20, fontWeight: "900", marginBottom: 4 },
  modalSub:      { color: "#64748B", fontSize: 13, marginBottom: 16 },
  modalInput:    { backgroundColor: "#1E293B", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: "#F1F5F9", fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: "#334155" },
  fieldLbl:      { color: "#94A3B8", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  modalBtns:     { flexDirection: "row", gap: 10, marginTop: 4 },
  btnCancel:     { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: "#1E293B", alignItems: "center" },
  btnCancelTxt:  { color: "#94A3B8", fontWeight: "700" },
  btnConfirm:    { flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: "#3B82F6", alignItems: "center" },
  btnConfirmTxt: { color: "#fff", fontWeight: "800", fontSize: 15 },
  btnDelete:     { paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: "#EF444466", alignItems: "center", marginBottom: 10 },
  btnDeleteTxt:  { color: "#F87171", fontWeight: "700", fontSize: 14 },

  // Expense modal tabs
  expTabRow:  { flexDirection: "row", gap: 6, marginBottom: 16 },
  expTabBtn:  { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: "#1E293B", alignItems: "center", borderWidth: 1.5, borderColor: "#1E293B" },
  expTabBtnA: { borderColor: "#3B82F6", backgroundColor: "#1D4ED822" },
  expTabTxt:  { color: "#64748B", fontSize: 12, fontWeight: "700" },
  expTabTxtA: { color: "#60A5FA" },

  // Amount row
  amtRow:   { backgroundColor: "#1E293B", borderRadius: 12, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginBottom: 14, borderWidth: 1, borderColor: "#334155" },
  amtSign:  { color: "#64748B", fontSize: 20, fontWeight: "700", marginRight: 6 },
  amtInput: { flex: 1, paddingVertical: 14, color: "#F1F5F9", fontSize: 26, fontWeight: "800" },


  // Base config
  baseInput: { flexDirection: "row", alignItems: "center", backgroundColor: "#1E293B", borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: "#334155", minWidth: 100 },
  basePre:   { color: "#64748B", fontSize: 13, fontWeight: "700" },
  baseField: { flex: 1, paddingVertical: 10, paddingHorizontal: 6, color: "#F1F5F9", fontSize: 14, fontWeight: "700" },
});
