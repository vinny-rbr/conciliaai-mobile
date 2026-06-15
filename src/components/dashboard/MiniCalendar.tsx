import { useState } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";
import { todayISO, addMonthsYM } from "../../lib/dateUtils";

export const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
export const WEEK_DAYS   = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

export function MiniCalendar({ month, selectedDay, onSelectDay, onClose }: {
  month: string;
  selectedDay?: string;
  onSelectDay: (date: string) => void;
  onClose: () => void;
}) {
  const [viewMonth, setViewMonth] = useState(month);
  const [y, m] = viewMonth.split("-").map(Number);
  const firstWeekday = new Date(y, m - 1, 1).getDay();
  const daysInMonth  = new Date(y, m, 0).getDate();
  const today        = todayISO();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={cal.overlay} activeOpacity={1} onPress={onClose}>
        <View style={cal.card} onStartShouldSetResponder={() => true}>
          {/* Month nav */}
          <View style={cal.header}>
            <TouchableOpacity onPress={() => setViewMonth(v => addMonthsYM(v, -1))} style={cal.navBtn}>
              <Text style={cal.navTxt}>‹</Text>
            </TouchableOpacity>
            <Text style={cal.headerTitle}>{MONTH_NAMES[m - 1]} {y}</Text>
            <TouchableOpacity onPress={() => setViewMonth(v => addMonthsYM(v, 1))} style={cal.navBtn}>
              <Text style={cal.navTxt}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Week labels */}
          <View style={cal.weekRow}>
            {WEEK_DAYS.map(d => <Text key={d} style={cal.weekLbl}>{d}</Text>)}
          </View>

          {/* Day grid */}
          <View style={cal.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={i} style={cal.cell} />;
              const iso     = `${y}-${String(m).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const isToday = iso === today;
              const isSel   = iso === selectedDay;
              return (
                <TouchableOpacity
                  key={i} style={[cal.cell, isToday && cal.todayCell, isSel && cal.selCell]}
                  onPress={() => onSelectDay(iso)} activeOpacity={0.7}
                >
                  <Text style={[cal.dayTxt, isToday && cal.todayTxt, isSel && cal.selTxt]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Today shortcut */}
          <TouchableOpacity style={cal.todayBtn} onPress={() => onSelectDay(today)}>
            <Text style={cal.todayBtnTxt}>Ir para hoje</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const cal = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  card:        { backgroundColor: "#1E293B", borderRadius: 20, padding: 16, width: 300, borderWidth: 1, borderColor: "#334155" },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  headerTitle: { color: "#F1F5F9", fontSize: 15, fontWeight: "800" },
  navBtn:      { width: 32, height: 32, borderRadius: 10, backgroundColor: "#0F172A", justifyContent: "center", alignItems: "center" },
  navTxt:      { color: "#60A5FA", fontSize: 18, fontWeight: "700", lineHeight: 22 },
  weekRow:     { flexDirection: "row", marginBottom: 6 },
  weekLbl:     { flex: 1, textAlign: "center", color: "#475569", fontSize: 10, fontWeight: "700" },
  grid:        { flexDirection: "row", flexWrap: "wrap" },
  cell:        { width: "14.28%", aspectRatio: 1, justifyContent: "center", alignItems: "center" },
  dayTxt:      { color: "#94A3B8", fontSize: 13, fontWeight: "500" },
  todayCell:   { backgroundColor: "#1D4ED822", borderRadius: 20 },
  todayTxt:    { color: "#60A5FA", fontWeight: "800" },
  selCell:     { backgroundColor: "#3B82F6", borderRadius: 20 },
  selTxt:      { color: "#fff", fontWeight: "800" },
  todayBtn:    { marginTop: 12, paddingVertical: 10, backgroundColor: "#0F172A", borderRadius: 12, alignItems: "center" },
  todayBtnTxt: { color: "#60A5FA", fontSize: 13, fontWeight: "700" },
});
