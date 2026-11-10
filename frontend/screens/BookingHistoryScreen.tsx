import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, ScrollView, SectionList, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft } from "phosphor-react-native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import ScreenBackground from "../components/ScreenBackground";
import FadeInView from "../components/FadeInView";
import CustomAlert from "../components/CustomAlert";
import { useFontFamilies } from "../hooks/useFontFamilies";
import { useSettings } from "../contexts/SettingsContext";
import { useColors, useThemedStyles } from "../hooks/useColors";
import { fetchCustomerBookingHistory, getCurrentUserId, type CustomerBookingHistoryItem } from "../services/bidding";
import { getStoredUser } from "../services/auth";
import { makeBookingHistoryStyles } from "../styles/BookingHistoryScreen.styles";
import { RootStackParamList } from "../navigation/types";
import { fontStyles } from "../styles/fonts";

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "BookingHistory">;
  route: RouteProp<RootStackParamList, "BookingHistory">;
};
type Filter = "all" | "home" | "vehicle" | "furniture" | "barber";

export default function BookingHistoryScreen({ navigation, route }: Props) {
  const fonts = useFontFamilies();
  const { settings } = useSettings();
  const colors = useColors();
  const s = useThemedStyles(makeBookingHistoryStyles);
  const [filter, setFilter] = useState<Filter>("all");
  const [bookings, setBookings] = useState<CustomerBookingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ title: string; message?: string } | null>(null);

  useEffect(() => {
    getCurrentUserId("guest")
      .then(fetchCustomerBookingHistory)
      .then(setBookings)
      .catch(() => setAlert({ title: "Couldn't load booking history", message: "Please check your connection and try again." }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const deletedId = route.params?.deletedId;
    if (!deletedId) return;
    setBookings(current => current.filter(booking => booking.id !== deletedId));
    navigation.setParams({ deletedId: undefined });
  }, [navigation, route.params?.deletedId]);

  const filtered = useMemo(
    () => bookings.filter(item => filter === "all" || item.service.toLowerCase().includes(filter)),
    [bookings, filter],
  );
  const sections = useMemo(() => {
    const groups = new Map<string, CustomerBookingHistoryItem[]>();
    filtered.forEach(booking => {
      const day = new Date(booking.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      groups.set(day, [...(groups.get(day) ?? []), booking]);
    });
    return [...groups.entries()].map(([title, data]) => ({ title, data }));
  }, [filtered]);

  const bookService = async () => {
    const storedUser = await getStoredUser();
    navigation.navigate("CustomerHome", { name: storedUser?.name ?? "" });
  };

  return (
    <ScreenBackground variant="sheet" showPattern patternOpacity={0.022} hideOrbs>
      <StatusBar style={settings.theme === "dark" ? "light" : "dark"} />
      <FadeInView style={s.header} delay={0} duration={600} keepRasterized>
        <TouchableOpacity style={s.backButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <ArrowLeft size={22} color={colors.white} weight="bold" />
        </TouchableOpacity>
        <View style={s.headerCopy}>
          <Text style={[s.headerTitle, fontStyles.bold]}>Booking History</Text>
          <Text style={[s.headerHint, fontStyles.medium]}>Tap a booking to view its details</Text>
        </View>
      </FadeInView>

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <FadeInView style={s.filtersWrap} delay={150} duration={700} keepRasterized>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
              <FilterChip label="All" active={filter === "all"} onPress={() => setFilter("all")} fonts={fonts} />
              <FilterChip label="Home" active={filter === "home"} onPress={() => setFilter("home")} fonts={fonts} />
              <FilterChip label="Vehicle" active={filter === "vehicle"} onPress={() => setFilter("vehicle")} fonts={fonts} />
              <FilterChip label="Shifting" active={filter === "furniture"} onPress={() => setFilter("furniture")} fonts={fonts} />
              <FilterChip label="Barber" active={filter === "barber"} onPress={() => setFilter("barber")} fonts={fonts} />
            </ScrollView>
          </FadeInView>
        }
        ListEmptyComponent={
          loading ? (
            <View style={s.loadingState}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <FadeInView style={s.emptyCard} delay={300} duration={700} keepRasterized>
              <Image source={require("../assets/images/Illustration7.webp")} style={s.emptyIllustration} resizeMode="contain" />
              <Text style={[s.emptyTitle, fontStyles.semiBold]}>No bookings yet</Text>
              <Text style={[s.emptyText, fontStyles.medium]}>Your booking history will appear here.</Text>
              <TouchableOpacity style={s.emptyButton} onPress={bookService} activeOpacity={0.86}>
                <Text style={[s.emptyButtonText, fontStyles.semiBold]}>Book a Service</Text>
              </TouchableOpacity>
            </FadeInView>
          )
        }
        renderSectionHeader={({ section }) => (
          <Text style={[s.dayHeader, fontStyles.semiBold]}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            fonts={fonts}
            onPress={() => navigation.navigate("BookingDetails", { booking: item })}
          />
        )}
      />
      <CustomAlert visible={!!alert} title={alert?.title ?? ""} message={alert?.message} onClose={() => setAlert(null)} />
    </ScreenBackground>
  );
}

function FilterChip({ label, active, onPress, fonts }: { label: string; active: boolean; onPress: () => void; fonts: ReturnType<typeof useFontFamilies> }) {
  const s = useThemedStyles(makeBookingHistoryStyles);
  return <TouchableOpacity style={[s.chip, active && s.chipActive]} onPress={onPress} activeOpacity={0.84}><Text style={[s.chipText, active && s.chipTextActive, fontStyles.semiBold]}>{label}</Text></TouchableOpacity>;
}

function BookingCard({ booking, fonts, onPress }: { booking: CustomerBookingHistoryItem; fonts: ReturnType<typeof useFontFamilies>; onPress: () => void }) {
  const s = useThemedStyles(makeBookingHistoryStyles);
  const isVehicle = booking.service.toLowerCase().includes("vehicle");
  const isFurniture = booking.service.toLowerCase().includes("furniture");
  const isBarber = booking.service.toLowerCase().includes("barber");
  const cancelled = booking.status === "cancelled";
  const statusLabel = cancelled ? (booking.cancelledBy === "worker" ? "Worker cancelled" : "You cancelled") : "Completed";
  const time = new Date(booking.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.86}>
    <View style={s.serviceIcon}>
      {isVehicle ? (
        <Image
          source={require("../assets/images/BookingHistoryVehicle.webp")}
          style={s.vehicleImage}
          resizeMode="contain"
          resizeMethod="resize"
        />
      ) : isBarber ? (
        <Image
          source={require("../assets/images/BookingHistoryBarber.webp")}
          style={s.barberImage}
          resizeMode="contain"
          resizeMethod="resize"
        />
      ) : isFurniture ? (
        <Image
          source={require("../assets/images/FurnitureServicesIcon.webp")}
          style={s.furnitureImage}
          resizeMode="contain"
          resizeMethod="resize"
        />
      ) : (
        <Image
          source={require("../assets/images/BookingHistoryHome.webp")}
          style={s.homeImage}
          resizeMode="contain"
          resizeMethod="resize"
        />
      )}
    </View>
    <View style={s.cardBody}>
      <Text style={[s.statusText, cancelled && s.cancelledText, fontStyles.medium]} numberOfLines={1}>
        {cancelled ? statusLabel : booking.address}
      </Text>
      <Text style={[s.detail, fontStyles.medium]} numberOfLines={1}>{booking.detail || booking.service}</Text>
      <Text style={[s.time, fontStyles.medium]}>{time}</Text>
    </View>
    <Text style={[s.cardPrice, cancelled && s.cancelledPrice, fontStyles.bold]}>PKR{booking.price}</Text>
  </TouchableOpacity>;
}
