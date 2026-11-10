import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, PaperPlaneRight, UserCircle } from "phosphor-react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import ScreenBackground from "../components/ScreenBackground";
import FadeInView from "../components/FadeInView";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useT, useSettings } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { makeChatStyles } from "../styles/ChatScreen.styles";
import { listJobChat, openJobRoomSocket, sendJobChatMessage, type ChatMessageSnapshot } from "../services/bidding";
import { markChatRead } from "../services/chatUnread";
import { setOpenChatJob } from "../services/notifications";
import { RootStackParamList } from "../navigation/types";
import { fontStyles } from "../styles/fonts";

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "Chat">;
  route: RouteProp<RootStackParamList, "Chat">;
};

type Message = {
  id: string;
  text: string;
  mine: boolean;
  time: string;
};

const QUICK_REPLIES = ["Hello", "Where are you?", "I'm here", "Please, give me 5 minutes"];

const formatTime = (date: Date) =>
  `${date.getHours() % 12 || 12}:${String(date.getMinutes()).padStart(2, "0")} ${date.getHours() >= 12 ? "p.m." : "a.m."}`;

export default function ChatScreen({ navigation, route }: Props) {
  const { workerName, peerRole = "worker", jobId, actorId, actorRole, peerPhoto } = route.params;
  const fonts = useFontFamilies();
  const t = useT();
  const { settings } = useSettings();
  const colors = useColors();
  const s = useThemedStyles(makeChatStyles);
  const scrollRef = useRef<FlatList<Message>>(null);
  const repliedRef = useRef(false);

  const isJobChat = Boolean(jobId && actorId && actorRole);

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [peerPhotoFailed, setPeerPhotoFailed] = useState(false);

  useEffect(() => {
    if (!isJobChat || !jobId || !actorId) return;

    let active = true;
    // Everything shown here counts as read, so the tracking screen's unread
    // pill clears as the thread arrives — including messages that land while
    // the chat is already open.
    const apply = (next: ChatMessageSnapshot[]) => {
      setMessages(next.map(message => mapChatMessage(message, actorId)));
      const newest = next.reduce((max, m) => Math.max(max, m.createdAt), 0);
      markChatRead(jobId, newest);
    };

    // Instant paint from a one-shot fetch, then live message pushes over the
    // job-room socket (no more 2.5s polling).
    listJobChat(jobId, actorId)
      .then(next => {
        if (active) apply(next);
      })
      .catch(() => undefined);

    const socket = openJobRoomSocket(jobId, actorRole === "worker" ? "worker" : "customer", actorId, {
      onChat: next => {
        if (active) apply(next);
      },
    });

    setOpenChatJob(jobId);

    return () => {
      active = false;
      setOpenChatJob(null);
      socket.close();
    };
  }, [actorId, actorRole, isJobChat, jobId]);

  // Track the keyboard ourselves — KeyboardAvoidingView's Android padding
  // mode is jumpy and leaves stale padding after the keyboard hides.
  // Pure transforms (no padding) so the animation is GPU-composited and
  // never triggers per-frame relayout: the screen slides up, the header
  // counter-slides to stay pinned.
  const keyboardPad = useSharedValue(0);
  const rootShiftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboardPad.value }],
  }));
  const headerPinStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: keyboardPad.value }],
    zIndex: 2,
  }));
  // Messages stay put too — only the input bar and chips ride up
  const messagesPinStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: keyboardPad.value }],
  }));
  // Quick chips fade away while typing — they're for replying WITHOUT the
  // keyboard, and they'd overlap the pinned messages otherwise
  const chipsOpacity = useSharedValue(1);
  const chipsStyle = useAnimatedStyle(() => ({ opacity: chipsOpacity.value }));
  // One-time content padding so the latest messages can scroll clear of the
  // risen input bar (state change, not a per-frame layout animation)
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", e => {
      // +12 breathing room between the input and the keyboard
      keyboardPad.value = withTiming(e.endCoordinates.height + 12, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      });
      chipsOpacity.value = withTiming(0, { duration: 140 });
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      keyboardPad.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) });
      chipsOpacity.value = withTiming(1, { duration: 180 });
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [keyboardPad, chipsOpacity]);

  useEffect(() => {
    // Keep the latest message in view
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [messages]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages(current => [
      ...current,
      { id: `m-${Date.now()}`, text: trimmed, mine: true, time: formatTime(new Date()) },
    ]);
    setDraft("");

    if (isJobChat && jobId && actorId && actorRole) {
      try {
        const next = await sendJobChatMessage(jobId, actorId, actorRole, trimmed);
        setMessages(next.map(message => mapChatMessage(message, actorId)));
      } catch {
        // Leave the optimistic message visible; polling will reconcile.
      }
      return;
    }

    // Mock worker ack until real chat lands — replies once per session
    if (!repliedRef.current) {
      repliedRef.current = true;
      setTimeout(() => {
        setMessages(current => [
          ...current,
          { id: `w-${Date.now()}`, text: t("Got it! See you soon."), mine: false, time: formatTime(new Date()) },
        ]);
      }, 1600);
    }
  };

  return (
    <ScreenBackground variant="black" flat>
      <StatusBar style={settings.theme === "dark" ? "light" : "dark"} />

      <Reanimated.View style={[s.root, rootShiftStyle]}>
        {/* Header — counter-translated so it stays pinned while the screen
            slides up under it */}
        <Reanimated.View style={headerPinStyle}>
        <FadeInView style={s.headerRow} delay={0} duration={600}>
          <TouchableOpacity
            style={s.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.85}
          >
            <ArrowLeft size={28} color={colors.white} weight="regular" />
          </TouchableOpacity>

          <View style={s.headerAvatar}>
            {peerPhoto && !peerPhotoFailed ? (
              <Image
                source={{ uri: peerPhoto }}
                style={s.headerAvatarImage}
                resizeMode="cover"
                onError={() => setPeerPhotoFailed(true)}
              />
            ) : (
              <UserCircle size={30} color={colors.white} weight="fill" />
            )}
          </View>
          <View style={s.headerTextBlock}>
            <Text style={[s.headerName, fontStyles.semiBold]} numberOfLines={1}>
              {workerName}
            </Text>
            <Text style={[s.headerRole, fontStyles.medium]}>
              {peerRole === "customer" ? t("Customer") : t("Worker")}
            </Text>
          </View>
        </FadeInView>
        </Reanimated.View>

        {/* Messages */}
        <Reanimated.View style={[{ flex: 1 }, messagesPinStyle]}>
        <FadeInView delay={150} duration={700} style={{ flex: 1 }}>
          <FlatList
            ref={scrollRef}
            data={messages}
            keyExtractor={message => message.id}
            contentContainerStyle={[s.messagesContent, { paddingBottom: 12 + keyboardHeight }]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={s.emptyState}>
                <Text style={[s.emptyText, fontStyles.semiBold]}>{t("No messages yet")}</Text>
              </View>
            }
            renderItem={({ item: message }) => (
              <View style={[s.bubble, message.mine ? s.bubbleMine : s.bubbleWorker]}>
                <View style={s.bubbleRow}>
                  <Text
                    style={[
                      s.bubbleText,
                      message.mine ? s.bubbleTextMine : s.bubbleTextWorker,
                      fontStyles.medium,
                    ]}
                  >
                    {message.text}
                  </Text>
                  <Text
                    style={[
                      s.bubbleTime,
                      message.mine ? s.bubbleTimeMine : s.bubbleTimeWorker,
                      fontStyles.medium,
                    ]}
                  >
                    {message.time}
                  </Text>
                </View>
              </View>
            )}
          />
        </FadeInView>
        </Reanimated.View>

        {/* Quick replies — hidden while typing */}
        <Reanimated.View style={[chipsStyle, { pointerEvents: keyboardHeight > 0 ? "none" : "auto" }]}>
        <FadeInView delay={300} duration={700} style={s.quickRow}>
          {QUICK_REPLIES.map(reply => (
            <TouchableOpacity
              key={reply}
              style={s.quickChip}
              activeOpacity={0.85}
              onPress={() => send(reply)}
            >
              <Text style={[s.quickChipText, fontStyles.semiBold]}>{t(reply)}</Text>
            </TouchableOpacity>
          ))}
        </FadeInView>
        </Reanimated.View>

        {/* Input */}
        <FadeInView delay={450} duration={650} style={s.inputBar}>
          <TextInput
            style={[s.input, fontStyles.medium]}
            placeholder={t("Be polite while chatting")}
            placeholderTextColor="#a7a8ac"
            value={draft}
            onChangeText={setDraft}
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={() => send(draft)}
          />
          <TouchableOpacity
            style={[s.sendButton, draft.trim().length === 0 && s.sendButtonDisabled]}
            activeOpacity={0.85}
            disabled={draft.trim().length === 0}
            onPress={() => send(draft)}
          >
            <PaperPlaneRight size={22} color={colors.white} weight="fill" />
          </TouchableOpacity>
        </FadeInView>
      </Reanimated.View>
    </ScreenBackground>
  );
}

function mapChatMessage(message: ChatMessageSnapshot, actorId: string): Message {
  return {
    id: message.id,
    text: message.text,
    mine: message.senderId === actorId,
    time: formatTime(new Date(message.createdAt)),
  };
}
