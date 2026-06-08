import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useListFeaturedEvents } from "@workspace/api-client-react";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EventCard } from "@/components/EventCard";
import { useColors } from "@/hooks/useColors";

const TABLE_FEATURES = [
  { icon: "layers" as const, label: "40+ Mats", desc: "Premium playing surfaces" },
  { icon: "grid" as const, label: "Tile Sets", desc: "Hand-selected collections" },
  { icon: "sidebar" as const, label: "Styled Racks", desc: "Matching rack sets" },
  { icon: "star" as const, label: "Full Curation", desc: "Every detail considered" },
];

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: featuredEvents, isLoading, refetch } = useListFeaturedEvents();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <LinearGradient
        colors={[colors.navy, colors.navyLight]}
        style={[styles.hero, { paddingTop: topPad + 24 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.heroBadge}>
          <View style={[styles.heroBadgeDot, { backgroundColor: colors.gold }]} />
          <Text style={[styles.heroBadgeText, { color: colors.gold, fontFamily: "Inter_500Medium" }]}>
            Premium mahjong experiences
          </Text>
        </View>

        <Text style={[styles.heroTitle, { color: "#FAF8F5", fontFamily: "CormorantGaramond_500Medium" }]}>
          You&apos;re invited to{"\n"}
          <Text style={{ color: colors.gold, fontStyle: "italic" }}>something special</Text>.
        </Text>

        <Text style={[styles.heroSubtitle, { color: "rgba(250,248,245,0.75)", fontFamily: "Inter_400Regular" }]}>
          Intimate mahjong gatherings, premium setups, and connections that feel rich, polished, and entirely your own.
        </Text>

        <View style={styles.heroCTAs}>
          <Pressable
            testID="home-explore-events"
            style={({ pressed }) => [
              styles.ctaPrimary,
              { backgroundColor: colors.gold, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => router.push("/(tabs)/events")}
          >
            <Text style={[styles.ctaPrimaryText, { color: colors.navy, fontFamily: "Inter_600SemiBold" }]}>
              Explore Events
            </Text>
            <Feather name="arrow-right" size={16} color={colors.navy} />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Custom Table Setup */}
      <View style={[styles.tableSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.sectionLabelRow}>
          <Feather name="layout" size={14} color={colors.primary} />
          <Text style={[styles.sectionLabel, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
            BUILD YOUR TABLE
          </Text>
        </View>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "CormorantGaramond_500Medium" }]}>
          Your table,{" "}
          <Text style={{ color: colors.primary, fontStyle: "italic" }}>your way.</Text>
        </Text>
        <Text style={[styles.sectionBody, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Choose from over{" "}
          <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
            40 premium mats, tile sets, and racks
          </Text>{" "}
          to create a setup that&apos;s completely your own.
        </Text>
        <View style={styles.tableGrid}>
          {TABLE_FEATURES.map((f) => (
            <View
              key={f.label}
              style={[
                styles.tableFeatureCard,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Feather name={f.icon} size={22} color={colors.primary} />
              <Text style={[styles.tableFeatureLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                {f.label}
              </Text>
              <Text style={[styles.tableFeatureDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {f.desc}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Featured Events */}
      <View style={styles.eventsSection}>
        <View style={styles.eventsSectionHeader}>
          <Text style={[styles.eventsSectionTitle, { color: colors.foreground, fontFamily: "CormorantGaramond_500Medium" }]}>
            Upcoming Gatherings
          </Text>
          <Pressable onPress={() => router.push("/(tabs)/events")}>
            <Text style={[styles.viewAllText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
              View all
            </Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : featuredEvents && featuredEvents.length > 0 ? (
          <FlatList
            data={featuredEvents.slice(0, 4)}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <EventCard event={item} style={styles.eventCardItem} />
            )}
            scrollEnabled={false}
          />
        ) : (
          <View style={[styles.emptyState, { borderColor: colors.border, borderRadius: colors.radius }]}>
            <Feather name="calendar" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyStateText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              No upcoming events yet.{"\n"}Check back soon!
            </Text>
          </View>
        )}
      </View>

      {/* Meet the Founder */}
      <View style={[styles.founderSection, { backgroundColor: "#181D37" }]}>
        <View style={styles.founderLabelRow}>
          <View style={[styles.founderLabelLine, { backgroundColor: "#C9A227" }]} />
          <Text style={[styles.founderLabel, { color: "#C9A227", fontFamily: "Inter_600SemiBold" }]}>
            MEET THE FOUNDER
          </Text>
          <View style={[styles.founderLabelLine, { backgroundColor: "#C9A227" }]} />
        </View>

        {/* Main photo */}
        <View style={styles.founderPhotoMain}>
          <Image
            source={require("../../assets/patsy-atx-tournament.jpg")}
            style={styles.founderPhotoMainImg}
            resizeMode="cover"
          />
        </View>

        {/* Thumbnail row */}
        <View style={styles.founderPhotoRow}>
          <View style={styles.founderPhotoThumb}>
            <Image
              source={require("../../assets/patsy-mahj-bash.jpg")}
              style={styles.founderPhotoThumbImg}
              resizeMode="cover"
            />
          </View>
          <View style={styles.founderPhotoThumb}>
            <Image
              source={require("../../assets/patsy-earthly-hand.jpg")}
              style={styles.founderPhotoThumbImg}
              resizeMode="cover"
            />
          </View>
        </View>

        <Text style={[styles.founderName, { color: "#FAF8F5", fontFamily: "CormorantGaramond_500Medium" }]}>
          Patsy Miller
        </Text>
        <Text style={[styles.founderTitle, { color: "#C9A227", fontFamily: "Inter_400Regular" }]}>
          Founder &amp; CEO, Bougie Bams
        </Text>

        <View style={[styles.founderDivider, { backgroundColor: "rgba(201,162,39,0.25)" }]} />

        <Text style={[styles.founderBio, { color: "rgba(250,248,245,0.80)", fontFamily: "Inter_400Regular" }]}>
          If you know me, you know I love bringing people together. I've always been happiest when there's food, laughter, conversation, and a touch of over-the-top flair. Most people would tell you "bougie" has always been one of my defining characteristics — and I happily embrace it.
        </Text>
        <Text style={[styles.founderBio, { color: "rgba(250,248,245,0.80)", fontFamily: "Inter_400Regular" }]}>
          I'm a proud 12th-generation Texan. I'm also known for my eyeglasses — bright colors are kind of my thing. So when I discovered mahjong, it felt like fate. The beautiful tables, vibrant tiles, and the way the game turns strangers into friends captured my heart immediately.
        </Text>
        <Text style={[styles.founderBio, { color: "rgba(250,248,245,0.80)", fontFamily: "Inter_400Regular" }]}>
          "Bougie" is what friends and family have called me for years. And "Bams"? That's a nod to bamboo tiles — a little wink to the game that brought all of this together.
        </Text>

        <View style={[styles.founderQuoteBlock, { borderLeftColor: "#C9A227" }]}>
          <Text style={[styles.founderQuoteBlockText, { color: "rgba(250,248,245,0.90)", fontFamily: "Inter_400Regular" }]}>
            "My hope is that every Bougie Bams gathering becomes more than just a game — a place where friendships are formed, traditions are created, and people leave feeling a little happier than when they arrived."
          </Text>
        </View>

        <Text style={[styles.founderClosing, { color: "rgba(250,248,245,0.55)", fontFamily: "Inter_400Regular" }]}>
          Because life is simply better when there's color, community, and a seat for everyone at the table. I'm so glad you're here.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 20,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(201,162,39,0.4)",
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  heroBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heroBadgeText: {
    fontSize: 12,
  },
  heroTitle: {
    fontSize: 44,
    lineHeight: 50,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 320,
  },
  heroCTAs: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  ctaPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 100,
  },
  ctaPrimaryText: {
    fontSize: 15,
  },
  tableSection: {
    padding: 24,
    borderBottomWidth: 1,
    gap: 12,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
  },
  sectionTitle: {
    fontSize: 30,
    lineHeight: 36,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  tableGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  tableFeatureCard: {
    width: "47%",
    padding: 16,
    borderWidth: 1,
    gap: 6,
  },
  tableFeatureLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  tableFeatureDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  eventsSection: {
    padding: 24,
    gap: 16,
  },
  eventsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventsSectionTitle: {
    fontSize: 28,
  },
  viewAllText: {
    fontSize: 14,
  },
  eventCardItem: {
    marginBottom: 16,
  },
  loadingContainer: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    borderWidth: 1,
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  founderSection: {
    padding: 28,
    gap: 14,
  },
  founderPhotoMain: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 16,
    overflow: "hidden",
  },
  founderPhotoMainImg: {
    width: "100%",
    height: "100%",
  },
  founderPhotoRow: {
    flexDirection: "row",
    gap: 10,
  },
  founderPhotoThumb: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  founderPhotoThumbImg: {
    width: "100%",
    height: "100%",
  },
  founderLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  founderLabelLine: {
    flex: 1,
    height: 1,
  },
  founderLabel: {
    fontSize: 10,
    letterSpacing: 3,
  },
  founderName: {
    fontSize: 40,
    lineHeight: 44,
  },
  founderTitle: {
    fontSize: 13,
    letterSpacing: 0.5,
    marginTop: -6,
  },
  founderDivider: {
    height: 1,
    marginVertical: 2,
  },
  founderBio: {
    fontSize: 14,
    lineHeight: 22,
  },
  founderQuoteBlock: {
    borderLeftWidth: 3,
    paddingLeft: 14,
    paddingVertical: 4,
    marginTop: 4,
  },
  founderQuoteBlockText: {
    fontSize: 14,
    fontStyle: "italic",
    lineHeight: 22,
  },
  founderClosing: {
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 20,
    marginTop: 4,
  },
});
