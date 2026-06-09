import { Feather } from "@expo/vector-icons";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGetRegistrationBySession } from "@workspace/api-client-react";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const zebraBanner = require("@/assets/bougie-zebra-banner.png");
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/auth";
import {
  saveReminderIdentifier,
  scheduleConfirmationNotification,
  scheduleReminderWithOffset,
  syncReminderToServer,
  getStoredAuthToken,
  REMINDER_OPTIONS,
  type ReminderTiming,
} from "@/lib/notifications";

const API_BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function ConfirmationScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const confirmationScheduled = useRef(false);
  const [reminderSet, setReminderSet] = useState(false);
  const [chosenTiming, setChosenTiming] = useState<ReminderTiming | null>(null);
  const [reminderPending, setReminderPending] = useState(false);
  const [reminderUnavailable, setReminderUnavailable] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data, isLoading, error } = useGetRegistrationBySession(
    { sessionId: sessionId ?? "" },
    { query: { enabled: !!sessionId } }
  );

  useEffect(() => {
    if (data?.registration && data?.event && !confirmationScheduled.current) {
      confirmationScheduled.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const event = {
        id: data.event.id,
        title: data.event.title,
        date: data.event.date,
        location: data.event.location,
      };

      scheduleConfirmationNotification(event);
    }
  }, [data]);

  const handleReminderChoice = async (timing: ReminderTiming) => {
    if (!data?.registration || !data?.event || reminderPending) return;

    setReminderPending(true);

    const event = {
      id: data.event.id,
      title: data.event.title,
      date: data.event.date,
      location: data.event.location,
    };

    const result = await scheduleReminderWithOffset(event, timing);

    if (result) {
      const scheduledAtIso = result.scheduledAt.toISOString();
      await saveReminderIdentifier(
        data.registration.id,
        event.id,
        event.title,
        event.date,
        result.identifier,
        timing.label,
        scheduledAtIso
      );
      if (isAuthenticated) {
        syncReminderToServer(API_BASE_URL, getStoredAuthToken, {
          registrationId: data.registration.id,
          eventId: event.id,
          eventTitle: event.title,
          eventDate: event.date,
          notificationIdentifier: result.identifier,
          reminderLabel: timing.label,
          scheduledAt: scheduledAtIso,
        }).catch(() => {});
      }
      setChosenTiming(timing);
      setReminderSet(true);
    } else {
      setReminderUnavailable(true);
    }

    setReminderPending(false);
  };

  const registration = data?.registration;
  const event = data?.event;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Zebra banner header */}
      <ImageBackground
        source={zebraBanner}
        style={[styles.bannerHeader, { paddingTop: topPad + 24 }]}
        imageStyle={{ resizeMode: "cover", transform: [{ translateX: -80 }] }}
      >
        <View style={styles.bannerOverlay} />
        {isLoading && (
          <View style={styles.bannerContent}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={[styles.bannerTitle, { fontFamily: "CormorantGaramond_500Medium" }]}>
              Confirming…
            </Text>
          </View>
        )}
        {error && (
          <View style={styles.bannerContent}>
            <Feather name="alert-circle" size={40} color="#fff" />
            <Text style={[styles.bannerTitle, { fontFamily: "CormorantGaramond_500Medium" }]}>
              Something went wrong
            </Text>
          </View>
        )}
        {registration && event && (
          <View style={styles.bannerContent}>
            <View style={styles.bannerCheckCircle}>
              <Feather name="check-circle" size={44} color="#C9A227" />
            </View>
            <Text style={[styles.bannerTitle, { fontFamily: "CormorantGaramond_500Medium" }]}>
              You&apos;re in!
            </Text>
            <Text style={[styles.bannerSubtitle, { fontFamily: "Inter_400Regular" }]}>
              Your spot is {registration.status === "paid" ? "confirmed" : "reserved"}. We&apos;ll email you with details.
            </Text>
          </View>
        )}
      </ImageBackground>

    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: bottomPad + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {error && (
        <View style={styles.center}>
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

          {/* Reminder picker */}
          {Platform.OS !== "web" && (
            <View
              style={[
                styles.reminderCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <View style={styles.reminderCardHeader}>
                <Feather name="bell" size={18} color={colors.primary} />
                <Text style={[styles.reminderCardTitle, { color: colors.foreground, fontFamily: "CormorantGaramond_500Medium" }]}>
                  Set a Reminder
                </Text>
              </View>

              {reminderSet && chosenTiming ? (
                <View style={styles.reminderConfirmed}>
                  <View style={[styles.reminderConfirmedIcon, { backgroundColor: `${colors.primary}18` }]}>
                    <Feather name="check" size={16} color={colors.primary} />
                  </View>
                  <Text style={[styles.reminderConfirmedText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                    Reminder set for{" "}
                    <Text style={{ fontFamily: "Inter_600SemiBold" }}>{chosenTiming.label}</Text>
                  </Text>
                </View>
              ) : reminderUnavailable ? (
                <Text style={[styles.reminderHint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  This event is too soon to set a reminder for that option.
                </Text>
              ) : (
                <>
                  <Text style={[styles.reminderHint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    When would you like to be reminded?
                  </Text>
                  <View style={styles.reminderOptions}>
                    {REMINDER_OPTIONS.map((option) => (
                      <Pressable
                        key={option.label}
                        testID={`reminder-option-${option.label.replace(/\s+/g, "-").toLowerCase()}`}
                        style={({ pressed }) => [
                          styles.reminderOptionBtn,
                          {
                            borderColor: colors.border,
                            borderRadius: colors.radius - 2,
                            backgroundColor: pressed ? `${colors.primary}10` : colors.background,
                            opacity: reminderPending ? 0.5 : 1,
                          },
                        ]}
                        onPress={() => handleReminderChoice(option)}
                        disabled={reminderPending}
                      >
                        {reminderPending ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <Text style={[styles.reminderOptionText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                            {option.label}
                          </Text>
                        )}
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
            </View>
          )}

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
    </View>
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
  bannerHeader: {
    overflow: "hidden",
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(24,29,55,0.62)",
  },
  bannerContent: {
    alignItems: "center",
    gap: 10,
    paddingTop: 8,
  },
  bannerCheckCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(201,162,39,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: {
    fontSize: 40,
    color: "#fff",
    textAlign: "center",
  },
  bannerSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
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
  reminderCard: {
    padding: 20,
    borderWidth: 1,
    gap: 12,
  },
  reminderCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reminderCardTitle: {
    fontSize: 22,
  },
  reminderHint: {
    fontSize: 14,
    lineHeight: 20,
  },
  reminderOptions: {
    gap: 10,
  },
  reminderOptionBtn: {
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  reminderOptionText: {
    fontSize: 15,
  },
  reminderConfirmed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reminderConfirmedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  reminderConfirmedText: {
    fontSize: 15,
    flex: 1,
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
