import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRegisterForEvent } from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function RegisterScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, title, price } = useLocalSearchParams<{
    id: string;
    title: string;
    price: string;
  }>();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const { mutate: register, isPending } = useRegisterForEvent();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const isFree = Number(price) === 0;
  const unitPrice = Number(price);
  const total = unitPrice * quantity;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = "First name is required";
    if (!lastName.trim()) newErrors.lastName = "Last name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Enter a valid email";
    return newErrors;
  };

  const handleSubmit = () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setErrors({});
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    register(
      {
        id: Number(id),
        data: {
          eventId: Number(id),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          quantity,
        },
      },
      {
        onSuccess: async (response) => {
          setSubmitted(true);
          const isCheckoutUrl =
            response.url &&
            (response.url.includes("square") ||
              response.url.includes("checkout") ||
              response.url.includes("payment"));
          if (isCheckoutUrl) {
            if (Platform.OS === "web") {
              window.open(response.url, "_blank");
            } else {
              await WebBrowser.openBrowserAsync(response.url);
            }
          }
          router.replace({
            pathname: "/confirmation",
            params: { sessionId: response.sessionId },
          });
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setErrors({ submit: "Something went wrong. Please try again." });
        },
      }
    );
  };

  const fieldStyle = (hasError: boolean) => ({
    backgroundColor: colors.card,
    borderColor: hasError ? colors.destructive : colors.border,
    borderRadius: colors.radius / 1.5,
    color: colors.foreground,
  });

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
        <Pressable onPress={() => router.back()} style={styles.headerBackBtn}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.headerTitle, { color: colors.foreground, fontFamily: "CormorantGaramond_500Medium" }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Registration
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Form */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "CormorantGaramond_500Medium" }]}>
            Your Details
          </Text>

          <View style={styles.fieldRow}>
            <View style={[styles.fieldHalf]}>
              <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                First Name *
              </Text>
              <TextInput
                testID="first-name-input"
                style={[styles.input, fieldStyle(!!errors.firstName)]}
                placeholder="Jane"
                placeholderTextColor={colors.mutedForeground}
                value={firstName}
                onChangeText={(v) => { setFirstName(v); setErrors((e) => ({ ...e, firstName: "" })); }}
                autoCapitalize="words"
                autoComplete="given-name"
              />
              {errors.firstName && (
                <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
                  {errors.firstName}
                </Text>
              )}
            </View>
            <View style={styles.fieldHalf}>
              <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                Last Name *
              </Text>
              <TextInput
                testID="last-name-input"
                style={[styles.input, fieldStyle(!!errors.lastName)]}
                placeholder="Smith"
                placeholderTextColor={colors.mutedForeground}
                value={lastName}
                onChangeText={(v) => { setLastName(v); setErrors((e) => ({ ...e, lastName: "" })); }}
                autoCapitalize="words"
                autoComplete="family-name"
              />
              {errors.lastName && (
                <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
                  {errors.lastName}
                </Text>
              )}
            </View>
          </View>

          <View>
            <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
              Email Address *
            </Text>
            <TextInput
              testID="email-input"
              style={[styles.input, fieldStyle(!!errors.email)]}
              placeholder="jane@example.com"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: "" })); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            {errors.email && (
              <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
                {errors.email}
              </Text>
            )}
          </View>

          <View>
            <Text style={[styles.label, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
              Phone (optional)
            </Text>
            <TextInput
              testID="phone-input"
              style={[styles.input, fieldStyle(false)]}
              placeholder="+1 (555) 000-0000"
              placeholderTextColor={colors.mutedForeground}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
          </View>
        </View>

        {/* Quantity */}
        <View style={[styles.section, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 24 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "CormorantGaramond_500Medium" }]}>
            Tickets
          </Text>
          <View style={[styles.quantityRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Pressable
              testID="quantity-decrease"
              style={[styles.quantityBtn, { borderColor: colors.border }]}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Feather name="minus" size={18} color={quantity <= 1 ? colors.mutedForeground : colors.foreground} />
            </Pressable>
            <Text style={[styles.quantityValue, { color: colors.foreground, fontFamily: "CormorantGaramond_500Medium" }]}>
              {quantity}
            </Text>
            <Pressable
              testID="quantity-increase"
              style={[styles.quantityBtn, { borderColor: colors.border }]}
              onPress={() => setQuantity((q) => Math.min(10, q + 1))}
            >
              <Feather name="plus" size={18} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.quantityLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {quantity === 1 ? "ticket" : "tickets"}
            </Text>
          </View>
        </View>

        {/* Order Summary */}
        {!isFree && (
          <View style={[styles.orderSummary, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {quantity} × ${unitPrice.toFixed(0)}
              </Text>
              <Text style={[styles.summaryValue, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                ${total.toFixed(0)}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryTotalLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                Total
              </Text>
              <Text style={[styles.summaryTotal, { color: colors.primary, fontFamily: "CormorantGaramond_500Medium" }]}>
                ${total.toFixed(0)}
              </Text>
            </View>
          </View>
        )}

        {errors.submit && (
          <View style={[styles.errorBanner, { backgroundColor: `${colors.destructive}15`, borderColor: colors.destructive, borderRadius: colors.radius }]}>
            <Feather name="alert-circle" size={16} color={colors.destructive} />
            <Text style={[styles.errorBannerText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
              {errors.submit}
            </Text>
          </View>
        )}

        {/* Submit */}
        <Pressable
          testID="submit-registration"
          style={({ pressed }) => [
            styles.submitBtn,
            {
              backgroundColor: isPending || submitted ? colors.muted : colors.primary,
              borderRadius: colors.radius,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={handleSubmit}
          disabled={isPending || submitted}
        >
          {isPending ? (
            <ActivityIndicator color={colors.navy} size="small" />
          ) : (
            <>
              <Text style={[styles.submitBtnText, { color: colors.navy, fontFamily: "Inter_600SemiBold" }]}>
                {isFree ? "Register Now" : "Continue to Payment"}
              </Text>
              <Feather name={isFree ? "check" : "external-link"} size={18} color={colors.navy} />
            </>
          )}
        </Pressable>

        <Text style={[styles.secureNote, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {isFree ? "Your spot will be reserved immediately." : "Payments are securely processed by Square."}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerBackBtn: {
    padding: 4,
    paddingBottom: 6,
  },
  headerTitle: {
    fontSize: 22,
  },
  headerSubtitle: {
    fontSize: 12,
  },
  scrollContent: {
    padding: 24,
    gap: 24,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 24,
    marginBottom: 4,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 12,
  },
  fieldHalf: {
    flex: 1,
    gap: 6,
  },
  label: {
    fontSize: 13,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    fontSize: 15,
  },
  errorText: {
    fontSize: 12,
    marginTop: 2,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    padding: 8,
    gap: 0,
  },
  quantityBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 8,
  },
  quantityValue: {
    fontSize: 28,
    width: 56,
    textAlign: "center",
  },
  quantityLabel: {
    flex: 1,
    fontSize: 14,
    paddingLeft: 8,
  },
  orderSummary: {
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
  },
  summaryDivider: {
    height: 1,
  },
  summaryTotalLabel: {
    fontSize: 15,
  },
  summaryTotal: {
    fontSize: 24,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderWidth: 1,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 16,
  },
  secureNote: {
    fontSize: 12,
    textAlign: "center",
  },
});
