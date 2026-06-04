import { Feather } from "@expo/vector-icons";
import { format } from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGetMyRegistrations } from "@workspace/api-client-react";
import React from "react";
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

export default function RegistrationDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: registrations, isLoading, error } = useGetMyRegistrations({
    query: { retry: false },
  });

  const item = registrations?.find(
    (r) => String(r.registration.id) === String(id)
  );

  const registration = item?.registration;
  const event = item?.event;

  const statusConfig: Record<string, { icon: string; label: string; bg: string; color: string }> = {
    paid: {
      icon: "check-circle",
      label: "Confirmed",
      bg: `${colors.primary}20`,
      color: colors.primary,
    },
    pending: {
      icon: "clock",
      label: "Pending",
      bg: `${colors.gold}22`,
      color: colors.gold,
    },
    cancelled: {
      icon: "x-circle",
      label: "Cancelled",
      bg: `${colors.destructive}15`,
      color: colors.destructive,
    },
  };

  const status = statusConfig[registration?.status ?? ""] ?? statusConfig.pending;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: topPad + 12, paddingBottom: bottomPad + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Back button */}
      <Pressable
        testID="back-button"
        style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        onPress={() => router.back()}
      >
        <Feather name="arrow-left" size={20} color={colors.foreground} />
        <Text style={[styles.backText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
          My Registrations
        </Text>
      </Pressable>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Loading your registration…
          </Text>
        </View>
      )}

      {(error || (!isLoading && !item)) && (
        <View style={styles.center}>
          <View style={[styles.iconCircle, { backgroundColor: `${colors.destructive}15` }]}>
            <Feather name="alert-circle" size={40} color={colors.destructive} />
          </View>
          <Text style={[styles.screenTitle, { color: colors.foreground, fontFamily: "CormorantGaramond_500Medium" }]}>
            Registration not found
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            We couldn&apos;t find this registration. It may have been removed.
          </Text>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            onPress={() => router.replace("/(tabs)/profile")}
          >
            <Text style={[styles.primaryBtnText, { color: colors.navy, fontFamily: "Inter_600SemiBold" }]}>
              Back to Profile
            </Text>
          </Pressable>
        </View>
      )}

      {registration && event && (
        <>
          {/* Status icon + title */}
          <View style={styles.successHeader}>
            <View style={[styles.iconCircle, { backgroundColor: status.bg }]}>
              <Feather name={status.icon as React.ComponentProps<typeof Feather>["name"]} size={44} color={status.color} />
            </View>
            <Text style={[styles.screenTitle, { color: colors.foreground, fontFamily: "CormorantGaramond_500Medium" }]}>
              Registration {status.label}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {registration.status === "paid"
                ? "Your spot is confirmed. We'll see you there!"
                : registration.status === "cancelled"
                ? "This registration has been cancelled."
                : "Your spot is reserved, pending confirmation."}
            </Text>
          </View>

          {/* Summary card */}
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
                {registration.quantity} {registration.quantity === 1 ? "ticket" : "tickets"}{" "}
                ·{" "}
                {Number(registration.totalAmount ?? 0) > 0
                  ? `$${Number(registration.totalAmount).toFixed(0)} paid`
                  : "Free"}
              </Text>
            </View>

            {/* Status badge */}
            <View style={[styles.statusBadge, { backgroundColor: status.bg, borderRadius: 100 }]}>
              <Feather name={status.icon as React.ComponentProps<typeof Feather>["name"]} size={12} color={status.color} />
              <Text style={[styles.statusText, { color: status.color, fontFamily: "Inter_600SemiBold" }]}>
                {status.label}
              </Text>
            </View>
          </View>

          {/* View event button */}
          <Pressable
            testID="view-event-button"
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: colors.radius,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={() =>
              router.push({ pathname: "/event/[id]", params: { id: String(event.id) } })
            }
          >
            <Text style={[styles.primaryBtnText, { color: colors.navy, fontFamily: "Inter_600SemiBold" }]}>
              View Event
            </Text>
          </Pressable>

          <Pressable onPress={() => router.back()}>
            <Text style={[styles.secondaryLink, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
              Back to profile
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
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 15,
  },
  center: {
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
  screenTitle: {
    fontSize: 38,
    textAlign: "center",
    lineHeight: 46,
  },
  subtitle: {
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
  primaryBtn: {
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: {
    fontSize: 16,
  },
  secondaryLink: {
    textAlign: "center",
    fontSize: 14,
    paddingBottom: 8,
  },
});
