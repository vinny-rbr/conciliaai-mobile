import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Audio } from "expo-av";
import { Platform } from "react-native";
import { apiFetch } from "./api";
import { getToken } from "./auth";

const PROJECT_ID     = "d1da11ae-d1fc-4657-bc1b-d191b62ed667";
const KEY_PUSH_TOKEN = "conciliaai_push_token";
const KEY_NOTIF_IDS  = "conciliaai_notif_ids";
export const KEY_SOUND = "conciliaai_notif_sound";

// Mapeamento: id da UI → nome do arquivo (sem extensão)
export const SOUND_FILE: Record<string, string> = {
  "default":           "default",
  "notification-bell": "notification_bell",
  "premium":           "premium",
  "twinkle":           "twinkle",
  "welcome-chime":     "welcome_chime",
  "threads":           "threads",
  "blackberry":        "blackberry",
  "wink":              "wink",
  "bottle-cap":        "bottle_cap",
  "beeper-rush":       "beeper_rush",
  "blare":             "blare",
  "crosswalk":         "crosswalk",
  "tlan-tlan":         "tlan_tlan",
};

// Assets para foreground (require() precisa ser estático)
export const SOUND_ASSETS: Record<string, number> = {
  notification_bell: require("../../assets/sounds/notification_bell.mp3"),
  premium:           require("../../assets/sounds/premium.mp3"),
  twinkle:           require("../../assets/sounds/twinkle.mp3"),
  welcome_chime:     require("../../assets/sounds/welcome_chime.mp3"),
  threads:           require("../../assets/sounds/threads.mp3"),
  blackberry:        require("../../assets/sounds/blackberry.mp3"),
  wink:              require("../../assets/sounds/wink.mp3"),
  bottle_cap:        require("../../assets/sounds/bottle_cap.mp3"),
  beeper_rush:       require("../../assets/sounds/beeper_rush.mp3"),
  blare:             require("../../assets/sounds/blare.mp3"),
  crosswalk:         require("../../assets/sounds/crosswalk.mp3"),
  tlan_tlan:         require("../../assets/sounds/tlan_tlan.mp3"),
};

// Android não permite alterar o som de um canal depois de criado.
// Solução: um canal por som — cada soundId tem seu próprio channelId.
export function getChannelId(soundId: string): string {
  const normalized = soundId.replace(/-/g, "_");
  return `conciliaai_v3_${normalized}`;
}

// Foreground: o handler não toca som — tratamos manualmente via expo-av
// para garantir o som escolhido pelo usuário.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  false, // gerenciado pelo setupForegroundNotificationListener
    shouldSetBadge:   false,
  }),
});

// Cria todos os canais Android no startup — um por som.
// Canais novos aceitam o som configurado; canais já existentes são ignorados pelo Android
// mas como usamos IDs diferentes por som, isso nunca acontece.
export async function setupAllChannels(): Promise<void> {
  if (Platform.OS !== "android") return;
  for (const [soundId, soundFile] of Object.entries(SOUND_FILE)) {
    const sound = soundFile === "default" ? "default" : soundFile;
    await Notifications.setNotificationChannelAsync(getChannelId(soundId), {
      name:             "ConciliaAI",
      importance:       Notifications.AndroidImportance.HIGH,
      sound,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:       "#3B82F6",
      enableVibrate:    true,
    });
  }
}

// Listener de foreground: quando chega push com app aberto, toca o som do usuário via expo-av.
// Retorna a função de cleanup para usar no useEffect.
export function setupForegroundNotificationListener(): () => void {
  const sub = Notifications.addNotificationReceivedListener(async () => {
    try {
      const soundId  = await SecureStore.getItemAsync(KEY_SOUND) ?? "default";
      const file     = SOUND_FILE[soundId] ?? "default";
      if (file === "default") return;
      const asset = SOUND_ASSETS[file];
      if (!asset) return;
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(asset, { shouldPlay: true, volume: 1 });
      sound.setOnPlaybackStatusUpdate(s => {
        if (s.isLoaded && s.didJustFinish) void sound.unloadAsync();
      });
    } catch { /* silencioso */ }
  });
  return () => sub.remove();
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function getOrRegisterPushToken(): Promise<string | null> {
  const cached = await SecureStore.getItemAsync(KEY_PUSH_TOKEN);
  if (cached) return cached;
  const token = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
  await SecureStore.setItemAsync(KEY_PUSH_TOKEN, token.data);
  return token.data;
}

// Registra token e channelId preferido no backend.
// O backend deve usar o channelId ao enviar push de grupos para este usuário.
export async function registerExpoTokenWithBackend(): Promise<void> {
  try {
    const authToken = await getToken();
    if (!authToken) { if (__DEV__) console.warn("[push-reg] sem authToken"); return; }
    let expoPushToken: string | null = null;
    try {
      expoPushToken = await getOrRegisterPushToken();
    } catch (e) {
      if (__DEV__) console.warn("[push-reg] getExpoPushToken falhou:", e);
      return;
    }
    if (!expoPushToken) { if (__DEV__) console.warn("[push-reg] token nulo"); return; }
    const soundId   = await SecureStore.getItemAsync(KEY_SOUND) ?? "default";
    const channelId = getChannelId(soundId);
    if (__DEV__) console.log("[push-reg] enviando token:", expoPushToken.slice(0, 30), "channelId:", channelId);
    const res = await apiFetch("/api/push/expo-token", {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ token: expoPushToken, channelId }),
    });
    if (__DEV__) console.log("[push-reg] resposta:", res.status);
  } catch (e) {
    if (__DEV__) console.warn("[push-reg] erro geral:", e);
  }
}

// Sincroniza o channelId preferido com o backend quando o usuário muda o som.
export async function syncChannelPreference(soundId: string): Promise<void> {
  try {
    const authToken = await getToken();
    if (!authToken) return;
    const channelId = getChannelId(soundId);
    await apiFetch("/api/push/channel-preference", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ channelId }),
    });
  } catch { /* best-effort */ }
}

const SCHEDULE: { hour: number; title: string; body: string }[] = [
  { hour:  9, title: "Bom dia! 💰",           body: "Hora de registrar os gastos da manhã." },
  { hour: 13, title: "Almoço registrado? 🍽️", body: "Não esqueça de anotar os lançamentos do meio-dia." },
  { hour: 19, title: "Como foi o dia? 📊",     body: "Registre seus gastos antes de esquecer." },
  { hour: 23, title: "Resumo do dia 🌙",       body: "Confira seu saldo e feche o dia organizado." },
];

export async function scheduleRecurringNotifications(soundId = "default") {
  await cancelAllScheduledNotifications();
  const channelId = getChannelId(soundId);
  const soundFile = SOUND_FILE[soundId] ?? "default";
  const ids: string[] = [];
  for (const item of SCHEDULE) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: item.title,
        body:  item.body,
        sound: soundFile === "default" ? "default" : `${soundFile}.mp3`,
      },
      trigger: {
        type:      Notifications.SchedulableTriggerInputTypes.DAILY,
        hour:      item.hour,
        minute:    0,
        channelId,
      },
    });
    ids.push(id);
  }
  await SecureStore.setItemAsync(KEY_NOTIF_IDS, JSON.stringify(ids));
}

export async function cancelAllScheduledNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await SecureStore.deleteItemAsync(KEY_NOTIF_IDS);
}

export async function sendTestNotification(soundId = "default") {
  const channelId = getChannelId(soundId);
  const soundFile = SOUND_FILE[soundId] ?? "default";
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "ConciliaAI 🔔",
      body:  "Notificações funcionando!",
      sound: soundFile === "default" ? "default" : `${soundFile}.mp3`,
    },
    trigger: {
      type:      Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds:   2,
      channelId,
    },
  });
}

// Mantida por compatibilidade — cria só o canal do soundId passado
export async function setupNotificationChannel(soundId = "default") {
  if (Platform.OS !== "android") return;
  const soundFile = SOUND_FILE[soundId] ?? "default";
  const sound = soundFile === "default" ? "default" : soundFile;
  await Notifications.setNotificationChannelAsync(getChannelId(soundId), {
    name:             "ConciliaAI",
    importance:       Notifications.AndroidImportance.HIGH,
    sound,
    vibrationPattern: [0, 250, 250, 250],
    lightColor:       "#3B82F6",
    enableVibrate:    true,
  });
}
