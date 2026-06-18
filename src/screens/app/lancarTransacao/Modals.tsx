import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import type { FinanceCategoryOption, BankAccount } from "../../../types/finance";
import { s } from "./shared";

type CategoryModalProps = {
  visible: boolean;
  onClose: () => void;
  categories: FinanceCategoryOption[];
  selectedCat: FinanceCategoryOption | null;
  onSelect: (c: FinanceCategoryOption) => void;
};

export function CategoryModal({ visible, onClose, categories, selectedCat, onSelect }: CategoryModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Categoria</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
            {categories.length === 0 ? (
              <Text style={s.emptyTxt}>Nenhuma categoria cadastrada.</Text>
            ) : (
              categories.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.catRow, selectedCat?.id === c.id && { backgroundColor: c.color + "18", borderColor: c.color }]}
                  onPress={() => onSelect(c)}
                >
                  <View style={[s.catDot, { backgroundColor: c.color + "33" }]}>
                    <Text style={{ fontSize: 18 }}>{c.icon}</Text>
                  </View>
                  <Text style={s.catName}>{c.name}</Text>
                  {selectedCat?.id === c.id && <Text style={[s.checkMark, { color: c.color }]}>✓</Text>}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

type AccountModalProps = {
  visible: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  selectedAcc: BankAccount | null;
  onSelect: (a: BankAccount | null) => void;
};

export function AccountModal({ visible, onClose, accounts, selectedAcc, onSelect }: AccountModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Conta</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
            <TouchableOpacity
              style={[s.catRow, !selectedAcc && { backgroundColor: "#3B82F618", borderColor: "#3B82F6" }]}
              onPress={() => onSelect(null)}
            >
              <Text style={s.catName}>Sem conta específica</Text>
              {!selectedAcc && <Text style={[s.checkMark, { color: "#3B82F6" }]}>✓</Text>}
            </TouchableOpacity>
            {accounts.map(a => (
              <TouchableOpacity
                key={a.id}
                style={[s.catRow, selectedAcc?.id === a.id && { backgroundColor: "#3B82F618", borderColor: "#3B82F6" }]}
                onPress={() => onSelect(a)}
              >
                <Text style={s.catName}>{a.nick || a.bank}</Text>
                {selectedAcc?.id === a.id && <Text style={[s.checkMark, { color: "#3B82F6" }]}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
