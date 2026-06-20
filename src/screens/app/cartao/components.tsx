import React from "react";
import { View, Text } from "react-native";
import type { CreditCard } from "../../../types/creditCard";
import { BRANDS, CARD_W, CARD_H, usageColor, faceColors, s } from "./shared";

export function CreditCardVisual({ card }: { card: CreditCard }) {
  const b = BRANDS[card.brand] ?? BRANDS.outro;
  const colors = faceColors(card.face, b);
  const isSmallLogo = b.logoText.length <= 2;
  const circleSize = Math.round(CARD_H * 0.9);
  const circleSize2 = Math.round(CARD_H * 0.55);
  return (
    <View style={[s.cardVisual, { backgroundColor: colors.bg1 }]}>
      <View style={[s.cardCircle, { backgroundColor: colors.bg2, bottom: -Math.round(CARD_H * 0.35), right: -Math.round(CARD_W * 0.12), width: circleSize, height: circleSize, borderRadius: Math.round(circleSize / 2) }]} />
      <View style={[s.cardCircle, { backgroundColor: colors.bg2, top: -Math.round(CARD_H * 0.2), right: Math.round(CARD_W * 0.15), width: circleSize2, height: circleSize2, borderRadius: Math.round(circleSize2 / 2), opacity: 0.5 }]} />
      <View style={s.cardTop}>
        <View style={[s.cardLogo, { backgroundColor: b.logoBg }]}>
          <Text style={[s.cardLogoTxt, { color: b.logoColor, fontSize: isSmallLogo ? 15 : 11 }]}>{b.logoText}</Text>
        </View>
        <Text style={s.cardNick}>{card.nick}</Text>
      </View>
      <View style={s.cardChip} />
      <Text style={s.cardLast4}>•••• {card.last4}</Text>
    </View>
  );
}

export function LimitBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(1, used / limit) : 0;
  const fillW = Math.max(3, Math.round(pct * 100));
  const col = usageColor(pct);
  return (
    <View style={s.barTrack}>
      <View style={[s.barFill, { width: `${fillW}%` as unknown as number, backgroundColor: col }]} />
    </View>
  );
}
