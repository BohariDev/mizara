import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  googleSignInApi,
  logoutApi,
  signInApi,
  signUpApi,
} from "@/services/auth/api";
import { getGoogleIdToken, signOutOfGoogle } from "@/services/auth/google";
import {
  deleteAccessToken,
  deleteRefreshToken,
  getRefreshToken,
  saveAccessToken,
  saveRefreshToken,
} from "@/services/auth/token-storage";
import { unregisterPushToken } from "@/services/push-notification/register";
import { getErrorMessage } from "../get-error-message";

export const useSignIn = () => {
  const {
    mutate: signIn,
    isPending,
    isSuccess,
    error,
  } = useMutation({
    mutationFn: signInApi,
    onSuccess: async ({ data }) => {
      await saveAccessToken(data.accessToken);
      await saveRefreshToken(data.refreshToken);
    },
  });

  const errorMessage = getErrorMessage(error);

  return { signIn, isPending, isSuccess, errorMessage };
};

export const useGoogleSignIn = () => {
  const {
    mutate: googleSignIn,
    isPending,
    isSuccess,
    data,
    error,
  } = useMutation({
    mutationFn: async () => {
      const idToken = await getGoogleIdToken();

      // The user closed the Google account picker.
      if (!idToken) return null;

      return googleSignInApi({ id_token: idToken });
    },
    onSuccess: async (response) => {
      if (!response) return;

      await saveAccessToken(response.data.accessToken);
      await saveRefreshToken(response.data.refreshToken);
    },
  });

  const errorMessage = getErrorMessage(
    error,
    "Google sign-in failed. Please try again.",
  );

  return {
    googleSignIn,
    isPending,
    isSuccess: isSuccess && !!data,
    errorMessage,
  };
};

export const useSignOut = () => {
  const queryClient = useQueryClient();
  const {
    mutate: signOut,
    isPending,
    error,
  } = useMutation({
    mutationFn: async () => {
      // Needs the session, so it runs before logout. A failure must not
      // block signing out.
      await unregisterPushToken().catch(() => {});

      const refreshToken = await getRefreshToken();

      if (refreshToken) {
        await logoutApi({ refresh_token: refreshToken });
      }
    },
    onSettled: async () => {
      await deleteAccessToken();
      await deleteRefreshToken();
      // Shows the account picker again on the next Google sign-in.
      await signOutOfGoogle();
      queryClient.clear();
    },
  });

  const errorMessage = getErrorMessage(error);

  return { signOut, isPending, errorMessage };
};

export const useSignUp = () => {
  const {
    mutate: signUp,
    isPending,
    error,
  } = useMutation({
    mutationFn: signUpApi,
  });

  const errorMessage = getErrorMessage(error);

  return { signUp, isPending, errorMessage };
};
