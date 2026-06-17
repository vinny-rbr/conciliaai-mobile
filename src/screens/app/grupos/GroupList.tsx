import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createGroup } from "../../../lib/groupsService";
import { getToken } from "../../../lib/auth";
import type { GroupDto } from "../../../lib/groupsService";
import { AvatarCircle, ModalSheet } from "./components";
import { fmtDate, s } from "./shared";

type Props = {
  groups: GroupDto[];
  loadingGroups: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenGroup: (g: GroupDto) => void;
  onDeleteGroup: (g: GroupDto) => void;
  onGroupsChanged: () => void;
};

export default function GroupList({
  groups, loadingGroups, refreshing, onRefresh,
  onOpenGroup, onDeleteGroup, onGroupsChanged,
}: Props) {
  const [showCreate,    setShowCreate]    = useState(false);
  const [newGroupName,  setNewGroupName]  = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [showInvite,    setShowInvite]    = useState(false);
  const [inviteCode,    setInviteCode]    = useState("");
  const [joiningInvite, setJoiningInvite] = useState(false);

  async function handleCreateGroup() {
    if (!newGroupName.trim()) return;
    setCreatingGroup(true);
    try {
      await createGroup(newGroupName.trim());
      setNewGroupName(""); setShowCreate(false);
      onGroupsChanged();
    } catch (e) { Alert.alert("Erro", e instanceof Error ? e.message : "Erro ao criar."); }
    finally { setCreatingGroup(false); }
  }

  async function handleJoinInvite() {
    if (!inviteCode.trim()) return;
    setJoiningInvite(true);
    try {
      const token = await getToken();
      const r = await fetch("https://conciliaai-api.onrender.com/api/groups/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ code: inviteCode.trim() }),
      });
      if (!r.ok) throw new Error("Código inválido ou expirado.");
      setInviteCode(""); setShowInvite(false);
      Alert.alert("Sucesso", "Você entrou no grupo!");
      onGroupsChanged();
    } catch (e) { Alert.alert("Erro", e instanceof Error ? e.message : "Erro ao aceitar convite."); }
    finally { setJoiningInvite(false); }
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.listHeader}>
        <Text style={s.listTitle}>Grupos</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={s.hdrBtn2} onPress={() => setShowInvite(true)}>
            <Text style={s.hdrBtn2Txt}>Entrar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.hdrBtn} onPress={() => setShowCreate(true)}>
            <Text style={s.hdrBtnTxt}>+ Novo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loadingGroups ? (
        <View style={s.center}><ActivityIndicator color="#3B82F6" size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.listScroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
          showsVerticalScrollIndicator={false}
        >
          {groups.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={s.emptyEmoji}>👥</Text>
              <Text style={s.emptyTitle}>Nenhum grupo ainda</Text>
              <Text style={s.emptySub}>Crie um grupo para dividir despesas com amigos, família ou colegas de trabalho.</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => setShowCreate(true)}>
                <Text style={s.emptyBtnTxt}>Criar primeiro grupo</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowInvite(true)} style={{ marginTop: 12 }}>
                <Text style={{ color: "#60A5FA", fontSize: 14, fontWeight: "700" }}>Tenho um código de convite</Text>
              </TouchableOpacity>
            </View>
          ) : groups.map((g, i) => (
            <TouchableOpacity key={g.id} style={s.groupCard} activeOpacity={0.8}
              onPress={() => onOpenGroup(g)}
              onLongPress={() => onDeleteGroup(g)}
            >
              <AvatarCircle label={g.name} idx={i} />
              <View style={{ flex: 1 }}>
                <Text style={s.groupName}>{g.name}</Text>
                {g.createdAtUtc && <Text style={s.groupSub}>Criado em {fmtDate(g.createdAtUtc.slice(0, 10))}</Text>}
              </View>
              <Text style={s.arrow}>›</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Modal: criar grupo */}
      <ModalSheet visible={showCreate} onClose={() => setShowCreate(false)}>
        <Text style={s.modalTitle}>Novo grupo</Text>
        <Text style={s.modalSub}>Dê um nome ao grupo para começar.</Text>
        <TextInput style={s.modalInput} placeholder="Ex: Casa, Viagem Europa, Trabalho…"
          placeholderTextColor="#475569" value={newGroupName} onChangeText={setNewGroupName}
          autoFocus returnKeyType="done" onSubmitEditing={() => void handleCreateGroup()} />
        <View style={s.modalBtns}>
          <TouchableOpacity style={s.btnCancel} onPress={() => { setNewGroupName(""); setShowCreate(false); }}>
            <Text style={s.btnCancelTxt}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnConfirm, (!newGroupName.trim() || creatingGroup) && { opacity: 0.4 }]}
            onPress={() => void handleCreateGroup()} disabled={!newGroupName.trim() || creatingGroup}>
            {creatingGroup ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnConfirmTxt}>Criar</Text>}
          </TouchableOpacity>
        </View>
      </ModalSheet>

      {/* Modal: código de convite */}
      <ModalSheet visible={showInvite} onClose={() => setShowInvite(false)}>
        <Text style={s.modalTitle}>Código de convite</Text>
        <Text style={s.modalSub}>Insira o código que você recebeu por e-mail.</Text>
        <TextInput style={s.modalInput} placeholder="Cole o código aqui"
          placeholderTextColor="#475569" value={inviteCode} onChangeText={setInviteCode}
          autoCapitalize="none" autoFocus />
        <View style={s.modalBtns}>
          <TouchableOpacity style={s.btnCancel} onPress={() => { setInviteCode(""); setShowInvite(false); }}>
            <Text style={s.btnCancelTxt}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnConfirm, (!inviteCode.trim() || joiningInvite) && { opacity: 0.4 }]}
            onPress={() => void handleJoinInvite()} disabled={!inviteCode.trim() || joiningInvite}>
            {joiningInvite ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnConfirmTxt}>Entrar</Text>}
          </TouchableOpacity>
        </View>
      </ModalSheet>
    </SafeAreaView>
  );
}
