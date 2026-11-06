import { View, useWindowDimensions } from "react-native";
import { useWatch } from "react-hook-form";

import { SCREEN_WIDTH_RATIO } from "@/constants/dimensions";
import { useTheme } from "@/contexts/ThemeContext";
import {
  RECURRING_PAYMENT_BILLING_CYCLES,
  RECURRING_PAYMENT_BILLING_DATE_TYPES,
  RECURRING_PAYMENT_BILLING_DATE_TYPE_DESCRIPTIONS,
  RECURRING_PAYMENT_DUE_DATE_TYPES,
  RECURRING_PAYMENT_DUE_DATE_TYPE_DESCRIPTIONS,
  RECURRING_PAYMENT_PRICING_TYPES,
  RECURRING_PAYMENT_PRICING_TYPE_DESCRIPTIONS,
  RECURRING_PAYMENT_TYPES,
  REMINDER_CHANNELS,
  REMINDER_CHANNEL_LABELS,
  REMINDER_OFFSET_DAYS,
  REMINDER_OFFSET_DAY_LABELS,
  type CreateRecurringPaymentFormData,
} from "@/schemas/recurring-payment";
import { useRecurringPaymentCategories } from "@/services/recurring-payment/hooks";
import { Styles } from "@/styles/stylesheets";
import {
  CheckboxGroupField,
  DateField,
  SelectInputField,
  TextField,
  ToggleField,
  toOptions,
  type FieldName,
} from "./fields";

function BasicsSection() {
  const { categories } = useRecurringPaymentCategories();

  return (
    <>
      <TextField name="name" label="Name" required placeholder="e.g. Netflix" />

      <SelectInputField
        name="type"
        label="Type"
        required
        placeholder="Select type"
        options={toOptions(RECURRING_PAYMENT_TYPES)}
      />

      {categories.length > 0 && (
        <SelectInputField
          name="category"
          label="Category"
          required
          placeholder="Select category"
          options={categories.map((category) => ({
            label: category.name,
            value: category.id,
          }))}
        />
      )}

      <TextField
        name="description"
        label="Description (optional)"
        placeholder="e.g. Family plan subscription"
        autoCapitalize="sentences"
      />
    </>
  );
}

function PaymentDetailsSection() {
  const { width } = useWindowDimensions();
  const type = useWatch<CreateRecurringPaymentFormData>({ name: "type" });
  const isBill = type === "Bills";

  return (
    <>
      {isBill && (
        <SelectInputField
          name="pricing_type"
          label="Pricing type"
          required
          placeholder="Select pricing type"
          hint="Does the amount stay the same every cycle?"
          options={toOptions(
            RECURRING_PAYMENT_PRICING_TYPES,
            RECURRING_PAYMENT_PRICING_TYPE_DESCRIPTIONS,
          )}
        />
      )}
      <TextField
        name="amount"
        label="Amount"
        required
        placeholder="0.00"
        keyboardType="numeric"
      />

      {isBill && (
        <>
          <SelectInputField
            name="billing_date_type"
            label="Billing date type"
            required
            placeholder="Select billing date type"
            hint="Is the bill issued on the same day every cycle?"
            options={toOptions(
              RECURRING_PAYMENT_BILLING_DATE_TYPES,
              RECURRING_PAYMENT_BILLING_DATE_TYPE_DESCRIPTIONS,
            )}
          />
          <DateField
            name="billing_date"
            label="Billing date"
            required
            placeholder="Select billing date"
            withTime
          />
        </>
      )}

      <SelectInputField
        name="billing_cycle"
        label="Billing cycle"
        required
        placeholder="Select billing cycle"
        options={toOptions(RECURRING_PAYMENT_BILLING_CYCLES)}
      />

      {isBill && (
        <SelectInputField
          name="due_date_type"
          label="Due date type"
          required
          placeholder="Select due date type"
          hint="Is the bill due on the same day every cycle?"
          options={toOptions(
            RECURRING_PAYMENT_DUE_DATE_TYPES,
            RECURRING_PAYMENT_DUE_DATE_TYPE_DESCRIPTIONS,
          )}
        />
      )}

      <DateField
        name="due_date"
        label="Due date"
        required
        placeholder="Select date"
        withTime
      />

      <View
        style={[
          Styles.flexColumn,
          { width: width * SCREEN_WIDTH_RATIO, gap: 5 },
        ]}
      >
        <ToggleField name="is_auto_renew" label="Auto-renew" />
        <ToggleField name="is_free_trial" label="Free trial" />
      </View>
    </>
  );
}

function RemindersSection() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  return (
    <View
      style={{
        width: width * SCREEN_WIDTH_RATIO,
        gap: 16,
        padding: 15,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        backgroundColor: colors.surface,
      }}
    >
      <CheckboxGroupField
        name="reminder_channels"
        label="Notification Channels"
        options={REMINDER_CHANNELS}
        labels={REMINDER_CHANNEL_LABELS}
      />
      <CheckboxGroupField
        name="reminder_remind_before_days"
        label="Remind me"
        options={REMINDER_OFFSET_DAYS}
        labels={REMINDER_OFFSET_DAY_LABELS}
      />
    </View>
  );
}

/**
 * The form's sections, in order. The wizard shows one per step and validates
 * its `fields` before moving on; the edit page shows them all at once.
 */
export const SECTIONS: {
  title: string;
  subtitle: string;
  fields: FieldName[];
  Content: () => React.JSX.Element;
}[] = [
  {
    title: "Basics",
    subtitle: "Tell us what this payment is for.",
    fields: ["name", "type", "category", "description"],
    Content: BasicsSection,
  },
  {
    title: "Payment Details",
    subtitle: "Set how much and how often you pay.",
    fields: [
      "pricing_type",
      "amount",
      "billing_date_type",
      "billing_date",
      "billing_cycle",
      "due_date_type",
      "due_date",
      "is_auto_renew",
      "is_free_trial",
    ],
    Content: PaymentDetailsSection,
  },
  {
    title: "Reminders",
    subtitle: "Choose how and when we remind you.",
    fields: ["reminder_channels", "reminder_remind_before_days"],
    Content: RemindersSection,
  },
];
