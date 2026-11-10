import { ConfigContext, ExpoConfig } from "expo/config";

// "123-abc.apps.googleusercontent.com" -> "com.googleusercontent.apps.123-abc"
const toIosUrlScheme = (clientId: string) =>
  `com.googleusercontent.apps.${clientId.replace(".apps.googleusercontent.com", "")}`;

const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

// Path to the Firebase config Android push needs: an EAS file env var on
// EAS builds, or ./google-services.json locally. Left out until Firebase is
// set up so the app still builds.
const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;

// Set per build profile in eas.json so dev, preview and production builds get
// their own app ID, name and URL scheme and can be installed side by side.
// Unset (e.g. a plain `expo start`) means production.
type AppVariant = "development" | "preview" | "production";
const appVariant = (process.env.APP_VARIANT ?? "production") as AppVariant;

const variants: Record<AppVariant, { idSuffix: string; nameSuffix: string }> = {
  development: { idSuffix: ".dev", nameSuffix: " (Dev)" },
  preview: { idSuffix: ".preview", nameSuffix: " (Preview)" },
  production: { idSuffix: "", nameSuffix: "" },
};
const { idSuffix, nameSuffix } = variants[appVariant] ?? variants.production;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  name: `${config.name}${nameSuffix}`,
  // "mobileapp" -> "mobileapp-dev", so deep links open the right install.
  scheme: idSuffix ? `${config.scheme}-${idSuffix.slice(1)}` : config.scheme,
  ios: {
    ...config.ios,
    bundleIdentifier: `${config.ios?.bundleIdentifier}${idSuffix}`,
  },
  android: {
    ...config.android,
    package: `${config.android?.package}${idSuffix}`,
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
