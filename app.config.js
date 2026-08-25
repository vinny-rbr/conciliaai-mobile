const { version } = require("./package.json");

export default {
  expo: {
    name: "ConciliaAI",
    slug: "conciliaai-mobile",
    version,
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    backgroundColor: "#0F172A",
    splash: {
      image: "./assets/android-icon-foreground.png",
      resizeMode: "contain",
      backgroundColor: "#000000",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.conciliaai.mobile",
      buildNumber: "5",
      infoPlist: {
        NSFaceIDUsageDescription:
          "O ConciliaAI usa Face ID para proteger suas informações financeiras.",
        NSPhotoLibraryUsageDescription:
          "O ConciliaAI acessa suas fotos para você escolher a imagem de um comprovante ou nota e registrar um lançamento financeiro a partir dela, e também para definir a foto do seu perfil. Por exemplo, você seleciona a foto de um recibo do supermercado e o app cria a despesa com o valor.",
        NSCameraUsageDescription:
          "O ConciliaAI usa a câmera para você fotografar um comprovante ou nota fiscal e registrar o lançamento a partir da foto. Por exemplo, tire uma foto do cupom da farmácia e o app cria a despesa automaticamente.",
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      versionCode: 43,
      adaptiveIcon: {
        backgroundColor: "#000000",
        foregroundImage: "./assets/android-icon-foreground.png",
      },
      predictiveBackGestureEnabled: false,
      package: "br.app.conciliaai.www.twa",
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? "./google-services.template.json",
      permissions: [
        "VIBRATE",
        "POST_NOTIFICATIONS",
        "android.permission.MODIFY_AUDIO_SETTINGS",
      ],
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "@react-native-community/datetimepicker",
      [
        "expo-av",
        {
          microphonePermission: false,
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/android-icon-foreground.png",
          color: "#3B82F6",
          defaultChannel: "conciliaai_v2",
          sounds: [
            "./assets/sounds/notification_bell.mp3",
            "./assets/sounds/premium.mp3",
            "./assets/sounds/twinkle.mp3",
            "./assets/sounds/welcome_chime.mp3",
            "./assets/sounds/threads.mp3",
            "./assets/sounds/blackberry.mp3",
            "./assets/sounds/wink.mp3",
            "./assets/sounds/bottle_cap.mp3",
            "./assets/sounds/beeper_rush.mp3",
            "./assets/sounds/blare.mp3",
            "./assets/sounds/crosswalk.mp3",
            "./assets/sounds/tlan_tlan.mp3",
          ],
        },
      ],
    ],
    extra: {
      eas: {
        projectId: "d1da11ae-d1fc-4657-bc1b-d191b62ed667",
      },
    },
  },
};
