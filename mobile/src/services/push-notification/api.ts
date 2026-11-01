import { api } from "@/services/api-client";
import {
  PushTokenResponse,
  RegisterPushTokenPayload,
  UnregisterPushTokenPayload,
} from "./types";

export const registerPushTokenApi = async (
  payload: RegisterPushTokenPayload,
) => {
  const { data } = await api.post<PushTokenResponse>(
    "/push-notification/token",
    payload,
  );
  return data;
};

export const unregisterPushTokenApi = async (
  payload: UnregisterPushTokenPayload,
) => {
  const { data } = await api.delete<PushTokenResponse>(
    "/push-notification/token",
    { data: payload },
  );
  return data;
};
