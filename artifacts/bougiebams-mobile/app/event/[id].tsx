import { Feather } from "@expo/vector-icons";
import { format } from "date-fns";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGetEvent } from "@workspace/api-client-react";
import React from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function EventDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: event, isLoading, error } = useGetEvent(Number(id));

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.errorText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Event not found.
        </Text>
        <Pressable style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Text style={[styles.backBtnText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  const openMap = () => {
    const query = encodeURIComponent(event.address || event.location);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const isFree = Number(event.price) === 0;
  const priceLabel = isFree ? "Free" : `$${Number(event.price).toFixed(0)}`;
  const spotsLabel = event.spotsRemaining != null ? `${event.spotsRemaining} spots remaining` : `${event.capacity} capacity`;
  const isSoldOut = event.spotsRemaining === 0;

  const handleRegister = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/event/register",
      params: { id: String(event.id), title: event.title, price: String(event.price) },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Image / Hero */}
        <View style={styles.imageContainer}>
          {event.imageUrl ? (
            <Image
              source={{ uri: event.imageUrl }}
              style={styles.heroImage}
              contentFit="cover"
            />
          ) : (
            <LinearGradient
              colors={[colors.navy, colors.navyLight]}
              style={styles.heroImage}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={[styles.heroPlaceholder, { color: colors.gold }]}>BB</Text>
            </LinearGradient>
          )}
          {/* Back button */}
          <Pressable
            testID="back-button"
            style={[
              styles.backCircle,
              { top: topPad + 12, backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </Pressable>
          {/* Price badge */}
          <View style={[styles.priceBadge, { backgroundColor: colors.gold }]}>
            <Text style={[styles.priceBadgeText, { color: colors.navy, fontFamily: "Inter_700Bold" }]}>
              {priceLabel}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text
            style={[
              styles.category,
              { color: colors.primary, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            {event.category?.toUpperCase()}
          </Text>

          <Text
            style={[
              styles.title,
              { color: colors.foreground, fontFamily: "CormorantGaramond_500Medium" },
            ]}
          >
            {event.title}
          </Text>

          {/* Info Pills */}
          <View style={styles.infoPills}>
            <View style={[styles.pill, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="calendar" size={14} color={colors.primary} />
              <Text style={[styles.pillText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                {format(new Date(event.date), "EEE, MMM d, yyyy")}
              </Text>
            </View>
            <View style={[styles.pill, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="clock" size={14} color={colors.primary} />
              <Text style={[styles.pillText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                {format(new Date(event.date), "h:mm a")}
                {event.endDate ? ` – ${format(new Date(event.endDate), "h:mm a")}` : ""}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.pill, { backgroundColor: colors.card, borderColor: colors.primary, opacity: pressed ? 0.7 : 1 }]}
              onPress={openMap}
            >
              <Feather name="map-pin" size={14} color={colors.primary} />
              <Text style={[styles.pillText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                {event.location}
              </Text>
              <Feather name="external-link" size={11} color={colors.primary} />
            </Pressable>
            <View style={[styles.pill, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="users" size={14} color={isSoldOut ? colors.destructive : colors.primary} />
              <Text
                style={[
                  styles.pillText,
                  {
                    color: isSoldOut ? colors.destructive : colors.foreground,
                    fontFamily: "Inter_500Medium",
                  },
                ]}
              >
                {isSoldOut ? "Sold Out" : spotsLabel}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Description */}
          <Text
            style={[
              styles.descriptionTitle,
              { color: colors.foreground, fontFamily: "CormorantGaramond_500Medium" },
            ]}
          >
            About this gathering
          </Text>
          <Text
            style={[
              styles.description,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            {event.description}
          </Text>

          {event.address && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Pressable
                style={({ pressed }) => [styles.addressCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, opacity: pressed ? 0.75 : 1 }]}
                onPress={openMap}
              >
                <Feather name="map-pin" size={16} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.addressLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                    LOCATION
                  </Text>
                  <Text style={[styles.addressText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
                    {event.location}
                  </Text>
                  <Text style={[styles.addressText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {event.address}
                  </Text>
                </View>
                <Feather name="external-link" size={14} color={colors.mutedForeground} />
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: bottomPad + 16,
          },
        ]}
      >
        <View style={styles.bottomBarInner}>
          <View>
            <Text style={[styles.bottomPrice, { color: colors.foreground, fontFamily: "CormorantGaramond_500Medium" }]}>
              {priceLabel}
            </Text>
            {!isSoldOut && (
              <Text style={[styles.bottomSpots, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {event.spotsRemaining != null ? `${event.spotsRemaining} left` : ""}
              </Text>
            )}
          </View>
          <Pressable
            testID="register-button"
            style={({ pressed }) => [
              styles.registerBtn,
              {
                backgroundColor: isSoldOut ? colors.muted : colors.primary,
                borderRadius: colors.radius,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={isSoldOut ? undefined : handleRegister}
            disabled={isSoldOut}
          >
            <Text
              style={[
                styles.registerBtnText,
                {
                  color: isSoldOut ? colors.mutedForeground : colors.navy,
                  fontFamily: "Inter_600SemiBold",
                },
              ]}
            >
              {isSoldOut ? "Sold Out" : "Register Now"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: 15,
  },
  imageContainer: {
    height: 280,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroPlaceholder: {
    fontSize: 48,
    fontWeight: "600",
    position: "absolute",
    alignSelf: "center",
    top: "35%",
  },
  backCircle: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  priceBadge: {
    position: "absolute",
    bottom: 16,
    right: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
  },
  priceBadgeText: {
    fontSize: 15,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  category: {
    fontSize: 11,
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
  },
  infoPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 100,
  },
  pillText: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  descriptionTitle: {
    fontSize: 22,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderWidth: 1,
  },
  addressLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bottomBar: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  bottomBarInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomPrice: {
    fontSize: 28,
  },
  bottomSpots: {
    fontSize: 12,
  },
  registerBtn: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  registerBtnText: {
    fontSize: 16,
  },
});
