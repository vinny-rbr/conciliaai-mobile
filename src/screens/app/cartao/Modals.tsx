import React from "react";
import {
  Modal, View, Text, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator,
} from "react-native";
import type { CreditCard } from "../../../types/creditCard";
import type { CreditCardBrand } from "../../../types/creditCard";
import type { BankAccount } from "../../../types/finance";
import { fmt } from "../../../lib/financeService";
import { BRANDS_LIST, EXPENSE_CATS, ACCENT, s } from "./shared";

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
