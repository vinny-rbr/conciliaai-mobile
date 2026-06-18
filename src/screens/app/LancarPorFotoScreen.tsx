import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Animated, Image,
  ScrollView, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { apiUrl } from "../../lib/api";
import { getToken } from "../../lib/auth";
import { listFinanceCategories } from "../../lib/financeCategoriesService";
import type { FinanceCategoryOption } from "../../types/finance";
import {
  PAY_TYPES, READ_STEPS, todayISO, fmtInput, parseCents, brToISO, isoToBR, s,
  type Stage, type OcrResult,
} from "./lancarPorFoto/shared";
import { SourceStage, ReadingStage, DoneStage } from "./lancarPorFoto/stages";

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

  useEffect(() => {
    if (stage !== "reading") return;

    let ocrDone = false, animDone = false;
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
          category, amountCents: cents, date: dateISO,
          paymentType: payType, status: "paid",
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

  if (stage === "source") return <SourceStage onPickSource={src => void pickSource(src)} onGoBack={() => navigation.goBack()} />;
  if (stage === "reading") return <ReadingStage imageUri={imageUri} progress={progress} readStep={readStep} readSteps={READ_STEPS} />;
  if (stage === "done") return <DoneStage txType={txType} description={description} onGoBack={() => navigation.goBack()} onRetake={handleRetake} />;

  // stage === "review"
  const accent = txType === "RECEITA" ? "#22C55E" : "#EF4444";
  const cents  = parseCents(amount);
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
