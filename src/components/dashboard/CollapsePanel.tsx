import { useEffect, useRef } from "react";
import { Animated } from "react-native";

export function CollapsePanel({ isOpen, contentHeight, children }: { isOpen: boolean; contentHeight: number; children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: isOpen ? contentHeight : 0,
      useNativeDriver: false,
      tension: 220,
      friction: 20,
    }).start();
  }, [isOpen, contentHeight]);

  return (
    <Animated.View style={{ height: anim, overflow: "hidden", marginTop: 2 }}>
      {children}
    </Animated.View>
  );
}

export function AnimatedCard({ children }: { children: React.ReactNode }) {
  const scale   = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, useNativeDriver: true, tension: 120, friction: 12 }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ transform: [{ scale }], opacity }}>{children}</Animated.View>;
}

export function DropdownPanel({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) {
  const height  = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(height,  { toValue: isOpen ? 160 : 0, useNativeDriver: false, tension: 200, friction: 18 }),
      Animated.timing(opacity, { toValue: isOpen ? 1 : 0, duration: 160, useNativeDriver: false }),
    ]).start();
  }, [isOpen]);
  return (
    <Animated.View style={{ height, opacity, overflow: "hidden", marginTop: 4 }}>
      {children}
    </Animated.View>
  );
}
