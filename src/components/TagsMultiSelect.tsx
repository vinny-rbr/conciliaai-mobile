import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

type Props = {
  value: string;
  onChange: (v: string) => void;
  availableTags?: string[];
};

export function TagsMultiSelect({ value, onChange, availableTags = [] }: Props) {
  const [input, setInput] = useState("");
  const selected = value ? value.split(",").map(t => t.trim()).filter(Boolean) : [];

  const toggle = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter(t => t !== tag).join(","));
    } else {
      onChange([...selected, tag].join(","));
    }
  };

  const addNew = (raw: string) => {
    const cleaned = raw.trim().replace(/,/g, "").toLowerCase();
    if (!cleaned) { setInput(""); return; }
    if (!selected.includes(cleaned)) onChange([...selected, cleaned].join(","));
    setInput("");
  };

  const pool = [...new Set([...availableTags, ...selected])].sort();

  return (
    <View>
      {pool.length > 0 && (
        <View style={ts.row}>
          {pool.map(tag => {
            const isSel = selected.includes(tag);
            return (
              <TouchableOpacity key={tag} onPress={() => toggle(tag)} style={[ts.chip, isSel && ts.chipSel]} activeOpacity={0.7}>
                <Text style={[ts.chipTxt, isSel && ts.chipTxtSel]}>#{tag}</Text>
                {isSel && <Text style={ts.checkmark}> ✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      <TextInput
        style={ts.input}
        value={input}
        onChangeText={text => { if (text.endsWith(",")) addNew(text.slice(0, -1)); else setInput(text); }}
        onSubmitEditing={() => addNew(input)}
        onBlur={() => addNew(input)}
        placeholder={pool.length === 0 ? "Ex: viagem, trabalho, família" : "Nova tag…"}
        placeholderTextColor="#475569"
        returnKeyType="done"
        blurOnSubmit={false}
        autoCapitalize="none"
      />
    </View>
  );
}

const ts = StyleSheet.create({
  row:        { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  chip:       { flexDirection: "row", alignItems: "center", backgroundColor: "#1E293B", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#334155", marginRight: 6, marginBottom: 6 },
  chipSel:    { backgroundColor: "#1E3A5F", borderColor: "#3B82F644" },
  chipTxt:    { color: "#64748B", fontSize: 13, fontWeight: "600" },
  chipTxtSel: { color: "#93C5FD" },
  checkmark:  { color: "#60A5FA", fontSize: 11, fontWeight: "800" },
  input:      { backgroundColor: "#0F172A", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: "#F1F5F9", fontSize: 14, borderWidth: 1, borderColor: "#1E293B" },
});
