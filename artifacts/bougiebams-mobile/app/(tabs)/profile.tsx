import { Feather } from "@expo/vector-icons";
import { format, isPast } from "date-fns";
import { useRouter } from "expo-router";
import {
  useGetCurrentAuthUser,
  useGetMyRegistrations,
} from "@workspace/api-client-react";
import type { RegistrationWithEvent } from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth";
import { useColors } from "@/hooks/useColors";

type TabFilter = "upcoming" | "past";

function StatusBadge({ status }: { status: string }) {
  const colors = useColors();

  const config: Record<string, { label: string; bg: string; text: string }> = {
    paid: {
      label: "Confirmed",
      bg: `${colors.primary}20`,
      text: colors.primary,
    },
    pending: {
      label: "Pending",
      bg: `${colors.gold}22`,
      text: colors.gold,
    },
    cancelled: {
      label: "Cancelled",
      bg: `${colors.destructive}15`,
      text: colors.destructive,
    },
  };

  const cfg = config[status] ?? config.pending;

  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg, borderRadius: 100 }]}>
      <Text style={[styles.badgeText, { color: cfg.text, fontFamily: "Inter_600SemiBold" }]}>
        {cfg.label}
      </Text>
    </View>
  );
}

function RegistrationCard({ item }: { item: RegistrationWithEvent }) {
  const colors = useColors();
  const router = useRouter();
  const { registration, event } = item;

  return (
    <Pressable
      testID={`registration-card-${registration.id}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      onPress={() =>
        router.push({ pathname: "/registration/[id]", params: { id: String(registration.id) } })
      }
    >
      <View style={styles.cardHeader}>
        <Text
          style={[
            styles.cardTitle,
            { color: colors.foreground, fontFamily: "CormorantGaramond_500Medium" },
          ]}
          numberOfLines={2}
        >
          {event.title}
        </Text>
        <StatusBadge status={registration.status} />
      </View>

      <View style={styles.cardRow}>
        <Feather name="calendar" size={13} color={colors.primary} />
        <Text style={[styles.cardMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {format(new Date(event.date), "EEE, MMM d, yyyy · h:mm a")}
        </Text>
      </View>

      <View style={styles.cardRow}>
        <Feather name="map-pin" size={13} color={colors.primary} />
        <Text
          style={[styles.cardMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
          numberOfLines={1}
        >
          {event.location}
        </Text>
      </View>

      <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
        <View style={styles.cardRow}>
          <Feather name="tag" size={13} color={colors.mutedForeground} />
          <Text style={[styles.cardMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {registration.quantity ?? 1}{" "}
            {(registration.quantity ?? 1) === 1 ? "ticket" : "tickets"}
          </Text>
        </View>
        {Number(registration.totalAmount ?? 0) > 0 ? (
          <Text style={[styles.cardAmount, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            ${Number(registration.totalAmount).toFixed(0)} paid
          </Text>
        ) : (
          <Text style={[styles.cardAmount, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Free
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabFilter>("upcoming");
  const [refreshing, setRefreshing] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { isAuthenticated, isLoading: authLoading, signIn, signOut } = useAuth();

  const { data: authData, isLoading: userLoading } = useGetCurrentAuthUser();
  const user = authData?.user ?? null;

  const {
    data: registrations,
    isLoading: regsLoading,
    error: regsError,
    refetch,
  } = useGetMyRegistrations({
    query: { enabled: isAuthenticated, retry: false },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signIn();
    } finally {
      setSigningIn(false);
    }
  };

  const filtered = (registrations ?? []).filter((item) => {
    const eventDate = new Date(item.event.date);
    return activeTab === "upcoming" ? !isPast(eventDate) : isPast(eventDate);
  });

  const isLoading = authLoading || (isAuthenticated && userLoading);

  if (isLoading) {
    return (
      <View style={[styles.fullCenter, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.headerTitle,
            { color: colors.foreground, fontFamily: "CormorantGaramond_500Medium" },
          ]}
        >
          My Profile
        </Text>
      </View>

      {!isAuthenticated ? (
        /* ── Not signed in ── */
        <ScrollView
          contentContainerStyle={[
            styles.emptyContent,
            { paddingBottom: Platform.OS === "web" ? 50 : 120 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.unauthCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <View style={[styles.avatarCircle, { backgroundColor: `${colors.primary}18` }]}>
              <Feather name="user" size={40} color={colors.primary} />
            </View>
            <Text
              style={[
                styles.unauthTitle,
                { color: colors.foreground, fontFamily: "CormorantGaramond_500Medium" },
              ]}
            >
              Sign in to view your events
            </Text>
            <Text
              style={[
                styles.unauthBody,
                { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
            >
              Your registrations and profile information will appear here once you&apos;re signed in.
            </Text>
            <Pressable
              testID="sign-in-button"
              style={({ pressed }) => [
                styles.signInBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: colors.radius,
                  opacity: pressed || signingIn ? 0.75 : 1,
                },
              ]}
              onPress={handleSignIn}
              disabled={signingIn}
            >
              {signingIn ? (
                <ActivityIndicator color={colors.navy} size="small" />
              ) : (
                <>
                  <Feather name="log-in" size={16} color={colors.navy} />
                  <Text
                    style={[
                      styles.signInBtnText,
                      { color: colors.navy, fontFamily: "Inter_600SemiBold" },
                    ]}
                  >
                    Sign In
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          <View
            style={[
              styles.guestHint,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Feather name="info" size={16} color={colors.mutedForeground} />
            <Text
              style={[
                styles.guestHintText,
                { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
            >
              Browse and register for events in the{" "}
              <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
                Events
              </Text>{" "}
              tab — no sign-in required.
            </Text>
          </View>
        </ScrollView>
      ) : (
        /* ── Signed in ── */
        <FlatList
          testID="profile-registrations-list"
          data={filtered}
          keyExtractor={(item) => String(item.registration.id)}
          renderItem={({ item }) => <RegistrationCard item={item} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Platform.OS === "web" ? 50 : 120 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View>
              {/* Profile card */}
              <View
                style={[
                  styles.profileCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <View style={[styles.avatarCircle, { backgroundColor: `${colors.primary}18` }]}>
                  <Feather name="user" size={32} color={colors.primary} />
                </View>
                <View style={styles.profileInfo}>
                  {user && (user.firstName || user.lastName) && (
                    <Text
                      style={[
                        styles.profileName,
                        { color: colors.foreground, fontFamily: "CormorantGaramond_500Medium" },
                      ]}
                    >
                      {[user.firstName, user.lastName].filter(Boolean).join(" ")}
                    </Text>
                  )}
                  {user?.email && (
                    <Text
                      style={[
                        styles.profileEmail,
                        { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                      ]}
                    >
                      {user.email}
                    </Text>
                  )}
                  <Pressable
                    testID="sign-out-button"
                    style={({ pressed }) => [styles.signOutBtn, { opacity: pressed ? 0.6 : 1 }]}
                    onPress={signOut}
                  >
                    <Feather name="log-out" size={13} color={colors.mutedForeground} />
                    <Text
                      style={[
                        styles.signOutText,
                        { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                      ]}
                    >
                      Sign out
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Section title + tabs */}
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.foreground, fontFamily: "CormorantGaramond_500Medium" },
                ]}
              >
                My Registrations
              </Text>

              <View
                style={[
                  styles.tabRow,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                {(["upcoming", "past"] as TabFilter[]).map((tab) => (
                  <Pressable
                    key={tab}
                    testID={`tab-${tab}`}
                    style={[
                      styles.tabButton,
                      {
                        backgroundColor:
                          activeTab === tab ? colors.primary : "transparent",
                        borderRadius: colors.radius - 4,
                      },
                    ]}
                    onPress={() => setActiveTab(tab)}
                  >
                    <Text
                      style={[
                        styles.tabLabel,
                        {
                          color:
                            activeTab === tab
                              ? colors.navy
                              : colors.mutedForeground,
                          fontFamily:
                            activeTab === tab ? "Inter_600SemiBold" : "Inter_400Regular",
                        },
                      ]}
                    >
                      {tab === "upcoming" ? "Upcoming" : "Past"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
          ListEmptyComponent={
            regsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary} size="large" />
              </View>
            ) : regsError ? (
              <View
                style={[
                  styles.emptyState,
                  { borderColor: colors.border, borderRadius: colors.radius },
                ]}
              >
                <Feather name="alert-circle" size={32} color={colors.mutedForeground} />
                <Text
                  style={[
                    styles.emptyTitle,
                    { color: colors.foreground, fontFamily: "CormorantGaramond_500Medium" },
                  ]}
                >
                  Couldn&apos;t load registrations
                </Text>
                <Text
                  style={[
                    styles.emptyBody,
                    { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                  ]}
                >
                  Pull to refresh and try again.
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.emptyState,
                  { borderColor: colors.border, borderRadius: colors.radius },
                ]}
              >
                <Feather name="calendar" size={36} color={colors.mutedForeground} />
                <Text
                  style={[
                    styles.emptyTitle,
                    { color: colors.foreground, fontFamily: "CormorantGaramond_500Medium" },
                  ]}
                >
                  {activeTab === "upcoming"
                    ? "No upcoming events"
                    : "No past events"}
                </Text>
                <Text
                  style={[
                    styles.emptyBody,
                    { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                  ]}
                >
                  {activeTab === "upcoming"
                    ? "Register for a gathering to see it here."
                    : "Your past registrations will appear here."}
                </Text>
                {activeTab === "upcoming" && (
                  <Pressable
                    testID="browse-events-button"
                    style={({ pressed }) => [
                      styles.browseBtn,
                      {
                        backgroundColor: colors.primary,
                        borderRadius: colors.radius,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                    onPress={() => router.push("/(tabs)/events")}
                  >
                    <Text
                      style={[
                        styles.browseBtnText,
                        { color: colors.navy, fontFamily: "Inter_600SemiBold" },
                      ]}
                    >
                      Browse Events
                    </Text>
                    <Feather name="arrow-right" size={16} color={colors.navy} />
                  </Pressable>
                )}
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fullCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerTitle: {
    fontSize: 36,
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    fontSize: 26,
    lineHeight: 32,
  },
  profileEmail: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 28,
    marginBottom: 12,
  },
  tabRow: {
    flexDirection: "row",
    borderWidth: 1,
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabLabel: {
    fontSize: 14,
  },
  card: {
    borderWidth: 1,
    padding: 16,
    gap: 10,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  cardTitle: {
    fontSize: 20,
    lineHeight: 26,
    flex: 1,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardMeta: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
  },
  cardAmount: {
    fontSize: 14,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 11,
  },
  loadingContainer: {
    padding: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    borderWidth: 1,
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 22,
    textAlign: "center",
  },
  emptyBody: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  browseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 8,
  },
  browseBtnText: {
    fontSize: 15,
  },
  emptyContent: {
    flexGrow: 1,
    padding: 20,
    gap: 16,
  },
  unauthCard: {
    padding: 32,
    borderWidth: 1,
    alignItems: "center",
    gap: 16,
  },
  unauthTitle: {
    fontSize: 26,
    textAlign: "center",
    lineHeight: 32,
  },
  unauthBody: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
  guestHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderWidth: 1,
  },
  guestHintText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },
  signInBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginTop: 4,
  },
  signInBtnText: {
    fontSize: 15,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  signOutText: {
    fontSize: 13,
  },
});
