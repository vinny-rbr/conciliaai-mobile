import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions, Keyboard, ScrollView, ScrollViewProps, StyleSheet, TextInput,
} from "react-native";

/**
 * ScrollView que evita que o teclado cubra o campo focado.
 *
 * - Mede a altura real do teclado (keyboardDidShow) e adiciona esse espaço no
 *   fim da rolagem, garantindo que sempre há área pra rolar.
 * - Ao abrir o teclado, mede o TextInput focado e rola pra deixá-lo acima do
 *   teclado (funciona pra qualquer posição do campo, não só o último).
 *
 * Uso: troque o <ScrollView> da tela por <KeyboardAwareScroll> mantendo os
 * mesmos props (contentContainerStyle, style, etc.).
 */
export function KeyboardAwareScroll({
  children,
  contentContainerStyle,
  extraBottom = 24,
  onScroll,
  ...props
}: ScrollViewProps & { extraBottom?: number }) {
  const scrollRef = useRef<ScrollView>(null);
  const offsetRef = useRef(0);
  const [kb, setKb] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", e => {
      const h = e.endCoordinates.height;
      setKb(h);
      // Espera o layout com o novo padding antes de medir/rolar.
      requestAnimationFrame(() => {
        const focused = TextInput.State.currentlyFocusedInput?.();
        const scroll = scrollRef.current;
        if (!focused || !scroll || typeof (focused as { measureInWindow?: unknown }).measureInWindow !== "function") return;
        (focused as { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void })
          .measureInWindow((_x, y, _w, hgt) => {
            const screenH = Dimensions.get("window").height;
            const kbTop = screenH - h;
            const inputBottom = y + hgt;
            const margin = 24;
            if (inputBottom > kbTop - margin) {
              const delta = inputBottom - (kbTop - margin);
              scroll.scrollTo({ y: offsetRef.current + delta, animated: true });
            }
          });
      });
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKb(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const flat = StyleSheet.flatten(contentContainerStyle) || {};
  const basePad = typeof flat.paddingBottom === "number" ? flat.paddingBottom : 0;

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      {...props}
      ref={scrollRef}
      scrollEventThrottle={16}
      onScroll={e => { offsetRef.current = e.nativeEvent.contentOffset.y; onScroll?.(e); }}
      contentContainerStyle={[contentContainerStyle, { paddingBottom: basePad + kb + extraBottom }]}
    >
      {children}
    </ScrollView>
  );
}
