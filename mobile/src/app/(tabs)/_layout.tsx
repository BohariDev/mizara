import { useEffect } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { Tabs, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HomeIcon from "@/assets/icons/home.svg";
import WalletCardsIcon from "@/assets/icons/wallet-cards.svg";
import PlusIcon from "@/assets/icons/plus.svg";
import NotificationIcon from "@/assets/icons/notification.svg";
import SettingsIcon from "@/assets/icons/settings.svg";
import { isThemeMode, useTheme } from "@/contexts/ThemeContext";
import { useTypography } from "@/hooks/useTypography";
import { useUserSettings } from "@/services/user/hooks";
import { useUnreadNotificationCount } from "@/services/notification/hooks";
import { usePushNotifications } from "@/services/push-notification/hooks";
import { formatUnreadBadge } from "@/utils/notification";

export default function TabsLayout() {
  const { colors, hasStoredThemeMode, setThemeMode } = useTheme();
  const FontSizes = useTypography();
  const { userSettings } = useUserSettings();
  const { unreadCount, refetch: refetchUnreadCount } =
    useUnreadNotificationCount();
  const insets = useSafeAreaInsets();

  usePushNotifications();

  // Notifications are created in the background, so refresh the badge when
  // the app comes back to the foreground.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refetchUnreadCount();
      }
    });

    return () => subscription.remove();
  }, [refetchUnreadCount]);

  // Fresh install / new device: adopt the account's theme. A theme already
  // chosen on this device always wins.
  const serverTheme = userSettings?.theme.key;
  useEffect(() => {
    if (hasStoredThemeMode === false && isThemeMode(serverTheme)) {
      setThemeMode(serverTheme);
    }
  }, [hasStoredThemeMode, serverTheme, setThemeMode]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          borderTopColor: colors.border,
          borderTopWidth: 2,
          backgroundColor: colors.background,
          height: 64 + insets.bottom,
          paddingTop: 8,
          paddingBottom: 8 + insets.bottom,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="recurring-payments"
        options={{
          title: "Payments",
          tabBarIcon: ({ color }) => <WalletCardsIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "Add",
          tabBarShowLabel: false,
          tabBarButton: ({ onPress, accessibilityState }) => (
            <View
              style={{
                flex: 0.8,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Pressable
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel="Add recurring payment"
                accessibilityState={accessibilityState}
                style={({ pressed }) => ({
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <PlusIcon color={colors.surface} />
              </Pressable>
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            // Open the add modal instead of switching to the placeholder tab.
            e.preventDefault();
            router.push("/recurring-payments/add");
          },
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color }) => <NotificationIcon color={color} />,
          tabBarBadge:
            unreadCount > 0 ? formatUnreadBadge(unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.danger,
            color: colors.surface,
            fontSize: FontSizes.tiny,
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <SettingsIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
