import { useEffect } from "react";
import { AppState } from "react-native";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";

import { registerPushToken } from "@/services/push-notification/register";
import { useMarkNotificationAsRead } from "@/services/notification/hooks";
import { PushNotificationData } from "./types";

// Mounted once for signed-in users: keeps this device's token current,
// refreshes the feed when a push arrives, and opens the screen a tapped
// push points to.
export const usePushNotifications = () => {
  const queryClient = useQueryClient();
  const { markNotificationAsRead } = useMarkNotificationAsRead();
  // Also returns the tap that launched the app from a killed state.
  const lastResponse = Notifications.useLastNotificationResponse();

  // Never prompts - the permission prompt only comes from turning push on
  // in settings.
  useEffect(() => {
    registerPushToken({ requestPermission: false }).catch(() => {});
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(() => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count"],
      });
    });

    return () => subscription.remove();
  }, [queryClient]);

  useEffect(() => {
    if (
      !lastResponse ||
      lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      return;
    }

    // Cleared so a remount (e.g. signing in again) doesn't replay the tap.
    Notifications.clearLastNotificationResponse();

    const data = lastResponse.notification.request.content
      .data as PushNotificationData;

    if (data.notification_id) {
      markNotificationAsRead(data.notification_id);
    }

    if (data.recurring_payment_id) {
      router.push({
        pathname: "/recurring-payments/[id]",
        params: { id: data.recurring_payment_id },
      });
    } else {
      router.push("/notifications");
    }
  }, [lastResponse, markNotificationAsRead]);
};

// The OS permission can change in system settings at any time, so check
// again whenever the app comes back to the foreground.
export const usePushPermission = () => {
  const { data, refetch } = useQuery({
    queryKey: ["push-permission"],
    queryFn: () => Notifications.getPermissionsAsync(),
  });

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refetch();
      }
    });

    return () => subscription.remove();
  }, [refetch]);

  return { isGranted: data?.granted ?? false, refresh: refetch };
};
