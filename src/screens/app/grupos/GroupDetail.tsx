import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, TextInput, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fmt } from "../../../lib/financeService";
import type { GroupDto, GroupMember, GroupExpense, GroupMemberBalance } from "../../../lib/groupsService";
import { AvatarCircle, SectionLabel, DonutChart, ModalSheet, TabBar } from "./components";
import {
  DetailTab, ExpTab, SplitMode, DonutSlice, Settlement,
  memberLabel, avatarColor, fmtDate, fmtBRL, currentMonthKey, monthLabelBR, s,
} from "./shared";

type ConfirmPayload = { title?: string; label: string; confirmLabel?: string; danger?: boolean; onConfirm: () => Promise<void> };

type Props = {
  selected: GroupDto;
  detailTab: DetailTab; setDetailTab: (t: DetailTab) => void;
  members: GroupMember[];
  expenses: GroupExpense[];
  balances: GroupMemberBalance[];
  detailLoad: boolean;
  myUserId: string | null;
  myPaidExpenseId: string | null;
  myPaidAmountCents: number | null;
  myPaidAccountName: string | null;
  selectedDonutId: string | null; setSelectedDonutId: (id: string | null) => void;
  splitMode: SplitMode; setSplitMode: (v: SplitMode) => void;
  monthTotal: number;
  monthExpenses: GroupExpense[];
  avgPerPerson: number;
  monthSplit: { member: GroupMember; idx: number; weight: number; shouldPay: number }[];
  canCalculate: boolean;
  donutSlices: DonutSlice[];
  selectedExpense: GroupExpense | null;
  settlements: Settlement[];

  // expense modal
  showExp: boolean; setShowExp: (v: boolean) => void;
  editingExp: GroupExpense | null;
  expTab: ExpTab; setExpTab: (v: ExpTab) => void;
  expDesc: string; setExpDesc: (v: string) => void;
  expHouseName: string; setExpHouseName: (v: string) => void;
  expAmount: string; setExpAmount: (v: string) => void;
  expDate: string; setExpDate: (v: string) => void;
  expPaidBy: string; setExpPaidBy: (v: string) => void;
  savingExp: boolean;

  // split config modal
  showBase: boolean; setShowBase: (v: boolean) => void;
  editSalaries: Record<string, string>;
  setEditSalaries: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  editPercents: Record<string, string>;
  setEditPercents: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  savingBase: boolean;
  percentSum: number;

  // member modal
  showAddMem: boolean; setShowAddMem: (v: boolean) => void;
  memEmail: string; setMemEmail: (v: string) => void;
  memDisplayName: string; setMemDisplayName: (v: string) => void;
  addingMem: boolean;

  // confirm modal
  confirmPay: ConfirmPayload | null;
  setConfirmPay: (v: ConfirmPayload | null) => void;
  confirmLoading: boolean;
  setConfirmLoading: (v: boolean) => void;

  // callbacks
  onClose: () => void;
  onOpenCreateExp: () => void;
  onOpenEditExp: (exp: GroupExpense) => void;
  onSaveExp: () => Promise<void>;
  onDeleteExp: (exp: GroupExpense) => void;
  onOpenBaseConfig: () => void;
  onSaveBase: () => Promise<void>;
  onEqualSplit: () => void;
  onMarkPaid: (st: Settlement) => void;
  onCreditorPaid: (shareCents: number) => void;
  onPayRemaining: (remaining: number, total: number) => void;
  onEstornar: () => void;
  onAddMember: () => Promise<void>;
  onRemoveMember: (m: GroupMember) => void;
  onDeleteGroup: (g: GroupDto) => void;
  onLoadDetail: () => void;
};

const TABS = [
  { key: "resumo"   as DetailTab, label: "Resumo"   },
  { key: "despesas" as DetailTab, label: "Despesas"  },
  { key: "saldos"   as DetailTab, label: "Acertos"   },
  { key: "membros"  as DetailTab, label: "Membros"   },
];

export default function GroupDetail(p: Props) {
  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.detailHeader}>
        <TouchableOpacity onPress={p.onClose} style={{ width: 70 }}>
          <Text style={s.backTxt}>‹ Grupos</Text>
        </TouchableOpacity>
        <Text style={s.detailTitle} numberOfLines={1}>{p.selected.name}</Text>
        <TouchableOpacity style={{ width: 70, alignItems: "flex-end" }}
          onPress={() => Alert.alert(p.selected.name, "Opções", [
            { text: "Adicionar despesa",  onPress: p.onOpenCreateExp },
            { text: "Convidar membro",    onPress: () => p.setShowAddMem(true) },
            { text: "Configurar rateio",  onPress: p.onOpenBaseConfig },
            { text: "Excluir grupo", style: "destructive", onPress: () => p.onDeleteGroup(p.selected) },
            { text: "Cancelar", style: "cancel" },
          ])}
        >
          <Text style={{ color: "#60A5FA", fontSize: 22, fontWeight: "300" }}>⋯</Text>
        </TouchableOpacity>
      </View>

      {/* Stats strip */}
      <View style={s.statsStrip}>
        {[
          [fmt(p.monthTotal), monthLabelBR(currentMonthKey())],
          [String(p.monthExpenses.length), "despesas/mês"],
          [String(p.members.length), "membros"],
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

      <TabBar tabs={TABS} active={p.detailTab} onChange={p.setDetailTab} />

      {p.detailLoad ? (
        <View style={s.center}><ActivityIndicator color="#3B82F6" size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={s.detailScroll} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={p.detailLoad} onRefresh={p.onLoadDetail} tintColor="#3B82F6" />}
        >
          {/* ═══ RESUMO ═══ */}
          {p.detailTab === "resumo" && (
            <View style={{ gap: 12 }}>
              <View style={s.splitHeader}>
                <View>
                  <Text style={s.splitTitle}>Rateio do mês</Text>
                  <Text style={s.splitSub}>{p.splitMode === "SALARY" ? "Proporcional ao salário" : "Percentual manual"}</Text>
                </View>
                <TouchableOpacity style={s.configBtn} onPress={p.onOpenBaseConfig}>
                  <Text style={s.configBtnTxt}>Configurar</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                {[["Gasto no mês", fmt(p.monthTotal), "#3B82F6"], ["Média/pessoa", fmt(p.avgPerPerson), "#8B5CF6"]].map(([lbl, val, col]) => (
                  <View key={lbl} style={[s.metricCard, { borderColor: (col as string) + "44" }]}>
                    <Text style={s.metricLbl}>{lbl}</Text>
                    <Text style={[s.metricVal, { color: col as string }]}>{val}</Text>
                  </View>
                ))}
              </View>

              {p.monthTotal > 0 && (
                <View style={{ backgroundColor: "#1E293B", borderRadius: 18, padding: 16, gap: 14, borderWidth: 1, borderColor: "#334155" }}>
                  <Text style={{ color: "#94A3B8", fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 }}>
                    {monthLabelBR(currentMonthKey())} · toque para detalhar
                  </Text>
                  <DonutChart slices={p.donutSlices} total={p.monthTotal} selectedId={p.selectedDonutId} onSelect={p.setSelectedDonutId} />

                  {p.selectedExpense && (
                    <View style={{ backgroundColor: "#0F172A", borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: avatarColor(p.donutSlices.findIndex(sl => sl.id === p.selectedExpense!.id)) + "55" }}>
                      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: "#F1F5F9", fontSize: 14, fontWeight: "800" }}>{p.selectedExpense.description}</Text>
                          <Text style={{ color: "#475569", fontSize: 11, marginTop: 3 }}>
                            {fmtDate(p.selectedExpense.date.slice(0, 10))} · Pago por{" "}
                            <Text style={{ color: "#60A5FA", fontWeight: "700" }}>{p.selectedExpense.paidByName}</Text>
                          </Text>
                        </View>
                        <Text style={{ color: "#F1F5F9", fontSize: 16, fontWeight: "900" }}>{fmt(p.selectedExpense.amountCents)}</Text>
                      </View>
                      {p.selectedExpense.participants.filter(pt => !pt.isExcluded).length > 0 && (
                        <>
                          <View style={{ height: 1, backgroundColor: "#1E293B" }} />
                          <Text style={{ color: "#64748B", fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 }}>Divisão</Text>
                          {p.selectedExpense.participants.filter(pt => !pt.isExcluded).map(pt => (
                            <View key={pt.userId} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                              <Text style={{ color: "#CBD5E1", fontSize: 13 }}>{pt.name}</Text>
                              <Text style={{ color: "#60A5FA", fontSize: 13, fontWeight: "800" }}>{fmt(pt.shareCents)}</Text>
                            </View>
                          ))}
                        </>
                      )}
                    </View>
                  )}
                </View>
              )}

              {!p.canCalculate ? (
                <View style={s.configNudge}>
                  <Text style={s.nudgeIcon}>⚙️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.nudgeTitle}>Configure o rateio</Text>
                    <Text style={s.nudgeSub}>{p.splitMode === "SALARY" ? "Insira os salários dos membros para calcular a divisão proporcional." : "Defina os percentuais de cada membro (devem somar 100%)."}</Text>
                  </View>
                </View>
              ) : p.monthTotal === 0 ? (
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
                  {p.monthSplit.map(({ member, idx, weight, shouldPay }) => (
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
          {p.detailTab === "despesas" && (
            <View style={{ gap: 10 }}>
              <TouchableOpacity style={s.primaryBtn} onPress={p.onOpenCreateExp}>
                <Text style={s.primaryBtnTxt}>+ Adicionar despesa</Text>
              </TouchableOpacity>
              {p.expenses.length === 0 ? (
                <View style={s.emptyWrap}>
                  <Text style={s.emptyEmoji}>🧾</Text>
                  <Text style={s.emptyTitle}>Sem despesas ainda</Text>
                  <Text style={s.emptySub}>Adicione a primeira despesa do grupo.</Text>
                </View>
              ) : p.expenses.map(exp => (
                <TouchableOpacity key={exp.id} style={s.expCard} activeOpacity={0.85}
                  onPress={() => p.onOpenEditExp(exp)} onLongPress={() => p.onDeleteExp(exp)}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={s.expTitle} numberOfLines={1}>{exp.description}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={s.expMeta}>{fmtDate(exp.date.slice(0, 10))}</Text>
                      <Text style={s.dot}>·</Text>
                      <Text style={s.expMeta}>Pago por <Text style={{ color: "#60A5FA", fontWeight: "700" }}>{exp.paidByName}</Text></Text>
                    </View>
                    {exp.participants.filter(pt => !pt.isExcluded).length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ flexDirection: "row", gap: 4 }}>
                          {exp.participants.filter(pt => !pt.isExcluded).map(pt => (
                            <View key={pt.userId} style={s.pChip}>
                              <Text style={s.pChipTxt}>{pt.name.split(" ")[0]} </Text>
                              <Text style={{ color: "#94A3B8", fontSize: 10 }}>{fmt(pt.shareCents)}</Text>
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
          {p.detailTab === "saldos" && (
            <View style={{ gap: 12 }}>
              {p.balances.length === 0 ? (
                <View style={s.emptyWrap}>
                  <Text style={s.emptyEmoji}>🤝</Text>
                  <Text style={s.emptyTitle}>Tudo quitado</Text>
                  <Text style={s.emptySub}>Adicione despesas para ver quem deve o quê.</Text>
                </View>
              ) : (
                <>
                  <SectionLabel title="Quem já pagou sua parte" />
                  {p.balances.map((b, i) => {
                    const isMe = b.userId === p.myUserId;
                    const iMeRegistered = isMe && p.myPaidExpenseId !== null;
                    const paidAmt = p.myPaidAmountCents;
                    const remaining = (iMeRegistered && paidAmt !== null) ? Math.max(0, b.totalOwesCents - paidAmt) : 0;
                    const iMeFullyPaid = iMeRegistered && (paidAmt === null || remaining < 50);
                    const iMePartial   = iMeRegistered && paidAmt !== null && remaining >= 50;
                    const showPago = b.balanceCents === 0 || iMeFullyPaid;
                    const st = p.settlements.find(x => x.fromId === b.userId);
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
                            <TouchableOpacity activeOpacity={isMe ? 0.7 : 1}
                              onPress={() => { if (isMe) p.onEstornar(); }}
                              style={{ backgroundColor: "#14532D55", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#22C55E44" }}>
                              <Text style={{ color: "#22C55E", fontSize: 12, fontWeight: "800" }}>✓ Pago{isMe ? " · estornar" : ""}</Text>
                              {isMe && p.myPaidAccountName ? (
                                <Text style={{ color: "#22C55E88", fontSize: 10, marginTop: 2 }}>{p.myPaidAccountName}</Text>
                              ) : null}
                            </TouchableOpacity>
                          ) : iMePartial ? (
                            <View style={{ alignItems: "flex-end", gap: 4 }}>
                              <TouchableOpacity activeOpacity={0.8}
                                onPress={() => p.onPayRemaining(remaining, b.totalOwesCents)}
                                style={{ backgroundColor: "#92400E55", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#F59E0B66" }}>
                                <Text style={{ color: "#F59E0B", fontSize: 12, fontWeight: "800" }}>+ {fmt(remaining)}</Text>
                              </TouchableOpacity>
                              <Text style={{ color: "#F59E0B88", fontSize: 10 }}>{fmt(paidAmt ?? 0)} pago</Text>
                            </View>
                          ) : isMe ? (
                            <TouchableOpacity style={s.pagueiBtn} activeOpacity={0.8}
                              onPress={() => st ? p.onMarkPaid(st) : p.onCreditorPaid(b.totalOwesCents)}>
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

                  <SectionLabel title="Posição individual" />
                  {p.balances.map((b, i) => {
                    const balCol = b.balanceCents > 0 ? "#22C55E" : b.balanceCents < 0 ? "#EF4444" : "#22C55E";
                    const isMe = b.userId === p.myUserId;
                    return (
                      <View key={b.userId} style={[s.balCard, isMe && { borderColor: "#3B82F644" }]}>
                        <AvatarCircle label={b.name} idx={i} size={40} />
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={[s.balName, isMe && { color: "#60A5FA" }]}>{b.name}{isMe ? " (você)" : ""}</Text>
                          <Text style={s.balMeta}>Pagou <Text style={{ color: "#22C55E", fontWeight: "700" }}>{fmt(b.totalPaidCents)}</Text></Text>
                        </View>
                        <View style={{ alignItems: "flex-end", gap: 2 }}>
                          <Text style={{ color: "#F1F5F9", fontSize: 16, fontWeight: "900" }}>{fmt(b.totalOwesCents)}</Text>
                          <Text style={{ color: "#64748B", fontSize: 10 }}>sua parte</Text>
                          {b.balanceCents !== 0 && (
                            <Text style={{ color: balCol, fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                              {b.balanceCents > 0 ? `+${fmt(b.balanceCents)} a receber` : `${fmt(b.balanceCents)} a pagar`}
                            </Text>
                          )}
                          {b.balanceCents === 0 && <Text style={{ color: "#22C55E", fontSize: 11, fontWeight: "700", marginTop: 2 }}>✓ quitado</Text>}
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
            </View>
          )}

          {/* ═══ MEMBROS ═══ */}
          {p.detailTab === "membros" && (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity style={[s.primaryBtn, { flex: 1 }]} onPress={() => p.setShowAddMem(true)}>
                  <Text style={s.primaryBtnTxt}>+ Convidar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.primaryBtn, { flex: 1, backgroundColor: "#1E293B", borderWidth: 1, borderColor: "#334155" }]} onPress={p.onOpenBaseConfig}>
                  <Text style={[s.primaryBtnTxt, { color: "#94A3B8" }]}>⚙ Rateio</Text>
                </TouchableOpacity>
              </View>
              {p.members.length === 0 ? (
                <View style={s.emptyWrap}>
                  <Text style={s.emptyEmoji}>👤</Text>
                  <Text style={s.emptyTitle}>Apenas você</Text>
                  <Text style={s.emptySub}>Convide pessoas pelo e-mail delas.</Text>
                </View>
              ) : p.members.map((m, i) => {
                const sal = p.editSalaries[m.userId]; // unused in display; use salaries from parent
                const pct = p.editPercents[m.userId];
                void sal; void pct;
                return (
                  <TouchableOpacity key={m.id} style={s.memberCard} activeOpacity={0.85}
                    onLongPress={() => p.onRemoveMember(m)}>
                    <AvatarCircle label={memberLabel(m)} idx={i} size={42} />
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={s.memberName}>{memberLabel(m)}</Text>
                      {m.email && <Text style={s.memberEmail}>{m.email}</Text>}
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
      <ModalSheet visible={p.showExp} onClose={() => p.setShowExp(false)}>
        <Text style={s.modalTitle}>{p.editingExp ? "Editar despesa" : "Nova despesa"}</Text>
        {!p.editingExp && (
          <View style={s.expTabRow}>
            {([["avulsa","Avulsa"],["casa","Casa/Recorrente"]] as [ExpTab,string][]).map(([k,l]) => (
              <TouchableOpacity key={k} style={[s.expTabBtn, p.expTab === k && s.expTabBtnA]} onPress={() => p.setExpTab(k)}>
                <Text style={[s.expTabTxt, p.expTab === k && s.expTabTxtA]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {p.expTab === "casa" && !p.editingExp ? (
          <>
            <Text style={s.fieldLbl}>Nome da conta</Text>
            <TextInput style={s.modalInput} placeholder="Ex: Aluguel, Condomínio…" placeholderTextColor="#475569"
              value={p.expHouseName} onChangeText={p.setExpHouseName} />
          </>
        ) : (
          <>
            <Text style={s.fieldLbl}>Descrição</Text>
            <TextInput style={s.modalInput} placeholder="Ex: Jantar, Uber, Mercado…" placeholderTextColor="#475569"
              value={p.expDesc} onChangeText={p.setExpDesc} autoFocus />
          </>
        )}
        <Text style={s.fieldLbl}>Valor</Text>
        <View style={s.amtRow}>
          <Text style={s.amtSign}>R$</Text>
          <TextInput style={s.amtInput} value={p.expAmount} onChangeText={t => p.setExpAmount(fmtBRL(t))}
            placeholder="0,00" placeholderTextColor="#475569" keyboardType="numeric" />
        </View>
        <Text style={s.fieldLbl}>Data</Text>
        <TextInput style={[s.modalInput, { marginBottom: 14 }]} value={p.expDate} onChangeText={p.setExpDate}
          placeholder="AAAA-MM-DD" placeholderTextColor="#475569" />
        {p.editingExp && (
          <TouchableOpacity style={s.btnDelete} onPress={() => { p.setShowExp(false); setTimeout(() => p.onDeleteExp(p.editingExp!), 300); }}>
            <Text style={s.btnDeleteTxt}>Excluir despesa</Text>
          </TouchableOpacity>
        )}
        <View style={s.modalBtns}>
          <TouchableOpacity style={s.btnCancel} onPress={() => p.setShowExp(false)}>
            <Text style={s.btnCancelTxt}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnConfirm, p.savingExp && { opacity: 0.5 }]}
            onPress={() => void p.onSaveExp()} disabled={p.savingExp}>
            {p.savingExp ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnConfirmTxt}>{p.editingExp ? "Salvar" : "Adicionar"}</Text>}
          </TouchableOpacity>
        </View>
      </ModalSheet>

      {/* ═══ MODAL: Configurar rateio ═══ */}
      <ModalSheet visible={p.showBase} onClose={() => p.setShowBase(false)}>
        <Text style={s.modalTitle}>Configurar rateio</Text>
        <View style={[s.expTabRow, { marginBottom: 16 }]}>
          {([["SALARY","Por salário"],["MANUAL","Por percentual"]] as [SplitMode,string][]).map(([k,l]) => (
            <TouchableOpacity key={k} style={[s.expTabBtn, p.splitMode === k && s.expTabBtnA]} onPress={() => p.setSplitMode(k)}>
              <Text style={[s.expTabTxt, p.splitMode === k && s.expTabTxtA]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
          {p.members.map((m, i) => (
            <View key={m.userId} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <AvatarCircle label={memberLabel(m)} idx={i} size={34} />
              <Text style={{ color: "#CBD5E1", fontSize: 13, flex: 1 }} numberOfLines={1}>{memberLabel(m)}</Text>
              {p.splitMode === "SALARY" ? (
                <View style={s.baseInput}>
                  <Text style={s.basePre}>R$</Text>
                  <TextInput style={s.baseField} value={p.editSalaries[m.userId] ?? ""}
                    onChangeText={v => p.setEditSalaries(prev => ({ ...prev, [m.userId]: v }))}
                    keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#475569" />
                </View>
              ) : (
                <View style={s.baseInput}>
                  <TextInput style={s.baseField} value={p.editPercents[m.userId] ?? ""}
                    onChangeText={v => p.setEditPercents(prev => ({ ...prev, [m.userId]: v }))}
                    keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#475569" />
                  <Text style={s.basePre}>%</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
        {p.splitMode === "MANUAL" && (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <Text style={{ color: Math.abs(p.percentSum - 100) < 0.5 ? "#22C55E" : "#F59E0B", fontSize: 13, fontWeight: "700" }}>
              Total: {p.percentSum.toFixed(1)}% {Math.abs(p.percentSum - 100) < 0.5 ? "✓" : "(deve ser 100%)"}
            </Text>
            <TouchableOpacity onPress={p.onEqualSplit}>
              <Text style={{ color: "#60A5FA", fontSize: 12, fontWeight: "700" }}>Dividir igual</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={s.modalBtns}>
          <TouchableOpacity style={s.btnCancel} onPress={() => p.setShowBase(false)}>
            <Text style={s.btnCancelTxt}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnConfirm, p.savingBase && { opacity: 0.5 }]}
            onPress={() => void p.onSaveBase()} disabled={p.savingBase}>
            {p.savingBase ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnConfirmTxt}>Salvar</Text>}
          </TouchableOpacity>
        </View>
      </ModalSheet>

      {/* ═══ MODAL: Convidar membro ═══ */}
      <ModalSheet visible={p.showAddMem} onClose={() => p.setShowAddMem(false)}>
        <Text style={s.modalTitle}>Convidar membro</Text>
        <Text style={s.modalSub}>A pessoa precisa ter uma conta no app.</Text>
        <Text style={s.fieldLbl}>E-mail</Text>
        <TextInput style={s.modalInput} placeholder="email@exemplo.com" placeholderTextColor="#475569"
          value={p.memEmail} onChangeText={p.setMemEmail} keyboardType="email-address" autoCapitalize="none" autoFocus />
        <Text style={s.fieldLbl}>Nome (opcional)</Text>
        <TextInput style={s.modalInput} placeholder="Nome para exibição" placeholderTextColor="#475569"
          value={p.memDisplayName} onChangeText={p.setMemDisplayName} />
        <View style={s.modalBtns}>
          <TouchableOpacity style={s.btnCancel} onPress={() => { p.setMemEmail(""); p.setMemDisplayName(""); p.setShowAddMem(false); }}>
            <Text style={s.btnCancelTxt}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnConfirm, (!p.memEmail.trim() || p.addingMem) && { opacity: 0.4 }]}
            onPress={() => void p.onAddMember()} disabled={!p.memEmail.trim() || p.addingMem}>
            {p.addingMem ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnConfirmTxt}>Convidar</Text>}
          </TouchableOpacity>
        </View>
      </ModalSheet>

      {/* ═══ MODAL: Confirmar pagamento/exclusão ═══ */}
      <ModalSheet visible={!!p.confirmPay} onClose={() => { if (!p.confirmLoading) p.setConfirmPay(null); }}>
        <Text style={s.modalTitle}>{p.confirmPay?.title ?? "Confirmar pagamento"}</Text>
        <Text style={{ color: "#94A3B8", fontSize: 14, lineHeight: 22, marginBottom: 28 }}>{p.confirmPay?.label ?? ""}</Text>
        <View style={s.modalBtns}>
          <TouchableOpacity style={s.btnCancel} onPress={() => p.setConfirmPay(null)} disabled={p.confirmLoading}>
            <Text style={s.btnCancelTxt}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btnConfirm, p.confirmPay?.danger && { backgroundColor: "#DC2626" }, p.confirmLoading && { opacity: 0.5 }]}
            disabled={p.confirmLoading}
            onPress={async () => {
              if (!p.confirmPay) return;
              p.setConfirmLoading(true);
              try { await p.confirmPay.onConfirm(); p.setConfirmPay(null); }
              catch (e) { Alert.alert("Erro", e instanceof Error ? e.message : "Não foi possível registrar."); }
              finally { p.setConfirmLoading(false); }
            }}
          >
            {p.confirmLoading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.btnConfirmTxt}>{p.confirmPay?.confirmLabel ?? "Confirmar"}</Text>}
          </TouchableOpacity>
        </View>
      </ModalSheet>
    </SafeAreaView>
  );
}
