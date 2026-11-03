import { useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";

import { getAssetUrl } from "@/utils/asset";
import { FontWeights } from "@/styles/typography";

// Background colours for the initials fallback; white text reads on all of them.
const FALLBACK_COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#F97316",
  "#10B981",
  "#0EA5E9",
  "#6366F1",
  "#14B8A6",
];

const getInitials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    words.length > 1
      ? words[0][0] + words[1][0]
      : (words[0] ?? "?").slice(0, 2);
  return initials.toUpperCase();
};

// Same name -> same colour, so a payment keeps its colour across screens.
const getFallbackColor = (name: string) => {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
};

type PaymentIconProps = {
  /** Asset key (e.g. "presets/netflix.webp"), full URL, or null. */
  icon: string | null | undefined;
  /** Used for the initials fallback. */
  name: string;
  size?: number;
};

/**
 * A payment's logo as a rounded square. Falls back to coloured initials when
 * there's no icon or it fails to load (e.g. offline before it was cached).
 */
export const PaymentIcon = ({ icon, name, size = 40 }: PaymentIconProps) => {
  const uri = getAssetUrl(icon);
  // Remember which URL failed, so a new icon gets a fresh attempt.
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const borderRadius = size * 0.24;

  if (uri && uri !== failedUri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius }}
        contentFit="cover"
        cachePolicy="disk"
        transition={150}
        accessibilityLabel={name}
        onError={() => setFailedUri(uri)}
      />
    );
  }

  return (
    <View
      accessibilityLabel={name}
      style={{
        width: size,
        height: size,
        borderRadius,
        backgroundColor: getFallbackColor(name),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: "white",
          fontWeight: FontWeights.bold,
          fontSize: size * 0.38,
        }}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
};
