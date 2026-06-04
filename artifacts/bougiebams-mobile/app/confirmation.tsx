import { Feather } from "@expo/vector-icons";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGetRegistrationBySession } from "@workspace/api-client-react";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function ConfirmationScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data, isLoading, error } = useGetRegistrationBySession(
    { sessionId: sessionId ?? "" },
    { query: { enabled: !!sessionId } }
  );

  useEffect(() => {
    if (data?.registration) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [data]);

  const registration = data?.registration;
  const event = data?.event;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: topPad + 24, paddingBottom: bottomPad + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Confirming your registration…
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.center}>
          <View style={[styles.iconCircle, { backgroundColor: `${colors.destructive}15` }]}>
            <Feather name="alert-circle" size={40} color={colors.destructive} />
          </View>
          <Text style={[styles.successTitle, { color: colors.foreground, fontFamily: "CormorantGaramond_500Medium" }]}>
            Something went wrong
          </Text>
          <Text style={[styles.successSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            We couldn&apos;t load your registration details. If you completed payment, check your email for a confirmation.
          </Text>
          <Pressable
            testID="go-home-button"
            style={[styles.homeBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            onPress={() => router.replace("/(tabs)/")}
          >
            <Text style={[styles.homeBtnText, { color: colors.navy, fontFamily: "Inter_600SemiBold" }]}>
              Back to Home
            </Text>
          </Pressable>
        </View>
      )}

      {registration && event && (
        <>
          {/* Success icon */}
          <View style={styles.successHeader}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}20` }]}>
              <Feather name="check-circle" size={44} color={colors.primary} />
            </View>
            <Text style={[styles.successTitle, { color: colors.foreground, fontFamily: "CormorantGaramond_500Medium" }]}>
              You&apos;re in!
            </Text>
            <Text style={[styles.successSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Your spot is {registration.status === "paid" ? "confirmed" : "reserved"}. We&apos;ll email you with details.
            </Text>
          </View>

          {/* Event summary card */}
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Text style={[styles.cardEventTitle, { color: colors.foreground, fontFamily: "CormorantGaramond_500Medium" }]}>
              {event.title}
            </Text>
            <View style={styles.cardRow}>
              <Feather name="calendar" size={14} color={colors.primary} />
              <Text style={[styles.cardRowText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
                {format(new Date(event.date), "EEE, MMM d, yyyy · h:mm a")}
              </Text>
            </View>
            <View style={styles.cardRow}>
              <Feather name="map-pin" size={14} color={colors.primary} />
              <Text style={[styles.cardRowText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
                {event.location}
              </Text>
            </View>
            <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
            <View style={styles.cardRow}>
              <Feather name="user" size={14} color={colors.mutedForeground} />
              <Text style={[styles.cardRowText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {registration.firstName} {registration.lastName}
              </Text>
            </View>
            <View style={styles.cardRow}>
              <Feather name="mail" size={14} color={colors.mutedForeground} />
              <Text style={[styles.cardRowText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {registration.email}
              </Text>
            </View>
            <View style={styles.cardRow}>
              <Feather name="tag" size={14} color={colors.mutedForeground} />
              <Text style={[styles.cardRowText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {registration.quantity} {registration.quantity === 1 ? "ticket" : "tickets"} · {
                  registration.status === "paid"
                    ? `$${Number(registration.totalAmount ?? 0).toFixed(0)} paid`
                    : "Free"
                }
              </Text>
            </View>
            {/* Status badge */}
            <View style={[styles.statusBadge, { backgroundColor: `${colors.primary}20`, borderRadius: 100 }]}>
              <Feather name="check" size={12} color={colors.primary} />
              <Text style={[styles.statusText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                {registration.status === "paid" ? "Confirmed" : "Pending Confirmation"}
              </Text>
            </View>
          </View>

          <Pressable
            testID="go-home-button"
            style={({ pressed }) => [
              styles.homeBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: colors.radius,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={() => router.replace("/(tabs)/")}
          >
            <Text style={[styles.homeBtnText, { color: colors.navy, fontFamily: "Inter_600SemiBold" }]}>
              Back to Home
            </Text>
          </Pressable>

          <Pressable onPress={() => router.push("/(tabs)/events")}>
            <Text style={[styles.browseMore, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
              Browse more events
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    gap: 24,
  },
  center: {
    flex: 1,
    alignItems: "center",
    gap: 16,
    paddingTop: 40,
  },
  loadingText: {
    fontSize: 15,
  },
  successHeader: {
    alignItems: "center",
    gap: 12,
    paddingTop: 20,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 40,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  summaryCard: {
    padding: 20,
    borderWidth: 1,
    gap: 12,
  },
  cardEventTitle: {
    fontSize: 24,
    lineHeight: 30,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardRowText: {
    fontSize: 14,
    flex: 1,
  },
  cardDivider: {
    height: 1,
    marginVertical: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
  },
  homeBtn: {
    paddingVertical: 16,
    alignItems: "center",
  },
  homeBtnText: {
    fontSize: 16,
  },
  browseMore: {
    textAlign: "center",
    fontSize: 14,
    paddingBottom: 8,
  },
});
