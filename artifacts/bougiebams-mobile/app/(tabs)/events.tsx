import { Feather } from "@expo/vector-icons";
import { useListEventCategories, useListEvents } from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const zebraBanner = require("@/assets/bougie-zebra-mobile.png");
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EventCard } from "@/components/EventCard";
import { useColors } from "@/hooks/useColors";

export default function EventsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: categories } = useListEventCategories();
  const {
    data: events,
    isLoading,
    refetch,
  } = useListEvents({
    upcoming: true,
    category: selectedCategory ?? undefined,
    search: search.trim() || undefined,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <ImageBackground
        source={zebraBanner}
        style={[styles.headerBanner, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}
        imageStyle={styles.headerBannerImage}
      >
        <View style={styles.headerOverlay} />
        <View style={styles.header}>
          <Text
            style={[
              styles.headerTitle,
              { color: "#FFFFFF", fontFamily: "CormorantGaramond_500Medium" },
            ]}
          >
            Bougie Events!
          </Text>
          <Text style={styles.headerTagline}>
            Life&apos;s too short for ordinary.{"\n"}Let&apos;s make mahjong{" "}
            <Text style={styles.headerTaglineBam}>BOUGIE</Text>
            {" — "}
            <Text style={styles.headerTaglineBam}>BAM!</Text>
          </Text>
          <View style={styles.founderQuote}>
            <Text style={styles.founderQuoteText}>
              "Bougie Bams is more than a business. It's an extension of who I am — a colorful, slightly over-the-top Texan who believes life is better when people gather around a beautiful table."
            </Text>
            <Text style={styles.founderAttribution}>
              — Patsy Miller, Founder & CEO
            </Text>
          </View>
        </View>

        {/* Search */}
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
          ]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            testID="events-search"
            placeholder="Search events…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            style={[
              styles.searchInput,
              { color: colors.foreground, fontFamily: "Inter_400Regular" },
            ]}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* Category Filter */}
        {categories && categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            <Pressable
              testID="category-all"
              style={[
                styles.categoryChip,
                {
                  backgroundColor: selectedCategory === null ? colors.primary : colors.card,
                  borderColor: selectedCategory === null ? colors.primary : colors.border,
                  borderRadius: 100,
                },
              ]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  {
                    color: selectedCategory === null ? colors.primaryForeground : colors.mutedForeground,
                    fontFamily: "Inter_500Medium",
                  },
                ]}
              >
                All
              </Text>
            </Pressable>
            {categories.map((cat) => (
              <Pressable
                key={cat}
                testID={`category-${cat}`}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: selectedCategory === cat ? colors.primary : colors.card,
                    borderColor: selectedCategory === cat ? colors.primary : colors.border,
                    borderRadius: 100,
                  },
                ]}
                onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    {
                      color: selectedCategory === cat ? colors.primaryForeground : colors.mutedForeground,
                      fontFamily: "Inter_500Medium",
                    },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </ImageBackground>

      {/* Events List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          testID="events-list"
          data={events ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <EventCard event={item} style={styles.eventCardItem} />
          )}
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
          scrollEnabled={!!(events && events.length > 0)}
          ListEmptyComponent={
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
                No events found
              </Text>
              <Text
                style={[
                  styles.emptyBody,
                  { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                ]}
              >
                {search ? "Try a different search term." : "Check back soon for upcoming gatherings."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerBanner: {
    borderBottomWidth: 1,
    overflow: "hidden",
  },
  headerBannerImage: {
    resizeMode: "cover",
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(24,29,55,0.6)",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 12,
  },
  headerTitle: {
    fontSize: 36,
  },
  headerTagline: {
    fontSize: 13,
    fontStyle: "italic",
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
    marginBottom: 4,
  },
  headerTaglineBam: {
    fontWeight: "700",
    fontStyle: "normal",
    color: "#FFFFFF",
  },
  founderQuote: {
    borderLeftWidth: 3,
    borderLeftColor: "#C9A227",
    paddingLeft: 10,
    marginTop: 4,
  },
  founderQuoteText: {
    fontSize: 11,
    fontStyle: "italic",
    lineHeight: 17,
    color: "rgba(255,255,255,0.90)",
    fontWeight: "500",
  },
  founderAttribution: {
    fontSize: 10,
    marginTop: 3,
    color: "rgba(255,255,255,0.65)",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  categoryRow: {
    gap: 8,
    paddingRight: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    padding: 20,
    gap: 0,
  },
  eventCardItem: {
    marginBottom: 16,
  },
  emptyState: {
    borderWidth: 1,
    padding: 40,
    margin: 20,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 22,
  },
  emptyBody: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
});
