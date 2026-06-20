import React, { useEffect, useState } from "react";
import {
  Modal, View, Text, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from "react-native";
import type { CreditCard } from "../../../types/creditCard";
import type { CreditCardBrand } from "../../../types/creditCard";
import type { BankAccount } from "../../../types/finance";
import { fmt } from "../../../lib/financeService";
import { updateCreditCard, deleteCreditCard } from "../../../lib/creditCardService";
import { BRANDS, BRANDS_LIST, EXPENSE_CATS, ACCENT, s, parseBRL } from "./shared";

type NewCardProps = {
  visible: boolean; onClose: () => void;
  brand: CreditCardBrand; setBrand: (b: CreditCardBrand) => void;
  nick: string; setNick: (v: string) => void;
  last4: string; setLast4: (v: string) => void;
  limit: string; setLimit: (v: string) => void;
  closing: string; setClosing: (v: string) => void;
  due: string; setDue: (v: string) => void;
  best: string; setBest: (v: string) => void;
  saving: boolean; onSave: () => void;
};

export function NewCardModal(p: NewCardProps) {
  return (
    <Modal visible={p.visible} transparent animationType="slide">
      <View style={s.modalBg}>
        <ScrollView contentContainerStyle={s.modalBox}>
          <Text style={s.modalTitle}>Novo cartão de crédito</Text>
          <Text style={s.fieldLabel}>Banco / Emissor</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", gap: 8, paddingVertical: 4 }}>
              {BRANDS_LIST.map(([key, b]) => (
                <TouchableOpacity key={key} activeOpacity={0.7} onPress={() => p.setBrand(key)}
                  style={[s.brandChip, { backgroundColor: b.bg1 }, p.brand === key && s.brandChipSel]}>
                  <Text style={s.brandChipTxt}>{b.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <Text style={s.fieldLabel}>Nome do cartão *</Text>
          <TextInput style={s.input} placeholderTextColor="#475569" placeholder="Ex: Nubank Ultravioleta" value={p.nick} onChangeText={p.setNick} />
          <Text style={s.fieldLabel}>Últimos 4 dígitos *</Text>
          <TextInput style={s.input} placeholderTextColor="#475569" placeholder="0000" keyboardType="number-pad" maxLength={4} value={p.last4} onChangeText={t => p.setLast4(t.replace(/\D/g, ""))} />
          <Text style={s.fieldLabel}>Limite *</Text>
          <TextInput style={s.input} placeholderTextColor="#475569" placeholder="R$ 0,00" keyboardType="decimal-pad" value={p.limit} onChangeText={p.setLimit} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            {([["Fecha dia", p.closing, p.setClosing, "3"], ["Vence dia", p.due, p.setDue, "10"], ["Melhor dia", p.best, p.setBest, "3"]] as [string,string,(v:string)=>void,string][]).map(([lbl, val, set, ph]) => (
              <View key={lbl} style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>{lbl}</Text>
                <TextInput style={s.input} placeholderTextColor="#475569" placeholder={ph} keyboardType="number-pad" maxLength={2} value={val} onChangeText={set} />
              </View>
            ))}
          </View>
          <TouchableOpacity style={s.saveBtn} activeOpacity={0.8} onPress={p.onSave} disabled={p.saving}>
            {p.saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnTxt}>Salvar cartão</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={p.onClose} style={s.cancelBtn}>
            <Text style={s.cancelBtnTxt}>Cancelar</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

type PayProps = {
  visible: boolean; onClose: () => void;
  card: CreditCard | null;
  payAmt: string; setPayAmt: (v: string) => void;
  payAccId: string; setPayAccId: (v: string) => void;
  accounts: BankAccount[];
  saving: boolean; onSave: () => void;
};

export function PayInvoiceModal(p: PayProps) {
  return (
    <Modal visible={p.visible} transparent animationType="slide">
      <View style={s.modalBg}>
        <View style={s.modalBox}>
          <Text style={s.modalTitle}>Pagar fatura</Text>
          {p.card && <Text style={s.modalSub}>Fatura atual: <Text style={{ color: ACCENT, fontWeight: "700" }}>{fmt(p.card.invoiceCents)}</Text></Text>}
          <Text style={s.fieldLabel}>Valor a pagar</Text>
          <TextInput style={s.input} placeholderTextColor="#475569" placeholder="R$ 0,00" keyboardType="decimal-pad" value={p.payAmt} onChangeText={p.setPayAmt} autoFocus />
          {p.accounts.length > 0 && (
            <>
              <Text style={s.fieldLabel}>Débitar de (opcional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => p.setPayAccId("")} style={[s.accChip, !p.payAccId && s.accChipSel]}>
                    <Text style={[s.accChipTxt, !p.payAccId && { color: "#fff" }]}>Nenhuma</Text>
                  </TouchableOpacity>
                  {p.accounts.map(a => (
                    <TouchableOpacity key={a.id} activeOpacity={0.7} onPress={() => p.setPayAccId(a.id)} style={[s.accChip, p.payAccId === a.id && s.accChipSel]}>
                      <Text style={[s.accChipTxt, p.payAccId === a.id && { color: "#fff" }]}>{a.nick}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}
          <TouchableOpacity style={s.saveBtn} activeOpacity={0.8} onPress={p.onSave} disabled={p.saving}>
            {p.saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnTxt}>Confirmar pagamento</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={p.onClose} style={s.cancelBtn}><Text style={s.cancelBtnTxt}>Cancelar</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

type GastoProps = {
  visible: boolean; onClose: () => void;
  card: CreditCard | null;
  title: string; setTitle: (v: string) => void;
  cat: string; setCat: (v: string) => void;
  amt: string; setAmt: (v: string) => void;
  saving: boolean; onSave: () => void;
};

export function LancarGastoModal(p: GastoProps) {
  return (
    <Modal visible={p.visible} transparent animationType="slide">
      <View style={s.modalBg}>
        <View style={s.modalBox}>
          <Text style={s.modalTitle}>Lançar gasto no cartão</Text>
          {p.card && <Text style={s.modalSub}>{p.card.nick} •••• {p.card.last4}</Text>}
          <Text style={s.fieldLabel}>Descrição *</Text>
          <TextInput style={s.input} placeholderTextColor="#475569" placeholder="Ex: Mercado Carrefour" value={p.title} onChangeText={p.setTitle} autoFocus />
          <Text style={s.fieldLabel}>Categoria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {EXPENSE_CATS.map(cat => (
                <TouchableOpacity key={cat} activeOpacity={0.7} onPress={() => p.setCat(cat)} style={[s.catChip, p.cat === cat && s.catChipSel]}>
                  <Text style={[s.catChipTxt, p.cat === cat && { color: "#fff", fontWeight: "700" }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <Text style={s.fieldLabel}>Valor *</Text>
          <TextInput style={s.input} placeholderTextColor="#475569" placeholder="R$ 0,00" keyboardType="decimal-pad" value={p.amt} onChangeText={p.setAmt} />
          <TouchableOpacity style={s.saveBtn} activeOpacity={0.8} onPress={p.onSave} disabled={p.saving}>
            {p.saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnTxt}>Lançar gasto</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={p.onClose} style={s.cancelBtn}><Text style={s.cancelBtnTxt}>Cancelar</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

type EditCardProps = {
  visible: boolean;
  onClose: () => void;
  card: CreditCard | null;
  onSaved: (updated: CreditCard) => void;
  onDeleted: () => void;
};

const EDIT_COLORS = [
  { id: "keep",     label: "Atual",   face: null,   swatch: null },
  { id: "violet",   label: "Violeta", face: "linear-gradient(135deg,#9F37E8,#6A02B0)", swatch: "#9F37E8" },
  { id: "amber",    label: "Âmbar",   face: "linear-gradient(135deg,#FBBF24,#D97706)", swatch: "#F59E0B" },
  { id: "blue",     label: "Azul",    face: "linear-gradient(135deg,#3B82F6,#1b3fa0)", swatch: "#3B82F6" },
  { id: "graphite", label: "Grafite", face: "linear-gradient(135deg,#334155,#0F172A)", swatch: "#334155" },
] as const;
type EditColorId = typeof EDIT_COLORS[number]["id"];

export function EditCardModal(p: EditCardProps) {
  const [nick, setNick]             = useState("");
  const [limit, setLimit]           = useState("");
  const [closing, setClosing]       = useState("");
  const [due, setDue]               = useState("");
  const [best, setBest]             = useState("");
  const [color, setColor]           = useState<EditColorId>("keep");
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (p.card && p.visible) {
      setNick(p.card.nick);
      setLimit(((p.card.limitCents) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
      setClosing(String(p.card.closingDay));
      setDue(String(p.card.dueDay));
      setBest(String(p.card.bestDay));
      const matched = EDIT_COLORS.find(c => c.face && c.face === p.card!.face);
      setColor(matched ? matched.id : "keep");
      setConfirmDel(false);
    }
  }, [p.card, p.visible]);

  async function handleSave() {
    if (!p.card || !nick.trim()) { Alert.alert("Atenção", "Digite o apelido do cartão."); return; }
    const limitCents = parseBRL(limit);
    if (limitCents <= 0) { Alert.alert("Atenção", "Informe um limite válido."); return; }
    const colorEntry = EDIT_COLORS.find(c => c.id === color);
    const face = color === "keep" ? p.card.face ?? null : (colorEntry?.face ?? null);
    setSaving(true);
    try {
      const updated = await updateCreditCard(p.card.id, {
        nick: nick.trim(),
        limitCents,
        closingDay: parseInt(closing) || p.card.closingDay,
        dueDay:     parseInt(due)     || p.card.dueDay,
        bestDay:    parseInt(best)    || p.card.bestDay,
        face,
      });
      p.onSaved(updated);
      p.onClose();
    } catch (e) { Alert.alert("Erro", String(e)); }
    setSaving(false);
  }

  async function handleDelete() {
    if (!p.card) return;
    setDeleting(true);
    try {
      await deleteCreditCard(p.card.id);
      p.onDeleted();
      p.onClose();
    } catch (e) { Alert.alert("Erro", String(e)); }
    setDeleting(false);
  }

  if (!p.card) return null;
  const b = BRANDS[p.card.brand] ?? BRANDS.outro;

  return (
    <Modal visible={p.visible} transparent animationType="slide" onRequestClose={p.onClose}>
      <View style={s.modalBg}>
        <ScrollView contentContainerStyle={s.modalBox} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={s.modalTitle}>Editar cartão</Text>
          <Text style={s.modalSub}>{b.label} •••• {p.card.last4}</Text>

          <Text style={s.fieldLabel}>Apelido do cartão</Text>
          <TextInput style={s.input} placeholderTextColor="#475569" value={nick} onChangeText={setNick} autoFocus />

          <Text style={s.fieldLabel}>Limite total</Text>
          <TextInput style={s.input} placeholderTextColor="#475569" placeholder="R$ 0,00" keyboardType="decimal-pad" value={limit} onChangeText={setLimit} />

          <View style={{ flexDirection: "row", gap: 10 }}>
            {([["Fecha dia", closing, setClosing], ["Vence dia", due, setDue], ["Melhor dia", best, setBest]] as [string, string, (v: string) => void][]).map(([lbl, val, set]) => (
              <View key={lbl} style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>{lbl}</Text>
                <TextInput style={s.input} placeholderTextColor="#475569" keyboardType="number-pad" maxLength={2} value={val} onChangeText={t => set(t.replace(/\D/g, ""))} />
              </View>
            ))}
          </View>

          <Text style={s.fieldLabel}>Cor do cartão</Text>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            {EDIT_COLORS.map(c => {
              const active = color === c.id;
              const bg = c.id === "keep" ? b.bg1 : c.swatch!;
              return (
                <TouchableOpacity key={c.id} onPress={() => setColor(c.id)} activeOpacity={0.8} style={{ alignItems: "center", gap: 4 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: bg, borderWidth: 2.5, borderColor: active ? "#F1F5F9" : "transparent" }} />
                  <Text style={{ color: active ? "#F1F5F9" : "#475569", fontSize: 10, fontWeight: "700" }}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={s.saveBtn} activeOpacity={0.8} onPress={() => void handleSave()} disabled={saving}>
            {saving ? <ActivityIndicator color="#0F172A" /> : <Text style={s.saveBtnTxt}>Salvar alterações</Text>}
          </TouchableOpacity>

          {!confirmDel ? (
            <TouchableOpacity onPress={() => setConfirmDel(true)} style={[s.cancelBtn, { marginTop: 8 }]}>
              <Text style={{ color: "#EF4444", fontSize: 14, fontWeight: "700" }}>Excluir cartão</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ marginTop: 16, padding: 14, backgroundColor: "#EF444415", borderRadius: 14, borderWidth: 1, borderColor: "#EF444433", gap: 12 }}>
              <Text style={{ color: "#FCA5A5", fontSize: 13, fontWeight: "700", textAlign: "center" }}>Excluir "{p.card.nick}" e todos os lançamentos?</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity onPress={() => setConfirmDel(false)} activeOpacity={0.7}
                  style={{ flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center" }}>
                  <Text style={{ color: "#94A3B8", fontSize: 14, fontWeight: "700" }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => void handleDelete()} disabled={deleting} activeOpacity={0.8}
                  style={{ flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: "#EF4444", alignItems: "center" }}>
                  {deleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: "#fff", fontSize: 14, fontWeight: "800" }}>Excluir</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity onPress={p.onClose} style={s.cancelBtn}>
            <Text style={s.cancelBtnTxt}>Cancelar</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}
