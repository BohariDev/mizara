import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import NotificationIcon from "@/assets/icons/notification.svg";
import ChevronRightIcon from "@/assets/icons/chevron-right.svg";
import { Styles } from "@/styles/stylesheets";
import { FontWeights } from "@/styles/typography";
import { useTypography } from "@/hooks/useTypography";
import { useTheme, type ThemeMode } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import {
  SCREEN_PADDING_TOP_RATIO,
  SCREEN_WIDTH_RATIO,
} from "@/constants/dimensions";
import {
  useMyProfile,
  useUserSettings,
  useUpdateUserSettings,
} from "@/services/user/hooks";
import { useSignOut } from "@/services/auth/hooks";
import { usePushPermission } from "@/services/push-notification/hooks";
import { registerPushToken } from "@/services/push-notification/register";
import { SettingsSkeleton } from "@/components/Skeleton";
import { ToggleSwitch } from "@/components/ToggleSwitch";

export default function Settings() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const FontSizes = useTypography();
  const { colors, themeMode } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const {
    myProfile,
    isPending: isProfilePending,
    errorMessage: profileErrorMessage,
  } = useMyProfile();
  const {
    userSettings,
    isPending: isSettingsPending,
    errorMessage: settingsErrorMessage,
  } = useUserSettings();
  const { updateUserSettings, isPending: isUpdateSettingsPending } =
    useUpdateUserSettings();
  const { signOut, isPending: isSigningOut } = useSignOut();
  const { isGranted: isPushPermissionGranted, refresh: refreshPushPermission } =
    usePushPermission();
  const [pendingToggle, setPendingToggle] = useState<"push" | "email" | null>(
    null,
  );

  const isPending = isProfilePending || isSettingsPending;

  // The account setting alone isn't enough: this device also needs the OS
  // permission to actually receive pushes.
  const isPushNotificationsOn =
    !!userSettings?.push_notifications_enabled && isPushPermissionGranted;

  const handlePushNotificationsToggle = async (newValue: boolean) => {
    setPendingToggle("push");

    // Turning push on is the only place the permission prompt is shown.
    if (newValue) {
      let canReceivePush = false;

      try {
        canReceivePush = await registerPushToken({ requestPermission: true });
      } catch {
        showToast("Failed to update push notifications.", "error");
        setPendingToggle(null);
        return;
      }

      await refreshPushPermission();

      if (!canReceivePush) {
        setPendingToggle(null);
        Alert.alert(
          "Notifications are blocked",
          "Allow notifications for Mizara in your phone settings to get push notifications.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
    }

    updateUserSettings(
      { push_notifications_enabled: newValue },
      {
        onSuccess: () => {
          showToast("Push notifications updated.");
        },
        onError: () => {
          showToast("Failed to update push notifications.", "error");
        },
        onSettled: () => {
          setPendingToggle(null);
        },
      },
    );
  };

  const handleEmailNotificationsToggle = (newValue: boolean) => {
    setPendingToggle("email");
    updateUserSettings(
      { email_notifications_enabled: newValue },
      {
        onSuccess: () => {
          showToast("Email notifications updated.");
        },
        onError: () => {
          showToast("Failed to update email notifications.", "error");
        },
        onSettled: () => {
          setPendingToggle(null);
        },
      },
    );
  };

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () =>
          signOut(undefined, {
            onSettled: () => {
              router.replace("/signin");
            },
          }),
      },
    ]);
  };

  return (
    <View
      style={[
        Styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + height * SCREEN_PADDING_TOP_RATIO,
          justifyContent: "flex-start",
        },
      ]}
    >
      <Text
        style={{
          color: colors.textPrimary,
          fontWeight: FontWeights.bold,
          fontSize: FontSizes.xLarge,
          textAlign: "left",
          width: width * SCREEN_WIDTH_RATIO,
        }}
      >
        Settings
      </Text>
      <View
        style={{
          width: width * SCREEN_WIDTH_RATIO,
          marginTop: height * 0.035,
        }}
      >
        <Text
          style={{
            color: colors.textPrimary,
            fontWeight: FontWeights.bold,
            fontSize: FontSizes.medium,
            marginBottom: height * 0.01,
          }}
        >
          Profile
        </Text>
        {isPending ? (
          <SettingsSkeleton />
        ) : profileErrorMessage || !myProfile ? (
          <Text
            style={{
              color: colors.danger,
              fontWeight: FontWeights.medium,
              fontSize: FontSizes.small,
              textAlign: "left",
              marginTop: 5,
            }}
          >
            {profileErrorMessage ?? "Profile not found."}
          </Text>
        ) : (
          <TouchableOpacity
            onPress={() => router.push("/settings/profile/edit")}
            style={[
              Styles.flexRow,
              {
                justifyContent: "space-between",
                paddingTop: 5,
              },
            ]}
          >
            <View style={[Styles.flexRow, { gap: 15, alignItems: "center" }]}>
              <View
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 9999,
                  width: 64,
                  height: 64,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: colors.surface,
                    fontWeight: FontWeights.medium,
                    fontSize: FontSizes.xLarge,
                  }}
                >
                  {myProfile?.first_name?.[0]?.toUpperCase()}
                  {myProfile?.last_name?.[0]?.toUpperCase()}
                </Text>
              </View>
              <View>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontWeight: FontWeights.semibold,
                    fontSize: FontSizes.medium,
                  }}
                >
                  {myProfile?.first_name} {myProfile?.last_name}
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontWeight: FontWeights.semibold,
                    fontSize: FontSizes.small,
                  }}
                >
                  {myProfile?.email}
                </Text>
              </View>
            </View>
            <ChevronRightIcon
              width={20}
              height={20}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
        )}
      </View>

      <View
        style={{
          width: width * SCREEN_WIDTH_RATIO,
          marginTop: height * 0.03,
        }}
      >
        <Text
          style={{
            color: colors.textPrimary,
            fontWeight: FontWeights.bold,
            fontSize: FontSizes.medium,
            marginBottom: height * 0.01,
          }}
        >
          Preferences
        </Text>
        <View style={{ gap: 10 }}>
          {isPending ? (
            <>
              <SettingsSkeleton />
              <SettingsSkeleton />
              <SettingsSkeleton />
            </>
          ) : settingsErrorMessage || !userSettings ? (
            <Text
              style={{
                color: colors.textSecondary,
                fontWeight: FontWeights.semibold,
                fontSize: FontSizes.small,
              }}
            >
              {settingsErrorMessage || "Settings not found"}
            </Text>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => router.push("/settings/preferences/currency")}
                style={[
                  Styles.flexRow,
                  {
                    justifyContent: "space-between",
                  },
                ]}
              >
                <View
                  style={[
                    Styles.flexRow,
                    { width: "90%", justifyContent: "space-between" },
                  ]}
                >
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontWeight: FontWeights.bold,
                      fontSize: FontSizes.small,
                    }}
                  >
                    Currency
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontWeight: FontWeights.semibold,
                      fontSize: FontSizes.small,
                    }}
                  >
                    {userSettings?.currency.key} {"("}
                    {userSettings?.currency.name}
                    {")"}
                  </Text>
                </View>
                <ChevronRightIcon
                  width={20}
                  height={20}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/settings/preferences/timezone")}
                style={[
                  Styles.flexRow,
                  {
                    justifyContent: "space-between",
                  },
                ]}
              >
                <View
                  style={[
                    Styles.flexRow,
                    { width: "90%", justifyContent: "space-between" },
                  ]}
                >
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontWeight: FontWeights.bold,
                      fontSize: FontSizes.small,
                    }}
                  >
                    Timezone
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontWeight: FontWeights.semibold,
                      fontSize: FontSizes.small,
                    }}
                  >
                    {userSettings?.timezone.key.split("/")[0]}/
                    {userSettings?.timezone.name}
                  </Text>
                </View>
                <ChevronRightIcon
                  width={20}
                  height={20}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/settings/preferences/theme")}
                style={[
                  Styles.flexRow,
                  {
                    justifyContent: "space-between",
                  },
                ]}
              >
                <View
                  style={[
                    Styles.flexRow,
                    { width: "90%", justifyContent: "space-between" },
                  ]}
                >
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontWeight: FontWeights.bold,
                      fontSize: FontSizes.small,
                    }}
                  >
                    Theme
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontWeight: FontWeights.semibold,
                      fontSize: FontSizes.small,
                    }}
                  >
                    {themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}
                  </Text>
                </View>
                <ChevronRightIcon
                  width={20}
                  height={20}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View
        style={{
          width: width * SCREEN_WIDTH_RATIO,
          marginTop: height * 0.03,
        }}
      >
        <Text
          style={{
            color: colors.textPrimary,
            fontWeight: FontWeights.bold,
            fontSize: FontSizes.medium,
            marginBottom: height * 0.01,
          }}
        >
          Notifications
        </Text>
        <View style={{ gap: 10 }}>
          {isPending ? (
            <>
              <SettingsSkeleton />
              <SettingsSkeleton />
            </>
          ) : settingsErrorMessage || !userSettings ? (
            <Text
              style={{
                color: colors.textSecondary,
                fontWeight: FontWeights.semibold,
                fontSize: FontSizes.small,
              }}
            >
              {settingsErrorMessage || "Settings not found"}
            </Text>
          ) : (
            <>
              <View
                style={[
                  Styles.flexRow,
                  {
                    justifyContent: "space-between",
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontWeight: FontWeights.bold,
                    fontSize: FontSizes.small,
                  }}
                >
                  Push Notifications
                </Text>
                <ToggleSwitch
                  value={isPushNotificationsOn}
                  onValueChange={handlePushNotificationsToggle}
                  loading={pendingToggle === "push"}
                />
              </View>
              <View
                style={[
                  Styles.flexRow,
                  {
                    justifyContent: "space-between",
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontWeight: FontWeights.bold,
                    fontSize: FontSizes.small,
                  }}
                >
                  Email Notifications
                </Text>
                <ToggleSwitch
                  value={userSettings?.email_notifications_enabled ?? false}
                  onValueChange={handleEmailNotificationsToggle}
                  loading={isUpdateSettingsPending && pendingToggle === "email"}
                />
              </View>
            </>
          )}
        </View>
      </View>

      <View
        style={{
          width: width * SCREEN_WIDTH_RATIO,
          marginTop: height * 0.04,
        }}
      >
        <TouchableOpacity
          onPress={handleLogout}
          disabled={isSigningOut}
          style={{
            width: "100%",
            paddingVertical: 12,
            backgroundColor: "transparent",
            borderRadius: 6,
            borderWidth: 1,
            borderColor: colors.danger,
            alignItems: "center",
          }}
        >
          {isSigningOut ? (
            <ActivityIndicator color={colors.danger} />
          ) : (
            <Text
              style={{
                color: colors.danger,
                fontWeight: FontWeights.semibold,
              }}
            >
              Log out
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
