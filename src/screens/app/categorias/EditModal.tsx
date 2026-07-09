import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { FinanceCategoryOption } from "../../../types/finance";
import { KeyboardAwareScroll } from "../../../components/KeyboardAwareScroll";
import { COLORS, ICONS, s, type EditState, type TabType } from "./shared";

type Props = {
  visible: boolean;
  onClose: () => void;
  edit: EditState;
  setEdit: (fn: (e: EditState) => EditState) => void;
  saving: boolean;
  onSave: () => void;
  parentOptions: FinanceCategoryOption[];
};

export function EditModal({ visible, onClose, edit, setEdit, saving, onSave, parentOptions }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.modal}>
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>{edit.id ? "Editar categoria" : "Nova categoria"}</Text>
          <Pressable onPress={onClose}><Text style={s.modalClose}>✕</Text></Pressable>
        </View>
        <KeyboardAwareScroll contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled">
          {!edit.id && (
            <View style={s.field}>
              <Text style={s.label}>Tipo</Text>
              <View style={s.tabBar}>
                {(["RECEITA", "DESPESA"] as TabType[]).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[s.tab, edit.type === t && s.tabActive]}
                    onPress={() => setEdit(e => ({ ...e, type: t, parentId: "" }))}
                  >
                    <Text style={[s.tabTxt, edit.type === t && s.tabTxtActive]}>
                      {t === "RECEITA" ? "Recebimento" : "Gasto"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={s.field}>
            <Text style={s.label}>Nome</Text>
            <TextInput
              style={s.input}
              value={edit.name}
              onChangeText={v => setEdit(e => ({ ...e, name: v }))}
              placeholder="Ex: Alimentação"
              placeholderTextColor="#475569"
              autoFocus
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Ícone</Text>
            <View style={s.iconGrid}>
              {ICONS.map(ic => (
                <TouchableOpacity
                  key={ic}
                  style={[s.iconOpt, edit.icon === ic && { borderColor: edit.color, borderWidth: 2 }]}
                  onPress={() => setEdit(e => ({ ...e, icon: ic }))}
                >
                  <Text style={s.iconOptTxt}>{ic}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>Cor</Text>
            <View style={s.colorRow}>
              {COLORS.map(col => (
                <TouchableOpacity
                  key={col}
                  style={[s.colorOpt, { backgroundColor: col }, edit.color === col && s.colorOptSel]}
                  onPress={() => setEdit(e => ({ ...e, color: col }))}
                />
              ))}
            </View>
          </View>

          {!edit.id && parentOptions.length > 0 && (
            <View style={s.field}>
              <Text style={s.label}>Subcategoria de (opcional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                <TouchableOpacity
                  style={[s.parentChip, !edit.parentId && s.parentChipSel]}
                  onPress={() => setEdit(e => ({ ...e, parentId: "" }))}
                >
                  <Text style={[s.parentChipTxt, !edit.parentId && s.parentChipTxtSel]}>Raiz</Text>
                </TouchableOpacity>
                {parentOptions.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={[s.parentChip, edit.parentId === p.id && s.parentChipSel]}
                    onPress={() => setEdit(e => ({ ...e, parentId: p.id }))}
                  >
                    <Text style={[s.parentChipTxt, edit.parentId === p.id && s.parentChipTxtSel]}>
                      {p.icon} {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.6 }]}
            onPress={onSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnTxt}>Salvar</Text>}
          </TouchableOpacity>
        </KeyboardAwareScroll>
      </View>
    </Modal>
  );
}
