import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, Modal,
  KeyboardAvoidingView, Platform,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { fmt } from "../../../lib/financeService";
import { DonutSlice, avatarColor, s } from "./shared";

const DONUT_SIZE = 204;
const DONUT_RO   = 90;
const DONUT_RI   = 56;
const DONUT_GAP  = 0.045;

function polar(cx: number, cy: number, r: number, a: number) {
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function arcPath(cx: number, cy: number, ro: number, ri: number, sa: number, ea: number) {
  const os = polar(cx, cy, ro, sa), oe = polar(cx, cy, ro, ea);
  const is = polar(cx, cy, ri, ea), ie = polar(cx, cy, ri, sa);
  const lg = ea - sa > Math.PI ? 1 : 0;
  return `M${os.x} ${os.y} A${ro} ${ro} 0 ${lg} 1 ${oe.x} ${oe.y} L${is.x} ${is.y} A${ri} ${ri} 0 ${lg} 0 ${ie.x} ${ie.y}Z`;
}

export function AvatarCircle({ label, idx, size = 44 }: { label: string; idx: number; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 3, backgroundColor: avatarColor(idx), alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontSize: size * 0.3, fontWeight: "900" }}>{label.slice(0, 2).toUpperCase()}</Text>
    </View>
  );
}

export function SectionLabel({ title }: { title: string }) {
  return <Text style={s.secLabel}>{title}</Text>;
}

export function DonutChart({ slices, total, selectedId, onSelect }: {
  slices: DonutSlice[];
  total: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!total || slices.length === 0) return null;

  const cx = DONUT_SIZE / 2, cy = DONUT_SIZE / 2;
  const hasSel = selectedId !== null;
  const sel    = slices.find(sl => sl.id === selectedId) ?? null;

  let angle = -Math.PI / 2;
  const paths = slices.map(sl => {
    const span = (sl.amountCents / total) * 2 * Math.PI;
    const isSel = sl.id === selectedId;
    const sa = angle + DONUT_GAP / 2;
    const ea = angle + span - DONUT_GAP / 2;
    angle += span;
    const ro = isSel ? DONUT_RO + 8 : DONUT_RO;
    return { ...sl, sa, ea, isSel, ro };
  });

  return (
    <View style={{ alignItems: "center", gap: 14 }}>
      <View style={{ width: DONUT_SIZE, height: DONUT_SIZE }}>
        <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
          <Circle cx={cx} cy={cy} r={(DONUT_RO + DONUT_RI) / 2}
            fill="none" stroke="#162032" strokeWidth={DONUT_RO - DONUT_RI} />
          {paths.map(p => (
            <Path key={p.id} d={arcPath(cx, cy, p.ro, DONUT_RI, p.sa, p.ea)}
              fill={avatarColor(p.colorIdx)} opacity={hasSel && !p.isSel ? 0.15 : 1}
              onPress={() => onSelect(p.isSel ? null : p.id)} />
          ))}
        </Svg>
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          {sel ? (
            <>
              <Text style={{ color: avatarColor(sel.colorIdx), fontSize: 17, fontWeight: "900" }}>{fmt(sel.amountCents)}</Text>
              <Text style={{ color: "#64748B", fontSize: 9, marginTop: 3, maxWidth: DONUT_RI * 1.7, textAlign: "center" }} numberOfLines={2}>{sel.label}</Text>
            </>
          ) : (
            <>
              <Text style={{ color: "#F1F5F9", fontSize: 18, fontWeight: "900" }}>{fmt(total)}</Text>
              <Text style={{ color: "#475569", fontSize: 10, marginTop: 2 }}>total mês</Text>
            </>
          )}
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        {slices.map(sl => {
          const isSel = sl.id === selectedId;
          return (
            <TouchableOpacity key={sl.id} activeOpacity={0.75} onPress={() => onSelect(isSel ? null : sl.id)}
              style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: avatarColor(sl.colorIdx), opacity: hasSel && !isSel ? 0.22 : 1, borderWidth: isSel ? 3 : 0, borderColor: "#fff" }}
            />
          );
        })}
      </View>

      <TouchableOpacity onPress={() => setExpanded(v => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 2 }}>
        <Text style={{ color: "#475569", fontSize: 11, fontWeight: "700" }}>{expanded ? "Ocultar lista" : "Ver lista de despesas"}</Text>
        <Text style={{ color: "#475569", fontSize: 10 }}>{expanded ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={{ width: "100%", gap: 5 }}>
          {slices.map(sl => {
            const isSel = sl.id === selectedId;
            return (
              <TouchableOpacity key={sl.id} activeOpacity={0.75} onPress={() => onSelect(isSel ? null : sl.id)}
                style={{ flexDirection: "row", alignItems: "center", gap: 9, padding: 10, borderRadius: 11, backgroundColor: isSel ? avatarColor(sl.colorIdx) + "1A" : "#0F172A", borderWidth: 1, borderColor: isSel ? avatarColor(sl.colorIdx) + "88" : "transparent", opacity: hasSel && !isSel ? 0.38 : 1 }}
              >
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: avatarColor(sl.colorIdx) }} />
                <Text style={{ color: "#CBD5E1", fontSize: 12, flex: 1, fontWeight: "600" }} numberOfLines={1}>{sl.label}</Text>
                <Text style={{ color: "#F1F5F9", fontSize: 13, fontWeight: "800" }}>{fmt(sl.amountCents)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function ModalSheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function TabBar<T extends string>({ tabs, active, onChange }: {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (t: T) => void;
}) {
  return (
    <View style={s.tabRow}>
      {tabs.map(t => (
        <TouchableOpacity key={t.key} style={[s.tabBtn, active === t.key && s.tabBtnA]} onPress={() => onChange(t.key)}>
          <Text style={[s.tabTxt, active === t.key && s.tabTxtA]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
