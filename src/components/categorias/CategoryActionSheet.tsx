import { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Animated, TouchableWithoutFeedback,
} from "react-native";
import type { FinanceCategoryOption } from "../../types/finance";

export function CategoryActionSheet({
  cat,
  onClose,
  onEdit,
  onAddSub,
  onDelete,
}: {
  cat: FinanceCategoryOption | null;
  onClose: () => void;
  onEdit: () => void;
  onAddSub: () => void;
  onDelete: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const visible = cat !== null;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 300, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  const lastCatRef = useRef(cat);
  if (cat) lastCatRef.current = cat;
  const displayCat = cat ?? lastCatRef.current;

  function action(fn: () => void) {
    onClose();
    setTimeout(fn, 250);
  }

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[sheet.backdrop, { opacity: backdropAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[sheet.panel, { transform: [{ translateY: slideAnim }] }]}>
        <View style={sheet.handle} />

        <View style={sheet.titleRow}>
          {displayCat && <View style={[sheet.titleDot, { backgroundColor: displayCat.color }]} />}
          <Text style={sheet.titleTxt} numberOfLines={1}>{displayCat?.name ?? ""}</Text>
        </View>

        <View style={sheet.divider} />

        <TouchableOpacity style={sheet.item} onPress={() => action(onEdit)}>
          <Text style={sheet.itemIcon}>✏️</Text>
          <Text style={sheet.itemTxt}>Editar categoria</Text>
        </TouchableOpacity>

        <TouchableOpacity style={sheet.item} onPress={() => action(onAddSub)}>
          <Text style={sheet.itemIcon}>➕</Text>
          <Text style={sheet.itemTxt}>Adicionar subcategoria</Text>
        </TouchableOpacity>

        <View style={sheet.divider} />

        <TouchableOpacity style={sheet.item} onPress={() => action(onDelete)}>
          <Text style={sheet.itemIcon}>🗑️</Text>
          <Text style={[sheet.itemTxt, { color: "#EF4444" }]}>Excluir categoria</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[sheet.item, sheet.cancelItem]} onPress={onClose}>
          <Text style={sheet.cancelTxt}>Cancelar</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const sheet = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  panel: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#1E293B", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#475569", alignSelf: "center", marginTop: 12, marginBottom: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 14 },
  titleDot: { width: 10, height: 10, borderRadius: 5 },
  titleTxt: { fontSize: 17, fontWeight: "700", color: "#F1F5F9", flex: 1 },
  divider: { height: 1, backgroundColor: "#334155", marginHorizontal: 20 },
  item: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 16 },
  itemIcon: { fontSize: 20, width: 28, textAlign: "center" },
  itemTxt: { fontSize: 16, color: "#F1F5F9", fontWeight: "500" },
  cancelItem: { marginTop: 8, justifyContent: "center" },
  cancelTxt: { fontSize: 16, color: "#64748B", fontWeight: "600", textAlign: "center", flex: 1 },
});
