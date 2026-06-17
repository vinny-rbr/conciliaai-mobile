import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  listGroups, deleteGroup,
  fetchMembers, addMember, removeMember,
  fetchExpenses, fetchBalances, createExpense, updateExpense, deleteExpense,
  recordSettlement, createPersonalExpense, deletePersonalExpense,
  fetchPersonalExpenseAmount, cleanupLegacyExpenseType,
} from "../../lib/groupsService";
import { getEmailFromAnySource } from "../../lib/auth";
import { fetchFinanceItems } from "../../lib/financeService";
import { listBankAccounts } from "../../lib/bankAccountsService";
import type { GroupDto, GroupMember, GroupExpense, GroupMemberBalance } from "../../lib/groupsService";
import { setGroupFabAction } from "../../navigation/groupFabAction";
import { useFocusEffect } from "@react-navigation/native";

import GroupList from "./grupos/GroupList";
import GroupDetail from "./grupos/GroupDetail";
import {
  SplitMode, DetailTab, ExpTab, Settlement, DonutSlice,
  loadSplitMode, saveSplitMode, loadSalaries, saveSalaries, loadPercents, savePercents,
  monthKey, currentMonthKey, monthLabelBR, fmtBRL, parseCents,
  computeParticipants, computeSettlements,
} from "./grupos/shared";

export default function GruposScreen() {
  // Groups list
  const [groups,        setGroups]        = useState<GroupDto[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);

  // Selected group
  const [selected,   setSelected]   = useState<GroupDto | null>(null);
  const [detailTab,  setDetailTab]  = useState<DetailTab>("resumo");
  const [members,    setMembers]    = useState<GroupMember[]>([]);
  const [expenses,   setExpenses]   = useState<GroupExpense[]>([]);
  const [balances,   setBalances]   = useState<GroupMemberBalance[]>([]);
  const [detailLoad, setDetailLoad] = useState(false);

  // Current user
  const [myUserId,           setMyUserId]           = useState<string | null>(null);
  const [primaryAccountId,   setPrimaryAccountId]   = useState<string | null>(null);
  const [primaryAccountName, setPrimaryAccountName] = useState<string | null>(null);
  const [myPaidAccountName,  setMyPaidAccountName]  = useState<string | null>(null);
  const [myPaidExpenseId,    setMyPaidExpenseId]    = useState<string | null>(null);
  const [myPaidAmountCents,  setMyPaidAmountCents]  = useState<number | null>(null);

  // Donut
  const [selectedDonutId, setSelectedDonutId] = useState<string | null>(null);

  // Split config
  const [splitMode, setSplitMode] = useState<SplitMode>("SALARY");
  const [salaries,  setSalaries]  = useState<Record<string, number>>({});
  const [percents,  setPercents]  = useState<Record<string, number>>({});

  // Expense modal
  const [showExp,      setShowExp]      = useState(false);
  const [editingExp,   setEditingExp]   = useState<GroupExpense | null>(null);
  const [expTab,       setExpTab]       = useState<ExpTab>("avulsa");
  const [expDesc,      setExpDesc]      = useState("");
  const [expHouseName, setExpHouseName] = useState("");
  const [expAmount,    setExpAmount]    = useState("");
  const [expDate,      setExpDate]      = useState(new Date().toISOString().slice(0, 10));
  const [expPaidBy,    setExpPaidBy]    = useState("");
  const [savingExp,    setSavingExp]    = useState(false);

  // Split config modal
  const [showBase,     setShowBase]     = useState(false);
  const [editSalaries, setEditSalaries] = useState<Record<string, string>>({});
  const [editPercents, setEditPercents] = useState<Record<string, string>>({});
  const [savingBase,   setSavingBase]   = useState(false);

  // Member modal
  const [showAddMem,     setShowAddMem]     = useState(false);
  const [memEmail,       setMemEmail]       = useState("");
  const [memDisplayName, setMemDisplayName] = useState("");
  const [addingMem,      setAddingMem]      = useState(false);

  // Confirm modal
  const [confirmPay,     setConfirmPay]     = useState<{ title?: string; label: string; confirmLabel?: string; danger?: boolean; onConfirm: () => Promise<void> } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // ── Load groups ────────────────────────────────────────────────────
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
    void SecureStore.getItemAsync("conciliaai.cleanup.legacyType.v1").then(done => {
      if (done) return;
      void cleanupLegacyExpenseType().then(n => {
        if (n >= 0) void SecureStore.setItemAsync("conciliaai.cleanup.legacyType.v1", "1");
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selected) { setGroupFabAction(() => openCreateExp()); }
    else          { setGroupFabAction(null); }
    return () => { setGroupFabAction(null); };
  }, [selected, myUserId, members]); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(useCallback(() => {
    return () => { setGroupFabAction(null); };
  }, []));

  // ── Load detail ────────────────────────────────────────────────────
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

      const myEmail = await getEmailFromAnySource();
      const me = mems.find(m => m.email?.toLowerCase() === myEmail?.toLowerCase());
      if (me) setMyUserId(me.userId);

      const [mode, sal, pct] = await Promise.all([
        loadSplitMode(g.id), loadSalaries(g.id), loadPercents(g.id),
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

  // ── Computed ───────────────────────────────────────────────────────
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
  const monthSplit = useMemo(() =>
    members.map((m, i) => ({
      member: m, idx: i,
      weight: weights[m.userId] ?? 0,
      shouldPay: Math.round(monthTotal * (weights[m.userId] ?? 0)),
    })).sort((a, b) => b.shouldPay - a.shouldPay),
    [members, weights, monthTotal]
  );
  const canCalculate = useMemo(() => {
    if (splitMode === "SALARY") return Object.values(salaries).some(v => v > 0);
    const sum = Object.values(percents).reduce((s, v) => s + v, 0);
    return Math.abs(sum - 100) < 0.5;
  }, [splitMode, salaries, percents]);
  const avgPerPerson = members.length > 0 ? Math.round(monthTotal / members.length) : 0;
  const settlements  = useMemo(() => computeSettlements(balances), [balances]);
  const donutSlices  = useMemo<DonutSlice[]>(() =>
    monthExpenses.map((exp, i) => ({ id: exp.id, label: exp.description, amountCents: exp.amountCents, colorIdx: i })),
    [monthExpenses]
  );
  const selectedExpense = useMemo(
    () => selectedDonutId ? monthExpenses.find(e => e.id === selectedDonutId) ?? null : null,
    [selectedDonutId, monthExpenses]
  );
  const percentSum = useMemo(
    () => Object.values(editPercents).reduce((s, v) => s + parseFloat(v.replace(",", ".") || "0"), 0),
    [editPercents]
  );

  // ── Handlers ───────────────────────────────────────────────────────
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

  function openCreateExp() {
    setEditingExp(null); setExpTab("avulsa"); setExpDesc(""); setExpHouseName("");
    setExpAmount(""); setExpDate(new Date().toISOString().slice(0, 10));
    setExpPaidBy(myUserId ?? members[0]?.userId ?? "");
    setShowExp(true);
  }

  function openEditExp(exp: GroupExpense) {
    setEditingExp(exp); setExpTab("avulsa");
    setExpDesc(exp.description);
    setExpAmount(fmtBRL(String(exp.amountCents)));
    setExpDate(exp.date.slice(0, 10));
    setExpPaidBy(exp.paidByUserId);
    setShowExp(true);
  }

  async function handleSaveExp() {
    if (!selected) return;
    const desc = expTab === "casa"
      ? `${expHouseName.trim()} — ${monthLabelBR(currentMonthKey())}`
      : expDesc.trim();
    const cents = parseCents(expAmount);
    if (!desc) { Alert.alert("Informe a descrição."); return; }
    if (!cents) { Alert.alert("Informe o valor."); return; }
    const paidBy = expPaidBy || myUserId || members[0]?.userId;
    if (!paidBy) { Alert.alert("Não foi possível identificar o pagador."); return; }
    const participants = canCalculate ? computeParticipants(members, weights, cents) : undefined;
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
      label: `"${exp.description}"\n\nEssa ação não pode ser desfeita.`,
      confirmLabel: "Excluir", danger: true,
      onConfirm: async () => { await deleteExpense(exp.id); await loadDetail(selected); },
    });
  }

  function handleMarkPaid(st: Settlement) {
    if (!selected) return;
    setConfirmPay({
      label: `Pagar para ${st.to}?\n\nSerá lançado como saída na sua conta.`,
      onConfirm: async () => {
        await recordSettlement(selected.id, { fromUserId: st.fromId, toUserId: st.toId, amountCents: st.cents, date: new Date().toISOString() });
        const { id } = await createPersonalExpense({
          title: `Acerto grupo "${selected.name}" → ${st.to}`,
          amountCents: st.cents,
          date: new Date().toISOString().slice(0, 10),
          category: "Transferências",
          accountId: primaryAccountId ?? undefined,
        });
        setMyPaidExpenseId(id); setMyPaidAmountCents(st.cents); setMyPaidAccountName(primaryAccountName);
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
      label: `Registrar sua parte no grupo?\n\nSerá lançado como saída na sua conta.`,
      onConfirm: async () => {
        const { id } = await createPersonalExpense({
          title: `Minha parte grupo "${selected.name}"`,
          amountCents: shareCents,
          date: new Date().toISOString().slice(0, 10),
          category: "Transferências",
          accountId: primaryAccountId ?? undefined,
        });
        setMyPaidExpenseId(id); setMyPaidAmountCents(shareCents); setMyPaidAccountName(primaryAccountName);
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
      label: `Complementar?\n\nSerá lançado como saída na sua conta.`,
      onConfirm: async () => {
        const { id } = await createPersonalExpense({
          title: `Complemento grupo "${selected.name}"`,
          amountCents: remainingCents,
          date: new Date().toISOString().slice(0, 10),
          category: "Transferências",
          accountId: primaryAccountId ?? undefined,
        });
        setMyPaidExpenseId(id); setMyPaidAmountCents(totalCents); setMyPaidAccountName(primaryAccountName);
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
      label: "Isso vai remover o lançamento da sua conta e marcar sua parte como pendente novamente.",
      confirmLabel: "Estornar",
      onConfirm: async () => {
        await deletePersonalExpense(myPaidExpenseId);
        await SecureStore.deleteItemAsync(`conciliaai.g.${selected.id}.mypaid`);
        await SecureStore.deleteItemAsync(`conciliaai.g.${selected.id}.mypacc`);
        await SecureStore.deleteItemAsync(`conciliaai.g.${selected.id}.mypaidamt`);
        setMyPaidExpenseId(null); setMyPaidAmountCents(null); setMyPaidAccountName(null);
        await loadDetail(selected);
      },
    });
  }

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
      await Promise.all([saveSplitMode(selected.id, splitMode), saveSalaries(selected.id, newSal), savePercents(selected.id, newPct)]);
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
    const label = m.displayName ?? m.name ?? m.email ?? "Membro";
    Alert.alert("Remover membro?", label, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: async () => {
        try { await removeMember(selected.id, m.id); await loadDetail(selected); }
        catch (e) { Alert.alert("Erro", e instanceof Error ? e.message : "Erro ao remover."); }
      }},
    ]);
  }

  // ── Render ──────────────────────────────────────────────────────────
  if (!selected) {
    return (
      <GroupList
        groups={groups}
        loadingGroups={loadingGroups}
        refreshing={refreshing}
        onRefresh={() => void loadGroups(true)}
        onOpenGroup={openGroup}
        onDeleteGroup={g => void handleDeleteGroup(g)}
        onGroupsChanged={() => void loadGroups(true)}
      />
    );
  }

  return (
    <GroupDetail
      selected={selected}
      detailTab={detailTab} setDetailTab={setDetailTab}
      members={members}
      expenses={expenses}
      balances={balances}
      detailLoad={detailLoad}
      myUserId={myUserId}
      myPaidExpenseId={myPaidExpenseId}
      myPaidAmountCents={myPaidAmountCents}
      myPaidAccountName={myPaidAccountName}
      selectedDonutId={selectedDonutId} setSelectedDonutId={setSelectedDonutId}
      splitMode={splitMode} setSplitMode={setSplitMode}
      monthTotal={monthTotal}
      monthExpenses={monthExpenses}
      avgPerPerson={avgPerPerson}
      monthSplit={monthSplit}
      canCalculate={canCalculate}
      donutSlices={donutSlices}
      selectedExpense={selectedExpense}
      settlements={settlements}
      showExp={showExp} setShowExp={setShowExp}
      editingExp={editingExp}
      expTab={expTab} setExpTab={setExpTab}
      expDesc={expDesc} setExpDesc={setExpDesc}
      expHouseName={expHouseName} setExpHouseName={setExpHouseName}
      expAmount={expAmount} setExpAmount={setExpAmount}
      expDate={expDate} setExpDate={setExpDate}
      expPaidBy={expPaidBy} setExpPaidBy={setExpPaidBy}
      savingExp={savingExp}
      showBase={showBase} setShowBase={setShowBase}
      editSalaries={editSalaries} setEditSalaries={setEditSalaries}
      editPercents={editPercents} setEditPercents={setEditPercents}
      savingBase={savingBase}
      percentSum={percentSum}
      showAddMem={showAddMem} setShowAddMem={setShowAddMem}
      memEmail={memEmail} setMemEmail={setMemEmail}
      memDisplayName={memDisplayName} setMemDisplayName={setMemDisplayName}
      addingMem={addingMem}
      confirmPay={confirmPay} setConfirmPay={setConfirmPay}
      confirmLoading={confirmLoading} setConfirmLoading={setConfirmLoading}
      onClose={closeDetail}
      onOpenCreateExp={openCreateExp}
      onOpenEditExp={openEditExp}
      onSaveExp={handleSaveExp}
      onDeleteExp={handleDeleteExp}
      onOpenBaseConfig={openBaseConfig}
      onSaveBase={handleSaveBase}
      onEqualSplit={handleEqualSplit}
      onMarkPaid={handleMarkPaid}
      onCreditorPaid={handleCreditorPaid}
      onPayRemaining={handlePayRemaining}
      onEstornar={handleEstornar}
      onAddMember={handleAddMember}
      onRemoveMember={m => void handleRemoveMember(m)}
      onDeleteGroup={g => void handleDeleteGroup(g)}
      onLoadDetail={() => void loadDetail(selected)}
    />
  );
}
