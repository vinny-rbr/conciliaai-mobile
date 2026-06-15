import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Dimensions,
} from "react-native";
import { fmt } from "../../lib/financeService";
import { createBankAccount, updateBankAccount } from "../../lib/bankAccountsService";
import type { BankAccount, FinanceItem } from "../../types/finance";
import { AnimatedCard } from "./CollapsePanel";

export const BANK_COLORS: Record<string, string> = {
  nubank: "#820AD1", inter: "#FF7A00", itau: "#003399",
  bradesco: "#CC092F", bb: "#0033A0", caixa: "#006BB6",
  santander: "#EC0000", picpay: "#21C25E",
};

export function bankColor(bank: string): string {
  const k = bank.toLowerCase();
  for (const [key, c] of Object.entries(BANK_COLORS)) if (k.includes(key)) return c;
  return "#334155";
}

export type BankCfg = { bg1: string; bg2: string; logoBg: string; logoText: string; logoColor: string };

export function getBankCfg(bank: string): BankCfg {
  const k = bank.toLowerCase();
  if (k.includes("nubank"))    return { bg1: "#820AD1", bg2: "#4A0080", logoBg: "rgba(255,255,255,.18)", logoText: "N",  logoColor: "#fff" };
  if (k.includes("inter"))     return { bg1: "#FF7A00", bg2: "#C25000", logoBg: "rgba(255,255,255,.18)", logoText: "i",  logoColor: "#fff" };
  if (k.includes("bb") || k.includes("brasil")) return { bg1: "#0038A8", bg2: "#001C6E", logoBg: "#FFD700", logoText: "BB", logoColor: "#0038A8" };
  if (k.includes("bradesco"))  return { bg1: "#CC092F", bg2: "#8A0020", logoBg: "rgba(255,255,255,.18)", logoText: "B",  logoColor: "#fff" };
  if (k.includes("itau") || k.includes("itaú")) return { bg1: "#003399", bg2: "#001566", logoBg: "#FFB300", logoText: "i", logoColor: "#003399" };
  if (k.includes("caixa"))     return { bg1: "#006BB6", bg2: "#004880", logoBg: "rgba(255,255,255,.18)", logoText: "C",  logoColor: "#fff" };
  if (k.includes("santander")) return { bg1: "#EC0000", bg2: "#A00000", logoBg: "rgba(255,255,255,.18)", logoText: "S",  logoColor: "#fff" };
  if (k.includes("picpay"))    return { bg1: "#21C25E", bg2: "#118040", logoBg: "rgba(255,255,255,.18)", logoText: "PP", logoColor: "#fff" };
  return { bg1: "#1E3A8A", bg2: "#0F1F4D", logoBg: "rgba(255,255,255,.18)", logoText: bank[0]?.toUpperCase() ?? "?", logoColor: "#fff" };
}

export type BankListItem = { name: string; key: string; logoText: string; logoBg: string; logoColor: string; bg: string };

export const BANKS_LIST: BankListItem[] = [
  { name: "Nubank",          key: "nubank",    logoText: "nu",    logoBg: "#820AD1",               logoColor: "#fff",     bg: "#820AD1" },
  { name: "Banco do Brasil", key: "bb",        logoText: "BB",    logoBg: "#0038A8",               logoColor: "#FFD700",  bg: "#0038A8" },
  { name: "Itaú",            key: "itau",      logoText: "i",     logoBg: "#FF6B00",               logoColor: "#fff",     bg: "#FF6B00" },
  { name: "PicPay",          key: "picpay",    logoText: "PP",    logoBg: "#21C25E",               logoColor: "#fff",     bg: "#21C25E" },
  { name: "Inter",           key: "inter",     logoText: "Inter", logoBg: "#FF7A00",               logoColor: "#fff",     bg: "#FF7A00" },
  { name: "C6 Bank",         key: "c6",        logoText: "C6",    logoBg: "#1A1A1A",               logoColor: "#C0A060",  bg: "#1A1A1A" },
  { name: "Caixa",           key: "caixa",     logoText: "C",     logoBg: "#006BB6",               logoColor: "#fff",     bg: "#006BB6" },
  { name: "Santander",       key: "santander", logoText: "S",     logoBg: "#EC0000",               logoColor: "#fff",     bg: "#EC0000" },
  { name: "Bradesco",        key: "bradesco",  logoText: "B",     logoBg: "#CC092F",               logoColor: "#fff",     bg: "#CC092F" },
  { name: "Outro",           key: "outro",     logoText: "?",     logoBg: "#334155",               logoColor: "#94A3B8",  bg: "#334155" },
];

export const CARD_COLORS = [
  { key: "default", label: "Padrão" },
  { key: "#9333EA", label: "Roxo" },
  { key: "#2563EB", label: "Azul" },
  { key: "#16A34A", label: "Verde" },
  { key: "#334155", label: "Escuro" },
];

const CARD_W = Dimensions.get("window").width - 32;
const CARD_H = 210;

export function BankCardVisual({ account, hidden, dimmed = false, bgOverride, showBalance = true, computedCents }: { account: BankAccount; hidden: boolean; dimmed?: boolean; bgOverride?: string; showBalance?: boolean; computedCents?: number }) {
  const cfg = getBankCfg(account.bank);
  const bg1 = bgOverride ?? cfg.bg1;
  const bg2 = bgOverride ? "rgba(0,0,0,0.3)" : cfg.bg2;
  return (
    <View style={{ width: CARD_W, height: CARD_H, borderRadius: 20, backgroundColor: bg1, padding: 20, overflow: "hidden", opacity: dimmed ? 0.65 : 1 }}>
      {/* Decorative circles */}
      <View style={{ position: "absolute", bottom: -40, right: -40, width: 170, height: 170, borderRadius: 85, backgroundColor: bg2 }} />
      <View style={{ position: "absolute", top: -30, right: 50,  width: 110, height: 110, borderRadius: 55, backgroundColor: bg2, opacity: 0.5 }} />
      {/* Top: logo + card name */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ width: 44, height: 32, borderRadius: 8, backgroundColor: cfg.logoBg, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: cfg.logoColor, fontSize: cfg.logoText.length === 1 ? 18 : 11, fontWeight: "900", letterSpacing: 0.3 }}>{cfg.logoText}</Text>
        </View>
        <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 13, fontWeight: "700" }}>{account.nick}</Text>
      </View>
      {/* Chip */}
      <View style={{ marginTop: 14, width: 38, height: 28, borderRadius: 6, backgroundColor: "#D4A520", justifyContent: "center", alignItems: "center" }}>
        <View style={{ width: "68%", height: 1, backgroundColor: "rgba(0,0,0,0.22)", marginBottom: 5 }} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <View style={{ width: 1, height: 13, backgroundColor: "rgba(0,0,0,0.18)" }} />
          <View style={{ width: 14, height: 13, borderRadius: 2, borderWidth: 1, borderColor: "rgba(0,0,0,0.15)" }} />
          <View style={{ width: 1, height: 13, backgroundColor: "rgba(0,0,0,0.18)" }} />
        </View>
        <View style={{ width: "68%", height: 1, backgroundColor: "rgba(0,0,0,0.22)", marginTop: 5 }} />
      </View>
      {/* Saldo disponível */}
      {showBalance && (
        <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: 10 }}>
          {(() => {
            const displayCents = account.balanceCents !== 0 ? account.balanceCents : (computedCents ?? 0);
            const isComputed = account.balanceCents === 0 && (computedCents ?? 0) !== 0;
            return (
              <>
                <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" }}>
                  {isComputed ? "Saldo calculado" : "Saldo disponível"}
                </Text>
                {hidden ? (
                  <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 3 }}>R$ ••••••</Text>
                ) : displayCents === 0 ? (
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8 }}>
                    <View style={{ backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}>
                      <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "700" }}>+ Definir saldo</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 3 }}>{fmt(displayCents)}</Text>
                )}
              </>
            );
          })()}
        </View>
      )}
      {!showBalance && <View style={{ flex: 1 }} />}
      {/* Bottom: number + brand */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 15, fontWeight: "600", letterSpacing: 3 }}>
          {hidden ? "•••• ••••" : `•••• ${account.last4 || "----"}`}
        </Text>
        {/* Mastercard circles */}
        <View style={{ flexDirection: "row" }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#EB001B" }} />
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#FF5F00", marginLeft: -10 }} />
        </View>
      </View>
    </View>
  );
}

export function computeAccountBalance(accountId: string, items: FinanceItem[]): number {
  let rec = 0, des = 0;
  for (const it of items) {
    if (it.accountId !== accountId) continue;
    if (it.type === "RECEITA") rec += it.amountCents;
    if (it.type === "DESPESA") des += it.amountCents;
  }
  return rec - des;
}

export function BankCarousel({ accounts, hidden, onSaved, items }: { accounts: BankAccount[]; hidden: boolean; onSaved: () => void; items: FinanceItem[] }) {
  const [activeIdx, setActiveIdx]   = useState(0);
  const [expanded, setExpanded]     = useState(false);
  // Modal: lista de contas
  const [accountsOpen, setAccountsOpen] = useState(false);
  // Modal: adicionar banco (2 passos)
  const [addOpen, setAddOpen]       = useState(false);
  const [addStep, setAddStep]       = useState<0 | 1>(0);
  const [selBank, setSelBank]       = useState<BankListItem | null>(null);
  const [addNick, setAddNick]       = useState("");
  const [addType, setAddType]       = useState<"corrente" | "poupanca" | "credito">("corrente");
  const [addColor, setAddColor]     = useState("default");
  const [addBalance, setAddBalance] = useState("");
  const [saving, setSaving]         = useState(false);
  // Editar saldo de conta existente
  const [editBalanceAcc, setEditBalanceAcc]   = useState<BankAccount | null>(null);
  const [editBalanceVal, setEditBalanceVal]   = useState("");
  const [savingBalance, setSavingBalance]     = useState(false);

  const nextIdx = accounts.length > 1 ? (activeIdx + 1) % accounts.length : -1;

  function openAdd() { setAddStep(0); setSelBank(null); setAddNick(""); setAddType("corrente"); setAddColor("default"); setAddBalance(""); setAddOpen(true); }
  function closeAdd() { setAddOpen(false); }

  async function handleSave() {
    if (!selBank || !addNick.trim()) return;
    setSaving(true);
    const balanceCents = addBalance.trim()
      ? Math.round(parseFloat(addBalance.replace(",", ".")) * 100)
      : 0;
    const ok = await createBankAccount({
      bank: selBank.name,
      nick: addNick.trim(),
      accountType: addType,
      face: addColor !== "default" ? addColor : undefined,
      balanceCents: isNaN(balanceCents) ? 0 : balanceCents,
    });
    setSaving(false);
    if (ok) { closeAdd(); onSaved(); }
  }

  async function handleSaveBalance() {
    if (!editBalanceAcc || !editBalanceVal.trim()) return;
    setSavingBalance(true);
    const cents = Math.round(parseFloat(editBalanceVal.replace(",", ".")) * 100);
    const ok = await updateBankAccount(editBalanceAcc.id, { balanceCents: isNaN(cents) ? 0 : cents });
    setSavingBalance(false);
    if (ok) { setEditBalanceAcc(null); setEditBalanceVal(""); onSaved(); }
  }

  // Preview account for step 2
  const previewAcc: BankAccount = {
    id: "preview", userId: "", nick: addNick || selBank?.name || "",
    bank: selBank?.name ?? "", accountType: addType, last4: "0000", balanceCents: 0,
  };
  const bgOverride = addColor !== "default" ? addColor : undefined;

  return (
    <View style={{ marginBottom: 4 }}>
      {/* ── Carousel ou Expandido ── */}
      {expanded ? (
        <View style={{ gap: 12 }}>
          {accounts.map(acc => {
            const computed = computeAccountBalance(acc.id, items);
            const noBalance = acc.balanceCents === 0 && computed === 0;
            return (
              <AnimatedCard key={acc.id}>
                <TouchableOpacity activeOpacity={0.92}
                  onPress={noBalance
                    ? () => { setEditBalanceAcc(acc); setEditBalanceVal(""); }
                    : () => setAccountsOpen(true)
                  }
                >
                  <BankCardVisual account={acc} hidden={hidden} computedCents={computed} />
                </TouchableOpacity>
              </AnimatedCard>
            );
          })}
        </View>
      ) : (
        <View style={{ paddingTop: 14 }}>
          <View style={{ position: "relative" }}>
            {nextIdx >= 0 && (
              <View style={{ position: "absolute", top: -11, left: 6, right: 6, height: CARD_H, borderRadius: 20, overflow: "hidden" }}>
                <BankCardVisual account={accounts[nextIdx]} hidden={hidden} dimmed computedCents={computeAccountBalance(accounts[nextIdx].id, items)} />
              </View>
            )}
            <View style={{ elevation: 6, shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }}>
              <ScrollView
                horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                decelerationRate="fast" snapToInterval={CARD_W}
                onMomentumScrollEnd={e => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
                  setActiveIdx(Math.max(0, Math.min(idx, accounts.length - 1)));
                }}
              >
                {accounts.map(acc => {
                  const computed = computeAccountBalance(acc.id, items);
                  const noBalance = acc.balanceCents === 0 && computed === 0;
                  return (
                    <TouchableOpacity key={acc.id} activeOpacity={0.92}
                      onPress={noBalance
                        ? () => { setEditBalanceAcc(acc); setEditBalanceVal(""); }
                        : () => setAccountsOpen(true)
                      }
                    >
                      <BankCardVisual account={acc} hidden={hidden} computedCents={computed} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </View>
      )}

      {!expanded && accounts.length > 1 && (
        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 14 }}>
          {accounts.map((_, i) => (
            <View key={i} style={{ width: i === activeIdx ? 22 : 6, height: 6, borderRadius: 3, backgroundColor: i === activeIdx ? "#3B82F6" : "#334155" }} />
          ))}
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "#1E293B", borderRadius: 14, paddingVertical: 13, alignItems: "center", borderWidth: 1, borderColor: "#334155" }}
          onPress={() => setExpanded(e => !e)}
        >
          <Text style={{ color: "#F1F5F9", fontSize: 13, fontWeight: "700" }}>{expanded ? "Recolher" : "Expandir cartões"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "#2563EB", borderRadius: 14, paddingVertical: 13, alignItems: "center" }}
          onPress={openAdd}
        >
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>+ Novo banco</Text>
        </TouchableOpacity>
      </View>

      {!expanded && (
        <Text style={{ color: "#475569", fontSize: 11, textAlign: "center", marginTop: 10, fontWeight: "600" }}>
          Deslize pra trocar · toque pra abrir a conta
        </Text>
      )}

      {/* ── Modal: lista de contas ── */}
      <Modal visible={accountsOpen} transparent animationType="slide" onRequestClose={() => setAccountsOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#0F172A", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "88%" }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#334155", alignSelf: "center", marginTop: 12, marginBottom: 4 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14 }}>
              <View>
                <Text style={{ color: "#F1F5F9", fontSize: 18, fontWeight: "800" }}>Minhas contas</Text>
                <Text style={{ color: "#64748B", fontSize: 12, marginTop: 2 }}>
                  {accounts.length} {accounts.length === 1 ? "banco" : "bancos"} · saldo total: {hidden ? "•••" : fmt(accounts.reduce((s, a) => s + a.balanceCents, 0))}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAccountsOpen(false)}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#1E293B", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#334155" }}>
                <Text style={{ color: "#94A3B8", fontSize: 16, fontWeight: "700" }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ paddingHorizontal: 16 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <Text style={{ color: "#475569", fontSize: 11, fontWeight: "700", marginBottom: 10, letterSpacing: 1 }}>LISTA DE CONTAS</Text>
              {accounts.map(acc => {
                const cfg = getBankCfg(acc.bank);
                const computedAcc = computeAccountBalance(acc.id, items);
                const displayBalance = acc.balanceCents !== 0 ? acc.balanceCents : computedAcc;
                const isComputed = acc.balanceCents === 0 && computedAcc !== 0;
                const hasAnyBalance = displayBalance !== 0;
                return (
                  <View key={acc.id} style={{ backgroundColor: "#1E293B", borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: "#334155", overflow: "hidden" }}>
                    <TouchableOpacity
                      style={{ flexDirection: "row", alignItems: "center", padding: 14, gap: 12 }}
                      activeOpacity={0.7}>
                      <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: cfg.bg1, justifyContent: "center", alignItems: "center" }}>
                        <Text style={{ color: cfg.logoColor, fontSize: cfg.logoText.length === 1 ? 20 : 11, fontWeight: "900" }}>{cfg.logoText}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#F1F5F9", fontSize: 15, fontWeight: "700" }}>{acc.bank}</Text>
                        <Text style={{ color: "#64748B", fontSize: 12, marginTop: 2 }}>
                          {acc.accountType === "credito" ? "Cartão de crédito" : acc.accountType === "poupanca" ? "Poupança" : "Conta corrente"} · •••{acc.last4 || "----"}
                        </Text>
                        {isComputed && <Text style={{ color: "#475569", fontSize: 10, marginTop: 1 }}>calculado dos lançamentos</Text>}
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <Text style={{ color: hasAnyBalance ? (isComputed ? "#94A3B8" : "#F1F5F9") : "#475569", fontSize: 15, fontWeight: "700" }}>
                          {hidden ? "•••" : hasAnyBalance ? fmt(displayBalance) : "—"}
                        </Text>
                        <Text style={{ color: "#475569", fontSize: 18, lineHeight: 18 }}>›</Text>
                      </View>
                    </TouchableOpacity>
                    {/* Botão definir saldo só quando nem saldo real nem calculado existe */}
                    {!hasAnyBalance && (
                      <TouchableOpacity
                        onPress={() => { setEditBalanceAcc(acc); setEditBalanceVal(""); setAccountsOpen(false); }}
                        style={{ backgroundColor: "#1D4ED822", borderTopWidth: 1, borderTopColor: "#334155", paddingVertical: 10, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: "#60A5FA", fontSize: 12, fontWeight: "700" }}>✏ Definir saldo desta conta</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
              <TouchableOpacity style={{ backgroundColor: "#1E293B", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: "#1D4ED844", flexDirection: "row", justifyContent: "center", gap: 10 }}>
                <Text style={{ color: "#60A5FA", fontSize: 17 }}>⇄</Text>
                <Text style={{ color: "#60A5FA", fontSize: 14, fontWeight: "700" }}>Transferência entre contas</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setAccountsOpen(false); openAdd(); }}
                style={{ backgroundColor: "#2563EB", borderRadius: 14, padding: 16, alignItems: "center" }}>
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>+ Adicionar nova conta</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modal: definir saldo de conta existente ── */}
      <Modal visible={!!editBalanceAcc} transparent animationType="fade" onRequestClose={() => setEditBalanceAcc(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 24 }}>
          <View style={{ backgroundColor: "#1E293B", borderRadius: 20, padding: 24, width: "100%", borderWidth: 1, borderColor: "#334155" }}>
            {/* Header */}
            <Text style={{ color: "#F1F5F9", fontSize: 17, fontWeight: "800", marginBottom: 4 }}>
              Definir saldo — {editBalanceAcc?.bank}
            </Text>
            <Text style={{ color: "#64748B", fontSize: 12, marginBottom: 20 }}>
              Informe o saldo atual desta conta.
            </Text>
            {/* Input */}
            <View style={{ backgroundColor: "#0F172A", borderRadius: 14, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 20, borderWidth: 1, borderColor: "#334155" }}>
              <Text style={{ color: "#64748B", fontSize: 18, fontWeight: "700", marginRight: 6 }}>R$</Text>
              <TextInput
                value={editBalanceVal}
                onChangeText={t => setEditBalanceVal(t.replace(/[^0-9.,]/g, ""))}
                placeholder="0,00"
                placeholderTextColor="#475569"
                keyboardType="decimal-pad"
                autoFocus
                style={{ flex: 1, paddingVertical: 16, color: "#F1F5F9", fontSize: 22, fontWeight: "700" }}
              />
            </View>
            {/* Botões */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setEditBalanceAcc(null)}
                style={{ flex: 1, backgroundColor: "#334155", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
              >
                <Text style={{ color: "#94A3B8", fontSize: 14, fontWeight: "700" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveBalance}
                disabled={savingBalance || !editBalanceVal.trim()}
                style={{ flex: 1, backgroundColor: !editBalanceVal.trim() ? "#334155" : "#2563EB", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
              >
                {savingBalance
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: !editBalanceVal.trim() ? "#475569" : "#fff", fontSize: 14, fontWeight: "700" }}>Salvar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal: adicionar banco (2 passos) ── */}
      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={closeAdd}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#0F172A", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "92%" }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#334155", alignSelf: "center", marginTop: 12, marginBottom: 4 }} />

            {addStep === 0 ? (
              /* ── Passo 1: Escolher banco ── */
              <>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 }}>
                  <View>
                    <Text style={{ color: "#F1F5F9", fontSize: 18, fontWeight: "800" }}>Adicionar banco</Text>
                    <Text style={{ color: "#64748B", fontSize: 12, marginTop: 3 }}>Escolha a instituição. Você pode cadastrar quantos bancos quiser.</Text>
                  </View>
                  <TouchableOpacity onPress={closeAdd}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#1E293B", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#334155" }}>
                    <Text style={{ color: "#94A3B8", fontSize: 16, fontWeight: "700" }}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                    {BANKS_LIST.map(bank => (
                      <TouchableOpacity key={bank.key}
                        style={{ width: "47%", flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#1E293B", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#334155" }}
                        activeOpacity={0.7}
                        onPress={() => { setSelBank(bank); setAddNick(bank.name); setAddStep(1); }}
                      >
                        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: bank.logoBg, justifyContent: "center", alignItems: "center" }}>
                          <Text style={{ color: bank.logoColor, fontSize: bank.logoText.length <= 2 ? 14 : 10, fontWeight: "900" }}>{bank.logoText}</Text>
                        </View>
                        <Text style={{ color: "#F1F5F9", fontSize: 14, fontWeight: "700", flex: 1 }} numberOfLines={1}>{bank.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            ) : (
              /* ── Passo 2: Formulário da conta ── */
              <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Header com voltar */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 10, paddingBottom: 16 }}>
                  <TouchableOpacity onPress={() => setAddStep(0)}
                    style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#1E293B", justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ color: "#94A3B8", fontSize: 18, fontWeight: "700" }}>‹</Text>
                  </TouchableOpacity>
                  <View>
                    <Text style={{ color: "#F1F5F9", fontSize: 18, fontWeight: "800" }}>{selBank?.name}</Text>
                    <Text style={{ color: "#64748B", fontSize: 12 }}>Como você quer chamar essa conta?</Text>
                  </View>
                </View>

                {/* Preview do cartão */}
                <View style={{ alignItems: "center", marginBottom: 20 }}>
                  <BankCardVisual account={previewAcc} hidden={false} bgOverride={bgOverride} showBalance={false} />
                </View>

                {/* Apelido */}
                <Text style={{ color: "#94A3B8", fontSize: 13, fontWeight: "700", marginBottom: 8 }}>Apelido da conta</Text>
                <TextInput
                  value={addNick}
                  onChangeText={setAddNick}
                  placeholder="Ex: Conta pessoal"
                  placeholderTextColor="#475569"
                  style={{ backgroundColor: "#1E293B", borderRadius: 14, padding: 16, color: "#F1F5F9", fontSize: 15, fontWeight: "600", marginBottom: 16, borderWidth: 1, borderColor: "#334155" }}
                />

                {/* Saldo inicial */}
                <Text style={{ color: "#94A3B8", fontSize: 13, fontWeight: "700", marginBottom: 8 }}>Saldo inicial <Text style={{ color: "#475569", fontWeight: "400" }}>(opcional)</Text></Text>
                <View style={{ backgroundColor: "#1E293B", borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: "#334155", flexDirection: "row", alignItems: "center", paddingHorizontal: 16 }}>
                  <Text style={{ color: "#64748B", fontSize: 16, fontWeight: "700", marginRight: 4 }}>R$</Text>
                  <TextInput
                    value={addBalance}
                    onChangeText={t => setAddBalance(t.replace(/[^0-9.,]/g, ""))}
                    placeholder="0,00"
                    placeholderTextColor="#475569"
                    keyboardType="decimal-pad"
                    style={{ flex: 1, padding: 14, color: "#F1F5F9", fontSize: 18, fontWeight: "700" }}
                  />
                </View>

                {/* Tipo de conta */}
                <Text style={{ color: "#94A3B8", fontSize: 13, fontWeight: "700", marginBottom: 8 }}>Tipo de conta</Text>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                  {(["corrente", "poupanca", "credito"] as const).map(t => {
                    const label = t === "corrente" ? "Conta corrente" : t === "poupanca" ? "Poupança" : "Cartão de crédito";
                    const active = addType === t;
                    return (
                      <TouchableOpacity key={t} onPress={() => setAddType(t)}
                        style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: active ? "#2563EB" : "#1E293B", borderWidth: 1, borderColor: active ? "#3B82F6" : "#334155" }}>
                        <Text style={{ color: active ? "#fff" : "#94A3B8", fontSize: 11, fontWeight: "700" }}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Cor do cartão */}
                <Text style={{ color: "#94A3B8", fontSize: 13, fontWeight: "700", marginBottom: 10 }}>Cor do cartão</Text>
                <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
                  {CARD_COLORS.map(c => {
                    const active = addColor === c.key;
                    const isDefault = c.key === "default";
                    return (
                      <TouchableOpacity key={c.key} onPress={() => setAddColor(c.key)}
                        style={{ width: 44, height: 44, borderRadius: 14, overflow: "hidden", borderWidth: active ? 2.5 : 1.5, borderColor: active ? "#F1F5F9" : "transparent" }}>
                        {isDefault ? (
                          <View style={{ flex: 1, backgroundColor: selBank?.bg ?? "#334155" }}>
                            <View style={{ position: "absolute", inset: 0, backgroundColor: "#9333EA", opacity: 0.3 }} />
                          </View>
                        ) : (
                          <View style={{ flex: 1, backgroundColor: c.key }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Salvar */}
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving || !addNick.trim()}
                  style={{ backgroundColor: saving || !addNick.trim() ? "#1E293B" : "#D97706", borderRadius: 16, padding: 17, alignItems: "center" }}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ color: saving || !addNick.trim() ? "#475569" : "#fff", fontSize: 16, fontWeight: "800" }}>Salvar conta</Text>
                  }
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
