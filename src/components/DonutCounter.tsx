import { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Text, Animated } from "react-native";
import Svg, { Circle, G, Defs, LinearGradient, Stop, RadialGradient } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE   = 220;
const STROKE = 32;
const R      = (SIZE - STROKE) / 2;
const C_CIRC = 2 * Math.PI * R;
const CENTER = SIZE / 2;
const GAP    = 0.012;

export type DonutSlice = { color: string; label: string; value: number };

function useCounter(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf: ReturnType<typeof requestAnimationFrame>;
    const start = Date.now();
    const tick = () => {
      const p     = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return val;
}

type SliceProps = {
  anim: Animated.Value;
  color: string;
  start: number;
  len: number;
};

function Slice({ anim, color, start, len }: SliceProps) {
  const arc    = len * C_CIRC;
  const shown  = -start * C_CIRC;
  const hidden = shown + (arc - GAP * C_CIRC);

  const offset = anim.interpolate({ inputRange: [0, 1], outputRange: [hidden, shown] });

  return (
    <AnimatedCircle
      cx={CENTER} cy={CENTER} r={R}
      stroke={color} strokeWidth={STROKE} fill="none"
      strokeDasharray={`${arc - GAP * C_CIRC} ${C_CIRC}`}
      strokeDashoffset={offset}
    />
  );
}

export type DonutCounterProps = {
  slices: DonutSlice[];
  centerSub?: string;
  isCurrency?: boolean;
  counterVal?: number;
  counterSuffix?: string;
};

export default function DonutCounter({ slices, centerSub, isCurrency = false, counterVal, counterSuffix = "" }: DonutCounterProps) {
  const total  = slices.reduce((s, sl) => s + sl.value, 0);
  const target = counterVal ?? total;
  const live   = useCounter(target);

  const segData = (() => {
    let cum = 0;
    return slices.map(sl => {
      const start = cum;
      const len   = total > 0 ? sl.value / total : 0;
      cum += len;
      return { ...sl, start, len };
    });
  })();

  // Sync-initialize so slices have anims on first render
  const animsRef = useRef<Animated.Value[]>([]);
  if (animsRef.current.length !== slices.length) {
    animsRef.current = slices.map(() => new Animated.Value(0));
  }

  useEffect(() => {
    animsRef.current.forEach(a => a.setValue(0));
    Animated.stagger(
      110,
      animsRef.current.map(a =>
        Animated.timing(a, { toValue: 1, duration: 800, useNativeDriver: false })
      )
    ).start();
  }, [slices.length, target]);

  const fmt = (v: number) =>
    isCurrency
      ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : Math.round(v) + counterSuffix;

  return (
    <View style={s.wrap}>
      <Svg width={SIZE} height={SIZE}>
        <Defs>
          <LinearGradient id="light" x1={CENTER} y1={0} x2={CENTER} y2={SIZE} gradientUnits="userSpaceOnUse">
            <Stop offset="0"   stopColor="#ffffff" stopOpacity="0.2" />
            <Stop offset="0.4" stopColor="#ffffff" stopOpacity="0" />
            <Stop offset="1"   stopColor="#000000" stopOpacity="0.25" />
          </LinearGradient>
          <RadialGradient id="hole" cx="50%" cy="40%" r="50%">
            <Stop offset="0" stopColor="#1E293B" stopOpacity="0" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0.45" />
          </RadialGradient>
        </Defs>

        <Circle cx={CENTER} cy={CENTER} r={R} stroke="#0F172A" strokeWidth={STROKE + 4} fill="none" />
        <Circle cx={CENTER} cy={CENTER} r={R} stroke="#1E293B" strokeWidth={STROKE} fill="none" />

        <G rotation={-90} originX={CENTER} originY={CENTER}>
          {segData.map((d, i) =>
            animsRef.current[i] ? (
              <Slice key={i} anim={animsRef.current[i]} color={d.color} start={d.start} len={d.len} />
            ) : null
          )}
        </G>

        <Circle cx={CENTER} cy={CENTER} r={R} fill="none" stroke="url(#light)" strokeWidth={STROKE} />
        <Circle cx={CENTER} cy={CENTER} r={R - STROKE / 2} fill="url(#hole)" />
      </Svg>

      <View style={s.center} pointerEvents="none">
        {counterVal != null && (
          <Text style={[s.total, isCurrency && s.totalCurrency]}>{fmt(live)}</Text>
        )}
        {centerSub && <Text style={s.sub}>{centerSub}</Text>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:          { width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" },
  center:        { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  total:         { fontSize: 28, fontWeight: "800", color: "#F1F5F9", letterSpacing: -1, textAlign: "center" },
  totalCurrency: { fontSize: 17 },
  sub:           { fontSize: 11, color: "#64748B", letterSpacing: 0.5, marginTop: 3, fontWeight: "600" },
});
