import { Dimensions } from "react-native";

export const H_PAD = 16;
export const COL_GAP = 12;
const { width: SCREEN_W } = Dimensions.get("window");
export const CARD_W = (SCREEN_W - H_PAD * 2 - COL_GAP) / 2;
