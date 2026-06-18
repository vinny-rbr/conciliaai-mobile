import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Svg, { Path } from "react-native-svg";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { getToken, getEmailFromAnySource, getUser } from "../../lib/auth";
import { apiUrl } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { s, getInitials, decodeUserId, PHOTO_KEY, type Sub } from "./perfil/shared";
import {
  AvatarSection, DadosPessoaisSection, AssinaturaSection,
  ContaSection, JuridicoSection, SugestoesSection,
} from "./perfil/sections";

export default function PerfilScreen() {
  const navigation = useNavigation();
  const { signOut } = useAuth();

  const [email, setEmail]               = useState("");
  const [name, setName]                 = useState("");
  const [cpf, setCpf]                   = useState("");
  const [sub, setSub]                   = useState<Sub | null>(null);
  const [photo, setPhoto]               = useState<string | null>(null);
  const [userId, setUserId]             = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);
  const [savingName, setSavingName]     = useState(false);
  const [savingCpf, setSavingCpf]       = useState(false);
  const [savedName, setSavedName]       = useState(false);
  const [savedCpf, setSavedCpf]         = useState(false);
  const [suggestion, setSuggestion]     = useState("");
  const [suggesting, setSuggesting]     = useState(false);
  const [suggestionSent, setSuggestionSent] = useState(false);
  const [deleting, setDeleting]         = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [emailVal, token, cached] = await Promise.all([
        getEmailFromAnySource(), getToken(), getUser(),
      ]);
      if (emailVal) setEmail(emailVal);

      const uid = token ? decodeUserId(token) : null;
      if (uid) {
        setUserId(uid);
        const photoUri = await SecureStore.getItemAsync(PHOTO_KEY(uid));
        if (photoUri) setPhoto(photoUri);
      }

      if (cached) {
        if (typeof cached.name === "string" && cached.name.trim()) setName(cached.name.trim());
        if (typeof cached.cpfCnpj === "string") setCpf(cached.cpfCnpj);
      }

      if (token) {
        const [uRes, sRes] = await Promise.all([
          fetch(apiUrl("/api/users/me"),          { headers: { Authorization: `Bearer ${token}` } }),
          fetch(apiUrl("/api/subscriptions/me"),  { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (uRes.ok) {
          const d = await uRes.json() as Record<string, unknown>;
          if (typeof d.name === "string" && d.name.trim()) setName(d.name.trim());
          if (typeof d.cpfCnpj === "string") setCpf(d.cpfCnpj);
        }
        if (sRes.ok) {
          const d = await sRes.json() as Record<string, unknown>;
          setSub({
            isLifetime: d.isLifetime === true || d.lifetime === true,
            status: typeof d.status === "string" ? d.status : "inactive",
            startDateUtc: typeof d.startDateUtc === "string" ? d.startDateUtc : null,
            endDateUtc: typeof d.subscriptionEndDateUtc === "string" ? d.subscriptionEndDateUtc :
                        typeof d.endDateUtc === "string" ? d.endDateUtc : null,
          });
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permissão necessária", "Habilite o acesso à galeria nas configurações.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images" as const,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1] as [number, number],
    });
    if (result.canceled || !result.assets?.[0]) return;
    const uri = result.assets[0].uri;
    setPhoto(uri);
    if (userId) await SecureStore.setItemAsync(PHOTO_KEY(userId), uri);
  }

  async function saveName() {
    const token = await getToken();
    if (!token || !name.trim()) return;
    setSavingName(true);
    try {
      const res = await fetch(apiUrl("/api/users/me"), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        setSavedName(true);
        setTimeout(() => setSavedName(false), 2000);
      }
    } catch { /* ignore */ }
    setSavingName(false);
  }

  async function saveCpf() {
    const token = await getToken();
    if (!token) return;
    setSavingCpf(true);
    try {
      const res = await fetch(apiUrl("/api/users/me"), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ cpfCnpj: cpf }),
      });
      if (res.ok) {
        setSavedCpf(true);
        setTimeout(() => setSavedCpf(false), 2000);
      }
    } catch { /* ignore */ }
    setSavingCpf(false);
  }

  async function sendSuggestion() {
    if (!suggestion.trim()) return;
    const token = await getToken();
    if (!token) return;
    setSuggesting(true);
    try {
      const res = await fetch(apiUrl("/api/suggestions"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: suggestion.trim() }),
      });
      if (res.ok) { setSuggestionSent(true); setSuggestion(""); }
      else Alert.alert("Erro ao enviar sugestão.", "Tente novamente.");
    } catch { Alert.alert("Erro ao enviar sugestão.", "Tente novamente."); }
    setSuggesting(false);
  }

  function handleLogout() {
    Alert.alert("Sair", "Deseja sair da conta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Excluir conta",
      "Esta ação é irreversível. Todos os seus dados serão apagados permanentemente.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const token = await getToken();
              const res = await fetch(apiUrl("/api/users/me"), {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token ?? ""}` },
              });
              if (res.ok) await signOut();
              else Alert.alert("Não foi possível excluir a conta.", "Tente novamente ou fale com o suporte.");
            } catch { Alert.alert("Não foi possível excluir a conta.", "Tente novamente."); }
            setDeleting(false);
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}><ActivityIndicator color="#3B82F6" size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      {/* Aurora background blobs — iOS only (Android renders them as solid dark circles) */}
      {Platform.OS === "ios" && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" }} pointerEvents="none">
          <View style={[s.auroraBlob, { top: 30,   left: -60,  width: 240, height: 240, backgroundColor: "rgba(59,130,246,0.15)" }]} />
          <View style={[s.auroraBlob, { top: 120,  right: -70, width: 260, height: 260, backgroundColor: "rgba(139,92,246,0.12)" }]} />
          <View style={[s.auroraBlob, { top: 480,  left: -50,  width: 240, height: 240, backgroundColor: "rgba(20,184,166,0.10)" }]} />
          <View style={[s.auroraBlob, { top: 720,  right: -60, width: 240, height: 240, backgroundColor: "rgba(99,102,241,0.10)" }]} />
          <View style={[s.auroraBlob, { top: 1060, left: -40,  width: 230, height: 230, backgroundColor: "rgba(59,130,246,0.10)" }]} />
        </View>
      )}

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#cdddf7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M14 6l-6 6 6 6" />
          </Svg>
          <Text style={s.backTxt}>Voltar</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Meu perfil</Text>
        <View style={{ width: 54 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <AvatarSection
          photo={photo}
          initials={getInitials(name || email)}
          name={name}
          email={email}
          sub={sub}
          onPickPhoto={() => void pickPhoto()}
        />

        <View style={s.sectionWrap}>
          <Text style={s.sectionLabel}>DADOS PESSOAIS</Text>
          <DadosPessoaisSection
            name={name} email={email} cpf={cpf}
            savingName={savingName} savingCpf={savingCpf}
            savedName={savedName} savedCpf={savedCpf}
            onChangeName={setName} onChangeCpf={setCpf}
            onSaveName={() => void saveName()}
            onSaveCpf={() => void saveCpf()}
          />
        </View>

        <View style={s.sectionWrap}>
          <Text style={s.sectionLabel}>ASSINATURA</Text>
          <AssinaturaSection sub={sub} />
        </View>

        <View style={s.sectionWrap}>
          <Text style={s.sectionLabel}>CONTA</Text>
          <ContaSection deleting={deleting} onLogout={handleLogout} onDelete={handleDeleteAccount} />
        </View>

        <View style={s.sectionWrap}>
          <Text style={s.sectionLabel}>JURÍDICO</Text>
          <JuridicoSection />
        </View>

        <View style={s.sectionWrap}>
          <Text style={s.sectionLabel}>SUGESTÕES</Text>
          <SugestoesSection
            suggestion={suggestion}
            suggesting={suggesting}
            suggestionSent={suggestionSent}
            onChange={text => { setSuggestion(text); setSuggestionSent(false); }}
            onSend={() => void sendSuggestion()}
          />
        </View>

        <Text style={s.footer}>ConciliaAI · Versão 1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
