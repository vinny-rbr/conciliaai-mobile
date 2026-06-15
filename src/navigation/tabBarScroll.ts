import { Animated } from "react-native";

export const leftTranslateX  = new Animated.Value(0);
export const rightTranslateX = new Animated.Value(0);
export const fabScale        = new Animated.Value(1);
export const fabOpacity      = new Animated.Value(1);

let lastY  = 0;
let hidden = false;

// A metade da largura da pill (cada half ocupa ~metade da tela menos margens)
const SLIDE = 240;

export function onTabBarScroll(y: number) {
  const delta = y - lastY;
  lastY = y;

  if (delta > 8 && !hidden) {
    hidden = true;
    // FAB some primeiro (rápido), depois as duas metades deslizam pra fora
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fabScale,   { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(fabOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(leftTranslateX,  { toValue: -SLIDE, useNativeDriver: true, tension: 80, friction: 12 }),
        Animated.spring(rightTranslateX, { toValue:  SLIDE, useNativeDriver: true, tension: 80, friction: 12 }),
      ]),
    ]).start();
  } else if (delta < -8 && hidden) {
    hidden = false;
    // As metades voltam primeiro, depois o FAB reaparece
    Animated.sequence([
      Animated.parallel([
        Animated.spring(leftTranslateX,  { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
        Animated.spring(rightTranslateX, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
      ]),
      Animated.parallel([
        Animated.timing(fabScale,   { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(fabOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]),
    ]).start();
  }
}
