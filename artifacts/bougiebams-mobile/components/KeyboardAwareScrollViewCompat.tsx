import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewProps,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { Platform, ScrollView, ScrollViewProps, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = KeyboardAwareScrollViewProps & ScrollViewProps;

export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  ...props
}: Props) {
  if (Platform.OS === "web") {
    return (
      <ScrollView keyboardShouldPersistTaps={keyboardShouldPersistTaps} {...props}>
        {children}
      </ScrollView>
    );
  }
  return (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...props}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}

interface KeyboardStickyFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function KeyboardStickyFooter({ children, style }: KeyboardStickyFooterProps) {
  const insets = useSafeAreaInsets();

  if (Platform.OS === "web") {
    return (
      <View style={[{ paddingBottom: insets.bottom || 16 }, style]}>
        {children}
      </View>
    );
  }

  return (
    <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
      <View style={[{ paddingBottom: insets.bottom || 16 }, style]}>
        {children}
      </View>
    </KeyboardStickyView>
  );
}
