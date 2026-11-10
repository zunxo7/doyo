import React, { useEffect, useRef, useState } from "react";
import {
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Reanimated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Broom, Car, CheckCircle, Couch, Prohibit, Scissors, Seat, Sparkle, Toolbox, X, XCircle } from "phosphor-react-native";
import { useT } from "../contexts/SettingsContext";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useColors, useThemedStyles } from "../hooks/useColors";
import type { Palette } from "../styles/colors";
import { fontStyles } from "../styles/fonts";

const PAGE_GAP = 12;
const EXTERIOR_INDEX = 1;
const INTERIOR_INDEX = 2;

const EXTERIOR_ITEMS = [
  { area: "Roof and top", method: "Wash and wipe" },
  { area: "Windows", method: "Exterior glass wipe" },
  { area: "Left side", method: "Wash and wipe" },
  { area: "Right side", method: "Wash and wipe" },
  { area: "Bottom and undercarriage", method: "Low-dust rinse only" },
  { area: "Wheels", method: "Wash and rinse" },
];

const INTERIOR_ITEMS = [
  { area: "Dashboard and steering wheel", method: "Dust and wipe, no water" },
  { area: "Front seats", method: "Dust and wipe" },
  { area: "Back seats", method: "Dust and wipe" },
  { area: "Floor and carpets", method: "Vacuum or sweep" },
  { area: "Windows (inside)", method: "Interior glass wipe" },
  { area: "Mirrors (inside)", method: "Interior mirror wipe" },
];

const NORMAL_HOME_ITEMS = [
  { area: "Room floors", method: "Brooming and mopping" },
];

const DETAILED_HOME_ITEMS = [
  { area: "Floors", method: "Brooming and mopping" },
  { area: "Glass surfaces", method: "Glass cleaning" },
  { area: "Windows", method: "Window cleaning" },
  { area: "Tables, desks, and flat surfaces", method: "Dusting and wiping" },
  { area: "Corners, edges, switches, and handles", method: "Dusting" },
];

// The worker only moves things; anything beyond that is listed so nobody
// books shifting expecting packing, assembly or a clean.
const FURNITURE_MOVING_ITEMS = [
  { area: "Big items", method: "Beds, sofas, wardrobes, dining tables" },
  { area: "Small items", method: "Chairs, side tables, TVs, boxes" },
  { area: "Between rooms and floors", method: "Shifted where you want it" },
];

const FURNITURE_EXCLUDED_ITEMS = [
  { area: "Packing and unpacking", method: "Not included", excluded: true },
  { area: "Assembling or dismantling", method: "Not included", excluded: true },
  { area: "Cleaning", method: "Book Home Services separately", excluded: true },
];

// A barber visit is hair and beard only, so skin care is named as out.
const BARBER_SERVICE_ITEMS = [
  { area: "Haircut", method: "Cut and styled the way you ask" },
  { area: "Beard", method: "Trimmed and styled" },
  { area: "Facials and skin care", method: "Not included", excluded: true },
];

// Unlike cleaning, the barber brings everything; the customer provides nothing.
const BARBER_EQUIPMENT_ITEMS = [
  { area: "Clippers and trimmer", method: "Brought by the barber" },
  { area: "Scissors and combs", method: "Brought by the barber" },
  { area: "Razor", method: "Brought by the barber" },
  { area: "Shaving cape", method: "Brought by the barber" },
  { area: "Sanitizing supplies", method: "Tools are sanitized before use" },
];

type ScopeItem = { area: string; method: string; excluded?: boolean };

type ScopePage = {
  label: string;
  Icon: React.ComponentType<any>;
  items: ScopeItem[];
};

type Props = {
  visible: boolean;
  scopeType?: "home" | "vehicle" | "furniture" | "barber";
  cleaningType?: "Regular" | "Deep" | string;
  onClose: () => void;
};

export default function VehicleScopeSheet({ visible, scopeType = "vehicle", cleaningType, onClose }: Props) {
  const fonts = useFontFamilies();
  const t = useT();
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const isHome = scopeType === "home";
  const pages: [ScopePage, ScopePage] =
    isHome
      ? [
          { label: "Regular", Icon: Broom, items: NORMAL_HOME_ITEMS },
          { label: "Deep", Icon: Sparkle, items: DETAILED_HOME_ITEMS },
        ]
      : scopeType === "furniture"
        ? [
            { label: "Moving", Icon: Couch, items: FURNITURE_MOVING_ITEMS },
            { label: "Not included", Icon: Prohibit, items: FURNITURE_EXCLUDED_ITEMS },
          ]
        : scopeType === "barber"
          ? [
              { label: "Services", Icon: Scissors, items: BARBER_SERVICE_ITEMS },
              { label: "Barber brings", Icon: Toolbox, items: BARBER_EQUIPMENT_ITEMS },
            ]
          : [
      { label: "Exterior", Icon: Car, items: EXTERIOR_ITEMS },
      { label: "Interior", Icon: Seat, items: INTERIOR_ITEMS },
        ];
  const initialPageIndex: 0 | 1 = isHome && cleaningType === "Deep" ? 1 : 0;
  const { height: SCREEN_H } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const [activePageIndex, setActivePageIndex] = useState<0 | 1>(initialPageIndex);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [switchWidth, setSwitchWidth] = useState(0);
  const anim = useSharedValue(0);
  const pageProgress = useSharedValue(initialPageIndex === 1 ? INTERIOR_INDEX : EXTERIOR_INDEX);
  const tabProgress = useSharedValue(initialPageIndex);
  const dragOffset = useSharedValue(0);
  const pageRef = useRef<0 | 1>(activePageIndex);
  pageRef.current = activePageIndex;

  const snapAfterLoop = (pageIndex: 0 | 1, index: number) => {
    setActivePageIndex(pageIndex);
    pageProgress.value = index;
    dragOffset.value = 0;
  };

  const animateTrack = (nextPageIndex: 0 | 1, targetIndex: number, snapIndex?: number) => {
    setActivePageIndex(nextPageIndex);
    dragOffset.value = withTiming(0, { duration: 160, easing: Easing.out(Easing.quad) });
    tabProgress.value = withTiming(nextPageIndex, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
    pageProgress.value = withTiming(targetIndex, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    }, finished => {
      if (finished && snapIndex !== undefined) {
        runOnJS(snapAfterLoop)(nextPageIndex, snapIndex);
      }
    });
  };

  const switchPage = (nextPageIndex: 0 | 1) => {
    if (nextPageIndex === pageRef.current) return;
    animateTrack(nextPageIndex, nextPageIndex === 1 ? INTERIOR_INDEX : EXTERIOR_INDEX);
  };

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-18, 18])
    .failOffsetY([-14, 14])
    .onBegin(() => {
      dragOffset.value = 0;
    })
    .onUpdate(event => {
      dragOffset.value = event.translationX;
    })
    .onEnd(event => {
      const currentIndex = Math.round(pageProgress.value);
      let targetIndex = currentIndex;
      let snapIndex = -1;
      let nextPageIndex: 0 | 1 | null = null;

      if (event.translationX < -32 || event.velocityX < -520) {
        if (currentIndex === EXTERIOR_INDEX) {
          targetIndex = INTERIOR_INDEX;
          nextPageIndex = 1;
        } else {
          targetIndex = 3;
          snapIndex = EXTERIOR_INDEX;
          nextPageIndex = 0;
        }
      } else if (event.translationX > 32 || event.velocityX > 520) {
        if (currentIndex === INTERIOR_INDEX) {
          targetIndex = EXTERIOR_INDEX;
          nextPageIndex = 0;
        } else {
          targetIndex = 0;
          snapIndex = INTERIOR_INDEX;
          nextPageIndex = 1;
        }
      }

      if (nextPageIndex === null) {
        dragOffset.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) });
        return;
      }

      runOnJS(setActivePageIndex)(nextPageIndex);
      dragOffset.value = withTiming(0, { duration: 160, easing: Easing.out(Easing.quad) });
      tabProgress.value = withTiming(nextPageIndex, {
        duration: 240,
        easing: Easing.out(Easing.cubic),
      });
      pageProgress.value = withTiming(targetIndex, {
        duration: 260,
        easing: Easing.out(Easing.cubic),
      }, finished => {
        if (finished && snapIndex >= 0) {
          pageProgress.value = snapIndex;
          dragOffset.value = 0;
        }
      });
    })
    .onFinalize(() => {
      dragOffset.value = withTiming(0, { duration: 120, easing: Easing.out(Easing.quad) });
    });

  useEffect(() => {
    if (visible) {
      setMounted(true);
      anim.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
    } else if (mounted) {
      anim.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }, finished => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [visible, onClose]);

  useEffect(() => {
    if (visible) {
      setActivePageIndex(initialPageIndex);
      pageProgress.value = initialPageIndex === 1 ? INTERIOR_INDEX : EXTERIOR_INDEX;
      tabProgress.value = initialPageIndex;
      dragOffset.value = 0;
    }
  }, [dragOffset, initialPageIndex, pageProgress, scopeType, tabProgress, visible]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: anim.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - anim.value) * 560 }],
  }));
  const pageTrackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -pageProgress.value * (viewportWidth + PAGE_GAP) + dragOffset.value }],
  }));
  const tabIndicatorStyle = useAnimatedStyle(() => {
    const innerWidth = Math.max(0, switchWidth - 10);
    const tabWidth = Math.max(0, (innerWidth - 8) / 2);
    return {
      width: tabWidth,
      opacity: switchWidth > 0 ? 1 : 0,
      transform: [{ translateX: tabProgress.value * (tabWidth + 8) }],
    };
  });

  if (!mounted) return null;

  return (
    <View style={s.overlay}>
      <Reanimated.View style={[s.scrim, scrimStyle]} />
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

      <Reanimated.View style={[s.sheet, { maxHeight: SCREEN_H * 0.82 }, sheetStyle]}>
        <View style={s.titleRow}>
          <Text style={[s.title, fontStyles.bold]}>
            {t(
              scopeType === "home"
                ? "Home cleaning scope"
                : scopeType === "furniture"
                  ? "Furniture shifting scope"
                  : scopeType === "barber"
                    ? "Barber scope"
                    : "Vehicle cleaning scope",
            )}
          </Text>
          <TouchableOpacity
            style={s.closeButton}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.85}
          >
            <X size={18} color={colors.white} weight="bold" />
          </TouchableOpacity>
        </View>
        <Text style={[s.subtitle, fontStyles.medium]}>
          {t(
            scopeType === "home"
              ? "Areas covered for home services"
              : scopeType === "furniture"
                ? "What is covered for shifting services"
                : scopeType === "barber"
                  ? "What a barber visit covers"
                  : "Areas covered for vehicle services",
          )}
        </Text>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          <View style={s.pageSwitch} onLayout={event => setSwitchWidth(event.nativeEvent.layout.width)}>
            <Reanimated.View pointerEvents="none" style={[s.pageIndicator, tabIndicatorStyle]} />
            <TouchableOpacity
              style={s.pageButton}
              activeOpacity={0.85}
              onPress={() => switchPage(0)}
            >
              {React.createElement(pages[0].Icon, {
                size: 17,
                color: activePageIndex === 0 ? colors.white : colors.whiteSubtle,
                weight: "fill",
              })}
              <Text
                style={[
                  s.pageButtonText,
                  activePageIndex === 0 && s.pageButtonTextActive,
                  fontStyles.semiBold,
                ]}
              >
                {t(pages[0].label)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.pageButton}
              activeOpacity={0.85}
              onPress={() => switchPage(1)}
            >
              {React.createElement(pages[1].Icon, {
                size: 17,
                color: activePageIndex === 1 ? colors.white : colors.whiteSubtle,
                weight: "fill",
              })}
              <Text
                style={[
                  s.pageButtonText,
                  activePageIndex === 1 && s.pageButtonTextActive,
                  fontStyles.semiBold,
                ]}
              >
                {t(pages[1].label)}
              </Text>
            </TouchableOpacity>
          </View>

          <GestureDetector gesture={swipeGesture}>
            <View
              style={s.pageViewport}
              onLayout={event => setViewportWidth(event.nativeEvent.layout.width)}
            >
              {viewportWidth > 0 ? (
                <Reanimated.View style={[s.pageTrack, { gap: PAGE_GAP }, pageTrackStyle]}>
                  <View style={{ width: viewportWidth }}>
                    <ScopeBlock items={pages[1].items} fonts={fonts} colors={colors} styles={s} />
                  </View>
                  <View style={{ width: viewportWidth }}>
                    <ScopeBlock items={pages[0].items} fonts={fonts} colors={colors} styles={s} />
                  </View>
                  <View style={{ width: viewportWidth }}>
                    <ScopeBlock items={pages[1].items} fonts={fonts} colors={colors} styles={s} />
                  </View>
                  <View style={{ width: viewportWidth }}>
                    <ScopeBlock items={pages[0].items} fonts={fonts} colors={colors} styles={s} />
                  </View>
                </Reanimated.View>
              ) : null}
            </View>
          </GestureDetector>

          <View style={s.paginationDots}>
            <View style={[s.dot, activePageIndex === 0 && s.dotActive]} />
            <View style={[s.dot, activePageIndex === 1 && s.dotActive]} />
          </View>
        </ScrollView>
      </Reanimated.View>
    </View>
  );
}

type ScopeBlockProps = {
  items: ScopeItem[];
  fonts: ReturnType<typeof useFontFamilies>;
  colors: Palette;
  styles: ReturnType<typeof makeStyles>;
};

function ScopeBlock({ items, fonts, colors, styles: s }: ScopeBlockProps) {
  const t = useT();
  return (
    <View style={s.scopeCard}>
      <View style={s.scopeList}>
        {items.map(item => (
          <View key={`${item.area}-${item.method}`} style={s.scopeItem}>
            <View style={s.scopeBullet}>
              {item.excluded ? (
                <XCircle size={16} color={colors.whiteSubtle} weight="fill" />
              ) : (
                <CheckCircle size={16} color={colors.accent} weight="fill" />
              )}
            </View>
            <View style={s.scopeCopy}>
              <Text style={[s.scopeAreaText, fontStyles.semiBold]}>{t(item.area)}</Text>
              <Text style={[s.scopeMethodText, fontStyles.medium]}>{t(item.method)}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFill,
      justifyContent: "flex-end",
      zIndex: 45,
    },
    scrim: {
      ...StyleSheet.absoluteFill,
      backgroundColor: c.scrim,
    },
    sheet: {
      backgroundColor: "#1d1d1d",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 18,
      paddingTop: 18,
      overflow: "hidden",
    },
    titleRow: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 34,
    },
    title: {
      fontSize: 19,
      color: c.white,
      textAlign: "center",
    },
    subtitle: {
      color: c.whiteSubtle,
      fontSize: 13.5,
      lineHeight: 19,
      textAlign: "center",
      marginTop: 4,
      marginBottom: 16,
    },
    closeButton: {
      position: "absolute",
      top: -5,
      right: 0,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#37383a",
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      gap: 12,
      paddingBottom: 30,
    },
    pageSwitch: {
      flexDirection: "row",
      gap: 8,
      backgroundColor: "rgba(255,255,255,0.06)",
      borderRadius: 16,
      padding: 5,
      position: "relative",
      overflow: "hidden",
    },
    pageIndicator: {
      position: "absolute",
      top: 5,
      bottom: 5,
      left: 5,
      borderRadius: 12,
      backgroundColor: c.accent,
    },
    pageButton: {
      flex: 1,
      height: 42,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      zIndex: 1,
    },
    pageButtonText: {
      color: c.whiteSubtle,
      fontSize: 13,
    },
    pageButtonTextActive: {
      color: c.white,
    },
    pageViewport: {
      overflow: "hidden",
      borderRadius: 18,
    },
    pageTrack: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    scopeCard: {
      borderRadius: 18,
      backgroundColor: "#37383a",
      padding: 14,
      gap: 12,
    },
    scopeList: {
      gap: 8,
    },
    scopeItem: {
      minHeight: 52,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.06)",
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 9,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    scopeBullet: {
      width: 20,
      alignItems: "center",
      paddingTop: 2,
    },
    scopeCopy: {
      flex: 1,
      gap: 2,
    },
    scopeAreaText: {
      color: c.white,
      fontSize: 13,
      lineHeight: 17,
    },
    scopeMethodText: {
      color: c.whiteSubtle,
      fontSize: 12,
      lineHeight: 16,
    },
    paginationDots: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 6,
      paddingTop: 2,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: "rgba(255,255,255,0.22)",
    },
    dotActive: {
      width: 22,
      backgroundColor: c.accent,
    },
  });
