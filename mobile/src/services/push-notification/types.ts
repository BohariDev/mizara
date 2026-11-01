import type { NotificationType } from "@/services/notification/types";

export type PushPlatform = "android" | "ios";

export type RegisterPushTokenPayload = {
  token: string;
  platform: PushPlatform;
};

export type UnregisterPushTokenPayload = {
  token: string;
};

export type PushTokenResponse = {
  message: string;
};

// Sent by the backend with every push so a tap can open the right screen.
export type PushNotificationData = {
  notification_id?: string;
  recurring_payment_id?: string | null;
  type?: NotificationType;
};
