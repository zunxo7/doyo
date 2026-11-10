import React from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "phosphor-react-native";
import ScreenBackground from "./ScreenBackground";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { makeLegalOverlayStyles } from "../styles/LegalOverlay.styles";
import { DEMO_NOTICE } from "../data/legalDocuments";
import { fontStyles } from "../styles/fonts";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function LegalOverlay({ visible, onClose }: Props) {
  const colors = useColors();
  const s = useThemedStyles(makeLegalOverlayStyles);
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScreenBackground variant="sheet" showPattern patternOpacity={0.022} hideOrbs>
        <View style={[s.wrap, { paddingTop: insets.top + 8 }]}>
          <View style={s.header}>
            <View style={s.headerLeadingSpacer} />
            <Text style={[s.headerTitle, fontStyles.bold]} numberOfLines={2}>
              {DEMO_NOTICE.title}
            </Text>
            <TouchableOpacity
              style={s.backBtn}
              activeOpacity={0.85}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={22} color={colors.white} weight="bold" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={s.scroll}
            contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 26 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={s.doc}>
              <Text style={[s.summary, fontStyles.medium]}>{DEMO_NOTICE.summary}</Text>
              {DEMO_NOTICE.sections.map(section => (
                <View key={section.title} style={s.section}>
                  <Text style={[s.sectionTitle, fontStyles.bold]}>{section.title}</Text>
                  <Text style={[s.body, fontStyles.medium]}>{section.body}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </ScreenBackground>
    </Modal>
  );
}
