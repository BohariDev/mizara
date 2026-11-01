import { ConfigContext, ExpoConfig } from "expo/config";

// "123-abc.apps.googleusercontent.com" -> "com.googleusercontent.apps.123-abc"
const toIosUrlScheme = (clientId: string) =>
  `com.googleusercontent.apps.${clientId.replace(".apps.googleusercontent.com", "")}`;

const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

// Path to the Firebase config Android push needs: an EAS file env var on
// EAS builds, or ./google-services.json locally. Left out until Firebase is
// set up so the app still builds.
const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  android: {
    ...config.android,
    ...(googleServicesFile && { googleServicesFile }),
  },
  plugins: [
    ...(config.plugins ?? []),
    "expo-dev-client",
    // Without options the plugin expects Firebase config files. Given an
    // iosUrlScheme it only patches the iOS Info.plist, and Android needs no
    // config at all, so it is skipped until the iOS client ID is set.
    ...(googleIosClientId
      ? [
          [
            "@react-native-google-signin/google-signin",
            { iosUrlScheme: toIosUrlScheme(googleIosClientId) },
          ] as [string, { iosUrlScheme: string }],
        ]
      : []),
  ],
});
