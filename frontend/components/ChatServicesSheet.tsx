import React, { useEffect, useState } from "react";
import { BackHandler, Keyboard, Pressable, Text, TouchableOpacity, View } from "react-native";
import Reanimated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Broom, CaretRight, Car, Couch, Scissors } from "phosphor-react-native";
import { useT } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import type { AppConfig } from "../services/appConfig";
import { makeChatServicesSheetStyles } from "../styles/ChatServicesSheet.styles";
import { fontStyles } from "../styles/fonts";

// Further than the sheet is tall, so it starts and ends fully off screen.
const SHEET_TRAVEL = 620;

type Props = {
  visible: boolean;
  pricing: AppConfig["pricing"];
  onClose: () => void;
  onPick: (service: "home" | "vehicle" | "furniture" | "barber") => void;
  onDetails: () => void;
};

export default function ChatServicesSheet({ visible, pricing, onClose, onPick, onDetails }: Props) {
  const t = useT();
  const colors = useColors();
  const s = useThemedStyles(makeChatServicesSheetStyles);
  const insets = useSafeAreaInsets();

  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.value) * SHEET_TRAVEL }] }));

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
    } else {
      progress.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }, finished => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible, progress]);

  useEffect(() => {
    if (!visible) return;
    Keyboard.dismiss();
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => back.remove();
  }, [visible, onClose]);

  if (!mounted) return null;

  const services = [
    { key: "home" as const, title: "Home cleaning", sub: "Regular and deep cleaning", from: pricing.home.regular.base, Icon: Broom },
    { key: "vehicle" as const, title: "Vehicle wash", sub: "Bikes, cars and vans", from: Math.min(pricing.vehicle.bike, pricing.vehicle.car, pricing.vehicle.van), Icon: Car },
    { key: "furniture" as const, title: "Furniture shifting", sub: "Small and big items", from: pricing.furniture.small, Icon: Couch },
    { key: "barber" as const, title: "Barber", sub: "Haircut and beard at home", from: Math.min(pricing.barber.haircut, pricing.barber.beard), Icon: Scissors },
  ];

  return (
    <View style={s.overlay} pointerEvents={visible ? "auto" : "none"}>
      <Reanimated.View style={[s.backdrop, backdropStyle]}>
        <Pressable style={s.backdropTap} onPress={onClose} />
      </Reanimated.View>
      <Reanimated.View style={[s.sheet, { paddingBottom: insets.bottom + 16 }, sheetStyle]}>
        <View style={s.handle} />
        <Text style={[s.title, fontStyles.bold]}>{t("What Doyo can book")}</Text>
        {services.map(({ key, title, sub, from, Icon }) => (
          <TouchableOpacity key={key} style={s.row} activeOpacity={0.85} onPress={() => onPick(key)}>
            <View style={s.icon}>
              <Icon size={22} color={colors.accent} weight="fill" />
            </View>
            <View style={s.rowText}>
              <Text style={[s.rowTitle, fontStyles.semiBold]}>{t(title)}</Text>
              <Text style={[s.rowSub, fontStyles.medium]}>{t(sub)}</Text>
            </View>
            <Text style={[s.rowPrice, fontStyles.medium]}>{t("From PKR{price}", { price: from.toLocaleString() })}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={s.details} activeOpacity={0.8} onPress={onDetails}>
          <Text style={[s.detailsText, fontStyles.semiBold]}>{t("Learn more about our services")}</Text>
          <CaretRight size={14} color={colors.accent} weight="bold" />
        </TouchableOpacity>
      </Reanimated.View>
    </View>
  );
}
