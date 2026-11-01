import * as SecureStore from "expo-secure-store";

const PUSH_TOKEN_KEY = "pushToken";

export const savePushToken = (token: string) =>
  SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);

export const getPushToken = () => SecureStore.getItemAsync(PUSH_TOKEN_KEY);

export const deletePushToken = () => SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
