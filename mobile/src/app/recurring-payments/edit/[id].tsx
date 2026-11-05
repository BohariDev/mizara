import { Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ArrowLeftIcon from "@/assets/icons/arrow-left.svg";
import { useTypography } from "@/hooks/useTypography";
import { Styles } from "@/styles/stylesheets";
import { FontWeights } from "@/styles/typography";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { RecurringPaymentForm } from "@/components/RecurringPaymentForm";
import { RecurringPaymentFormSkeleton } from "@/components/Skeleton";
import {
  SCREEN_PADDING_BOTTOM_RATIO,
  SCREEN_PADDING_TOP_RATIO,
  SCREEN_WIDTH_RATIO,
} from "@/constants/dimensions";
import type { CreateRecurringPaymentFormData } from "@/schemas/recurring-payment";
import {
  useRecurringPayment,
  useUpdateRecurringPayment,
} from "@/services/recurring-payment/hooks";
import type { UpdateRecurringPaymentPayload } from "@/services/recurring-payment/types";
import {
  useReminderSettings,
  useUpsertReminderSettings,
} from "@/services/reminder-settings/hooks";

export default function EditRecurringPayment() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const FontSizes = useTypography();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {
    recurringPayment,
    isPending: isPaymentLoading,
    errorMessage: loadErrorMessage,
  } = useRecurringPayment(id);
  const { reminderSettings, isPending: isReminderLoading } =
    useReminderSettings(id);
  const {
    updateRecurringPayment,
    isPending: isUpdating,
    errorMessage: updateErrorMessage,
  } = useUpdateRecurringPayment();
  const {
    upsertReminderSettings,
    isPending: isSavingReminders,
    errorMessage: upsertReminderErrorMessage,
  } = useUpsertReminderSettings();

  const isLoading = isPaymentLoading || isReminderLoading;
  const isPending = isUpdating || isSavingReminders;
  const errorMessage = updateErrorMessage ?? upsertReminderErrorMessage;

  const onSubmit = (data: CreateRecurringPaymentFormData) => {
    const payload: UpdateRecurringPaymentPayload = {
      name: data.name,
      type: data.type,
      description: data.description ?? "",
      amount: Number(data.amount),
      billing_cycle: data.billing_cycle,
      is_auto_renew: data.is_auto_renew,
      is_free_trial: data.is_free_trial,
      due_date: data.due_date.toISOString(),
      pricing_type: data.pricing_type,
      billing_date:
        data.type === "Bills" ? data.billing_date?.toISOString() : undefined,
      billing_date_type: data.billing_date_type,
      due_date_type: data.due_date_type,
      category: data.category,
    };

    updateRecurringPayment(
      { id, payload },
      {
        onSuccess: () => {
          upsertReminderSettings(
            {
              recurringPaymentId: id,
              payload: {
                is_enabled: true,
                channels: data.reminder_channels,
                remind_before_days: data.reminder_remind_before_days,
              },
            },
            {
              onSuccess: () => {
                showToast("Recurring payment updated.");
                router.back();
              },
            },
          );
        },
      },
    );
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
        <TouchableOpacity style={{ width: 24 }} onPress={() => router.back()}>
          <ArrowLeftIcon color={colors.textPrimary} />
        </TouchableOpacity>
        <Text
          style={{
            color: colors.textPrimary,
            fontWeight: FontWeights.bold,
            fontSize: FontSizes.large,
          }}
        >
          Edit Recurring Payment
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={{ width: width * SCREEN_WIDTH_RATIO }}>
          <RecurringPaymentFormSkeleton />
        </View>
      ) : loadErrorMessage || !recurringPayment ? (
        <Text
          style={{
            color: colors.danger,
            fontWeight: FontWeights.medium,
            fontSize: FontSizes.small,
            textAlign: "center",
            marginTop: 20,
          }}
        >
          {loadErrorMessage ?? "Recurring payment not found."}
        </Text>
      ) : (
        <RecurringPaymentForm
          defaultValues={{
            name: recurringPayment.name,
            type: recurringPayment.type,
            description: recurringPayment.description ?? "",
            amount: String(Number(recurringPayment.amount)),
            billing_cycle: recurringPayment.billing_cycle,
            is_auto_renew: recurringPayment.is_auto_renew,
            is_free_trial: recurringPayment.is_free_trial,
            due_date: new Date(recurringPayment.due_date),
            pricing_type: recurringPayment.pricing_type,
            billing_date: recurringPayment.billing_date
              ? new Date(recurringPayment.billing_date)
              : undefined,
            billing_date_type: recurringPayment.billing_date_type,
            due_date_type: recurringPayment.due_date_type,
            category: recurringPayment.category ?? "",
            reminder_channels: reminderSettings?.channels ?? [],
            reminder_remind_before_days: reminderSettings?.remind_before_days ?? [],
          }}
          onSubmit={onSubmit}
          isPending={isPending}
          errorMessage={errorMessage}
          resetLabel="Reset"
          variant="sections"
        />
      )}
    </KeyboardAwareScrollView>
  );
}
