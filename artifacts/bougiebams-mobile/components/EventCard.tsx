import { Feather } from "@expo/vector-icons";
import { format } from "date-fns";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import type { Event } from "@workspace/api-client-react";

interface EventCardProps {
  event: Event;
  style?: object;
}

export function EventCard({ event, style }: EventCardProps) {
  const colors = useColors();
  const router = useRouter();

  const isFree = Number(event.price) === 0;
  const priceLabel = isFree ? "Free" : `$${Number(event.price).toFixed(0)}`;
  const spotsLabel =
    event.spotsRemaining != null ? `${event.spotsRemaining} spots` : null;

  return (
    <Pressable
      testID={`event-card-${event.id}`}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
      onPress={() => router.push(`/event/${event.id}`)}
    >
      <View
        style={[
          styles.imageContainer,
          { borderRadius: colors.radius, overflow: "hidden" },
        ]}
      >
        {event.imageUrl ? (
          <Image
            source={{ uri: event.imageUrl }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <LinearGradient
            colors={[colors.navy, colors.navyLight]}
            style={styles.image}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[styles.imagePlaceholder, { color: colors.gold }]}>
              BB
            </Text>
          </LinearGradient>
        )}
        <View style={styles.imageBadgeRow}>
          <View
            style={[
              styles.dateBadge,
              { backgroundColor: "rgba(10,12,26,0.85)" },
            ]}
          >
            <Text style={[styles.dateBadgeText, { color: "#fff" }]}>
              {format(new Date(event.date), "MMM d")}
            </Text>
          </View>
          <View
            style={[
              styles.priceBadge,
              { backgroundColor: colors.gold },
            ]}
          >
            <Text style={[styles.priceBadgeText, { color: colors.navyLight }]}>
              {priceLabel}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
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
          numberOfLines={2}
        >
          {event.title}
        </Text>
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <Text
              style={[
                styles.metaText,
                { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
            >
              {format(new Date(event.date), "h:mm a")}
            </Text>
          </View>
          {spotsLabel && (
            <View style={styles.metaItem}>
              <Feather name="users" size={12} color={colors.mutedForeground} />
              <Text
                style={[
                  styles.metaText,
                  { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                ]}
              >
                {spotsLabel}
              </Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Feather name="map-pin" size={12} color={colors.mutedForeground} />
            <Text
              style={[
                styles.metaText,
                { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
              numberOfLines={1}
            >
              {event.location}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    overflow: "hidden",
  },
  imageContainer: {
    height: 180,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    fontSize: 36,
    fontWeight: "600",
    position: "absolute",
    alignSelf: "center",
    top: "35%",
  },
  imageBadgeRow: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  dateBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  priceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  priceBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  body: {
    padding: 16,
    gap: 6,
  },
  category: {
    fontSize: 11,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
  },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
});
