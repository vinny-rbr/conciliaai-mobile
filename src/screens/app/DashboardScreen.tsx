import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, Animated, Dimensions, TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DonutCounter from "../../components/DonutCounter";
import type { DonutSlice } from "../../components/DonutCounter";
import { fetchFinanceItems, fmt } from "../../lib/financeService";
import { listBankAccounts, createBankAccount, updateBankAccount } from "../../lib/bankAccountsService";
import { getPlanName } from "../../lib/auth";
import { useAuth } from "../../context/AuthContext";
import { onTabBarScroll } from "../../navigation/tabBarScroll";
import type { FinanceItem, BankAccount } from "../../types/finance";

// ── helpers ──────────────────────────────────────────────────────────────────
function addMonthsYM(ym: string, add: number): string {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1 + add, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function ymToLabel(ym: string): string {
  const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const [y, m] = ym.split("-");
  return `${months[parseInt(m) - 1]} ${y}`;
}
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function dateLabel(iso: string): string {
  const [, m, d] = iso.split("-");
  const months = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  return `${d} ${months[parseInt(m) - 1]}`;
}

const CATS: Record<string, string> = {
  alimenta:"🍔", mercado:"🛒", transporte:"🚗", saude:"💊", saúde:"💊",
  lazer:"🎮", educa:"📚", moradia:"🏠", roupa:"👕", viagem:"✈️",
  salario:"💼", salário:"💼", investimento:"📈",
};
function catIcon(cat: string): string {
  const k = cat.toLowerCase();
  for (const [key, icon] of Object.entries(CATS)) if (k.includes(key)) return icon;
  return "📦";
}

function Sparkline({ vals, color }: { vals: number[]; color: string }) {
  const max = Math.max(...vals.map(Math.abs), 1);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, height: 24 }}>
      {vals.map((v, i) => (
        <View key={i} style={{
          width: 4, borderRadius: 2,
          height: Math.max(3, Math.round(24 * Math.abs(v) / max)),
          backgroundColor: color,
          opacity: 0.3 + (i / vals.length) * 0.7,
        }} />
      ))}
    </View>
  );
}

const CHART_COLORS = ["#3B82F6","#F59E0B","#10B981","#EF4444","#8B5CF6","#F97316","#06B6D4","#EC4899"];

type SliceWithItems = DonutSlice & { items: FinanceItem[] };

function CollapsePanel({ isOpen, contentHeight, children }: { isOpen: boolean; contentHeight: number; children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: isOpen ? contentHeight : 0,
      useNativeDriver: false,
      tension: 220,
      friction: 20,
    }).start();
  }, [isOpen, contentHeight]);

  return (
    <Animated.View style={{ height: anim, overflow: "hidden", marginTop: 2 }}>
      {children}
    </Animated.View>
  );
}

function AnimatedCard({ children }: { children: React.ReactNode }) {
  const scale   = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, useNativeDriver: true, tension: 120, friction: 12 }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ transform: [{ scale }], opacity }}>{children}</Animated.View>;
}

function DropdownPanel({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) {
  const height  = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(height,  { toValue: isOpen ? 160 : 0, useNativeDriver: false, tension: 200, friction: 18 }),
      Animated.timing(opacity, { toValue: isOpen ? 1 : 0, duration: 160, useNativeDriver: false }),
    ]).start();
  }, [isOpen]);
  return (
    <Animated.View style={{ height, opacity, overflow: "hidden", marginTop: 4 }}>
      {children}
    </Animated.View>
  );
}

function ExpandableLegend({ slices }: { slices: SliceWithItems[] }) {
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

const BANK_COLORS: Record<string, string> = {
  nubank: "#820AD1", inter: "#FF7A00", itau: "#003399",
  bradesco: "#CC092F", bb: "#0033A0", caixa: "#006BB6",
  santander: "#EC0000", picpay: "#21C25E",
};
function bankColor(bank: string): string {
  const k = bank.toLowerCase();
  for (const [key, c] of Object.entries(BANK_COLORS)) if (k.includes(key)) return c;
  return "#334155";
}

const CARD_W = Dimensions.get("window").width - 32;
const CARD_H = 210;

type BankCfg = { bg1: string; bg2: string; logoBg: string; logoText: string; logoColor: string };
function getBankCfg(bank: string): BankCfg {
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

type BankListItem = { name: string; key: string; logoText: string; logoBg: string; logoColor: string; bg: string };
const BANKS_LIST: BankListItem[] = [
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

const CARD_COLORS = [
  { key: "default", label: "Padrão" },
  { key: "#9333EA", label: "Roxo" },
  { key: "#2563EB", label: "Azul" },
  { key: "#16A34A", label: "Verde" },
  { key: "#334155", label: "Escuro" },
];

function BankCardVisual({ account, hidden, dimmed = false, bgOverride, showBalance = true, computedCents }: { account: BankAccount; hidden: boolean; dimmed?: boolean; bgOverride?: string; showBalance?: boolean; computedCents?: number }) {
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

function computeAccountBalance(accountId: string, items: FinanceItem[]): number {
  let rec = 0, des = 0;
  for (const it of items) {
    if (it.accountId !== accountId) continue;
    if (it.type === "RECEITA") rec += it.amountCents;
    if (it.type === "DESPESA") des += it.amountCents;
  }
  return rec - des;
}

function BankCarousel({ accounts, hidden, onSaved, items }: { accounts: BankAccount[]; hidden: boolean; onSaved: () => void; items: FinanceItem[] }) {
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
                  onPress={noBalance ? () => { setEditBalanceAcc(acc); setEditBalanceVal(""); } : undefined}
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
                      onPress={noBalance ? () => { setEditBalanceAcc(acc); setEditBalanceVal(""); } : undefined}
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

const PLAN_COLOR: Record<string, string> = {
  Pro: "#3B82F6", Premium: "#D97706", Basico: "#64748B",
};
const PLAN_LABEL: Record<string, string> = {
  Pro: "● PRO", Premium: "● PREMIUM", Basico: "● BÁSICO",
};

type PeriodKey = "MONTH" | "LAST_3" | "YEAR" | "ALL";
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "MONTH", label: "Mês atual" },
  { key: "LAST_3", label: "Últimos 3 meses" },
  { key: "YEAR", label: "Ano" },
  { key: "ALL", label: "Tudo" },
];

function getPeriodRange(period: PeriodKey): { from: string; to: string } {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(y, m + 1, 0);
  const to = `${y}-${pad(m+1)}-${pad(lastDay.getDate())}`;
  if (period === "MONTH") return { from: `${y}-${pad(m+1)}-01`, to };
  if (period === "LAST_3") return { from: `${y}-${pad(m-1 < 0 ? 12 : m-1)}-01`.replace(/\d{4}/, String(m-1 < 0 ? y-1 : y)), to };
  if (period === "YEAR") return { from: `${y}-01-01`, to };
  return { from: "2000-01-01", to };
}

type AnalyticsTab = "confronto" | "gastos" | "receitas" | "pagamento";

// ── Component ──────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { signOut } = useAuth();
  const [items, setItems] = useState<FinanceItem[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [heroMonth, setHeroMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  });
  const [period, setPeriod] = useState<PeriodKey>("LAST_3");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState<AnalyticsTab>("confronto");
  const [planName, setPlanName] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDay, setSelectedDay]   = useState<string | undefined>(undefined);
  const [chartPickerOpen, setChartPickerOpen] = useState(false);
  const [addedCharts, setAddedCharts]         = useState<string[]>([]);
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const [compareCatOpen, setCompareCatOpen] = useState<"A" | "B" | null>(null);

  const currentMonthYM = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }, []);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    const [data, accs, plan] = await Promise.all([
      fetchFinanceItems(),
      listBankAccounts(),
      getPlanName(),
    ]);
    setItems(data);
    setAccounts(accs);
    setPlanName(plan);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { void load(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); void load(true); }, []);

  // Hero card data
  const heroData = useMemo(() => {
    let rec = 0, des = 0, cumRec = 0, cumDes = 0;
    const endExclusive = addMonthsYM(heroMonth, 1);
    for (const item of items) {
      if (item.dateISO.startsWith(heroMonth)) {
        if (item.type === "RECEITA") rec += item.amountCents;
        if (item.type === "DESPESA") des += item.amountCents;
      }
      if (item.dateISO < endExclusive) {
        if (item.type === "RECEITA") cumRec += item.amountCents;
        if (item.type === "DESPESA") cumDes += item.amountCents;
      }
    }
    const storedSum = accounts.reduce((s, a) => s + a.balanceCents, 0);
    const displayBalance = accounts.length > 0 && storedSum !== 0 ? storedSum : cumRec - cumDes;
    return { rec, des, saldo: displayBalance };
  }, [items, heroMonth, accounts]);

  // Filtered items by period
  const filteredItems = useMemo(() => {
    const { from, to } = getPeriodRange(period);
    return items.filter(it => it.dateISO >= from && it.dateISO <= to);
  }, [items, period]);

  // Sparklines — last 6 months
  const sparklines = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    });
    const rec: number[] = [], des: number[] = [], cred: number[] = [], sal: number[] = [];
    for (const ym of months) {
      let r = 0, d = 0, cr = 0;
      for (const item of items) {
        if (!item.dateISO.startsWith(ym)) continue;
        if (item.type === "RECEITA") r += item.amountCents;
        if (item.type === "DESPESA") { d += item.amountCents; if (item.paymentType === "credit") cr += item.amountCents; }
      }
      rec.push(r); des.push(d); cred.push(cr); sal.push(r - d);
    }
    return { rec, des, cred, sal };
  }, [items]);

  // Summary for filtered period
  const totRec = useMemo(() => filteredItems.filter(it => it.type==="RECEITA").reduce((s,it) => s+it.amountCents, 0), [filteredItems]);
  const totDes = useMemo(() => filteredItems.filter(it => it.type==="DESPESA").reduce((s,it) => s+it.amountCents, 0), [filteredItems]);
  const totCred = useMemo(() => filteredItems.filter(it => it.type==="DESPESA" && it.paymentType==="credit").reduce((s,it) => s+it.amountCents, 0), [filteredItems]);
  const saldo = totRec - totDes;

  // Month comparison (vs last month)
  const monthCmp = useMemo(() => {
    const now = new Date();
    const curYM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    const prevYM = addMonthsYM(curYM, -1);
    let curRec = 0, curDes = 0, prevRec = 0, prevDes = 0;
    for (const it of items) {
      if (it.dateISO.startsWith(curYM)) {
        if (it.type==="RECEITA") curRec += it.amountCents;
        if (it.type==="DESPESA") curDes += it.amountCents;
      }
      if (it.dateISO.startsWith(prevYM)) {
        if (it.type==="RECEITA") prevRec += it.amountCents;
        if (it.type==="DESPESA") prevDes += it.amountCents;
      }
    }
    const pct = (cur: number, prev: number) => prev > 0 ? ((cur - prev) / prev * 100).toFixed(1) : null;
    return {
      rec: pct(curRec, prevRec),
      des: pct(curDes, prevDes),
      sal: pct(curRec - curDes, prevRec - prevDes),
    };
  }, [items]);

  const cmpLine = (pct: string | null, invert = false) => {
    if (!pct) return "vs mês anterior: —";
    const n = parseFloat(pct);
    const up = invert ? n < 0 : n >= 0;
    return `vs mês anterior: ${up ? "↑" : "↓"} ${Math.abs(n).toFixed(1)}%`;
  };

  // Due soon
  const dueSoon = useMemo(() => {
    const today = todayISO();
    const limit = addDaysISO(today, 3);
    return items
      .filter(it => it.type==="DESPESA" && it.status!=="paid" && it.dateISO >= today && it.dateISO <= limit)
      .sort((a,b) => a.dateISO.localeCompare(b.dateISO)).slice(0, 4);
  }, [items]);

  const latest = useMemo(() => filteredItems.slice(0, 8), [filteredItems]);

  // Analytics content
  const analyticsContent = useMemo(() => {
    if (analyticsTab === "confronto") {
      const ratio = totRec > 0 ? Math.min(1, totDes / totRec) : 0;
      return { ratio, label: `${(ratio * 100).toFixed(0)}% comprometido` };
    }
    if (analyticsTab === "gastos") {
      const bycat: Record<string, number> = {};
      filteredItems.filter(it => it.type==="DESPESA").forEach(it => { bycat[it.category] = (bycat[it.category] ?? 0) + it.amountCents; });
      return Object.entries(bycat).sort(([,a],[,b]) => b - a).slice(0, 4).map(([k,v]) => ({ k, v }));
    }
    if (analyticsTab === "receitas") {
      const bycat: Record<string, number> = {};
      filteredItems.filter(it => it.type==="RECEITA").forEach(it => { bycat[it.category] = (bycat[it.category] ?? 0) + it.amountCents; });
      return Object.entries(bycat).sort(([,a],[,b]) => b - a).slice(0, 4).map(([k,v]) => ({ k, v }));
    }
    // pagamento
    const byPay: Record<string, number> = { Pix: 0, Crédito: 0, Débito: 0, Dinheiro: 0 };
    filteredItems.filter(it => it.type==="DESPESA").forEach(it => {
      const lbl = it.paymentType === "pix" ? "Pix" : it.paymentType === "credit" ? "Crédito" : it.paymentType === "debit" ? "Débito" : "Dinheiro";
      byPay[lbl] = (byPay[lbl] ?? 0) + it.amountCents;
    });
    return Object.entries(byPay).filter(([,v]) => v > 0).sort(([,a],[,b]) => b - a).map(([k,v]) => ({ k, v }));
  }, [analyticsTab, filteredItems, totRec, totDes]);

  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}><ActivityIndicator size="large" color="#60A5FA" /></View>
      </SafeAreaView>
    );
  }

  const planKey = planName ?? "Basico";
  const planColor = PLAN_COLOR[planKey] ?? "#64748B";
  const planLabel = PLAN_LABEL[planKey] ?? planKey;
  const periodLabel = PERIODS.find(p => p.key === period)?.label ?? "Período";

  return (
    <SafeAreaView style={s.root}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60A5FA" />}
        onScroll={e => onTabBarScroll(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        {/* Brand bar */}
        <View style={s.brandBar}>
          <View style={s.brandLeft}>
            <View style={s.brandMark}>
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800" }}>C</Text>
            </View>
            <View>
              <Text style={s.brandName}>Conciliaaí</Text>
              <Text style={s.brandSub}>FINANÇAS</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {planName && (
              <View style={[s.planBadge, { backgroundColor: planColor + "22", borderColor: planColor + "55" }]}>
                <Text style={[s.planBadgeTxt, { color: planColor }]}>{planLabel}</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => signOut()} style={s.logoutBtn}>
              <Text style={s.logoutTxt}>↩</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero card */}
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
              {accounts.length > 0 && (
                <Text style={s.heroAccountsHint}>
                  somando {accounts.length} {accounts.length === 1 ? "conta" : "contas"}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => setBalanceHidden(h => !h)} style={s.eyeBtn}>
              <Text style={{ fontSize: 18 }}>{balanceHidden ? "🙈" : "👁"}</Text>
            </TouchableOpacity>
          </View>

          <View style={s.heroStats}>
            <View style={s.heroStat}>
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
            <View style={s.heroDivider} />
            <View style={s.heroStat}>
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

        {/* Period selector */}
        <View style={s.periodRow}>
          <Text style={s.periodRowLabel}>Período da análise</Text>
          <TouchableOpacity style={s.periodBtn} onPress={() => setPeriodOpen(o => !o)}>
            <Text style={s.periodBtnTxt}>{periodLabel}</Text>
            <Text style={{ color: "#94A3B8", fontSize: 12 }}>{periodOpen ? "▲" : "▼"}</Text>
          </TouchableOpacity>
        </View>
        {periodOpen && (
          <View style={s.periodDropdown}>
            {PERIODS.map(p => (
              <TouchableOpacity key={p.key} style={[s.periodOption, period === p.key && s.periodOptionActive]}
                onPress={() => { setPeriod(p.key); setPeriodOpen(false); }}>
                <Text style={[s.periodOptionTxt, period === p.key && { color: "#60A5FA" }]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Meus cartões */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Meus cartões</Text>
          <Text style={s.sectionAction}>Gerenciar ›</Text>
        </View>
        {accounts.length === 0 ? (
          <TouchableOpacity style={s.bankCardAdd}>
            <Text style={s.bankCardAddIcon}>+</Text>
            <Text style={s.bankCardAddTxt}>Adicionar banco</Text>
          </TouchableOpacity>
        ) : (
          <BankCarousel accounts={accounts} hidden={balanceHidden} onSaved={() => void load(true)} items={items} />
        )}

        {/* 4 summary cards */}
        <View style={s.cardsGrid}>
          {([
            { lab: "Receitas",  val: totRec,  color: "#34D399", spark: sparklines.rec,  cmp: cmpLine(monthCmp.rec) },
            { lab: "Despesas",  val: totDes,  color: "#FB7185", spark: sparklines.des,  cmp: cmpLine(monthCmp.des, true) },
            { lab: "Crédito",   val: totCred, color: "#F97316", spark: sparklines.cred, cmp: "gastos no crédito" },
            { lab: "Saldo",     val: saldo,   color: "#60A5FA", spark: sparklines.sal,  cmp: cmpLine(monthCmp.sal) },
          ] as const).map(card => (
            <View key={card.lab} style={[s.statCard, { borderBottomColor: card.color, borderBottomWidth: 3 }]}>
              <Text style={s.statLab}>{card.lab}</Text>
              <Text style={[s.statVal, { color: card.color }]} numberOfLines={1}>
                {balanceHidden ? "•••" : fmt(Math.abs(card.val))}
              </Text>
              <Sparkline vals={card.spark} color={card.color} />
              <Text style={s.statSub}>{card.cmp}</Text>
            </View>
          ))}
        </View>

        {/* Analytics tabs */}
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
              { label: "Despesas",    value: totDes,                       color: d.ratio > 0.9 ? "#EF4444" : d.ratio > 0.7 ? "#F59E0B" : "#F97316", items: filteredItems.filter(it => it.type === "DESPESA") },
              { label: "Receitas",    value: totRec,                       color: "#10B981", items: filteredItems.filter(it => it.type === "RECEITA") },
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
                <DonutCounter key={analyticsTab} slices={slices}
                  counterVal={slices.reduce((s, sl) => s + sl.value, 0)}
                  isCurrency centerSub="total" />
                <ExpandableLegend slices={slices} />
              </View>
            );
          })()}
        </View>

        {/* Gráficos adicionados */}
        {addedCharts.includes("compare") && (() => {
          const cats = Array.from(new Set(filteredItems.map(it => it.category))).sort();
          const catA = compareA || cats[0] || "";
          const catB = compareB || cats[1] || cats[0] || "";
          const getStats = (cat: string) => {
            const its = filteredItems.filter(it => it.category === cat);
            const rec = its.filter(it => it.type === "RECEITA").reduce((s, it) => s + it.amountCents, 0);
            const des = its.filter(it => it.type === "DESPESA").reduce((s, it) => s + it.amountCents, 0);
            return { rec, des, saldo: rec - des };
          };
          const statsA = getStats(catA);
          const statsB = getStats(catB);
          const maxVal = Math.max(statsA.rec, statsA.des, statsB.rec, statsB.des, 1);
          const bar = (v: number, color: string) => (
            <View style={{ height: 6, borderRadius: 3, backgroundColor: "#1E293B", marginTop: 4, overflow: "hidden" }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: color, width: `${Math.round(Math.abs(v) / maxVal * 100)}%` }} />
            </View>
          );
          return (
            <AnimatedCard>
            <View style={s.extraCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <View>
                  <Text style={{ color: "#64748B", fontSize: 10, fontWeight: "700", letterSpacing: 1 }}>COMPARATIVO</Text>
                  <Text style={{ color: "#F1F5F9", fontSize: 15, fontWeight: "800" }}>Compare duas categorias</Text>
                </View>
                <TouchableOpacity onPress={() => setAddedCharts(c => c.filter(x => x !== "compare"))} style={{ padding: 4 }}>
                  <Text style={{ color: "#475569", fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Selectors */}
              {(["A", "B"] as const).map(side => {
                const val = side === "A" ? catA : catB;
                return (
                  <View key={side} style={{ marginBottom: 8 }}>
                    <Text style={{ color: "#64748B", fontSize: 11, fontWeight: "600", marginBottom: 4 }}>
                      {side === "A" ? "Categoria 1" : "Categoria 2"}
                    </Text>
                    <TouchableOpacity
                      style={{ backgroundColor: "#1E293B", borderRadius: 10, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                      onPress={() => setCompareCatOpen(compareCatOpen === side ? null : side)}
                    >
                      <Text style={{ color: "#F1F5F9", fontSize: 13, fontWeight: "600" }}>{val || "Selecionar"}</Text>
                      <Text style={{ color: "#475569" }}>{compareCatOpen === side ? "▲" : "▼"}</Text>
                    </TouchableOpacity>
                    <DropdownPanel isOpen={compareCatOpen === side}>
                      <ScrollView style={{ backgroundColor: "#0F172A", borderRadius: 10 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                        {cats.map(cat => (
                          <TouchableOpacity key={cat} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: "#1E293B" }}
                            onPress={() => { side === "A" ? setCompareA(cat) : setCompareB(cat); setCompareCatOpen(null); }}>
                            <Text style={{ color: cat === val ? "#60A5FA" : "#94A3B8", fontWeight: cat === val ? "700" : "400" }}>{cat}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </DropdownPanel>
                  </View>
                );
              })}

              {/* Side by side */}
              <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                {[{ label: catA, stats: statsA, color: "#3B82F6" }, { label: catB, stats: statsB, color: "#A78BFA" }].map((block, i) => (
                  <View key={i} style={{ flex: 1, backgroundColor: "#0F172A", borderRadius: 12, padding: 12 }}>
                    <Text style={{ color: block.color, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 }}>{i === 0 ? "CAT 1" : "CAT 2"}</Text>
                    <Text style={{ color: "#F1F5F9", fontSize: 13, fontWeight: "700", marginBottom: 10 }} numberOfLines={1}>{block.label}</Text>
                    {[
                      { label: "Receitas", val: block.stats.rec, color: "#22C55E" },
                      { label: "Despesas", val: block.stats.des, color: "#EF4444" },
                      { label: "Saldo",    val: block.stats.saldo, color: block.stats.saldo >= 0 ? "#60A5FA" : "#F87171" },
                    ].map(row => (
                      <View key={row.label} style={{ marginBottom: 8 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ color: "#64748B", fontSize: 10 }}>{row.label}</Text>
                          <Text style={{ color: row.color, fontSize: 10, fontWeight: "700" }}>{fmt(Math.abs(row.val))}</Text>
                        </View>
                        {bar(row.val, row.color)}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </View>
            </AnimatedCard>
          );
        })()}

        {/* Botão adicionar gráfico */}
        {AVAILABLE_CHARTS.some(c => !addedCharts.includes(c.id)) && (
          <TouchableOpacity style={s.addChartBtn} onPress={() => setChartPickerOpen(true)} activeOpacity={0.7}>
            <Text style={s.addChartPlus}>+</Text>
            <Text style={s.addChartTxt}>Adicionar gráfico</Text>
          </TouchableOpacity>
        )}

        {/* Due soon */}
        {dueSoon.length > 0 && (
          <View style={s.dueSoonCard}>
            <Text style={s.dueSoonTitle}>⚠️ Vence em breve</Text>
            {dueSoon.map(it => (
              <View key={it.id} style={s.dueSoonRow}>
                <Text style={s.dueSoonName} numberOfLines={1}>{it.title}</Text>
                <Text style={s.dueSoonDate}>{dateLabel(it.dateISO)}</Text>
                <Text style={s.dueSoonAmt}>{fmt(it.amountCents)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Latest transactions */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Últimas transações</Text>
        </View>
        {latest.length === 0
          ? <Text style={s.emptyTxt}>Nenhuma transação ainda.</Text>
          : latest.map(it => (
            <View key={it.id} style={s.txRow}>
              <View style={[s.txIcon, {
                backgroundColor: it.type==="RECEITA" ? "rgba(74,222,128,.14)" : "rgba(248,113,113,.14)",
              }]}>
                <Text style={s.txEmoji}>{catIcon(it.category)}</Text>
              </View>
              <View style={s.txInfo}>
                <Text style={s.txTitle} numberOfLines={1}>{it.title}</Text>
                <Text style={s.txCat}>{it.category} · {dateLabel(it.dateISO)}</Text>
              </View>
              <Text style={[s.txAmt, { color: it.type==="RECEITA" ? "#4ADE80" : "#F87171" }]}>
                {it.type==="RECEITA" ? "+" : "−"}{fmt(it.amountCents)}
              </Text>
            </View>
          ))}
      </ScrollView>

      {/* Chart picker modal */}
      <Modal transparent visible={chartPickerOpen} animationType="slide" onRequestClose={() => setChartPickerOpen(false)}>
        <TouchableOpacity style={cal.overlay} activeOpacity={1} onPress={() => setChartPickerOpen(false)}>
          <View style={[cal.card, { width: "100%", borderBottomLeftRadius: 0, borderBottomRightRadius: 0, position: "absolute", bottom: 0, paddingBottom: 32 }]}
            onStartShouldSetResponder={() => true}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#334155", alignSelf: "center", marginBottom: 16 }} />
            <Text style={{ color: "#F1F5F9", fontSize: 16, fontWeight: "800", marginBottom: 4 }}>Adicionar gráfico</Text>
            <Text style={{ color: "#64748B", fontSize: 12, marginBottom: 16 }}>Escolha um gráfico para adicionar ao dashboard</Text>
            {AVAILABLE_CHARTS.filter(c => !addedCharts.includes(c.id)).map(chart => (
              <TouchableOpacity key={chart.id}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#0F172A", borderRadius: 14, padding: 14, marginBottom: 8 }}
                onPress={() => { setAddedCharts(c => [...c, chart.id]); setChartPickerOpen(false); }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 28 }}>{chart.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#F1F5F9", fontSize: 14, fontWeight: "700" }}>{chart.title}</Text>
                  <Text style={{ color: "#64748B", fontSize: 12, marginTop: 2 }}>{chart.sub}</Text>
                </View>
                <Text style={{ color: "#3B82F6", fontSize: 20 }}>+</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {calendarOpen && (
        <MiniCalendar
          month={heroMonth}
          selectedDay={selectedDay}
          onSelectDay={date => {
            setSelectedDay(date);
            setHeroMonth(date.substring(0, 7));
            setCalendarOpen(false);
          }}
          onClose={() => setCalendarOpen(false)}
        />
      )}
    </SafeAreaView>
  );
}

// ── Available Charts ─────────────────────────────────────────────────────────
const AVAILABLE_CHARTS = [
  { id: "compare", icon: "⚖️", title: "Compare duas categorias", sub: "Dados de duas categorias lado a lado" },
];

// ── Mini Calendar ────────────────────────────────────────────────────────────
const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const WEEK_DAYS   = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function MiniCalendar({ month, selectedDay, onSelectDay, onClose }: {
  month: string;
  selectedDay?: string;
  onSelectDay: (date: string) => void;
  onClose: () => void;
}) {
  const [viewMonth, setViewMonth] = useState(month);
  const [y, m] = viewMonth.split("-").map(Number);
  const firstWeekday = new Date(y, m - 1, 1).getDay();
  const daysInMonth  = new Date(y, m, 0).getDate();
  const today        = todayISO();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={cal.overlay} activeOpacity={1} onPress={onClose}>
        <View style={cal.card} onStartShouldSetResponder={() => true}>
          {/* Month nav */}
          <View style={cal.header}>
            <TouchableOpacity onPress={() => setViewMonth(v => addMonthsYM(v, -1))} style={cal.navBtn}>
              <Text style={cal.navTxt}>‹</Text>
            </TouchableOpacity>
            <Text style={cal.headerTitle}>{MONTH_NAMES[m - 1]} {y}</Text>
            <TouchableOpacity onPress={() => setViewMonth(v => addMonthsYM(v, 1))} style={cal.navBtn}>
              <Text style={cal.navTxt}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Week labels */}
          <View style={cal.weekRow}>
            {WEEK_DAYS.map(d => <Text key={d} style={cal.weekLbl}>{d}</Text>)}
          </View>

          {/* Day grid */}
          <View style={cal.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={i} style={cal.cell} />;
              const iso     = `${y}-${String(m).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const isToday = iso === today;
              const isSel   = iso === selectedDay;
              return (
                <TouchableOpacity
                  key={i} style={[cal.cell, isToday && cal.todayCell, isSel && cal.selCell]}
                  onPress={() => onSelectDay(iso)} activeOpacity={0.7}
                >
                  <Text style={[cal.dayTxt, isToday && cal.todayTxt, isSel && cal.selTxt]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Today shortcut */}
          <TouchableOpacity style={cal.todayBtn} onPress={() => onSelectDay(today)}>
            <Text style={cal.todayBtnTxt}>Ir para hoje</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const cal = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  card:        { backgroundColor: "#1E293B", borderRadius: 20, padding: 16, width: 300, borderWidth: 1, borderColor: "#334155" },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  headerTitle: { color: "#F1F5F9", fontSize: 15, fontWeight: "800" },
  navBtn:      { width: 32, height: 32, borderRadius: 10, backgroundColor: "#0F172A", justifyContent: "center", alignItems: "center" },
  navTxt:      { color: "#60A5FA", fontSize: 18, fontWeight: "700", lineHeight: 22 },
  weekRow:     { flexDirection: "row", marginBottom: 6 },
  weekLbl:     { flex: 1, textAlign: "center", color: "#475569", fontSize: 10, fontWeight: "700" },
  grid:        { flexDirection: "row", flexWrap: "wrap" },
  cell:        { width: "14.28%", aspectRatio: 1, justifyContent: "center", alignItems: "center" },
  dayTxt:      { color: "#94A3B8", fontSize: 13, fontWeight: "500" },
  todayCell:   { backgroundColor: "#1D4ED822", borderRadius: 20 },
  todayTxt:    { color: "#60A5FA", fontWeight: "800" },
  selCell:     { backgroundColor: "#3B82F6", borderRadius: 20 },
  selTxt:      { color: "#fff", fontWeight: "800" },
  todayBtn:    { marginTop: 12, paddingVertical: 10, backgroundColor: "#0F172A", borderRadius: 12, alignItems: "center" },
  todayBtnTxt: { color: "#60A5FA", fontSize: 13, fontWeight: "700" },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F172A" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 100 },

  // Brand bar
  brandBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  brandLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#2563EB", justifyContent: "center", alignItems: "center" },
  brandName: { fontSize: 16, fontWeight: "800", color: "#F1F5F9" },
  brandSub: { fontSize: 9, fontWeight: "700", color: "#64748B", letterSpacing: 1.5 },
  planBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  planBadgeTxt: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  logoutBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#1E293B", justifyContent: "center", alignItems: "center" },
  logoutTxt: { fontSize: 16, color: "#64748B" },

  // Hero card
  heroCard: { backgroundColor: "#1D4ED8", borderRadius: 22, padding: 20, marginBottom: 12 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  heroBalLabel: { fontSize: 12, color: "rgba(255,255,255,.6)", fontWeight: "600" },
  monthNav: { flexDirection: "row", alignItems: "center", gap: 8 },
  monthBtn: { width: 26, height: 26, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(255,255,255,.15)", borderRadius: 7 },
  monthBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "600", lineHeight: 20 },
  monthLabel: { fontSize: 13, fontWeight: "700", color: "#fff", minWidth: 110, textAlign: "center" },
  heroBalRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  heroBal: { fontSize: 30, fontWeight: "800", color: "#fff" },
  heroAccountsHint: { fontSize: 11, color: "rgba(255,255,255,.55)", marginTop: 3 },
  eyeBtn: { padding: 6, marginTop: 4 },
  heroStats: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,.18)", borderRadius: 14, padding: 14 },
  heroStat: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  heroStatIc: { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  heroStatLbl: { fontSize: 11, color: "rgba(255,255,255,.6)", fontWeight: "600" },
  heroStatVal: { fontSize: 14, fontWeight: "700", marginTop: 2 },
  heroDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,.2)", marginHorizontal: 12 },

  // Period selector
  periodRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  periodRowLabel: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  periodBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#1E293B", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#334155" },
  periodBtnTxt: { fontSize: 13, color: "#F1F5F9", fontWeight: "600" },
  periodDropdown: { backgroundColor: "#1E293B", borderRadius: 12, borderWidth: 1, borderColor: "#334155", marginBottom: 8, overflow: "hidden" },
  periodOption: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#334155" },
  periodOptionActive: { backgroundColor: "rgba(96,165,250,.1)" },
  periodOptionTxt: { fontSize: 14, color: "#CBD5E1", fontWeight: "600" },

  // Meus cartões
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#F1F5F9" },
  sectionAction: { fontSize: 13, color: "#60A5FA", fontWeight: "600" },
  cardsScroll: { marginLeft: -16, paddingLeft: 16, marginBottom: 4 },
  bankCard: { width: 160, height: 100, borderRadius: 16, padding: 14, justifyContent: "space-between" },
  bankCardBank: { fontSize: 11, color: "rgba(255,255,255,.7)", fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  bankCardNick: { fontSize: 13, fontWeight: "700", color: "#fff" },
  bankCardBal: { fontSize: 15, fontWeight: "800", color: "#fff" },
  bankCardLast: { fontSize: 10, color: "rgba(255,255,255,.5)" },
  bankCardAdd: { width: 160, height: 100, borderRadius: 16, borderWidth: 2, borderColor: "#334155", borderStyle: "dashed", justifyContent: "center", alignItems: "center", gap: 6 },
  bankCardAddIcon: { fontSize: 24, color: "#60A5FA", fontWeight: "300" },
  bankCardAddTxt: { fontSize: 12, color: "#64748B", fontWeight: "600" },

  // Summary cards
  cardsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statCard: { flex: 1, minWidth: "45%", backgroundColor: "#1E293B", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#334155" },
  statLab: { fontSize: 11, color: "#94A3B8", fontWeight: "700", marginBottom: 4 },
  statVal: { fontSize: 17, fontWeight: "800", marginBottom: 8 },
  statSub: { fontSize: 10, color: "#64748B", marginTop: 4, fontWeight: "600" },

  // Analytics
  analyticsCard: { backgroundColor: "#1E293B", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#334155", marginBottom: 16 },
  analyticsTabs: { flexDirection: "row", gap: 4 },
  analyticsTabBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, alignItems: "center", backgroundColor: "#0F172A" },
  analyticsTabActive: { backgroundColor: "#2563EB" },
  analyticsTabTxt: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  analyticsTabTxtActive: { color: "#fff" },
  progressTrack: { height: 8, backgroundColor: "#334155", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressLabel: { fontSize: 12, color: "#94A3B8", fontWeight: "600", marginTop: 6, textAlign: "center" },
  confrontoLbl: { fontSize: 11, color: "#94A3B8", fontWeight: "600", marginBottom: 2 },
  confrontoVal: { fontSize: 16, fontWeight: "800" },
  catBarLabel: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },
  catBarTrack: { height: 6, backgroundColor: "#334155", borderRadius: 3, overflow: "hidden" },
  catBarFill: { height: "100%", borderRadius: 3 },

  // Due soon
  dueSoonCard: { backgroundColor: "rgba(245,158,11,.1)", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "rgba(245,158,11,.3)", marginBottom: 16 },
  dueSoonTitle: { fontSize: 13, fontWeight: "800", color: "#FBBF24", marginBottom: 10 },
  dueSoonRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "rgba(245,158,11,.15)" },
  dueSoonName: { flex: 1, fontSize: 13, fontWeight: "600", color: "#F1F5F9" },
  dueSoonDate: { fontSize: 11, color: "#94A3B8", marginRight: 10 },
  dueSoonAmt: { fontSize: 13, fontWeight: "700", color: "#F87171" },

  // Extra charts
  extraCard:   { backgroundColor: "#1E293B", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#334155" },
  addChartBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, backgroundColor: "#1E293B", borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: "#334155", borderStyle: "dashed" },
  addChartPlus:{ color: "#3B82F6", fontSize: 20, fontWeight: "300" },
  addChartTxt: { color: "#475569", fontSize: 13, fontWeight: "600" },

  // Transactions
  emptyTxt: { color: "#64748B", fontSize: 13, textAlign: "center", paddingVertical: 24 },
  txRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#1E293B" },
  txIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  txEmoji: { fontSize: 20 },
  txInfo: { flex: 1 },
  txTitle: { fontSize: 14, fontWeight: "600", color: "#F1F5F9" },
  txCat: { fontSize: 12, color: "#64748B", marginTop: 2 },
  txAmt: { fontSize: 14, fontWeight: "700" },
});
