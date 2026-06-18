import { Animated, Image, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { s } from "./shared";

// ── Source ────────────────────────────────────────────────────────────────────
type SourceStageProps = {
  onPickSource: (source: "camera" | "gallery") => void;
  onGoBack: () => void;
};

export function SourceStage({ onPickSource, onGoBack }: SourceStageProps) {
  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={onGoBack} style={s.backBtn}>
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
        <TouchableOpacity style={s.srcBtn} activeOpacity={0.8} onPress={() => onPickSource("camera")}>
          <Text style={s.srcBtnIcon}>📷</Text>
          <View>
            <Text style={s.srcBtnTitle}>Tirar foto</Text>
            <Text style={s.srcBtnSub}>Usar a câmera agora</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={[s.srcBtn, { backgroundColor: "#1E3A5F" }]} activeOpacity={0.8} onPress={() => onPickSource("gallery")}>
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
}

// ── Reading ───────────────────────────────────────────────────────────────────
type ReadingStageProps = {
  imageUri: string | null;
  progress: Animated.Value;
  readStep: number;
  readSteps: string[];
};

export function ReadingStage({ imageUri, progress, readStep, readSteps }: ReadingStageProps) {
  return (
    <SafeAreaView style={s.root}>
      <View style={s.centerFull}>
        {imageUri && <Image source={{ uri: imageUri }} style={s.thumbReading} resizeMode="cover" />}
        <Text style={s.readingTitle}>Lendo o comprovante…</Text>
        <View style={s.progressTrack}>
          <Animated.View style={[s.progressFill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
        </View>
        <Text style={s.readingStep}>{readSteps[readStep]}</Text>
        <ActivityIndicator color="#3B82F6" style={{ marginTop: 16 }} />
      </View>
    </SafeAreaView>
  );
}

// ── Done ──────────────────────────────────────────────────────────────────────
type DoneStageProps = {
  txType: "RECEITA" | "DESPESA";
  description: string;
  onGoBack: () => void;
  onRetake: () => void;
};

export function DoneStage({ txType, description, onGoBack, onRetake }: DoneStageProps) {
  return (
    <SafeAreaView style={s.root}>
      <View style={s.centerFull}>
        <Text style={s.doneEmoji}>✓</Text>
        <Text style={s.doneTitle}>{txType === "RECEITA" ? "Receita" : "Despesa"} lançada!</Text>
        <Text style={s.doneSub}>{description.trim() || "Lançamento"} foi adicionado ao seu saldo.</Text>
        <TouchableOpacity style={s.doneBtn} onPress={onGoBack}>
          <Text style={s.doneBtnTxt}>Concluir</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRetake} style={{ marginTop: 12 }}>
          <Text style={{ color: "#60A5FA", fontSize: 14, fontWeight: "700" }}>Lançar outro</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
