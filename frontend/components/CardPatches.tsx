import React from "react";
import { StyleSheet, View } from "react-native";

// Solid two-tone blue slanted rectangles that bleed off the right edge and get
// sliced by the card's rounded clip — bold and graphic, kept to the right so the
// left-side text stays clear.
const CardPatches = React.memo(function CardPatches({
  extraWhite = false,
  extraWhiteBottom = false,
  hideDark = false,
  whiteTop = false,
  whiteBottom = false,
}: {
  extraWhite?: boolean;
  extraWhiteBottom?: boolean;
  hideDark?: boolean;
  whiteTop?: boolean;
  whiteBottom?: boolean;
}) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={{
          position: "absolute",
          top: -46,
          right: -30,
          width: 66,
          height: 150,
          borderRadius: 10,
          backgroundColor: whiteTop ? "#ffffff" : "#00BAF0",
          transform: [{ rotate: "32deg" }],
        }}
      />
      {!hideDark ? (
        <View
          style={{
            position: "absolute",
            bottom: -40,
            right: 44,
            width: 44,
            height: 104,
            borderRadius: 8,
            backgroundColor: whiteBottom ? "#ffffff" : "#0098da",
            transform: [{ rotate: "-20deg" }],
          }}
        />
      ) : null}
      {extraWhite ? (
        <View
          style={{
            position: "absolute",
            top: -30,
            right: 59,
            width: 20,
            height: 56,
            borderRadius: 5,
            backgroundColor: "#ffffff",
            transform: [{ rotate: "26deg" }],
          }}
        />
      ) : null}
      {extraWhiteBottom ? (
        <View
          style={{
            position: "absolute",
            bottom: -30,
            right: 58,
            width: 20,
            height: 56,
            borderRadius: 5,
            backgroundColor: "#ffffff",
            transform: [{ rotate: "-24deg" }],
          }}
        />
      ) : null}
    </View>
  );
});

export default CardPatches;
