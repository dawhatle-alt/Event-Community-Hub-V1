import { Feather } from "@expo/vector-icons";
import { useListEventCategories, useListEvents } from "@workspace/api-client-react";
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
  TextInput,
  View,
} from "react-native";
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
          Bougie Events!
        </Text>
        <Text style={[styles.headerTagline, { color: colors.mutedForeground }]}>
          Life's too short for ordinary. Let's make mahjong bougie — bam!
        </Text>

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
      </View>

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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerTitle: {
    fontSize: 36,
  },
  headerTagline: {
    fontSize: 13,
    fontStyle: "italic",
    marginTop: 2,
    marginBottom: 4,
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
