import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { apiFetch } from "./api";
import { getToken } from "./auth";

const PROJECT_ID    = "d1da11ae-d1fc-4657-bc1b-d191b62ed667";
const KEY_PUSH_TOKEN = "conciliaai_push_token";
const KEY_NOTIF_IDS  = "conciliaai_notif_ids";

// Som padrão quando o app está em foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   false,
  }),
});

// Mapeamento: id da UI → nome do arquivo em res/raw (sem extensão)
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

// ID versionado — Android não atualiza canal existente, novo ID força criação com o som correto
const CHANNEL_ID = "conciliaai_v2";

export async function setupNotificationChannel(soundId = "default") {
  if (Platform.OS !== "android") return;
  const soundFile = SOUND_FILE[soundId] ?? "default";
  // Android busca em res/raw/ pelo nome SEM extensão
  const sound = soundFile === "default" ? "default" : soundFile;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "ConciliaAI",
    importance:       Notifications.AndroidImportance.HIGH,
    sound,
    vibrationPattern: [0, 250, 250, 250],
    lightColor:       "#3B82F6",
    enableVibrate:    true,
  });
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
    if (__DEV__) console.log("[push-reg] enviando token:", expoPushToken.slice(0, 30));
    const res = await apiFetch("/api/push/expo-token", {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ token: expoPushToken }),
    });
    if (__DEV__) console.log("[push-reg] resposta:", res.status);
  } catch (e) {
    if (__DEV__) console.warn("[push-reg] erro geral:", e);
  }
}

const SCHEDULE: { hour: number; title: string; body: string }[] = [
  { hour:  9, title: "Bom dia! 💰",           body: "Hora de registrar os gastos da manhã." },
  { hour: 13, title: "Almoço registrado? 🍽️", body: "Não esqueça de anotar os lançamentos do meio-dia." },
  { hour: 19, title: "Como foi o dia? 📊",     body: "Registre seus gastos antes de esquecer." },
  { hour: 23, title: "Resumo do dia 🌙",       body: "Confira seu saldo e feche o dia organizado." },
];

export async function scheduleRecurringNotifications(soundId = "default") {
  await cancelAllScheduledNotifications();
  await setupNotificationChannel(soundId);

  const soundFile = SOUND_FILE[soundId] ?? "default";
  const ids: string[] = [];
  for (const item of SCHEDULE) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: item.title,
        body:  item.body,
        // iOS usa o nome do arquivo; Android usa o canal (CHANNEL_ID)
        sound: soundFile === "default" ? "default" : `${soundFile}.mp3`,
      },
      trigger: {
        type:             Notifications.SchedulableTriggerInputTypes.DAILY,
        hour:             item.hour,
        minute:           0,
        channelId:        CHANNEL_ID,
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
  await setupNotificationChannel(soundId);
  const soundFile = SOUND_FILE[soundId] ?? "default";
  await Notifications.scheduleNotificationAsync({
    content: {
      title:   "ConciliaAI 🔔",
      body:    "Notificações funcionando!",
      sound:   soundFile === "default" ? "default" : `${soundFile}.mp3`,
    },
    trigger: {
      type:      Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds:   2,
      channelId: CHANNEL_ID,
    },
  });
}
