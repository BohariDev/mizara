import { Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useWatch } from "react-hook-form";

import { SCREEN_WIDTH_RATIO } from "@/constants/dimensions";
import { useTheme } from "@/contexts/ThemeContext";
import { useTypography } from "@/hooks/useTypography";
import {
  REMINDER_CHANNELS,
  REMINDER_CHANNEL_LABELS,
  REMINDER_OFFSET_DAYS,
  REMINDER_OFFSET_DAY_LABELS,
  type CreateRecurringPaymentFormData,
} from "@/schemas/recurring-payment";
import { useRecurringPaymentCategories } from "@/services/recurring-payment/hooks";
import { Styles } from "@/styles/stylesheets";
import { FontWeights } from "@/styles/typography";
import { formatAmount, formatDueDate } from "@/utils/recurring-payment";
import { SECTIONS } from "./sections";

type Row = { label: string; value?: string };

const formatDate = (date?: Date) =>
  date ? formatDueDate(date.toISOString()) : undefined;

const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const yesNo = (value: boolean) => (value ? "Yes" : "No");

/** Joins the labels of the selected options, in display order. */
const joinSelected = <V extends string | number>(
  options: readonly V[],
  selected: readonly V[],
  labels: Record<V, string>,
) =>
  options
    .filter((option) => selected.includes(option))
    .map((option) => labels[option])
    .join(", ");

export function ReviewStep({
  onEditSection,
}: {
  onEditSection: (sectionIndex: number) => void;
}) {
  const { categories } = useRecurringPaymentCategories();
  const values = useWatch<CreateRecurringPaymentFormData>();
  const isBill = values.type === "Bills";

  // One list of rows per section, in the same order as SECTIONS.
  const rowsBySection: Row[][] = [
    [
      { label: "Name", value: values.name },
      { label: "Type", value: values.type },
      {
        label: "Category",
        value: categories.find((c) => c.id === values.category)?.name,
      },
      { label: "Description", value: values.description },
    ],
    [
      { label: "Amount", value: formatAmount(values.amount ?? "") },
      { label: "Pricing type", value: isBill ? values.pricing_type : undefined },
      { label: "Billing cycle", value: values.billing_cycle },
      {
        label: "Due date",
        value:
          values.due_date &&
          `${formatDate(values.due_date)}, ${formatTime(values.due_date)}`,
      },
      {
        label: "Due date type",
        value: isBill ? values.due_date_type : undefined,
      },
      {
        label: "Billing date",
        value: isBill ? formatDate(values.billing_date) : undefined,
      },
      {
        label: "Billing date type",
        value: isBill ? values.billing_date_type : undefined,
      },
      { label: "Auto-renew", value: yesNo(!!values.is_auto_renew) },
      { label: "Free trial", value: yesNo(!!values.is_free_trial) },
    ],
    [
      {
        label: "Channels",
        value: joinSelected(
          REMINDER_CHANNELS,
          values.reminder_channels ?? [],
          REMINDER_CHANNEL_LABELS,
        ),
      },
      {
        label: "Remind me",
        value: joinSelected(
          REMINDER_OFFSET_DAYS,
          values.reminder_remind_before_days ?? [],
          REMINDER_OFFSET_DAY_LABELS,
        ),
      },
    ],
  ];

  return (
    <>
      {SECTIONS.map((section, index) => (
        <ReviewCard
          key={section.title}
          title={section.title}
          rows={rowsBySection[index].filter((row) => row.value)}
          onEdit={() => onEditSection(index)}
        />
      ))}
    </>
  );
}

function ReviewCard({
  title,
  rows,
  onEdit,
}: {
  title: string;
  rows: Row[];
  onEdit: () => void;
}) {
  const { colors } = useTheme();
  const FontSizes = useTypography();
  const { width } = useWindowDimensions();

  return (
    <View
      style={{
        width: width * SCREEN_WIDTH_RATIO,
        gap: 10,
        padding: 15,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        backgroundColor: colors.surface,
      }}
    >
      <View style={[Styles.flexRow, { justifyContent: "space-between" }]}>
        <Text
          style={{
            color: colors.textPrimary,
            fontWeight: FontWeights.bold,
            fontSize: FontSizes.medium,
          }}
        >
          {title}
        </Text>
        <TouchableOpacity onPress={onEdit} hitSlop={8}>
          <Text
            style={{
              color: colors.primary,
              fontWeight: FontWeights.semibold,
              fontSize: FontSizes.small,
            }}
          >
            Edit
          </Text>
        </TouchableOpacity>
      </View>

      {rows.map((row) => (
        <View
          key={row.label}
          style={[
            Styles.flexRow,
            { justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
          ]}
        >
          <Text style={{ color: colors.textSecondary, fontSize: FontSizes.small }}>
            {row.label}
          </Text>
          <Text
            style={{
              flex: 1,
              textAlign: "right",
              color: colors.textPrimary,
              fontWeight: FontWeights.medium,
              fontSize: FontSizes.small,
            }}
          >
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
