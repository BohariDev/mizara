export const EXPO_CLIENT = Symbol('EXPO_CLIENT');

// Must match the Android notification channel the mobile app creates.
export const ANDROID_CHANNEL_ID = 'reminders';

// Expo recommends waiting before fetching receipts, and keeps them for a day.
export const RECEIPT_CHECK_DELAY_MINUTES = 15;
export const RECEIPT_RETENTION_HOURS = 24;
