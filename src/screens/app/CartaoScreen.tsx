import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { CreditCard, CreditCardBrand, CreditCardTransaction } from "../../types/creditCard";
import { listCreditCards, createCreditCard, updateCreditCard, deleteCreditCard, listCardTransactions, addCardExpense, payCardInvoice } from "../../lib/creditCardService";
import { listBankAccounts } from "../../lib/bankAccountsService";
import type { BankAccount } from "../../types/finance";
import { fmt } from "../../lib/financeService";
import { ACCENT, CARD_W, s, parseBRL } from "./cartao/shared";
import { CreditCardVisual, LimitBar } from "./cartao/components";
import { NewCardModal, PayInvoiceModal, LancarGastoModal, EditCardModal } from "./cartao/Modals";

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
  const [showEdit, setShowEdit]     = useState(false);

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
    try { setTxs(await listCardTransactions(cardId)); }
    catch { setTxs([]); }
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [cs, accs] = await Promise.all([listCreditCards(), listBankAccounts()]);
      setCards(cs);
      setAccounts(accs.filter(a => a.accountType !== "credito"));
      if (cs.length > 0) await loadTxs(cs[0].id);
      else setTxs([]);
    } catch { /* silent */ }
    setLoading(false); setRefreshing(false);
  }, [loadTxs]);

  useEffect(() => { void load(); }, [load]);

  const selectCard = (idx: number) => {
    setSelIdx(idx);
    if (cards[idx]) void loadTxs(cards[idx].id);
  };

  const handleCreateCard = async () => {
    if (!newNick.trim() || !newLast4.trim() || !newLimit.trim()) { Alert.alert("Preencha todos os campos obrigatórios."); return; }
    if (newLast4.length !== 4 || isNaN(Number(newLast4))) { Alert.alert("Os 4 últimos dígitos devem ser numéricos."); return; }
    setSavingNew(true);
    try {
      await createCreditCard({ brand: newBrand, nick: newNick.trim(), last4: newLast4, limitCents: parseBRL(newLimit), closingDay: parseInt(newClosing) || 3, dueDay: parseInt(newDue) || 10, bestDay: parseInt(newBest) || 3 });
      setShowNew(false);
      setNewNick(""); setNewLast4(""); setNewLimit(""); setNewBrand("nubank"); setNewClosing("3"); setNewDue("10"); setNewBest("3");
      await load(true); setSelIdx(0);
    } catch (e) { Alert.alert("Erro", String(e)); }
    setSavingNew(false);
  };

  const handlePay = async () => {
    if (!card) return;
    const amt = parseBRL(payAmt);
    if (amt <= 0) { Alert.alert("Informe o valor a pagar."); return; }
    setSavingPay(true);
    try { await payCardInvoice(card.id, amt, payAccId || undefined); setShowPay(false); setPayAmt(""); await load(true); }
    catch (e) { Alert.alert("Erro", String(e)); }
    setSavingPay(false);
  };

  const handleGasto = async () => {
    if (!card) return;
    if (!gastoTitle.trim()) { Alert.alert("Informe a descrição."); return; }
    const amt = parseBRL(gastoAmt);
    if (amt <= 0) { Alert.alert("Informe o valor."); return; }
    setSavingGasto(true);
    try { await addCardExpense(card.id, { title: gastoTitle.trim(), category: gastoCat, amountCents: amt }); setShowGasto(false); setGastoTitle(""); setGastoAmt(""); setGastoCat("Outros"); await load(true); }
    catch (e) { Alert.alert("Erro", String(e)); }
    setSavingGasto(false);
  };

  const totalFatura = cards.reduce((a, c) => a + c.invoiceCents, 0);
  const totalLimit  = cards.reduce((a, c) => a + c.limitCents, 0);

  if (loading) return <SafeAreaView style={s.root}><View style={s.loadWrap}><ActivityIndicator color={ACCENT} size="large" /></View></SafeAreaView>;

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={s.backBtn}><Text style={s.backTxt}>‹ Voltar</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Cartões de crédito</Text>
        <TouchableOpacity onPress={() => setShowNew(true)} activeOpacity={0.7} style={s.newBtn}><Text style={s.newBtnTxt}>+ Novo</Text></TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }} tintColor={ACCENT} />}
      >
        {cards.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>💳</Text>
            <Text style={s.emptyTitle}>Nenhum cartão ainda</Text>
            <Text style={s.emptySub}>Adicione seu cartão de crédito para acompanhar sua fatura</Text>
            <TouchableOpacity onPress={() => setShowNew(true)} activeOpacity={0.7} style={s.emptyBtn}><Text style={s.emptyBtnTxt}>+ Adicionar cartão</Text></TouchableOpacity>
          </View>
        ) : (
          <>
            {cards.length > 1 && (
              <View style={s.summary}>
                <View><Text style={s.summaryLabel}>Fatura total aberta</Text><Text style={s.summaryVal}>{fmt(totalFatura)}</Text></View>
                <View style={s.summaryRight}><Text style={s.summaryLabel}>Limite total</Text><Text style={[s.summaryVal, { color: "#94A3B8" }]}>{fmt(totalLimit)}</Text></View>
              </View>
            )}
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={s.carousel}
              onMomentumScrollEnd={e => { const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_W); selectCard(Math.max(0, Math.min(idx, cards.length - 1))); }}>
              {cards.map(c => <View key={c.id} style={{ width: CARD_W, marginHorizontal: 24 }}><CreditCardVisual card={c} /></View>)}
            </ScrollView>
            {cards.length > 1 && <View style={s.dots}>{cards.map((_, i) => <View key={i} style={[s.dot, i === selIdx && s.dotActive]} />)}</View>}
            {card && (
              <View style={s.detailPanel}>
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>Fatura aberta</Text>
                  <Text style={[s.detailAmt, { color: card.invoiceCents > 0 ? ACCENT : "#4ADE80" }]}>{fmt(card.invoiceCents)}</Text>
                </View>
                <LimitBar used={card.invoiceCents} limit={card.limitCents} />
                <View style={s.limitRow}>
                  <Text style={s.limitTxt}>Limite {fmt(card.limitCents)}</Text>
                  <Text style={s.limitTxt}>Livre {fmt(Math.max(0, card.limitCents - card.invoiceCents))}</Text>
                </View>
                <View style={s.chips}>
                  {[{ icon: "📅", label: "Vence", val: `dia ${card.dueDay}` }, { icon: "🔒", label: "Fecha", val: `dia ${card.closingDay}` }, { icon: "⭐", label: "Melhor dia", val: `dia ${card.bestDay}` }].map(ch => (
                    <View key={ch.label} style={s.chip}><Text style={s.chipIcon}>{ch.icon}</Text><View><Text style={s.chipLabel}>{ch.label}</Text><Text style={s.chipVal}>{ch.val}</Text></View></View>
                  ))}
                </View>
                <View style={s.actions}>
                  <TouchableOpacity style={s.actionBtn} activeOpacity={0.8} onPress={() => { setPayAmt(((card.invoiceCents) / 100).toFixed(2).replace(".", ",")); setShowPay(true); }}>
                    <Text style={s.actionBtnTxt}>Pagar fatura</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, s.actionBtnSec]} activeOpacity={0.8} onPress={() => setShowGasto(true)}>
                    <Text style={[s.actionBtnTxt, { color: "#F1F5F9" }]}>+ Lançar gasto</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, s.actionBtnSec, { paddingHorizontal: 14 }]} activeOpacity={0.8} onPress={() => setShowEdit(true)}>
                    <Text style={[s.actionBtnTxt, { color: "#94A3B8" }]}>✏️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {txs.length > 0 && (
              <View style={s.txSection}>
                <Text style={s.txTitle}>Lançamentos</Text>
                {txs.map(tx => (
                  <View key={tx.id} style={s.txRow}>
                    <View style={s.txLeft}><Text style={s.txName}>{tx.title}</Text><Text style={s.txCat}>{tx.category} · {tx.dateISO.slice(8)}/{tx.dateISO.slice(5, 7)}</Text></View>
                    <Text style={[s.txAmt, { color: tx.type === "in" ? "#4ADE80" : "#F87171" }]}>{tx.type === "in" ? "+" : "-"}{fmt(Math.abs(tx.amountCents))}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <NewCardModal visible={showNew} onClose={() => setShowNew(false)} brand={newBrand} setBrand={setNewBrand} nick={newNick} setNick={setNewNick} last4={newLast4} setLast4={setNewLast4} limit={newLimit} setLimit={setNewLimit} closing={newClosing} setClosing={setNewClosing} due={newDue} setDue={setNewDue} best={newBest} setBest={setNewBest} saving={savingNew} onSave={() => void handleCreateCard()} />
      <PayInvoiceModal visible={showPay} onClose={() => setShowPay(false)} card={card} payAmt={payAmt} setPayAmt={setPayAmt} payAccId={payAccId} setPayAccId={setPayAccId} accounts={accounts} saving={savingPay} onSave={() => void handlePay()} />
      <LancarGastoModal visible={showGasto} onClose={() => setShowGasto(false)} card={card} title={gastoTitle} setTitle={setGastoTitle} cat={gastoCat} setCat={setGastoCat} amt={gastoAmt} setAmt={setGastoAmt} saving={savingGasto} onSave={() => void handleGasto()} />
      <EditCardModal
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        card={card}
        onSaved={updated => { setCards(cs => cs.map(c => c.id === updated.id ? updated : c)); }}
        onDeleted={() => { setCards(cs => cs.filter(c => c.id !== card?.id)); setSelIdx(0); }}
      />
    </SafeAreaView>
  );
}
