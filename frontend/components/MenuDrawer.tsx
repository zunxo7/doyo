import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Linking,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import Reanimated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  Briefcase,
  CaretRight,
  Headset,
  UserCircle,
  Gear,
  HandCoins,
  FileText,
  ClockCounterClockwise,
  InstagramLogo,
} from "phosphor-react-native";
import Svg, { Path } from "react-native-svg";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useT } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import type { Palette } from "../styles/colors";
import AppIcon from "./AppIcon";
import Wordmark from "./Wordmark";
import LegalOverlay from "./LegalOverlay";
import { fontStyles } from "../styles/fonts";

const DEVPOST_URL = "https://paypalaihackathon.devpost.com/";

interface Props {
  visible: boolean;
  userName?: string;
  onClose: () => void;
  onLogout: () => void;
  onProfile: () => void;
  onLoyalty: () => void;
  onBookingHistory: () => void;
  onSupport: () => void;
  onSettings: () => void;
  onBecomeWorker: () => void;
}

export default function MenuDrawer({
  visible,
  userName,
  onClose,
  onLogout,
  onProfile,
  onLoyalty,
  onBookingHistory,
  onSupport,
  onSettings,
  onBecomeWorker,
}: Props) {
  const { width, height } = useWindowDimensions();
  const fonts = useFontFamilies();
  const t = useT();
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  // Give longer labels such as "Booking history" enough breathing room while
  // preserving a visible slice of the screen behind the drawer.
  const drawerWidth = width * 0.76;
  const [mounted, setMounted] = useState(visible);
  const [legalOpen, setLegalOpen] = useState(false);
  const mountedRef = useRef(visible);
  const slideAnim = useSharedValue(-drawerWidth);
  const overlayOpacity = useSharedValue(0);
  const finishClose = useCallback(() => {
    mountedRef.current = false;
    setMounted(false);
  }, []);

  useEffect(() => {
    const open = () => {
      mountedRef.current = true;
      setMounted(true);
      slideAnim.value = -drawerWidth;
      overlayOpacity.value = 0;
      slideAnim.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
      overlayOpacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });
    };

    const close = () => {
      slideAnim.value = withTiming(-drawerWidth, { duration: 240, easing: Easing.in(Easing.cubic) }, finished => {
        if (finished) {
          runOnJS(finishClose)();
        }
      });
      overlayOpacity.value = withTiming(0, { duration: 180, easing: Easing.in(Easing.quad) });
    };

    if (visible) open();
    else if (mountedRef.current) close();
  }, [drawerWidth, finishClose, overlayOpacity, slideAnim, visible]);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideAnim.value }],
  }));

  // Hardware back closes the drawer.
  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [visible, onClose]);

  // Close the drawer first, then run the action once the slide-out finishes
  const handleAction = (action: () => void) => {
    onClose();
    setTimeout(action, 260);
  };

  if (!mounted) return null;

  // Rendered inline (not in a Modal) — Modal teardown on Android cuts the
  // slide-out animation short with a visible pop
  return (
    <View style={s.overlay}>
      <Reanimated.View
        renderToHardwareTextureAndroid
        needsOffscreenAlphaCompositing
        style={[s.scrim, scrimStyle]}
      />
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      <Reanimated.View
        renderToHardwareTextureAndroid
        needsOffscreenAlphaCompositing
        style={[s.drawer, { width: drawerWidth }, drawerStyle]}
      >
        <View style={s.header}>
          <View style={s.headerLogoRow}>
            <AppIcon size={32} />
            <View style={s.headerWordmark}>
              <Wordmark fontSize={20} />
            </View>
          </View>
        </View>

        {userName ? (
          <Text style={[s.greeting, fontStyles.medium]}>
            {t("Hey,")} <Text style={[s.greetingName, fontStyles.bold]}>{userName}</Text>
          </Text>
        ) : null}

        <View style={s.menu}>
          <MenuItem
            label={t("Profile")}
            Icon={UserCircle}
            fonts={fonts}
            onPress={() => handleAction(onProfile)}
          />
          <MenuItem
            label={t("Loyalty")}
            Icon={HandCoins}
            fonts={fonts}
            onPress={() => handleAction(onLoyalty)}
          />
          <MenuItem
            label={t("Booking History")}
            Icon={ClockCounterClockwise}
            fonts={fonts}
            onPress={() => handleAction(onBookingHistory)}
          />
          <MenuItem
            label={t("Support")}
            Icon={Headset}
            fonts={fonts}
            onPress={() => handleAction(onSupport)}
          />
          <MenuItem
            label={t("Settings")}
            Icon={Gear}
            fonts={fonts}
            onPress={() => handleAction(onSettings)}
          />
          <MenuItem
            label={t("Legal")}
            Icon={FileText}
            fonts={fonts}
            onPress={() => setLegalOpen(true)}
          />
        </View>

        <View style={s.drawerArt} pointerEvents="none">
          <View style={s.artWhiteSlash} />
          <View style={s.artCyanBack} />
          <View style={s.artCyanFront} />
        </View>

        <View style={s.footer}>
          <TouchableOpacity style={s.workerModeBtn} activeOpacity={0.88} onPress={() => handleAction(onBecomeWorker)}>
            <Briefcase size={22} color={colors.white} weight="fill" />
            <Text style={[s.workerModeText, fontStyles.semiBold]}>
              {t("Worker mode")}
            </Text>
          </TouchableOpacity>

          <View style={s.socialRow}>
            <TouchableOpacity style={s.socialButton} activeOpacity={0.8}>
              <InstagramLogo size={32} color={colors.white} weight="bold" />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.socialButton}
              activeOpacity={0.8}
              onPress={() => void Linking.openURL(DEVPOST_URL).catch(() => undefined)}
            >
              <Svg width={32} height={32} viewBox="0 0 32 32" fill="none" stroke={colors.white} strokeWidth={2.5} strokeLinejoin="round">
                <Path d="M9 4H23L30 16L23 28H9L2 16Z" />
                <Path d="M12 10.5H16A5.5 5.5 0 0 1 16 21.5H12Z" />
              </Svg>
            </TouchableOpacity>
          </View>
        </View>
      </Reanimated.View>
      <LegalOverlay
        visible={legalOpen}
        onClose={() => setLegalOpen(false)}
      />
    </View>
  );
}

function MenuItem({
  label,
  Icon,
  fonts,
  onPress,
}: {
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string; weight?: "fill" | "bold" | "regular" }>;
  fonts: ReturnType<typeof useFontFamilies>;
  onPress: () => void;
}) {
  const s = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity style={s.menuItem} activeOpacity={0.8} onPress={onPress}>
      <View style={s.menuIconWrap}>
        <Icon size={24} color="#8f98a6" weight="regular" />
      </View>
      <Text style={[s.menuLabel, fontStyles.semiBold]} numberOfLines={1}>
        {label}
      </Text>
      <CaretRight size={19} color="#8f98a6" weight="bold" />
    </TouchableOpacity>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFill,
      flexDirection: "row",
      justifyContent: "flex-start",
      zIndex: 100,
      elevation: 100,
    },
    scrim: {
      ...StyleSheet.absoluteFill,
      backgroundColor: c.scrim,
    },
    drawer: {
      backgroundColor: "#1d1d1d",
      paddingTop: 52,
      paddingHorizontal: 0,
      paddingBottom: 28,
      borderTopRightRadius: 24,
      borderBottomRightRadius: 24,
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 22,
      marginBottom: 20,
    },
    headerLogoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    headerWordmark: {
      marginTop: 6,
    },
    greeting: {
      fontSize: 15,
      color: c.whiteSubtle,
      paddingHorizontal: 22,
      marginBottom: 18,
    },
    greetingName: {
      color: c.white,
      fontSize: 15,
    },
    menu: {
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      minHeight: 45,
      paddingHorizontal: 28,
    },
    menuIconWrap: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
    },
    menuLabel: {
      flex: 1,
      fontSize: 18,
      color: c.white,
    },
    drawerArt: {
      flex: 1,
      minHeight: 150,
      overflow: "hidden",
      position: "relative",
    },
    artWhiteSlash: {
      position: "absolute",
      right: 59,
      top: 33,
      width: 20,
      height: 56,
      borderRadius: 5,
      backgroundColor: c.white,
      transform: [{ rotate: "26deg" }],
    },
    artCyanBack: {
      position: "absolute",
      bottom: 20,
      left: -20,
      width: 44,
      height: 104,
      borderRadius: 8,
      backgroundColor: "#0098da",
      transform: [{ rotate: "30deg" }],
    },
    artCyanFront: {
      position: "absolute",
      top: 23,
      right: -30,
      width: 66,
      height: 150,
      borderRadius: 10,
      backgroundColor: c.accent,
      transform: [{ rotate: "32deg" }],
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: "#4c4d4f",
      paddingHorizontal: 22,
      paddingTop: 21,
      gap: 12,
    },
    workerModeBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: c.accent,
      borderRadius: 14,
      height: 52,
    },
    workerModeText: {
      color: c.white,
      fontSize: 15,
    },
    socialRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    socialButton: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
    },
  });
