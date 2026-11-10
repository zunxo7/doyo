import React from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { Pencil, User } from "phosphor-react-native";
import { useColors } from "../hooks/useColors";
import { pickAvatar } from "../services/avatar";

type Props = {
  /** Local URI of the chosen photo, or null/undefined for the placeholder */
  photoUri?: string | null;
  /** Stable key for this owner (their email) — the avatar persists under it */
  ownerKey: string;
  /** Called with the saved WebP URI after a successful pick */
  onPick: (uri: string) => void;
  size?: number;
};

/**
 * Circular profile picture with a pencil-edit badge. Tapping anywhere opens the
 * photo library (square crop), converts to WebP and saves it permanently.
 * Shared by the customer Profile and worker Account screens.
 */
export default function EditableAvatar({ photoUri, ownerKey, onPick, size = 88 }: Props) {
  const colors = useColors();

  const pick = async () => {
    const uri = await pickAvatar(ownerKey);
    if (uri) onPick(uri);
  };

  const badge = Math.round(size * 0.34);

  return (
    <TouchableOpacity
      style={{ width: size, height: size }}
      activeOpacity={0.85}
      onPress={pick}
    >
      <View
        style={[
          styles.circle,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.paper },
        ]}
      >
        {photoUri ? (
          <Image key={photoUri} source={{ uri: photoUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <User size={size * 0.58} color={colors.ink} weight="regular" />
        )}
      </View>
      <View
        style={[
          styles.badge,
          {
            width: badge,
            height: badge,
            borderRadius: badge / 2,
            backgroundColor: colors.accent,
            borderColor: "#37383a",
          },
        ]}
      >
        <Pencil size={badge * 0.5} color={colors.white} weight="bold" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  badge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
  },
});
