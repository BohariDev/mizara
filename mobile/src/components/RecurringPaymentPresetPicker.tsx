import { useMemo, useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

import PlusIcon from "@/assets/icons/plus.svg";
import { PaymentIcon } from "@/components/PaymentIcon";
import { SearchBar } from "@/components/SearchBar";
import { Skeleton } from "@/components/Skeleton";
import {
  SCREEN_PADDING_BOTTOM_RATIO,
  SCREEN_WIDTH_RATIO,
} from "@/constants/dimensions";
import { useTheme } from "@/contexts/ThemeContext";
import { useTypography } from "@/hooks/useTypography";
import { useRecurringPaymentPresets } from "@/services/recurring-payment/hooks";
import type {
  RecurringPaymentPreset,
  RecurringPaymentType,
} from "@/services/recurring-payment/types";
import { FontWeights } from "@/styles/typography";

const COLUMNS = 4;
const GAP = 12;

const FILTERS: { label: string; value: RecurringPaymentType | null }[] = [
  { label: "All", value: null },
  { label: "Subscriptions", value: "Subscription" },
  { label: "Bills", value: "Bills" },
];

// "Disney+", "disney plus" and "DisneyPlus" should all match.
const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/[^a-z0-9]/g, "");

const matchesSearch = (preset: RecurringPaymentPreset, query: string) =>
  [preset.name, ...preset.aliases].some((text) =>
    normalize(text).includes(query),
  );

type RecurringPaymentPresetPickerProps = {
  onSelectPreset: (preset: RecurringPaymentPreset) => void;
  /** Called with the search text (may be empty) to use as the custom name. */
  onSelectCustom: (name: string) => void;
};

/** Grid of predefined subscriptions and bills, plus a "Custom" option. */
export function RecurringPaymentPresetPicker({
  onSelectPreset,
  onSelectCustom,
}: RecurringPaymentPresetPickerProps) {
  const FontSizes = useTypography();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const { presets, isPending, errorMessage, refetch } =
    useRecurringPaymentPresets();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RecurringPaymentType | null>(null);

  const contentWidth = width * SCREEN_WIDTH_RATIO;
  const tileWidth = (contentWidth - GAP * (COLUMNS - 1)) / COLUMNS;
  const iconSize = Math.min(tileWidth - 16, 64);

  const query = normalize(search);
  const visiblePresets = useMemo(
    () =>
      presets.filter(
        (preset) =>
          (filter === null || preset.type === filter) &&
          (query === "" || matchesSearch(preset, query)),
      ),
    [presets, filter, query],
  );

  const tileLabelStyle = {
    color: colors.textPrimary,
    fontSize: FontSizes.tiny,
    textAlign: "center" as const,
    marginTop: 6,
  };

  return (
    <ScrollView
      contentContainerStyle={{
        width: contentWidth,
        gap: 14,
        paddingBottom: height * SCREEN_PADDING_BOTTOM_RATIO,
      }}
    >
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search e.g. Netflix, Meralco"
      />

      <View style={{ flexDirection: "row", gap: 8 }}>
        {FILTERS.map(({ label, value }) => {
          const isActive = filter === value;
          return (
            <TouchableOpacity
              key={label}
              onPress={() => setFilter(value)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 14,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: isActive ? colors.primary : colors.border,
                backgroundColor: isActive ? colors.infoBg : colors.surface,
              }}
            >
              <Text
                style={{
                  color: isActive ? colors.primary : colors.textSecondary,
                  fontSize: FontSizes.small,
                  fontWeight: isActive
                    ? FontWeights.semibold
                    : FontWeights.regular,
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {errorMessage && (
        <TouchableOpacity onPress={() => refetch()}>
          <Text style={{ color: colors.danger, fontSize: FontSizes.small }}>
            Couldn&apos;t load services. Tap to retry, or add a custom payment.
          </Text>
        </TouchableOpacity>
      )}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
        {/* Custom is always first, so it's reachable even while loading. */}
        <TouchableOpacity
          onPress={() => onSelectCustom(search.trim())}
          style={{ width: tileWidth, alignItems: "center" }}
          accessibilityLabel="Add a custom payment"
        >
          <View
            style={{
              width: iconSize,
              height: iconSize,
              borderRadius: iconSize * 0.24,
              borderWidth: 1.5,
              borderStyle: "dashed",
              borderColor: colors.textMuted,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PlusIcon color={colors.textSecondary} width={22} height={22} />
          </View>
          <Text style={tileLabelStyle} numberOfLines={2}>
            Custom
          </Text>
        </TouchableOpacity>

        {isPending
          ? Array.from({ length: 11 }, (_, index) => (
              <View
                key={index}
                style={{ width: tileWidth, alignItems: "center" }}
              >
                <Skeleton
                  width={iconSize}
                  height={iconSize}
                  borderRadius={iconSize * 0.24}
                />
                <Skeleton
                  width={tileWidth * 0.7}
                  height={10}
                  style={{ marginTop: 8 }}
                />
              </View>
            ))
          : visiblePresets.map((preset) => (
              <TouchableOpacity
                key={preset.slug}
                onPress={() => onSelectPreset(preset)}
                style={{ width: tileWidth, alignItems: "center" }}
              >
                <PaymentIcon
                  icon={preset.icon}
                  name={preset.name}
                  size={iconSize}
                />
                <Text style={tileLabelStyle} numberOfLines={2}>
                  {preset.name}
                </Text>
              </TouchableOpacity>
            ))}
      </View>

      {!isPending && query !== "" && visiblePresets.length === 0 && (
        <TouchableOpacity onPress={() => onSelectCustom(search.trim())}>
          <Text
            style={{ color: colors.textSecondary, fontSize: FontSizes.small }}
          >
            No matches.{" "}
            <Text
              style={{
                color: colors.primary,
                fontWeight: FontWeights.semibold,
              }}
            >
              Add &quot;{search.trim()}&quot; as a custom payment
            </Text>
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
