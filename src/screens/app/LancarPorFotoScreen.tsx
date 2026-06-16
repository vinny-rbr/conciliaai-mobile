import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { apiUrl } from "../../lib/api";
import { getToken } from "../../lib/auth";
import { listFinanceCategories } from "../../lib/financeCategoriesService";
import type { FinanceCategoryOption } from "../../types/finance";

type Stage = "source" | "reading" | "review" | "done";

type OcrResult = {
  amount?: string;
  description?: string;
  date?: string;
  paymentType?: string;
  category?: string;
  detectedFields?: number;
};

const PAY_TYPES = [
  { key: "pix",    label: "Pix" },
  { key: "debit",  label: "Débito" },
  { key: "credit", label: "Crédito" },
  { key: "cash",   label: "Dinheiro" },
];

const READ_STEPS = [
  "Enviando a imagem…",
  "Lendo o comprovante…",
  "Identificando valor e data…",
  "Sugerindo categoria…",
];

function todayISO() { return new Date().toISOString().slice(0, 10); }

function fmtInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return (parseInt(digits, 10) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function parseCents(v: string): number {
  const d = v.replace(/\D/g, "");
  return d ? parseInt(d, 10) : 0;
}

function brToISO(br: string): string | null {
  const p = br.split("/");
  if (p.length === 3 && p[2].length === 4) return `${p[2]}-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(br)) return br;
  return null;
}

function isoToBR(iso: string): string {
  if (!iso || iso.length < 10) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function LancarPorFotoScreen() {
  const navigation = useNavigation();

  const [stage, setStage]             = useState<Stage>("source");
  const [imageUri, setImageUri]       = useState<string | null>(null);
  const [readStep, setReadStep]       = useState(0);
  const progress                      = useRef(new Animated.Value(0)).current;

  const [txType, setTxType]           = useState<"RECEITA" | "DESPESA">("DESPESA");
  const [amount, setAmount]           = useState("");
  const [description, setDescription] = useState("");
  const [dateBR, setDateBR]           = useState(isoToBR(todayISO()));
  const [payType, setPayType]         = useState("pix");
  const [category, setCategory]       = useState("Outros");
  const [categories, setCategories]   = useState<FinanceCategoryOption[]>([]);
  const [detectedFields, setDetectedFields] = useState(0);
  const [saving, setSaving]           = useState(false);

  const pendingBase64 = useRef<string | null>(null);

  useEffect(() => {
    void listFinanceCategories().then(cats => setCategories(cats)).catch(() => {});
  }, []);

  // ── OCR + animation when stage = "reading" ──────────────────────────
  useEffect(() => {
    if (stage !== "reading") return;

    let ocrDone = false;
    let animDone = false;
    let ocrResult: OcrResult | null = null;

    function apply() {
      if (ocrResult?.amount)      setAmount(fmtInput(ocrResult.amount.replace(/[^\d]/g, "")));
      if (ocrResult?.description) setDescription(ocrResult.description);
      if (ocrResult?.date)        setDateBR(isoToBR(ocrResult.date));
      if (ocrResult?.paymentType) setPayType(ocrResult.paymentType);
      if (ocrResult?.category)    setCategory(ocrResult.category);
      setDetectedFields(ocrResult?.detectedFields ?? 0);
      setStage("review");
    }

    function tryTransition() { if (ocrDone && animDone) apply(); }

    // OCR call
    void (async () => {
      const base64 = pendingBase64.current;
      if (!base64) { ocrDone = true; tryTransition(); return; }
      try {
        const token = await getToken();
        const res = await fetch(apiUrl("/api/finance/receipt-ocr/image"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
          body: JSON.stringify({ imageBase64: base64, mimeType: "image/jpeg" }),
        });
        if (res.ok) ocrResult = await res.json() as OcrResult;
      } catch { /* proceed without OCR */ }
      ocrDone = true;
      tryTransition();
    })();

    // Progress animation
    progress.setValue(0);
    setReadStep(0);
    let step = 0;
    const interval = setInterval(() => {
      step = Math.min(step + 1, READ_STEPS.length - 1);
      setReadStep(step);
    }, 900);
    Animated.timing(progress, { toValue: 1, duration: READ_STEPS.length * 900, useNativeDriver: false }).start(() => {
      clearInterval(interval);
      animDone = true;
      tryTransition();
    });

    return () => { clearInterval(interval); };
  }, [stage]);

  // ── Pick image ───────────────────────────────────────────────────────
  const pickSource = useCallback(async (source: "camera" | "gallery") => {
    const opts = { quality: 0.85 as const, base64: true as const };

    let result;
    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert("Permissão necessária", "Habilite o acesso à câmera nas configurações."); return; }
      result = await ImagePicker.launchCameraAsync(opts);
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ ...opts, mediaTypes: "images" as const });
    }

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    pendingBase64.current = asset.base64 ?? null;
    setImageUri(asset.uri);
    setStage("reading");
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────
  async function handleSave() {
    const cents = parseCents(amount);
    if (!cents) { Alert.alert("Informe o valor."); return; }
    const dateISO = brToISO(dateBR);
    if (!dateISO) { Alert.alert("Data inválida. Use DD/MM/AAAA."); return; }

    setSaving(true);
    try {
      const token = await getToken();
      const r = await fetch(apiUrl("/api/finance"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          type: txType,
          title: description.trim() || "Lançamento por foto",
          category,
          amountCents: cents,
          date: dateISO,
          paymentType: payType,
          status: "paid",
        }),
      });
      if (!r.ok) throw new Error(`Erro ${r.status}`);
      setStage("done");
    } catch (e) {
      Alert.alert("Erro", e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  function handleRetake() {
    pendingBase64.current = null;
    setImageUri(null);
    setAmount(""); setDescription(""); setDateBR(isoToBR(todayISO()));
    setPayType("pix"); setCategory("Outros"); setDetectedFields(0);
    setStage("source");
  }

  function handleDateChange(text: string) {
    let d = text.replace(/\D/g,"").slice(0,8);
    if (d.length >= 5) d = `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`;
    else if (d.length >= 3) d = `${d.slice(0,2)}/${d.slice(2)}`;
    setDateBR(d);
  }

  const accent = txType === "RECEITA" ? "#22C55E" : "#EF4444";
  const cents  = parseCents(amount);

  // ── Stages ───────────────────────────────────────────────────────────

  if (stage === "source") return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backTxt}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Lançar por foto</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={s.sourceBody}>
        <View style={s.heroCard}>
          <Text style={s.heroEmoji}>📷</Text>
          <Text style={s.heroTitle}>Fotografe o comprovante</Text>
          <Text style={s.heroSub}>
            Tire foto ou escolha da galeria. A IA lê o valor, a data e sugere a categoria automaticamente.
          </Text>
        </View>

        <TouchableOpacity style={s.srcBtn} activeOpacity={0.8} onPress={() => void pickSource("camera")}>
          <Text style={s.srcBtnIcon}>📷</Text>
          <View>
            <Text style={s.srcBtnTitle}>Tirar foto</Text>
            <Text style={s.srcBtnSub}>Usar a câmera agora</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[s.srcBtn, { backgroundColor: "#1E3A5F" }]} activeOpacity={0.8} onPress={() => void pickSource("gallery")}>
          <Text style={s.srcBtnIcon}>🖼️</Text>
          <View>
            <Text style={s.srcBtnTitle}>Escolher da galeria</Text>
            <Text style={s.srcBtnSub}>Imagem já salva no celular</Text>
          </View>
        </TouchableOpacity>

        <View style={s.tipBox}>
          <Text style={s.tipIcon}>✨</Text>
          <Text style={s.tipTxt}>
            Funciona com cupom fiscal, recibo, comprovante de Pix e print do app do banco.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );

  if (stage === "reading") return (
    <SafeAreaView style={s.root}>
      <View style={s.centerFull}>
        {imageUri && (
          <Image source={{ uri: imageUri }} style={s.thumbReading} resizeMode="cover" />
        )}
        <Text style={s.readingTitle}>Lendo o comprovante…</Text>

        <View style={s.progressTrack}>
          <Animated.View style={[s.progressFill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
        </View>

        <Text style={s.readingStep}>{READ_STEPS[readStep]}</Text>
        <ActivityIndicator color="#3B82F6" style={{ marginTop: 16 }} />
      </View>
    </SafeAreaView>
  );

  if (stage === "done") return (
    <SafeAreaView style={s.root}>
      <View style={s.centerFull}>
        <Text style={s.doneEmoji}>✓</Text>
        <Text style={s.doneTitle}>{txType === "RECEITA" ? "Receita" : "Despesa"} lançada!</Text>
        <Text style={s.doneSub}>{description.trim() || "Lançamento"} foi adicionado ao seu saldo.</Text>
        <TouchableOpacity style={s.doneBtn} onPress={() => navigation.goBack()}>
          <Text style={s.doneBtnTxt}>Concluir</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRetake} style={{ marginTop: 12 }}>
          <Text style={{ color: "#60A5FA", fontSize: 14, fontWeight: "700" }}>Lançar outro</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  // stage === "review"
  const rootCats = categories.filter(c => !c.parentId);

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={handleRetake} style={s.backBtn}>
          <Text style={s.backTxt}>‹ Trocar foto</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Confirmar lançamento</Text>
        <TouchableOpacity
          style={[s.saveHdrBtn, (!cents || saving) && { opacity: 0.4 }]}
          onPress={() => void handleSave()}
          disabled={!cents || saving}
        >
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveHdrTxt}>Salvar</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.reviewBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Thumbnail + OCR badge */}
        {imageUri && (
          <View style={s.thumbRow}>
            <Image source={{ uri: imageUri }} style={s.thumb} resizeMode="cover" />
            <View style={s.ocrBadge}>
              <Text style={s.ocrBadgeIcon}>✨</Text>
              <Text style={s.ocrBadgeTxt}>
                {detectedFields > 0 ? `${detectedFields} campo${detectedFields > 1 ? "s" : ""} detectado${detectedFields > 1 ? "s" : ""}` : "Confira os dados"}
              </Text>
            </View>
          </View>
        )}

        {/* Receita / Despesa toggle */}
        <View style={s.typeRow}>
          <TouchableOpacity
            style={[s.typeBtn, txType === "RECEITA" && { backgroundColor: "#166534", borderColor: "#22C55E" }]}
            onPress={() => setTxType("RECEITA")}
          >
            <Text style={[s.typeBtnTxt, txType === "RECEITA" && { color: "#22C55E" }]}>↑ Receita</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.typeBtn, txType === "DESPESA" && { backgroundColor: "#7F1D1D", borderColor: "#EF4444" }]}
            onPress={() => setTxType("DESPESA")}
          >
            <Text style={[s.typeBtnTxt, txType === "DESPESA" && { color: "#EF4444" }]}>↓ Despesa</Text>
          </TouchableOpacity>
        </View>

        {/* Valor */}
        <View style={[s.amtBlock, { borderColor: accent + "44", backgroundColor: accent + "11" }]}>
          <Text style={[s.amtSign, { color: accent + "99" }]}>R$</Text>
          <TextInput
            style={[s.amtInput, { color: accent }]}
            value={amount}
            onChangeText={v => setAmount(fmtInput(v))}
            keyboardType="numeric"
            placeholder="0,00"
            placeholderTextColor={accent + "55"}
          />
        </View>

        {/* Descrição */}
        <View style={s.field}>
          <Text style={s.label}>Descrição</Text>
          <TextInput
            style={s.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Nome do estabelecimento ou descrição"
            placeholderTextColor="#475569"
          />
        </View>

        {/* Data */}
        <View style={s.field}>
          <Text style={s.label}>Data</Text>
          <TextInput
            style={s.input}
            value={dateBR}
            onChangeText={handleDateChange}
            placeholder="DD/MM/AAAA"
            placeholderTextColor="#475569"
            keyboardType="numeric"
            maxLength={10}
          />
        </View>

        {/* Forma de pagamento */}
        <View style={s.field}>
          <Text style={s.label}>Forma de pagamento</Text>
          <View style={s.chipRow}>
            {PAY_TYPES.map(pt => (
              <TouchableOpacity
                key={pt.key}
                style={[s.chip, payType === pt.key && { backgroundColor: accent + "22", borderColor: accent }]}
                onPress={() => setPayType(pt.key)}
              >
                <Text style={[s.chipTxt, payType === pt.key && { color: accent }]}>{pt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Categoria */}
        <View style={s.field}>
          <Text style={s.label}>Categoria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {(rootCats.length > 0 ? rootCats : [{ id: "0", name: "Outros" } as FinanceCategoryOption]).map(c => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setCategory(c.name)}
                style={[s.chip, category === c.name && { backgroundColor: "#1D4ED822", borderColor: "#3B82F6" }]}
              >
                <Text style={[s.chipTxt, category === c.name && { color: "#60A5FA", fontWeight: "700" }]}>
                  {c.icon ? `${c.icon} ${c.name}` : c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Salvar */}
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: cents ? accent : "#1E293B" }]}
          onPress={() => void handleSave()}
          disabled={!cents || saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={[s.saveBtnTxt, !cents && { color: "#475569" }]}>
                {cents ? `Lançar ${txType === "RECEITA" ? "receita" : "despesa"}` : "Informe o valor"}
              </Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F172A" },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1E293B", gap: 8 },
  backBtn: {},
  backTxt: { color: "#94A3B8", fontSize: 14 },
  headerTitle: { flex: 1, color: "#F1F5F9", fontSize: 16, fontWeight: "700" },
  saveHdrBtn: { backgroundColor: "#3B82F6", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  saveHdrTxt: { color: "#fff", fontSize: 13, fontWeight: "800" },

  sourceBody: { flex: 1, padding: 20, gap: 14 },
  heroCard: { backgroundColor: "#1E293B", borderRadius: 20, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "#334155" },
  heroEmoji: { fontSize: 48, marginBottom: 10 },
  heroTitle: { color: "#F1F5F9", fontSize: 18, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  heroSub: { color: "#64748B", fontSize: 13, textAlign: "center", lineHeight: 20 },
  srcBtn: { backgroundColor: "#1E3A8A", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: "#2563EB44" },
  srcBtnIcon: { fontSize: 28 },
  srcBtnTitle: { color: "#F1F5F9", fontSize: 15, fontWeight: "700" },
  srcBtnSub: { color: "#64748B", fontSize: 12, marginTop: 2 },
  tipBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#1E293B", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#334155" },
  tipIcon: { fontSize: 16 },
  tipTxt: { color: "#64748B", fontSize: 12, lineHeight: 18, flex: 1 },

  centerFull: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  thumbReading: { width: 140, height: 180, borderRadius: 14, marginBottom: 24, opacity: 0.85 },
  readingTitle: { color: "#F1F5F9", fontSize: 18, fontWeight: "700", marginBottom: 20 },
  progressTrack: { width: "100%", height: 6, backgroundColor: "#1E293B", borderRadius: 3, overflow: "hidden", marginBottom: 10 },
  progressFill: { height: 6, backgroundColor: "#3B82F6", borderRadius: 3 },
  readingStep: { color: "#64748B", fontSize: 13 },

  doneEmoji: { fontSize: 52, color: "#4ADE80", marginBottom: 12 },
  doneTitle: { color: "#F1F5F9", fontSize: 22, fontWeight: "800", marginBottom: 6 },
  doneSub: { color: "#94A3B8", fontSize: 14, textAlign: "center", marginBottom: 24 },
  doneBtn: { backgroundColor: "#3B82F6", borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  doneBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },

  reviewBody: { padding: 16, gap: 18, paddingBottom: 60 },
  thumbRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  thumb: { width: 80, height: 100, borderRadius: 12 },
  ocrBadge: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#1E3A8A22", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#3B82F633" },
  ocrBadgeIcon: { fontSize: 18 },
  ocrBadgeTxt: { color: "#60A5FA", fontSize: 13, fontWeight: "700" },

  typeRow: { flexDirection: "row", gap: 10 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: "#334155", backgroundColor: "#1E293B", alignItems: "center" },
  typeBtnTxt: { color: "#64748B", fontSize: 14, fontWeight: "700" },

  amtBlock: { borderRadius: 18, borderWidth: 1.5, flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, gap: 6 },
  amtSign: { fontSize: 22, fontWeight: "700" },
  amtInput: { flex: 1, fontSize: 36, fontWeight: "800" },

  field: { gap: 8 },
  label: { color: "#94A3B8", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: "#1E293B", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: "#F1F5F9", fontSize: 15, borderWidth: 1, borderColor: "#334155" },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: "#334155", backgroundColor: "#1E293B" },
  chipTxt: { color: "#64748B", fontSize: 13, fontWeight: "600" },

  saveBtn: { borderRadius: 16, paddingVertical: 17, alignItems: "center", marginTop: 6 },
  saveBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
