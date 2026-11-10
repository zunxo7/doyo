import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "phosphor-react-native";
import { useFontFamilies } from "../../hooks/useFontFamilies";
import { useColors, useThemedStyles } from "../../hooks/useColors";
import { makeWorkerStyles } from "../../styles/WorkerHomeScreen.styles";
import { fontStyles } from "../../styles/fonts";

export type WorkerTab = "jobs" | "earnings" | "account" | "settings";

export type TabDef = {
  key: WorkerTab;
  label: string;
  Icon: Icon;
  badge?: number;
};

type Props = {
  tabs: TabDef[];
  active: WorkerTab;
  onChange: (tab: WorkerTab) => void;
};

export default function WorkerBottomNav({ tabs, active, onChange }: Props) {
  const fonts = useFontFamilies();
  const colors = useColors();
  const s = useThemedStyles(makeWorkerStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.bottomNav, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {tabs.map(tab => (
        <NavButton
          key={tab.key}
          tab={tab}
          active={active === tab.key}
          colors={colors}
          s={s}
          fonts={fonts}
          onPress={() => onChange(tab.key)}
        />
      ))}
    </View>
  );
}

function NavButton({
  tab,
  active,
  colors,
  s,
  fonts,
  onPress,
}: {
  tab: TabDef;
  active: boolean;
  colors: ReturnType<typeof useColors>;
  s: ReturnType<typeof useThemedStyles<ReturnType<typeof makeWorkerStyles>>>;
  fonts: ReturnType<typeof useFontFamilies>;
  onPress: () => void;
}) {
  const press = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.12 }],
  }));

  return (
    <TouchableOpacity
      style={s.navItem}
      activeOpacity={0.85}
      onPress={onPress}
      onPressIn={() => (press.value = withSpring(1, { damping: 16, stiffness: 360 }))}
      onPressOut={() => (press.value = withSpring(0, { damping: 16, stiffness: 360 }))}
    >
      <Reanimated.View style={[s.navIconWrap, active && s.navIconWrapActive, animStyle]}>
        <tab.Icon
          size={23}
          color={active ? colors.accent : colors.fgFaint}
          weight={active ? "fill" : "regular"}
        />
        {tab.badge ? (
          <View style={s.navBadge}>
            <Text style={[s.navBadgeText, fontStyles.bold]}>{tab.badge}</Text>
          </View>
        ) : null}
      </Reanimated.View>
      <Text style={[s.navLabel, active && s.navLabelActive, fontStyles.semiBold]}>
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
}
