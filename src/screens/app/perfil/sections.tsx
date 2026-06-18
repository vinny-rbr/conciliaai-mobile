import { ActivityIndicator, Image, Linking, Text, TextInput, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { Sub } from "./shared";
import { s, fmtDate, chipInfo } from "./shared";
import { rootNavigate } from "../../../navigation/rootNav";

// ── SVG Icons ─────────────────────────────────────────────────────────────────
function IcoUser({ size = 19, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="8" r="3.6" />
      <Path d="M5 20c0-3.6 3.2-5.6 7-5.6s7 2 7 5.6" />
    </Svg>
  );
}

function IcoMail({ size = 19, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="5" width="18" height="14" rx="2.5" />
      <Path d="M3.5 7l8.5 6 8.5-6" />
    </Svg>
  );
}

function IcoId({ size = 19, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="5" width="18" height="14" rx="2.5" />
      <Circle cx="8.5" cy="11" r="2" />
      <Path d="M13 10h5M13 14h4M5.5 16c.6-1.6 4.4-1.6 5 0" />
    </Svg>
  );
}

function IcoShield({ size = 19, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z" />
    </Svg>
  );
}

function IcoBell({ size = 19, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z" />
      <Path d="M10 20a2 2 0 004 0" />
    </Svg>
  );
}

function IcoLogout({ size = 19, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 4h3a1 1 0 011 1v14a1 1 0 01-1 1h-3" />
      <Path d="M10 12h9M15 8l4 4-4 4" />
    </Svg>
  );
}

function IcoTrash({ size = 19, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" />
    </Svg>
  );
}

function IcoCamera({ size = 15, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 8h3l1.4-2h7.2L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
      <Circle cx="12" cy="13" r="3.4" />
    </Svg>
  );
}

function IcoEdit({ size = 16, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 19l13-13M9 6h9v9" />
    </Svg>
  );
}

function IcoPlus({ size = 18, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 6v12M6 12h12" />
    </Svg>
  );
}

function IcoChevronRight({ size = 18, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

function IcoCheck({ size = 16, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12l4.5 4.5L19 7" />
    </Svg>
  );
}

function IcoArrowRight({ size = 17, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}

function IcoCrown({ size = 21 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="#fde68a" stroke="#fde68a" strokeWidth="1.3" strokeLinejoin="round">
      <Path d="M3 8l4.5 3.5L12 4l4.5 7.5L21 8l-1.8 10.5H4.8z" />
    </Svg>
  );
}

export { IcoChevronRight as IcoChevronLeft };

// ── Avatar ────────────────────────────────────────────────────────────────────
type AvatarSectionProps = {
  photo: string | null;
  initials: string;
  name: string;
  email: string;
  sub: Sub | null;
  onPickPhoto: () => void;
};

export function AvatarSection({ photo, initials, name, email, sub, onPickPhoto }: AvatarSectionProps) {
  const isActive = sub && (sub.status === "active" || sub.isLifetime);
  const badgeColor    = isActive ? "#4ADE80" : "#F87171";
  const badgeBg       = isActive ? "rgba(74,222,128,0.14)"  : "rgba(248,113,113,0.14)";
  const badgeBorder   = isActive ? "rgba(74,222,128,0.45)"  : "rgba(248,113,113,0.42)";
  const badgeTextColor = isActive ? "#86efac" : "#fca5a5";
  const badgeLabel    = isActive ? "Plano ativo" : "Plano inativo";

  return (
    <View style={s.avatarSection}>
      <TouchableOpacity style={{ position: "relative" }} onPress={onPickPhoto} activeOpacity={0.8}>
        <View style={s.avatarRingOuter}>
          {photo ? (
            <Image source={{ uri: photo }} style={s.avatarImg} />
          ) : (
            <View style={s.avatarInner}>
              <Text style={s.avatarInitials}>{initials}</Text>
            </View>
          )}
        </View>
        <View style={s.cameraBadge}>
          <IcoCamera size={15} color="#fff" />
        </View>
      </TouchableOpacity>

      <Text style={s.avatarName}>{name || "—"}</Text>
      <Text style={s.avatarEmail}>{email}</Text>

      <View style={[s.badge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
        <View style={[s.badgeDot, { backgroundColor: badgeColor }]} />
        <Text style={[s.badgeTxt, { color: badgeTextColor }]}>{badgeLabel}</Text>
      </View>
    </View>
  );
}

// ── Dados pessoais ────────────────────────────────────────────────────────────
type DadosPessoaisProps = {
  name: string;
  email: string;
  cpf: string;
  savingName: boolean;
  savingCpf: boolean;
  onChangeName: (v: string) => void;
  onChangeCpf: (v: string) => void;
  onSaveName: () => void;
  onSaveCpf: () => void;
};

export function DadosPessoaisSection({ name, email, cpf, savingName, savingCpf, onChangeName, onChangeCpf, onSaveName, onSaveCpf }: DadosPessoaisProps) {
  return (
    <View style={s.card}>
      <View style={s.row}>
        <View style={[s.rowIcon, { backgroundColor: "rgba(96,165,250,0.16)" }]}>
          <IcoUser color="#93c0ff" />
        </View>
        <View style={s.rowBody}>
          <Text style={s.rowLabel}>NOME</Text>
          <TextInput
            style={s.rowInput}
            value={name}
            onChangeText={onChangeName}
            placeholder="Seu nome"
            placeholderTextColor="#475569"
            returnKeyType="done"
            onBlur={onSaveName}
            onSubmitEditing={onSaveName}
          />
        </View>
        {savingName
          ? <ActivityIndicator color="#60A5FA" size="small" />
          : <IcoEdit size={16} color="#6b82a6" />}
      </View>
      <View style={s.divider} />
      <View style={s.row}>
        <View style={[s.rowIcon, { backgroundColor: "rgba(167,139,250,0.16)" }]}>
          <IcoMail color="#c4b5fd" />
        </View>
        <View style={s.rowBody}>
          <Text style={s.rowLabel}>E-MAIL</Text>
          <Text style={s.rowValue}>{email || "—"}</Text>
        </View>
      </View>
      <View style={s.divider} />
      <View style={s.row}>
        <View style={[s.rowIcon, { backgroundColor: "rgba(45,212,191,0.16)" }]}>
          <IcoId color="#5eead4" />
        </View>
        <View style={s.rowBody}>
          <Text style={s.rowLabel}>CPF</Text>
          <TextInput
            style={s.rowInput}
            value={cpf}
            onChangeText={onChangeCpf}
            placeholder="Adicionar CPF"
            placeholderTextColor="#9db4d6"
            keyboardType="numeric"
            returnKeyType="done"
            onBlur={onSaveCpf}
            onSubmitEditing={onSaveCpf}
          />
        </View>
        {savingCpf
          ? <ActivityIndicator color="#60A5FA" size="small" />
          : !cpf ? <IcoPlus size={18} color="#60A5FA" /> : null}
      </View>
    </View>
  );
}

// ── Assinatura ────────────────────────────────────────────────────────────────
type AssinaturaProps = { sub: Sub | null };

export function AssinaturaSection({ sub }: AssinaturaProps) {
  const isActive = sub && (sub.status === "active" || sub.isLifetime);

  if (!isActive) {
    return (
      <View style={[s.subCard, { padding: 18 }]}>
        <View style={s.subCtaHeader}>
          <View style={s.subCtaIconWrap}><IcoCrown /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.subCtaTitle}>Desbloqueie o Premium</Text>
            <Text style={s.subCtaSub}>Sua conta está sem plano ativo</Text>
          </View>
        </View>
        <View style={s.subCtaFeatures}>
          <View style={s.subCtaFeature}>
            <IcoCheck size={16} color="#5eead4" />
            <Text style={s.subCtaFeatureTxt}>Conciliações ilimitadas</Text>
          </View>
          <View style={s.subCtaFeature}>
            <IcoCheck size={16} color="#5eead4" />
            <Text style={s.subCtaFeatureTxt}>Relatórios completos e exportação</Text>
          </View>
        </View>
        <TouchableOpacity style={s.subCtaBtn} activeOpacity={0.85} onPress={() => rootNavigate("Planos")}>
          <Text style={s.subCtaBtnTxt}>Ver planos</Text>
          <IcoArrowRight size={17} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.subCard}>
      <View style={s.subRow}>
        <Text style={s.subTitle}>Ciclo atual</Text>
        <View style={[s.badge, { backgroundColor: "rgba(74,222,128,0.14)", borderColor: "rgba(74,222,128,0.4)" }]}>
          <View style={[s.badgeDot, { backgroundColor: "#4ADE80" }]} />
          <Text style={[s.badgeTxt, { color: "#86efac" }]}>{sub?.isLifetime ? "Vitalício" : chipInfo(sub).label}</Text>
        </View>
      </View>
      <View style={s.subDates}>
        <View style={s.subDateItem}>
          <Text style={s.subDateLabel}>PAGAMENTO</Text>
          <Text style={s.subDateValue}>{fmtDate(sub?.startDateUtc)}</Text>
        </View>
        <View style={[s.subDateItem, { alignItems: "flex-end" }]}>
          <Text style={s.subDateLabel}>VENCIMENTO</Text>
          <Text style={s.subDateValue}>{sub?.isLifetime ? "—" : fmtDate(sub?.endDateUtc)}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Conta ─────────────────────────────────────────────────────────────────────
type ContaProps = { deleting: boolean; onLogout: () => void; onDelete: () => void };

export function ContaSection({ deleting, onLogout, onDelete }: ContaProps) {
  return (
    <View style={s.card}>
      <TouchableOpacity style={s.menuRow} activeOpacity={0.7}>
        <View style={[s.rowIcon, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
          <IcoShield color="#aebfd9" />
        </View>
        <Text style={s.menuLabel}>Segurança e senha</Text>
        <IcoChevronRight size={18} color="#5d7398" />
      </TouchableOpacity>
      <View style={s.divider} />
      <TouchableOpacity style={s.menuRow} activeOpacity={0.7} onPress={() => rootNavigate("Notificacoes")}>
        <View style={[s.rowIcon, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
          <IcoBell color="#aebfd9" />
        </View>
        <Text style={s.menuLabel}>Notificações</Text>
        <IcoChevronRight size={18} color="#5d7398" />
      </TouchableOpacity>
      <View style={s.divider} />
      <TouchableOpacity style={s.menuRow} activeOpacity={0.7} onPress={onLogout}>
        <View style={[s.rowIcon, { backgroundColor: "rgba(248,113,113,0.14)" }]}>
          <IcoLogout color="#fca5a5" />
        </View>
        <Text style={[s.menuLabel, { color: "#fca5a5" }]}>Sair da conta</Text>
      </TouchableOpacity>
      <View style={s.divider} />
      <TouchableOpacity style={s.menuRow} activeOpacity={0.7} onPress={onDelete} disabled={deleting}>
        <View style={[s.rowIcon, { backgroundColor: "rgba(248,113,113,0.14)" }]}>
          {deleting
            ? <ActivityIndicator color="#fca5a5" size="small" />
            : <IcoTrash color="#fca5a5" />}
        </View>
        <Text style={[s.menuLabel, { color: "#fca5a5" }]}>Excluir conta</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Jurídico ──────────────────────────────────────────────────────────────────
export function JuridicoSection() {
  return (
    <View style={s.card}>
      <TouchableOpacity
        style={s.menuRow}
        activeOpacity={0.7}
        onPress={() => void Linking.openURL("https://conciliaai.app.br/privacidade")}
      >
        <View style={[s.rowIcon, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
          <IcoShield color="#aebfd9" />
        </View>
        <Text style={s.menuLabel}>Política de Privacidade</Text>
        <IcoChevronRight size={18} color="#5d7398" />
      </TouchableOpacity>
    </View>
  );
}

// ── Sugestões ─────────────────────────────────────────────────────────────────
type SugestoesProps = {
  suggestion: string;
  suggesting: boolean;
  suggestionSent: boolean;
  onChange: (text: string) => void;
  onSend: () => void;
};

export function SugestoesSection({ suggestion, suggesting, suggestionSent, onChange, onSend }: SugestoesProps) {
  return (
    <View style={s.card}>
      <Text style={s.suggestionDesc}>
        Tem uma ideia ou melhoria? Conta pra gente — toda sugestão é lida com atenção.
      </Text>
      <TextInput
        style={s.suggestionInput}
        value={suggestion}
        onChangeText={onChange}
        placeholder="Escreva sua sugestão aqui..."
        placeholderTextColor="#5d7398"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
      {suggestionSent ? (
        <Text style={s.suggestionSent}>Sugestão enviada! Obrigado ✓</Text>
      ) : (
        <TouchableOpacity
          style={[s.suggestionBtn, (!suggestion.trim() || suggesting) && { opacity: 0.4 }]}
          onPress={onSend}
          disabled={!suggestion.trim() || suggesting}
          activeOpacity={0.8}
        >
          {suggesting
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.suggestionBtnTxt}>Enviar sugestão</Text>}
        </TouchableOpacity>
      )}
    </View>
  );
}
