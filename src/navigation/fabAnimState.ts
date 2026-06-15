import { Animated } from "react-native";

export const fabRotation  = new Animated.Value(0);
export const fabTranslate = new Animated.Value(0);

export function openFabAnim() {
  Animated.parallel([
    Animated.spring(fabRotation,  { toValue: 1, useNativeDriver: true, tension: 70, friction: 8 }),
    Animated.spring(fabTranslate, { toValue: -60, useNativeDriver: true, tension: 70, friction: 8 }),
  ]).start();
}

export function closeFabAnim(onDone?: () => void) {
  Animated.parallel([
    Animated.spring(fabRotation,  { toValue: 0, useNativeDriver: true, tension: 70, friction: 8 }),
    Animated.spring(fabTranslate, { toValue: 0,  useNativeDriver: true, tension: 70, friction: 8 }),
  ]).start(({ finished }) => { if (finished && onDone) onDone(); });
}
