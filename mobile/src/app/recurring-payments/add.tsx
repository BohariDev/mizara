import { useEffect, useState } from "react";
import {
  BackHandler,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ArrowLeftIcon from "@/assets/icons/arrow-left.svg";
import { useTypography } from "@/hooks/useTypography";
import { Styles } from "@/styles/stylesheets";
import { FontWeights } from "@/styles/typography";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { PaymentIcon } from "@/components/PaymentIcon";
import { RecurringPaymentPresetPicker } from "@/components/RecurringPaymentPresetPicker";
import { RecurringPaymentForm } from "@/components/RecurringPaymentForm";
import {
  SCREEN_PADDING_BOTTOM_RATIO,
  SCREEN_PADDING_TOP_RATIO,
  SCREEN_WIDTH_RATIO,
} from "@/constants/dimensions";
import type { CreateRecurringPaymentFormData } from "@/schemas/recurring-payment";
import { useCreateRecurringPayment } from "@/services/recurring-payment/hooks";
import type {
  CreateRecurringPaymentPayload,
  RecurringPaymentPreset,
} from "@/services/recurring-payment/types";
import { useUpsertReminderSettings } from "@/services/reminder-settings/hooks";

const EMPTY_FORM: CreateRecurringPaymentFormData = {
  name: "",
  type: undefined as unknown as CreateRecurringPaymentFormData["type"],
  description: "",
  amount: "",
  billing_cycle:
    undefined as unknown as CreateRecurringPaymentFormData["billing_cycle"],
  is_auto_renew: true,
  is_free_trial: false,
  due_date: undefined as unknown as Date,
  pricing_type: "Fixed",
  billing_date: undefined,
  billing_date_type: "Fixed",
  due_date_type: "Fixed",
  category: "",
  reminder_channels: [],
  reminder_remind_before_days: [],
};

/**
 * Pre-fills the form from a preset; every field can still be changed.
 */
const getDefaultValues = (
  preset: RecurringPaymentPreset | null,
  customName: string,
): CreateRecurringPaymentFormData => {
  if (!preset) return { ...EMPTY_FORM, name: customName };

  return {
    ...EMPTY_FORM,
    name: preset.name,
    type: preset.type,
    category: preset.category,
    billing_cycle: preset.default_billing_cycle,
    pricing_type: preset.default_pricing_type ?? EMPTY_FORM.pricing_type,
  };
};

export default function AddRecurringPayment() {
  const router = useRouter();
  const FontSizes = useTypography();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {
    createRecurringPayment,
    isPending: isCreating,
    errorMessage: createErrorMessage,
  } = useCreateRecurringPayment();
  const {
    upsertReminderSettings,
    isPending: isSavingReminders,
    errorMessage: reminderErrorMessage,
  } = useUpsertReminderSettings();

  // The user first picks a service (or "Custom"), then fills in the form.
  const [step, setStep] = useState<"pick" | "form">("pick");
  const [preset, setPreset] = useState<RecurringPaymentPreset | null>(null);
  const [customName, setCustomName] = useState("");

  const isPending = isCreating || isSavingReminders;
  const errorMessage = createErrorMessage ?? reminderErrorMessage;

  const onSelectPreset = (selected: RecurringPaymentPreset) => {
    setPreset(selected);
    setStep("form");
  };

  const onSelectCustom = (name: string) => {
    setPreset(null);
    setCustomName(name);
    setStep("form");
  };

  const onBack = () => {
    if (step === "form") setStep("pick");
    else router.back();
  };

  // Android's back button returns to the picker instead of leaving the screen.
  useEffect(() => {
    if (step !== "form") return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setStep("pick");
        return true;
      },
    );
    return () => subscription.remove();
  }, [step]);

  const onSubmit = (data: CreateRecurringPaymentFormData) => {
    const payload: CreateRecurringPaymentPayload = {
      name: data.name,
      type: data.type,
      description: data.description || undefined,
      amount: Number(data.amount),
      currency: "PHP",
      billing_cycle: data.billing_cycle,
      is_auto_renew: data.is_auto_renew,
      is_archived: false,
      is_free_trial: data.is_free_trial,
      due_date: data.due_date.toISOString(),
      pricing_type: data.pricing_type,
      billing_date:
        data.type === "Bills" ? data.billing_date?.toISOString() : undefined,
      billing_date_type: data.billing_date_type,
      due_date_type: data.due_date_type,
      category: data.category,
      icon: preset?.icon,
    };

    createRecurringPayment(payload, {
      onSuccess: ({ data: created }) => {
        upsertReminderSettings(
          {
            recurringPaymentId: created.id,
            payload: {
              is_enabled: true,
              channels: data.reminder_channels,
              remind_before_days: data.reminder_remind_before_days,
            },
          },
          {
            onSuccess: () => {
              showToast("Recurring payment added.");
              router.back();
            },
          },
        );
      },
    });
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={[
        Styles.container,
        {
          backgroundColor: colors.background,
          justifyContent: "flex-start",
          paddingTop: insets.top + height * SCREEN_PADDING_TOP_RATIO,
          paddingBottom: insets.bottom + height * SCREEN_PADDING_BOTTOM_RATIO,
        },
      ]}
    >
      <View
        style={[
          Styles.flexRow,
          {
            width: width * SCREEN_WIDTH_RATIO,
            gap: 10,
            justifyContent: "space-between",
            paddingBottom: height * 0.02,
          },
        ]}
      >
        <TouchableOpacity style={{ width: 24 }} onPress={onBack}>
          <ArrowLeftIcon color={colors.textPrimary} />
        </TouchableOpacity>
        <Text
          style={{
            color: colors.textPrimary,
            fontWeight: FontWeights.bold,
            fontSize: FontSizes.large,
          }}
        >
          Add Recurring Payment
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {step === "pick" ? (
        <>
          <View
            style={{
              width: width * SCREEN_WIDTH_RATIO,
              gap: 4,
              marginBottom: height * 0.015,
            }}
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: FontSizes.large,
                fontWeight: FontWeights.bold,
              }}
            >
              Choose a service
            </Text>
            <Text
              style={{ color: colors.textSecondary, fontSize: FontSizes.small }}
            >
              Pick one to fill in the details, or add a custom payment.
            </Text>
          </View>
          <RecurringPaymentPresetPicker
            onSelectPreset={onSelectPreset}
            onSelectCustom={onSelectCustom}
          />
        </>
      ) : (
        <>
          <SelectedServiceRow
            preset={preset}
            onChange={() => setStep("pick")}
          />
          <RecurringPaymentForm
            defaultValues={getDefaultValues(preset, customName)}
            onSubmit={onSubmit}
            isPending={isPending}
            errorMessage={errorMessage}
            resetLabel="Clear"
          />
        </>
      )}
    </KeyboardAwareScrollView>
  );
}

/** Shows which service the form was filled from, with a way to pick again. */
function SelectedServiceRow({
  preset,
  onChange,
}: {
  preset: RecurringPaymentPreset | null;
  onChange: () => void;
}) {
  const FontSizes = useTypography();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  return (
    <View
      style={[
        Styles.flexRow,
        {
          width: width * SCREEN_WIDTH_RATIO,
          gap: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          backgroundColor: colors.surface,
        },
      ]}
    >
      <PaymentIcon
        icon={preset?.icon}
        name={preset?.name ?? "Custom"}
        size={36}
      />
      <Text
        style={{
          flex: 1,
          color: colors.textPrimary,
          fontSize: FontSizes.medium,
          fontWeight: FontWeights.semibold,
        }}
        numberOfLines={1}
      >
        {preset?.name ?? "Custom payment"}
      </Text>
      <TouchableOpacity onPress={onChange} hitSlop={8}>
        <Text
          style={{
            color: colors.primary,
            fontSize: FontSizes.small,
            fontWeight: FontWeights.semibold,
          }}
        >
          Change
        </Text>
      </TouchableOpacity>
    </View>
  );
}
