import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useThemedStyles } from "../hooks/useColors";
import type { Palette } from "../styles/colors";
import { fontStyles } from "../styles/fonts";

interface AlertButton {
  label: string;
  onPress?: () => void;
  primary?: boolean;
  variant?: "primary" | "secondary" | "danger";
}

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onClose: () => void;
}

export default function CustomAlert({ visible, title, message, buttons, onClose }: Props) {
  const fonts = useFontFamilies();
  const s = useThemedStyles(makeStyles);

  const btns: AlertButton[] = buttons?.length
    ? buttons
    : [{ label: "OK", primary: true }];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={[s.title, fontStyles.bold]}>{title}</Text>
          {!!message && (
            <Text style={[s.message, fontStyles.medium]}>{message}</Text>
          )}

          <View style={s.buttonsRow}>
            {btns.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[s.btn, btn.variant === "danger" ? s.btnDanger : (btn.variant === "primary" || btn.primary) ? s.btnPrimary : s.btnGhost]}
                activeOpacity={0.8}
                onPress={() => { btn.onPress?.(); onClose(); }}
              >
                <Text style={[
                  s.btnText,
                  btn.variant === "danger" || btn.variant === "primary" || btn.primary ? s.btnTextPrimary : s.btnTextGhost,
                  fontStyles.semiBold,
                ]}>
                  {btn.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
    },
    card: {
      backgroundColor: "#343434",
      borderRadius: 18,
      padding: 24,
      width: "100%",
    },
    title: {
      fontSize: 18,
      color: c.white,
      marginBottom: 8,
    },
    message: {
      fontSize: 14,
      color: c.whiteSubtle,
      lineHeight: 20,
      marginBottom: 20,
    },
    buttonsRow: {
      flexDirection: "column",
      gap: 10,
      marginTop: 4,
    },
    btn: {
      width: "100%",
      minHeight: 48,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    btnPrimary: {
      backgroundColor: c.accent,
    },
    btnDanger: {
      backgroundColor: c.danger,
    },
    btnGhost: {
      backgroundColor: "#4a4b4d",
    },
    btnText: {
      fontSize: 14,
    },
    btnTextPrimary: {
      color: c.white,
    },
    btnTextGhost: {
      color: c.white,
    },
  });
