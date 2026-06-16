import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  Dimensions, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { CreditCard, CreditCardBrand, CreditCardTransaction } from "../../types/creditCard";
import {
  listCreditCards, createCreditCard, listCardTransactions,
  addCardExpense, payCardInvoice,
} from "../../lib/creditCardService";
import { listBankAccounts } from "../../lib/bankAccountsService";
import type { BankAccount } from "../../types/finance";
import { fmt } from "../../lib/financeService";

// ─── Constants ─────────────────────────────────────────────────────────────────

const ACCENT = "#F59E0B";
const { width: W } = Dimensions.get("window");
const CARD_W = W - 48;
const CARD_H = Math.round(CARD_W * 0.6);

const BRANDS: Record<CreditCardBrand, { label: string; bg1: string; bg2: string; logoBg: string; logoText: string; logoColor: string }> = {
  nubank:    { label: "Nubank",    bg1: "#820AD1", bg2: "#4A0080", logoBg: "rgba(255,255,255,.18)", logoText: "nu",    logoColor: "#fff" },
  itau:      { label: "Itaú",     bg1: "#FF6B00", bg2: "#C25000", logoBg: "rgba(255,255,255,.18)", logoText: "i",     logoColor: "#fff" },
  inter:     { label: "Inter",    bg1: "#FF7A00", bg2: "#C25000", logoBg: "rgba(255,255,255,.18)", logoText: "inter", logoColor: "#fff" },
  c6:        { label: "C6 Bank",  bg1: "#1A1A1A", bg2: "#0A0A0A", logoBg: "#C0A060",               logoText: "C6",    logoColor: "#C0A060" },
  bb:        { label: "BB",       bg1: "#0038A8", bg2: "#001C6E", logoBg: "#FFD700",               logoText: "BB",    logoColor: "#0038A8" },
  santander: { label: "Santander",bg1: "#EC0000", bg2: "#A00000", logoBg: "rgba(255,255,255,.18)", logoText: "S",     logoColor: "#fff" },
  caixa:     { label: "Caixa",    bg1: "#006BB6", bg2: "#004880", logoBg: "rgba(255,255,255,.18)", logoText: "C",     logoColor: "#fff" },
  picpay:    { label: "PicPay",   bg1: "#21C25E", bg2: "#118040", logoBg: "rgba(255,255,255,.18)", logoText: "PP",    logoColor: "#fff" },
  outro:     { label: "Outro",    bg1: "#334155", bg2: "#1E293B", logoBg: "rgba(255,255,255,.18)", logoText: "?",     logoColor: "#94A3B8" },
};

const BRANDS_LIST = Object.entries(BRANDS) as [CreditCardBrand, (typeof BRANDS)[CreditCardBrand]][];
const EXPENSE_CATS = ["Alimentação", "Transporte", "Compras", "Assinaturas", "Saúde", "Viagem", "Lazer", "Outros"];

function usageColor(pct: number) {
  return pct < 0.5 ? "#4ADE80" : pct < 0.82 ? ACCENT : "#F87171";
}

function parseBRL(s: string): number {
  const clean = s.replace(/[^\d,]/g, "").replace(",", ".");
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : Math.round(n * 100);
}

// ─── Card Visual ───────────────────────────────────────────────────────────────

function CreditCardVisual({ card }: { card: CreditCard }) {
  const b = BRANDS[card.brand] ?? BRANDS.outro;
  const isSmallLogo = b.logoText.length <= 2;
  const circleSize = Math.round(CARD_H * 0.9);
  const circleSize2 = Math.round(CARD_H * 0.55);
  return (
    <View style={[s.cardVisual, { backgroundColor: b.bg1 }]}>
      <View style={[s.cardCircle, { backgroundColor: b.bg2, bottom: -Math.round(CARD_H * 0.35), right: -Math.round(CARD_W * 0.12), width: circleSize, height: circleSize, borderRadius: Math.round(circleSize / 2) }]} />
      <View style={[s.cardCircle, { backgroundColor: b.bg2, top: -Math.round(CARD_H * 0.2), right: Math.round(CARD_W * 0.15), width: circleSize2, height: circleSize2, borderRadius: Math.round(circleSize2 / 2), opacity: 0.5 }]} />
      <View style={s.cardTop}>
        <View style={[s.cardLogo, { backgroundColor: b.logoBg }]}>
          <Text style={[s.cardLogoTxt, { color: b.logoColor, fontSize: isSmallLogo ? 15 : 11 }]}>{b.logoText}</Text>
        </View>
        <Text style={s.cardNick}>{card.nick}</Text>
      </View>
      <View style={s.cardChip} />
      <Text style={s.cardLast4}>•••• {card.last4}</Text>
    </View>
  );
}

// ─── Limit Bar ─────────────────────────────────────────────────────────────────

function LimitBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(1, used / limit) : 0;
  const fillW = Math.max(3, Math.round(pct * 100));
  const col = usageColor(pct);
  return (
    <View style={s.barTrack}>
      <View style={[s.barFill, { width: `${fillW}%` as unknown as number, backgroundColor: col }]} />
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function CartaoScreen() {
  const navigation = useNavigation();
  const [cards, setCards]           = useState<CreditCard[]>([]);
  const [txs, setTxs]               = useState<CreditCardTransaction[]>([]);
  const [accounts, setAccounts]     = useState<BankAccount[]>([]);
  const [selIdx, setSelIdx]         = useState(0);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showNew, setShowNew]       = useState(false);
  const [showPay, setShowPay]       = useState(false);
  const [showGasto, setShowGasto]   = useState(false);

  const [newBrand, setNewBrand]     = useState<CreditCardBrand>("nubank");
  const [newNick, setNewNick]       = useState("");
  const [newLast4, setNewLast4]     = useState("");
  const [newLimit, setNewLimit]     = useState("");
  const [newClosing, setNewClosing] = useState("3");
  const [newDue, setNewDue]         = useState("10");
  const [newBest, setNewBest]       = useState("3");
  const [savingNew, setSavingNew]   = useState(false);

  const [payAmt, setPayAmt]         = useState("");
  const [payAccId, setPayAccId]     = useState("");
  const [savingPay, setSavingPay]   = useState(false);

  const [gastoTitle, setGastoTitle] = useState("");
  const [gastoCat, setGastoCat]     = useState("Outros");
  const [gastoAmt, setGastoAmt]     = useState("");
  const [savingGasto, setSavingGasto] = useState(false);

  const card = cards[selIdx] ?? null;

  const loadTxs = useCallback(async (cardId: string) => {
    try {
      const list = await listCardTransactions(cardId);
      setTxs(list);
    } catch { setTxs([]); }
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [cs, accs] = await Promise.all([listCreditCards(), listBankAccounts()]);
      setCards(cs);
      setAccounts(accs.filter(a => a.accountType !== "credito"));
      if (cs.length > 0) {
        await loadTxs(cs[0].id);
      } else {
        setTxs([]);
      }
    } catch { /* silent */ }
    setLoading(false);
    setRefreshing(false);
  }, [loadTxs]);

  useEffect(() => { void load(); }, [load]);

  const selectCard = (idx: number) => {
    setSelIdx(idx);
    if (cards[idx]) void loadTxs(cards[idx].id);
  };

  const handleCreateCard = async () => {
    if (!newNick.trim() || !newLast4.trim() || !newLimit.trim()) {
      Alert.alert("Preencha todos os campos obrigatórios."); return;
    }
    if (newLast4.length !== 4 || isNaN(Number(newLast4))) {
      Alert.alert("Os 4 últimos dígitos devem ser numéricos."); return;
    }
    setSavingNew(true);
    try {
      await createCreditCard({
        brand: newBrand, nick: newNick.trim(), last4: newLast4,
        limitCents: parseBRL(newLimit),
        closingDay: parseInt(newClosing) || 3,
        dueDay: parseInt(newDue) || 10,
        bestDay: parseInt(newBest) || 3,
      });
      setShowNew(false);
      setNewNick(""); setNewLast4(""); setNewLimit(""); setNewBrand("nubank");
      setNewClosing("3"); setNewDue("10"); setNewBest("3");
      await load(true);
      setSelIdx(0);
    } catch (e) { Alert.alert("Erro", String(e)); }
    setSavingNew(false);
  };

  const handlePay = async () => {
    if (!card) return;
    const amt = parseBRL(payAmt);
    if (amt <= 0) { Alert.alert("Informe o valor a pagar."); return; }
    setSavingPay(true);
    try {
      await payCardInvoice(card.id, amt, payAccId || undefined);
      setShowPay(false); setPayAmt("");
      await load(true);
    } catch (e) { Alert.alert("Erro", String(e)); }
    setSavingPay(false);
  };

  const handleGasto = async () => {
    if (!card) return;
    if (!gastoTitle.trim()) { Alert.alert("Informe a descrição."); return; }
    const amt = parseBRL(gastoAmt);
    if (amt <= 0) { Alert.alert("Informe o valor."); return; }
    setSavingGasto(true);
    try {
      await addCardExpense(card.id, { title: gastoTitle.trim(), category: gastoCat, amountCents: amt });
      setShowGasto(false);
      setGastoTitle(""); setGastoAmt(""); setGastoCat("Outros");
      await load(true);
    } catch (e) { Alert.alert("Erro", String(e)); }
    setSavingGasto(false);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.loadWrap}><ActivityIndicator color={ACCENT} size="large" /></View>
      </SafeAreaView>
    );
  }

  const totalFatura = cards.reduce((a, c) => a + c.invoiceCents, 0);
  const totalLimit  = cards.reduce((a, c) => a + c.limitCents, 0);

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={s.backBtn}>
          <Text style={s.backTxt}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Cartões de crédito</Text>
        <TouchableOpacity onPress={() => setShowNew(true)} activeOpacity={0.7} style={s.newBtn}>
          <Text style={s.newBtnTxt}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }} tintColor={ACCENT} />}
      >
        {cards.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>💳</Text>
            <Text style={s.emptyTitle}>Nenhum cartão ainda</Text>
            <Text style={s.emptySub}>Adicione seu cartão de crédito para acompanhar sua fatura</Text>
            <TouchableOpacity onPress={() => setShowNew(true)} activeOpacity={0.7} style={s.emptyBtn}>
              <Text style={s.emptyBtnTxt}>+ Adicionar cartão</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {cards.length > 1 && (
              <View style={s.summary}>
                <View>
                  <Text style={s.summaryLabel}>Fatura total aberta</Text>
                  <Text style={s.summaryVal}>{fmt(totalFatura)}</Text>
                </View>
                <View style={s.summaryRight}>
                  <Text style={s.summaryLabel}>Limite total</Text>
                  <Text style={[s.summaryVal, { color: "#94A3B8" }]}>{fmt(totalLimit)}</Text>
                </View>
              </View>
            )}

            {/* Carousel */}
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={s.carousel}
              onMomentumScrollEnd={e => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
                selectCard(Math.max(0, Math.min(idx, cards.length - 1)));
              }}
            >
              {cards.map(c => (
                <View key={c.id} style={{ width: CARD_W, marginHorizontal: 24 }}>
                  <CreditCardVisual card={c} />
                </View>
              ))}
            </ScrollView>

            {cards.length > 1 && (
              <View style={s.dots}>
                {cards.map((_, i) => (
                  <View key={i} style={[s.dot, i === selIdx && s.dotActive]} />
                ))}
              </View>
            )}

            {card && (
              <View style={s.detailPanel}>
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>Fatura aberta</Text>
                  <Text style={[s.detailAmt, { color: card.invoiceCents > 0 ? ACCENT : "#4ADE80" }]}>
                    {fmt(card.invoiceCents)}
                  </Text>
                </View>

                <LimitBar used={card.invoiceCents} limit={card.limitCents} />

                <View style={s.limitRow}>
                  <Text style={s.limitTxt}>Limite {fmt(card.limitCents)}</Text>
                  <Text style={s.limitTxt}>Livre {fmt(Math.max(0, card.limitCents - card.invoiceCents))}</Text>
                </View>

                <View style={s.chips}>
                  {[
                    { icon: "📅", label: "Vence", val: `dia ${card.dueDay}` },
                    { icon: "🔒", label: "Fecha", val: `dia ${card.closingDay}` },
                    { icon: "⭐", label: "Melhor dia", val: `dia ${card.bestDay}` },
                  ].map(ch => (
                    <View key={ch.label} style={s.chip}>
                      <Text style={s.chipIcon}>{ch.icon}</Text>
                      <View>
                        <Text style={s.chipLabel}>{ch.label}</Text>
                        <Text style={s.chipVal}>{ch.val}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={s.actions}>
                  <TouchableOpacity
                    style={s.actionBtn}
                    activeOpacity={0.8}
                    onPress={() => {
                      setPayAmt(((card.invoiceCents) / 100).toFixed(2).replace(".", ","));
                      setShowPay(true);
                    }}
                  >
                    <Text style={s.actionBtnTxt}>Pagar fatura</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, s.actionBtnSec]}
                    activeOpacity={0.8}
                    onPress={() => setShowGasto(true)}
                  >
                    <Text style={[s.actionBtnTxt, { color: "#F1F5F9" }]}>+ Lançar gasto</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {txs.length > 0 && (
              <View style={s.txSection}>
                <Text style={s.txTitle}>Lançamentos</Text>
                {txs.map(tx => (
                  <View key={tx.id} style={s.txRow}>
                    <View style={s.txLeft}>
                      <Text style={s.txName}>{tx.title}</Text>
                      <Text style={s.txCat}>{tx.category} · {tx.dateISO.slice(8)}/{tx.dateISO.slice(5, 7)}</Text>
                    </View>
                    <Text style={[s.txAmt, { color: tx.type === "in" ? "#4ADE80" : "#F87171" }]}>
                      {tx.type === "in" ? "+" : "-"}{fmt(Math.abs(tx.amountCents))}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Modal: Novo cartão ── */}
      <Modal visible={showNew} transparent animationType="slide">
        <View style={s.modalBg}>
          <ScrollView contentContainerStyle={s.modalBox}>
            <Text style={s.modalTitle}>Novo cartão de crédito</Text>

            <Text style={s.fieldLabel}>Banco / Emissor</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row", gap: 8, paddingVertical: 4 }}>
                {BRANDS_LIST.map(([key, b]) => (
                  <TouchableOpacity
                    key={key}
                    activeOpacity={0.7}
                    onPress={() => setNewBrand(key)}
                    style={[s.brandChip, { backgroundColor: b.bg1 }, newBrand === key && s.brandChipSel]}
                  >
                    <Text style={s.brandChipTxt}>{b.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={s.fieldLabel}>Nome do cartão *</Text>
            <TextInput style={s.input} placeholderTextColor="#475569" placeholder="Ex: Nubank Ultravioleta" value={newNick} onChangeText={setNewNick} />

            <Text style={s.fieldLabel}>Últimos 4 dígitos *</Text>
            <TextInput style={s.input} placeholderTextColor="#475569" placeholder="0000" keyboardType="number-pad" maxLength={4} value={newLast4} onChangeText={t => setNewLast4(t.replace(/\D/g, ""))} />

            <Text style={s.fieldLabel}>Limite *</Text>
            <TextInput style={s.input} placeholderTextColor="#475569" placeholder="R$ 0,00" keyboardType="decimal-pad" value={newLimit} onChangeText={setNewLimit} />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Fecha dia</Text>
                <TextInput style={s.input} placeholderTextColor="#475569" placeholder="3" keyboardType="number-pad" maxLength={2} value={newClosing} onChangeText={setNewClosing} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Vence dia</Text>
                <TextInput style={s.input} placeholderTextColor="#475569" placeholder="10" keyboardType="number-pad" maxLength={2} value={newDue} onChangeText={setNewDue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Melhor dia</Text>
                <TextInput style={s.input} placeholderTextColor="#475569" placeholder="3" keyboardType="number-pad" maxLength={2} value={newBest} onChangeText={setNewBest} />
              </View>
            </View>

            <TouchableOpacity style={s.saveBtn} activeOpacity={0.8} onPress={() => void handleCreateCard()} disabled={savingNew}>
              {savingNew ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnTxt}>Salvar cartão</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowNew(false)} style={s.cancelBtn}>
              <Text style={s.cancelBtnTxt}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Modal: Pagar fatura ── */}
      <Modal visible={showPay} transparent animationType="slide">
        <View style={s.modalBg}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Pagar fatura</Text>
            {card && (
              <Text style={s.modalSub}>Fatura atual: <Text style={{ color: ACCENT, fontWeight: "700" }}>{fmt(card.invoiceCents)}</Text></Text>
            )}
            <Text style={s.fieldLabel}>Valor a pagar</Text>
            <TextInput style={s.input} placeholderTextColor="#475569" placeholder="R$ 0,00" keyboardType="decimal-pad" value={payAmt} onChangeText={setPayAmt} autoFocus />

            {accounts.length > 0 && (
              <>
                <Text style={s.fieldLabel}>Débitar de (opcional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => setPayAccId("")} style={[s.accChip, !payAccId && s.accChipSel]}>
                      <Text style={[s.accChipTxt, !payAccId && { color: "#fff" }]}>Nenhuma</Text>
                    </TouchableOpacity>
                    {accounts.map(a => (
                      <TouchableOpacity key={a.id} activeOpacity={0.7} onPress={() => setPayAccId(a.id)} style={[s.accChip, payAccId === a.id && s.accChipSel]}>
                        <Text style={[s.accChipTxt, payAccId === a.id && { color: "#fff" }]}>{a.nick}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            <TouchableOpacity style={s.saveBtn} activeOpacity={0.8} onPress={() => void handlePay()} disabled={savingPay}>
              {savingPay ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnTxt}>Confirmar pagamento</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPay(false)} style={s.cancelBtn}>
              <Text style={s.cancelBtnTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Lançar gasto ── */}
      <Modal visible={showGasto} transparent animationType="slide">
        <View style={s.modalBg}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Lançar gasto no cartão</Text>
            {card && <Text style={s.modalSub}>{card.nick} •••• {card.last4}</Text>}

            <Text style={s.fieldLabel}>Descrição *</Text>
            <TextInput style={s.input} placeholderTextColor="#475569" placeholder="Ex: Mercado Carrefour" value={gastoTitle} onChangeText={setGastoTitle} autoFocus />

            <Text style={s.fieldLabel}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {EXPENSE_CATS.map(cat => (
                  <TouchableOpacity key={cat} activeOpacity={0.7} onPress={() => setGastoCat(cat)} style={[s.catChip, gastoCat === cat && s.catChipSel]}>
                    <Text style={[s.catChipTxt, gastoCat === cat && { color: "#fff", fontWeight: "700" }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={s.fieldLabel}>Valor *</Text>
            <TextInput style={s.input} placeholderTextColor="#475569" placeholder="R$ 0,00" keyboardType="decimal-pad" value={gastoAmt} onChangeText={setGastoAmt} />

            <TouchableOpacity style={s.saveBtn} activeOpacity={0.8} onPress={() => void handleGasto()} disabled={savingGasto}>
              {savingGasto ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnTxt}>Lançar gasto</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowGasto(false)} style={s.cancelBtn}>
              <Text style={s.cancelBtnTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F172A" },
  loadWrap: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1E293B" },
  backBtn: { paddingRight: 12 },
  backTxt: { color: "#94A3B8", fontSize: 16 },
  headerTitle: { flex: 1, color: "#F1F5F9", fontSize: 17, fontWeight: "700" },
  newBtn: { backgroundColor: "#F59E0B22", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  newBtnTxt: { color: ACCENT, fontSize: 14, fontWeight: "700" },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  summary: { flexDirection: "row", justifyContent: "space-between", margin: 16, backgroundColor: "#1E293B", borderRadius: 14, padding: 16 },
  summaryLabel: { color: "#64748B", fontSize: 12, marginBottom: 2 },
  summaryVal: { color: ACCENT, fontSize: 18, fontWeight: "700" },
  summaryRight: { alignItems: "flex-end" },

  carousel: { paddingTop: 16 },

  cardVisual: { width: CARD_W, height: CARD_H, borderRadius: 20, padding: 20, overflow: "hidden" },
  cardCircle: { position: "absolute" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardLogo: { width: 44, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  cardLogoTxt: { fontWeight: "900", letterSpacing: 0.3 },
  cardNick: { color: "rgba(255,255,255,0.82)", fontSize: 13, fontWeight: "700" },
  cardChip: { width: 38, height: 28, borderRadius: 5, backgroundColor: "#F4D58A", marginTop: 24, marginBottom: 8, borderWidth: 1, borderColor: "rgba(0,0,0,.15)" },
  cardLast4: { color: "rgba(255,255,255,0.92)", fontSize: 15, fontWeight: "500", letterSpacing: 3 },

  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 12, marginBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#334155" },
  dotActive: { backgroundColor: ACCENT, width: 18 },

  detailPanel: { margin: 16, backgroundColor: "#1E293B", borderRadius: 16, padding: 16 },
  detailRow: { marginBottom: 12 },
  detailLabel: { color: "#64748B", fontSize: 13, marginBottom: 2 },
  detailAmt: { fontSize: 26, fontWeight: "800" },

  barTrack: { height: 8, backgroundColor: "#0F172A", borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  barFill: { height: 8, borderRadius: 4 },

  limitRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  limitTxt: { color: "#64748B", fontSize: 12 },

  chips: { flexDirection: "row", gap: 8, marginBottom: 16 },
  chip: { flex: 1, backgroundColor: "#0F172A", borderRadius: 10, padding: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  chipIcon: { fontSize: 14 },
  chipLabel: { color: "#64748B", fontSize: 10 },
  chipVal: { color: "#F1F5F9", fontSize: 12, fontWeight: "700" },

  actions: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, backgroundColor: ACCENT, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  actionBtnSec: { backgroundColor: "#0F172A", borderWidth: 1, borderColor: "#334155" },
  actionBtnTxt: { color: "#0F172A", fontSize: 14, fontWeight: "800" },

  txSection: { marginHorizontal: 16, marginTop: 8 },
  txTitle: { color: "#94A3B8", fontSize: 12, fontWeight: "700", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  txRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#1E293B", borderRadius: 12, padding: 14, marginBottom: 8 },
  txLeft: { flex: 1, marginRight: 12 },
  txName: { color: "#F1F5F9", fontSize: 14, fontWeight: "600" },
  txCat: { color: "#64748B", fontSize: 12, marginTop: 2 },
  txAmt: { fontSize: 14, fontWeight: "700" },

  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { color: "#F1F5F9", fontSize: 20, fontWeight: "700", marginBottom: 8 },
  emptySub: { color: "#64748B", fontSize: 14, textAlign: "center", marginBottom: 24 },
  emptyBtn: { backgroundColor: ACCENT, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  emptyBtnTxt: { color: "#0F172A", fontSize: 15, fontWeight: "800" },

  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#1E293B", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { color: "#F1F5F9", fontSize: 18, fontWeight: "800", marginBottom: 4 },
  modalSub: { color: "#94A3B8", fontSize: 13, marginBottom: 20 },

  fieldLabel: { color: "#94A3B8", fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
  input: { backgroundColor: "#0F172A", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: "#F1F5F9", fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: "#334155" },

  saveBtn: { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveBtnTxt: { color: "#0F172A", fontSize: 16, fontWeight: "800" },
  cancelBtn: { alignItems: "center", paddingTop: 14 },
  cancelBtnTxt: { color: "#64748B", fontSize: 14 },

  brandChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, opacity: 0.75 },
  brandChipSel: { opacity: 1, borderWidth: 2, borderColor: "rgba(255,255,255,0.8)" },
  brandChipTxt: { color: "#fff", fontSize: 13 },

  accChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: "#0F172A", borderWidth: 1, borderColor: "#334155" },
  accChipSel: { backgroundColor: "#1D4ED8", borderColor: "#3B82F6" },
  accChipTxt: { color: "#94A3B8", fontSize: 13 },

  catChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: "#0F172A", borderWidth: 1, borderColor: "#334155" },
  catChipSel: { backgroundColor: "#F59E0B22", borderColor: ACCENT },
  catChipTxt: { color: "#94A3B8", fontSize: 13 },
});
