import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Reanimated, {
  Easing,
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Check, PaypalLogo, X } from "phosphor-react-native";
import PayPalCheckout from "../PayPalCheckout";
import { useT } from "../../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../../hooks/useColors";
import { makeWorkerStyles } from "../../styles/WorkerHomeScreen.styles";
import { confirmPayPal, startCommissionPayment, type PayPalSession } from "../../services/payments";
import { fontStyles } from "../../styles/fonts";

// Matches MIN_COMMISSION_PKR on the server, which refuses anything lower.
const MIN_TOPUP = 50;

type Props = {
  visible: boolean;
  /** Worker whose commission is being settled. */
  workerId: string;
  /** Commission currently owed — offered as a "pay full" quick amount. */
  due: number;
  onClose: () => void;
  /** Fired once the payment succeeds, with the paid amount. */
  onToppedUp?: (amount: number) => void;
};

export default function WalletSheet({ visible, due, onClose, onToppedUp }: Props) {
  const t = useT();
  const colors = useColors();
  const s = useThemedStyles(makeWorkerStyles);

  const [mounted, setMounted] = useState(visible);
  const [amount, setAmount] = useState("");
  const [done, setDone] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [session, setSession] = useState<PayPalSession | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ txnId: string; when: string } | null>(null);
  const anim = useSharedValue(0);

  // Never offer more than is owed: the server clamps to `due` anyway.
  const quickAmounts = [500, 1000].filter(q => q < due);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      // Prefill with the outstanding commission — settle the full due.
      setAmount(due > 0 ? String(due) : "");
      setDone(false);
      setReceipt(null);
      setVerifying(false);
      setPaying(false);
      setPayError(null);
      setSession(null);
      setCheckoutUrl(null);
      anim.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
    } else if (mounted) {
      anim.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }, finished => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: anim.value }));
  // Negative: the sheet sits above the screen and drops in.
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (anim.value - 1) * 520 }] }));

  const parsed = parseInt(amount.replace(/[^0-9]/g, ""), 10);
  const valid = Number.isFinite(parsed) && parsed >= MIN_TOPUP && parsed <= due;
  // Money is moving and there is nothing to cancel: every way out of the sheet
  // is shut off while the payment is being confirmed.
  const busy = verifying;
  const charged = session?.amount ?? (Number.isFinite(parsed) ? parsed : 0);

  const handleStartPayment = async () => {
    if (!valid || paying) return;
    setPaying(true);
    setPayError(null);
    try {
      const started = await startCommissionPayment(parsed);
      setSession(started);
      setCheckoutUrl(started.checkoutUrl);
    } catch (error) {
      setPayError(error instanceof Error ? error.message : t("Payment failed. No charge was made."));
    } finally {
      setPaying(false);
    }
  };

  // The server captures the order here, so this response is the authority on money.
  const handleApproved = async () => {
    setCheckoutUrl(null);
    if (!session) return;
    setVerifying(true);
    setPayError(null);
    try {
      const result = await confirmPayPal(session.id);
      if (result.status !== "succeeded") throw new Error(t("Payment failed. No charge was made."));
      const when = new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      setReceipt({ txnId: result.captureId ?? session.id, when });
      setDone(true);
      onToppedUp?.(result.amount);
    } catch (error) {
      setPayError(error instanceof Error ? error.message : t("Payment failed. No charge was made."));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <>
      <Modal
        visible={mounted}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={busy ? () => undefined : onClose}
      >
        <View style={s.modalOverlay}>
          <Reanimated.View style={[s.modalScrim, scrimStyle]} />
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            disabled={busy}
            onPress={onClose}
          />

          <Reanimated.View style={[s.modalSheet, sheetStyle]}>
            {!busy ? (
              <TouchableOpacity
                style={s.sheetCloseButton}
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.85}
              >
                <X size={18} color={colors.white} weight="bold" />
              </TouchableOpacity>
            ) : null}

            {done ? (
              <Reanimated.View entering={FadeIn.duration(240)} style={s.walletDone}>
                <View style={s.walletDoneCircle}>
                  <Check size={38} color={colors.white} weight="bold" />
                </View>
                <Text style={[s.walletDoneTitle, fontStyles.bold]}>{t("Payment successful")}</Text>
                <Text style={[s.walletDoneSub, fontStyles.medium]}>
                  {t("PKR{amount} has been paid to settle your Doyo commission. You're all set to keep accepting jobs.", {
                    amount: charged.toLocaleString(),
                  })}
                </Text>

                <View style={s.walletReceipt}>
                  <View style={s.walletReceiptRow}>
                    <Text style={[s.walletReceiptLabel, fontStyles.medium]}>{t("Paid for")}</Text>
                    <Text style={[s.walletReceiptValue, fontStyles.semiBold]}>
                      {t("Commission settlement")}
                    </Text>
                  </View>
                  <View style={[s.walletReceiptRow, s.walletReceiptDivider]}>
                    <Text style={[s.walletReceiptLabel, fontStyles.medium]}>{t("Transaction ID")}</Text>
                    <Text style={[s.walletReceiptValue, fontStyles.semiBold]} numberOfLines={1}>
                      {receipt?.txnId ?? "—"}
                    </Text>
                  </View>
                  <View style={[s.walletReceiptRow, s.walletReceiptDivider]}>
                    <Text style={[s.walletReceiptLabel, fontStyles.medium]}>{t("Date")}</Text>
                    <Text style={[s.walletReceiptValue, fontStyles.semiBold]}>{receipt?.when ?? "—"}</Text>
                  </View>
                </View>

                <TouchableOpacity style={[s.confirmBtn, { width: "100%" }]} activeOpacity={0.9} onPress={onClose}>
                  <Text style={[s.confirmBtnText, fontStyles.semiBold]}>{t("Done")}</Text>
                </TouchableOpacity>
              </Reanimated.View>
            ) : verifying ? (
              <Reanimated.View entering={FadeIn.duration(200)} style={s.walletDone}>
                <ActivityIndicator color={colors.accent} size="large" />
                <Text style={[s.walletDoneTitle, fontStyles.bold, { marginTop: 18 }]}>
                  {t("Confirming your payment")}
                </Text>
                <Text style={[s.walletDoneSub, fontStyles.medium]}>
                  {t("This takes a few seconds. Please don't close the app.")}
                </Text>
              </Reanimated.View>
            ) : (
              <>
                <Text style={[s.modalTitle, fontStyles.bold]}>{t("Top up")}</Text>
                <Text style={[s.modalSub, fontStyles.medium]}>
                  {t("Settle your Doyo commission to keep getting jobs.")}
                </Text>

                <View style={s.walletInputRow}>
                  <Text style={[s.walletCurrency, fontStyles.semiBold]}>PKR</Text>
                  <TextInput
                    style={[s.walletInput, fontStyles.bold]}
                    value={amount}
                    onChangeText={v => {
                      const digits = v.replace(/[^0-9]/g, "");
                      const n = parseInt(digits, 10);
                      setAmount(Number.isFinite(n) && n > due ? String(due) : digits);
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="0"
                    placeholderTextColor={colors.ink + "55"}
                  />
                </View>
                <Text style={[s.walletHint, fontStyles.medium]}>
                  {t("Minimum PKR{amount}", { amount: MIN_TOPUP.toLocaleString() })}
                </Text>
                {payError ? (
                  <Text style={[s.walletHint, s.walletHintError, fontStyles.medium]}>{payError}</Text>
                ) : null}

                {quickAmounts.length > 0 ? (
                  <View style={s.quickRow}>
                    {quickAmounts.map(q => (
                      <TouchableOpacity
                        key={q}
                        style={[s.quickChip, parsed === q && s.quickChipActive]}
                        activeOpacity={0.85}
                        onPress={() => setAmount(String(q))}
                      >
                        <Text style={[s.quickChipText, fontStyles.semiBold]}>{q.toLocaleString()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[s.confirmBtn, (!valid || paying) && s.confirmBtnDisabled]}
                  activeOpacity={0.9}
                  disabled={!valid || paying}
                  onPress={handleStartPayment}
                >
                  {paying ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <>
                      <PaypalLogo size={19} color={colors.white} weight="fill" />
                      <Text style={[s.confirmBtnText, fontStyles.semiBold]}>
                        {t("Pay with PayPal")}
                        {valid ? ` PKR${parsed.toLocaleString()}` : ""}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </Reanimated.View>
        </View>
      </Modal>

      <PayPalCheckout url={checkoutUrl} onApproved={handleApproved} onCancel={() => setCheckoutUrl(null)} />
    </>
  );
}
