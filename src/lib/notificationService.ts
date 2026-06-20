import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const PROJECT_ID = "d1da11ae-d1fc-4657-bc1b-d191b62ed667";
const KEY_PUSH_TOKEN = "conciliaai_push_token";
const KEY_NOTIF_IDS  = "conciliaai_notif_ids";

// Exibir notificação mesmo com o app aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   false,
  }),
});

export async function setupNotificationChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "ConciliaAI",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#3B82F6",
    enableVibrate: true,
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function getOrRegisterPushToken(): Promise<string | null> {
  try {
    const cached = await SecureStore.getItemAsync(KEY_PUSH_TOKEN);
    if (cached) return cached;
    const token = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    await SecureStore.setItemAsync(KEY_PUSH_TOKEN, token.data);
    return token.data;
  } catch {
    return null;
  }
}

const SCHEDULE: { hour: number; title: string; body: string }[] = [
  { hour:  9, title: "Bom dia! 💰",        body: "Hora de registrar os gastos da manhã." },
  { hour: 13, title: "Almoço registrado? 🍽️", body: "Não esqueça de anotar os lançamentos do meio-dia." },
  { hour: 19, title: "Como foi o dia? 📊",  body: "Registre seus gastos antes de esquecer." },
  { hour: 23, title: "Resumo do dia 🌙",    body: "Confira seu saldo e feche o dia organizado." },
];

export async function scheduleRecurringNotifications(soundEnabled = true) {
  await cancelAllScheduledNotifications();
  const ids: string[] = [];
  for (const item of SCHEDULE) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: item.title,
        body:  item.body,
        sound: soundEnabled ? "default" : undefined,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: item.hour,
        minute: 0,
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

export async function sendTestNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "ConciliaAI 🔔",
      body: "Notificações funcionando!",
      sound: "default",
    },
    trigger: { seconds: 2, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
  });
}
