import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, Vibration, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Svg, { Path } from "react-native-svg";
import * as SecureStore from "expo-secure-store";
import {
  requestNotificationPermissions,
  scheduleRecurringNotifications,
  cancelAllScheduledNotifications,
  sendTestNotification,
} from "../../../lib/notificationService";

const KEY_ENABLED = "conciliaai_notif_enabled";
const KEY_VIBRATE = "conciliaai_notif_vibrate";
const KEY_SOUND   = "conciliaai_notif_sound";

const SOUNDS = [
  { id: "default",           label: "Padrão do sistema" },
  { id: "notification-bell", label: "Notification Bell" },
  { id: "premium",           label: "Premium" },
  { id: "twinkle",           label: "Twinkle" },
  { id: "welcome-chime",     label: "Welcome Chime" },
  { id: "threads",           label: "Threads" },
  { id: "blackberry",        label: "Blackberry" },
  { id: "wink",              label: "Wink" },
  { id: "bottle-cap",        label: "Bottle Cap" },
  { id: "beeper-rush",       label: "Beeper Rush" },
  { id: "blare",             label: "Blare" },
  { id: "crosswalk",         label: "Crosswalk" },
  { id: "tlan-tlan",         label: "Tlan Tlan" },
];

function Toggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.8} style={[s.toggleTrack, value && s.toggleTrackOn]}>
      <View style={[s.toggleThumb, value && s.toggleThumbOn]} />
    </TouchableOpacity>
  );
}

export default function NotificacoesScreen() {
  const navigation = useNavigation();
  const [enabled, setEnabled] = useState(false);
  const [vibrate, setVibrate] = useState(true);
  const [sound,   setSound]   = useState("default");
  const [loading, setLoading] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    const [e, v, sd] = await Promise.all([
      SecureStore.getItemAsync(KEY_ENABLED),
      SecureStore.getItemAsync(KEY_VIBRATE),
      SecureStore.getItemAsync(KEY_SOUND),
    ]);
    if (e  !== null) setEnabled(e === "true");
    if (v  !== null) setVibrate(v !== "false");
    if (sd)          setSound(sd);
  }

  async function toggleEnabled() {
    setLoading(true);
    const next = !enabled;

    if (next) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          "Permissão negada",
          "Acesse Configurações > Aplicativos > ConciliaAI > Notificações para ativar.",
        );
        setLoading(false);
        return;
      }
      await scheduleRecurringNotifications(sound !== "none");
    } else {
      await cancelAllScheduledNotifications();
    }

    setEnabled(next);
    await SecureStore.setItemAsync(KEY_ENABLED, String(next));
    setLoading(false);
  }

  async function toggleVibrate() {
    const next = !vibrate;
    setVibrate(next);
    await SecureStore.setItemAsync(KEY_VIBRATE, String(next));
    if (next) Vibration.vibrate(200);
  }

  async function selectSound(id: string) {
    setSound(id);
    await SecureStore.setItemAsync(KEY_SOUND, id);
    // Re-agenda com o novo som se as notificações estiverem ativas
    if (enabled) {
      await scheduleRecurringNotifications(id !== "none");
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#cdddf7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M14 6l-6 6 6 6" />
          </Svg>
          <Text style={s.backTxt}>Voltar</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notificações</Text>
        <View style={{ width: 54 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Ativar notificações */}
        <View style={s.card}>
          <View style={s.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleLabel}>Ativar notificações</Text>
              <Text style={s.toggleSub}>Receba lembretes para registrar seus gastos</Text>
            </View>
            <Toggle value={enabled} onToggle={() => { if (!loading) void toggleEnabled(); }} />
          </View>
        </View>

        {/* Status */}
        <View style={[s.statusCard, enabled ? s.statusCardOn : s.statusCardOff]}>
          <Text style={[s.statusTxt, enabled ? s.statusTxtOn : s.statusTxtOff]}>
            {enabled ? "✓ Notificações ativadas." : "Notificações desativadas."}
          </Text>
        </View>

        {/* Testar */}
        {enabled && (
          <TouchableOpacity style={s.testBtn} onPress={() => void sendTestNotification()} activeOpacity={0.8}>
            <Text style={s.testBtnTxt}>🔔 Testar notificação agora</Text>
          </TouchableOpacity>
        )}

        {/* Vibração */}
        <View style={[s.card, { marginTop: 16 }]}>
          <View style={s.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleLabel}>Vibração</Text>
              <Text style={s.toggleSub}>Vibrar ao receber notificação</Text>
            </View>
            <Toggle value={vibrate} onToggle={() => void toggleVibrate()} />
          </View>
        </View>

        {/* Som */}
        <Text style={s.sectionLabel}>SOM DE NOTIFICAÇÃO</Text>
        <View style={s.card}>
          {SOUNDS.map((snd, i) => {
            const selected = sound === snd.id;
            return (
              <View key={snd.id}>
                <TouchableOpacity style={s.soundRow} onPress={() => void selectSound(snd.id)} activeOpacity={0.7}>
                  <View style={[s.radio, selected && s.radioSelected]}>
                    {selected && <View style={s.radioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.soundLabel, selected && s.soundLabelSelected]}>{snd.label}</Text>
                    {snd.id === "default" && (
                      <Text style={s.soundHint}>Som padrão do Android</Text>
                    )}
                  </View>
                </TouchableOpacity>
                {i < SOUNDS.length - 1 && <View style={s.divider} />}
              </View>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: "#070d1a" },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, paddingTop: 6, paddingBottom: 10 },
  backBtn:     { flexDirection: "row", alignItems: "center", gap: 2 },
  backTxt:     { color: "#cdddf7", fontSize: 14, fontWeight: "600" },
  headerTitle: { color: "#F1F5F9", fontSize: 15, fontWeight: "700" },
  scroll:      { paddingHorizontal: 18, paddingTop: 8 },

  card:    { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.11)", overflow: "hidden" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginHorizontal: 15 },

  toggleRow:   { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  toggleLabel: { color: "#F1F5F9", fontSize: 15, fontWeight: "800", marginBottom: 3 },
  toggleSub:   { color: "#64748B", fontSize: 12, fontWeight: "500" },

  toggleTrack:   { width: 52, height: 30, borderRadius: 15, backgroundColor: "rgba(148,163,184,0.15)", justifyContent: "center", paddingHorizontal: 3 },
  toggleTrackOn: { backgroundColor: "#2563EB" },
  toggleThumb:   { width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff", alignSelf: "flex-start", shadowColor: "#000", shadowRadius: 4, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 2 } },
  toggleThumbOn: { alignSelf: "flex-end" },

  statusCard:    { borderRadius: 12, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 14, marginTop: 8 },
  statusCardOn:  { backgroundColor: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.4)" },
  statusCardOff: { backgroundColor: "rgba(148,163,184,0.08)", borderColor: "rgba(148,163,184,0.18)" },
  statusTxt:     { fontSize: 13, fontWeight: "600" },
  statusTxtOn:   { color: "#86efac" },
  statusTxtOff:  { color: "#64748B" },

  testBtn:    { marginTop: 10, backgroundColor: "rgba(59,130,246,0.15)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(59,130,246,0.4)", paddingVertical: 12, alignItems: "center" },
  testBtnTxt: { color: "#60A5FA", fontSize: 14, fontWeight: "700" },

  sectionLabel: { color: "#7e93b3", fontSize: 11, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", marginTop: 24, marginBottom: 10, marginLeft: 4 },

  soundRow:           { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  radio:              { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: "#475569", alignItems: "center", justifyContent: "center" },
  radioSelected:      { borderColor: "#60A5FA" },
  radioDot:           { width: 10, height: 10, borderRadius: 5, backgroundColor: "#60A5FA" },
  soundLabel:         { color: "#CBD5E1", fontSize: 14, fontWeight: "600" },
  soundLabelSelected: { color: "#93c0ff", fontWeight: "700" },
  soundHint:          { color: "#475569", fontSize: 11, marginTop: 2 },
});
