import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export function TagsInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [input, setInput] = useState("");
  const tagList = value ? value.split(",").map(t => t.trim()).filter(Boolean) : [];

  const addTag = (raw: string) => {
    const cleaned = raw.trim().replace(/,/g, "").toLowerCase();
    if (!cleaned) { setInput(""); return; }
    if (!tagList.includes(cleaned)) onChange([...tagList, cleaned].join(","));
    setInput("");
  };

  const removeTag = (tag: string) => onChange(tagList.filter(t => t !== tag).join(","));

  return (
    <View>
      {tagList.length > 0 && (
        <View style={ts.row}>
          {tagList.map(tag => (
            <View key={tag} style={ts.chip}>
              <Text style={ts.chipTxt}>#{tag}</Text>
              <TouchableOpacity onPress={() => removeTag(tag)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={ts.chipX}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      <TextInput
        style={ts.input}
        value={input}
        onChangeText={text => { if (text.endsWith(",")) addTag(text.slice(0, -1)); else setInput(text); }}
        onSubmitEditing={() => addTag(input)}
        placeholder={tagList.length === 0 ? "Ex: viagem, trabalho, família" : "Adicionar mais…"}
        placeholderTextColor="#475569"
        returnKeyType="done"
        blurOnSubmit={false}
        autoCapitalize="none"
      />
    </View>
  );
}

const ts = StyleSheet.create({
  row:     { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  chip:    { flexDirection: "row", alignItems: "center", backgroundColor: "#1E3A5F", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#3B82F644", gap: 5 },
  chipTxt: { color: "#93C5FD", fontSize: 13, fontWeight: "600" },
  chipX:   { color: "#64748B", fontSize: 16, fontWeight: "700", lineHeight: 18 },
  input:   { backgroundColor: "#0F172A", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: "#F1F5F9", fontSize: 14, borderWidth: 1, borderColor: "#1E293B" },
});
