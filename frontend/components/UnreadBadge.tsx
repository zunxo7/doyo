import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useColors } from "../hooks/useColors";
import { fontStyles } from "../styles/fonts";

/**
 * Ping-style unread pill, absolutely positioned over the top-right of whatever
 * it's rendered inside (an action circle, in practice). Renders nothing at
 * zero so callers can drop it in unconditionally.
 */
export default function UnreadBadge({ count }: { count: number }) {
  const fonts = useFontFamilies();
  const colors = useColors();
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);

  return (
    <View
      pointerEvents="none"
      style={[
        s.badge,
        {
          // Same red as the "Cancel request" button (ts.cancelJobButton).
          backgroundColor: colors.danger,
          // Grows into a pill once the number needs more than one digit.
          paddingHorizontal: label.length > 1 ? 5 : 0,
          minWidth: 20,
        },
      ]}
    >
      <Text style={[s.text, fontStyles.bold, { color: colors.white }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -3,
    right: -4,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 11,
    lineHeight: 14,
    includeFontPadding: false,
  },
});
