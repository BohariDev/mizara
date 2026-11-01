import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";

import {
  registerPushTokenApi,
  unregisterPushTokenApi,
} from "@/services/push-notification/api";
import {
  deletePushToken,
  getPushToken,
  savePushToken,
} from "@/services/push-notification/token-storage";

// Must match ANDROID_CHANNEL_ID on the backend.
const ANDROID_CHANNEL_ID = "reminders";

// Show pushes as banners even while the app is open.
export const configureNotificationHandler = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
};

const getExpoPushToken = async (requestPermission: boolean) => {
  // Android 13+ only shows the permission prompt once a channel exists.
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "Payment reminders",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  let { granted } = await Notifications.getPermissionsAsync();

  if (!granted && requestPermission) {
    ({ granted } = await Notifications.requestPermissionsAsync());
  }

  if (!granted) return null;

  const { data } = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });

  return data;
};

// Returns whether this device can now receive pushes. Without
// requestPermission it never prompts - it only refreshes the token when
// permission was already granted.
export const registerPushToken = async ({
  requestPermission,
}: {
  requestPermission: boolean;
}) => {
  const token = await getExpoPushToken(requestPermission);

  if (!token) return false;

  await registerPushTokenApi({
    token,
    platform: Platform.OS === "ios" ? "ios" : "android",
  });
  await savePushToken(token);

  return true;
};

// Stops this device from receiving the signed-out account's pushes.
export const unregisterPushToken = async () => {
  const token = await getPushToken();

  if (!token) return;

  try {
    await unregisterPushTokenApi({ token });
  } finally {
    await deletePushToken();
  }
};
