import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ArrowLeftIcon from "@/assets/icons/arrow-left.svg";
import InfoIcon from "@/assets/icons/info.svg";
import SquarePenIcon from "@/assets/icons/square-pen.svg";
import TriangleAlertIcon from "@/assets/icons/triangle-alert.svg";
import { useTypography } from "@/hooks/useTypography";
import { useRefresh } from "@/hooks/useRefresh";
import { Styles } from "@/styles/stylesheets";
import { FontWeights } from "@/styles/typography";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import {
  SCREEN_PADDING_BOTTOM_RATIO,
  SCREEN_PADDING_TOP_RATIO,
  SCREEN_WIDTH_RATIO,
} from "@/constants/dimensions";
import { Badge, Variant } from "@/components/Badge";
import { RecurringPaymentDetailSkeleton } from "@/components/Skeleton";
import { ConfirmBillingCycleModal } from "@/components/ConfirmBillingCycleModal";
import { InfoModal } from "@/components/InfoModal";
import { PaymentIcon } from "@/components/PaymentIcon";
import {
  useDeleteRecurringPayment,
  useRecurringPayment,
  useRecurringPaymentCategories,
  useUpdateRecurringPayment,
} from "@/services/recurring-payment/hooks";
import { useReminderSettings } from "@/services/reminder-settings/hooks";
import {
  RECURRING_PAYMENT_BILLING_DATE_TYPE_DESCRIPTIONS,
  RECURRING_PAYMENT_DUE_DATE_TYPE_DESCRIPTIONS,
  RECURRING_PAYMENT_PRICING_TYPE_DESCRIPTIONS,
  REMINDER_CHANNEL_LABELS,
  REMINDER_OFFSET_DAY_LABELS,
} from "@/schemas/recurring-payment";
import {
  formatAmount,
  formatDueDate,
  formatDueStatus,
  getDueStatusColor,
  isCycleConfirmationReady,
} from "@/utils/recurring-payment";

export default function RecurringPaymentDetails() {
  const router = useRouter();
  const { id, confirm } = useLocalSearchParams<{
    id: string;
    confirm?: string;
  }>();
  const FontSizes = useTypography();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { categories } = useRecurringPaymentCategories();
  const {
    recurringPayment,
    isPending,
    errorMessage,
    refetch: refetchRecurringPayment,
  } = useRecurringPayment(id);
  const { reminderSettings, refetch: refetchReminderSettings } =
    useReminderSettings(id);
  const { isRefreshing, onRefresh } = useRefresh([
    refetchRecurringPayment,
    refetchReminderSettings,
  ]);
  const {
    updateRecurringPayment,
    isPending: isUpdating,
    errorMessage: updateErrorMessage,
  } = useUpdateRecurringPayment();
  const {
    deleteRecurringPayment,
    isPending: isDeleting,
    errorMessage: deleteErrorMessage,
  } = useDeleteRecurringPayment();

  const [showConfirmCycleModal, setShowConfirmCycleModal] = useState(false);
  const [isAutoOpenDismissed, setIsAutoOpenDismissed] = useState(false);
  const [openHint, setOpenHint] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const needsCycleConfirmation =
    !!recurringPayment && isCycleConfirmationReady(recurringPayment);
  // Rolled over but the billing date hasn't arrived - dates are a guess.
  const hasExpectedDates =
    !!recurringPayment?.needs_cycle_confirmation &&
    !recurringPayment.is_archived &&
    !needsCycleConfirmation;
  const expectedSuffix = hasExpectedDates ? " (expected)" : "";

  // Opened from the home prompt - go straight to the confirmation sheet.
  const isConfirmCycleModalOpen =
    showConfirmCycleModal ||
    (confirm === "1" && needsCycleConfirmation && !isAutoOpenDismissed);

  const onCloseConfirmCycleModal = () => {
    setShowConfirmCycleModal(false);
    setIsAutoOpenDismissed(true);
  };

  const isMutating = isUpdating || isDeleting;
  const actionErrorMessage = updateErrorMessage ?? deleteErrorMessage;

  const categoryName =
    (recurringPayment?.category &&
      categories.find(
        (category) => category.id === recurringPayment.category,
      )?.name) ||
    "Uncategorized";

  const onToggleArchive = () => {
    if (!recurringPayment) return;

    updateRecurringPayment(
      {
        id: recurringPayment.id,
        payload: { is_archived: !recurringPayment.is_archived },
      },
      {
        onSuccess: () =>
          showToast(
            recurringPayment.is_archived
              ? "Recurring payment reactivated."
              : "Recurring payment archived.",
          ),
      },
    );
  };

  const onTogglePaid = () => {
    if (!recurringPayment) return;

    updateRecurringPayment(
      {
        id: recurringPayment.id,
        payload: { is_paid: !recurringPayment.is_paid },
      },
      {
        onSuccess: () =>
          showToast(
            recurringPayment.is_paid ? "Marked as unpaid." : "Marked as paid.",
          ),
      },
    );
  };

  const onDelete = () => {
    if (!recurringPayment) return;

    Alert.alert(
      "Delete recurring payment",
      `Are you sure you want to delete "${recurringPayment.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            deleteRecurringPayment(recurringPayment.id, {
              onSuccess: () => {
                showToast("Recurring payment deleted.");
                router.back();
              },
            }),
        },
      ],
    );
  };

  const details: { label: string; value: string; hint?: string }[] =
    recurringPayment
      ? [
          { label: "Type", value: recurringPayment.type },
          { label: "Category", value: categoryName },
          ...(recurringPayment.type === "Bills"
            ? [
                {
                  label: "Pricing type",
                  value: recurringPayment.pricing_type,
                  hint: RECURRING_PAYMENT_PRICING_TYPE_DESCRIPTIONS[
                    recurringPayment.pricing_type
                  ],
                },
              ]
            : []),
          ...(recurringPayment.type === "Bills"
            ? [
                {
                  label: "Billing date type",
                  value: recurringPayment.billing_date_type,
                  hint: RECURRING_PAYMENT_BILLING_DATE_TYPE_DESCRIPTIONS[
                    recurringPayment.billing_date_type
                  ],
                },
                {
                  label: "Billing date",
                  value: recurringPayment.billing_date
                    ? `${formatDueDate(recurringPayment.billing_date)}, ${new Date(
                        recurringPayment.billing_date,
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}${expectedSuffix}`
                    : "Not set",
                },
                {
                  label: "Paid",
                  value: recurringPayment.is_paid ? "Yes" : "No",
                },
              ]
            : []),
          { label: "Billing cycle", value: recurringPayment.billing_cycle },
          ...(recurringPayment.type === "Bills"
            ? [
                {
                  label: "Due date type",
                  value: recurringPayment.due_date_type,
                  hint: RECURRING_PAYMENT_DUE_DATE_TYPE_DESCRIPTIONS[
                    recurringPayment.due_date_type
                  ],
                },
              ]
            : []),
          {
            label: "Due date",
            value: `${formatDueDate(recurringPayment.due_date)}, ${new Date(
              recurringPayment.due_date,
            ).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}${expectedSuffix}`,
          },
          {
            label: "Auto-renew",
            value: recurringPayment.is_auto_renew ? "On" : "Off",
          },
          {
            label: "Free trial",
            value: recurringPayment.is_free_trial ? "Yes" : "No",
          },
          { label: "Currency", value: recurringPayment.currency },
          {
            label: "Created",
            value: formatDueDate(recurringPayment.created_at),
          },
          ...(reminderSettings
            ? [
                {
                  label: "Notification Channels",
                  value: reminderSettings.channels
                    .map((channel) => REMINDER_CHANNEL_LABELS[channel])
                    .join(", "),
                },
                {
                  label: "Remind me",
                  value: reminderSettings.remind_before_days
                    .slice()
                    .sort((a, b) => b - a)
                    .map((days) => REMINDER_OFFSET_DAY_LABELS[days])
                    .join(", "),
                },
              ]
            : []),
        ]
      : [];

  return (
    <View
      style={[
        Styles.container,
        {
          backgroundColor: colors.background,
          justifyContent: "flex-start",
          paddingTop: insets.top + height * SCREEN_PADDING_TOP_RATIO,
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
          Payment Details
        </Text>
        {recurringPayment ? (
          <TouchableOpacity
            style={{ width: 24 }}
            onPress={() =>
              router.push({
                pathname: "/recurring-payments/edit/[id]",
                params: { id: recurringPayment.id },
              })
            }
          >
            <SquarePenIcon color={colors.textPrimary} width={22} height={22} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      {isPending ? (
        <View style={{ width: width * SCREEN_WIDTH_RATIO }}>
          <RecurringPaymentDetailSkeleton />
        </View>
      ) : errorMessage || !recurringPayment ? (
        <Text
          style={{
            color: colors.danger,
            fontWeight: FontWeights.medium,
            fontSize: FontSizes.small,
            textAlign: "center",
            marginTop: 20,
          }}
        >
          {errorMessage ?? "Recurring payment not found."}
        </Text>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
              progressBackgroundColor={colors.background}
            />
          }
          contentContainerStyle={[
            Styles.flexColumn,
            {
              width: width * SCREEN_WIDTH_RATIO,
              gap: height * 0.02,
              paddingBottom:
                insets.bottom + height * SCREEN_PADDING_BOTTOM_RATIO,
            },
          ]}
        >
          {needsCycleConfirmation && (
            <TouchableOpacity
              onPress={() => setShowConfirmCycleModal(true)}
              style={[
                Styles.flexRow,
                {
                  width: "100%",
                  gap: 10,
                  padding: 15,
                  borderWidth: 1,
                  borderColor: colors.warning,
                  borderRadius: 10,
                  backgroundColor: colors.warningBg,
                  justifyContent: "flex-start",
                },
              ]}
            >
              <TriangleAlertIcon
                color={colors.warning}
                width={22}
                height={22}
              />
              <View style={{ flexShrink: 1, gap: 2 }}>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontWeight: FontWeights.semibold,
                    fontSize: FontSizes.small,
                  }}
                >
                  Your new bill is in
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontWeight: FontWeights.medium,
                    fontSize: FontSizes.tiny,
                  }}
                >
                  Tap to check if anything changed this cycle.
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <View
            style={[
              Styles.flexRow,
              {
                width: "100%",
                gap: 6,
                padding: 15,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                backgroundColor: colors.surface,
                justifyContent: "space-between",
                alignItems: "flex-start",
              },
            ]}
          >
            <View style={[Styles.flexRow, { gap: 10 }]}>
              <PaymentIcon
                icon={recurringPayment.icon}
                name={recurringPayment.name}
                size={46}
              />
              <View>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{
                    color: colors.textPrimary,
                    fontWeight: FontWeights.semibold,
                    fontSize: FontSizes.large,
                    flexShrink: 1,
                  }}
                >
                  {recurringPayment.name}
                </Text>
                <View
                  style={[
                    Styles.flexRow,
                    { gap: 5, justifyContent: "flex-start" },
                  ]}
                >
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontWeight: FontWeights.medium,
                      fontSize: FontSizes.small,
                    }}
                  >
                    {recurringPayment.billing_cycle}
                  </Text>
                </View>
                <View
                  style={[
                    Styles.flexRow,
                    { gap: 5, justifyContent: "flex-start" },
                  ]}
                >
                  {recurringPayment.is_free_trial ? (
                    <Badge variant={Variant.FreeTrial} />
                  ) : null}
                  {recurringPayment.is_archived ? (
                    <Badge variant={Variant.Archived} />
                  ) : null}
                </View>
              </View>
            </View>
            <View>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontWeight: FontWeights.bold,
                  fontSize: FontSizes.xLarge,
                  textAlign: "right",
                }}
              >
                {formatAmount(recurringPayment.amount)}
              </Text>
              {recurringPayment.type === "Bills" && recurringPayment.is_paid ? (
                <Text
                  style={{
                    color: colors.success,
                    fontWeight: FontWeights.medium,
                    fontSize: FontSizes.small,
                    textAlign: "right",
                  }}
                >
                  PAID
                </Text>
              ) : (
                !recurringPayment.is_archived && (
                  <Text
                    style={{
                      color: getDueStatusColor(
                        recurringPayment.due_date,
                        colors,
                        "Active",
                      ),
                      fontWeight: FontWeights.medium,
                      fontSize: FontSizes.small,
                      textAlign: "right",
                    }}
                  >
                    {formatDueStatus(recurringPayment.due_date)}
                  </Text>
                )
              )}
            </View>
          </View>

          <View
            style={{
              width: "100%",
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 10,
              backgroundColor: colors.surface,
            }}
          >
            {details.map((detail, index) => (
              <View
                key={detail.label}
                style={[
                  Styles.flexRow,
                  {
                    justifyContent: "space-between",
                    paddingVertical: 12,
                    paddingHorizontal: 15,
                    gap: 10,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontWeight: FontWeights.medium,
                    fontSize: FontSizes.small,
                  }}
                >
                  {detail.label}
                </Text>
                <View
                  style={[
                    Styles.flexRow,
                    { flexShrink: 1, justifyContent: "flex-end", gap: 6 },
                  ]}
                >
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontWeight: FontWeights.semibold,
                      fontSize: FontSizes.small,
                      textAlign: "right",
                      flexShrink: 1,
                    }}
                  >
                    {detail.value}
                  </Text>
                  {detail.hint && (
                    <TouchableOpacity
                      hitSlop={10}
                      onPress={() =>
                        setOpenHint({
                          title: `${detail.label}: ${detail.value}`,
                          message: detail.hint!,
                        })
                      }
                    >
                      <InfoIcon
                        width={FontSizes.small + 2}
                        height={FontSizes.small + 2}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>

          {recurringPayment.description ? (
            <View
              style={{
                width: "100%",
                gap: 6,
                padding: 15,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                backgroundColor: colors.surface,
              }}
            >
              <Text
                style={{
                  color: colors.textSecondary,
                  fontWeight: FontWeights.medium,
                  fontSize: FontSizes.small,
                }}
              >
                Description
              </Text>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontWeight: FontWeights.medium,
                  fontSize: FontSizes.small,
                }}
              >
                {recurringPayment.description}
              </Text>
            </View>
          ) : null}

          {actionErrorMessage && (
            <Text
              style={{
                color: colors.danger,
                fontSize: FontSizes.small,
                textAlign: "center",
                width: "100%",
              }}
            >
              {actionErrorMessage}
            </Text>
          )}

          {recurringPayment.type === "Bills" &&
            !recurringPayment.is_archived && (
              <TouchableOpacity
                onPress={onTogglePaid}
                disabled={isMutating}
                style={{
                  width: "100%",
                  paddingVertical: 15,
                  backgroundColor: colors.primary,
                  borderRadius: 6,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontWeight: FontWeights.bold,
                  }}
                >
                  {recurringPayment.is_paid ? "Mark as Unpaid" : "Mark as Paid"}
                </Text>
              </TouchableOpacity>
            )}
          <TouchableOpacity
            onPress={onToggleArchive}
            disabled={isMutating}
            style={{
              width: "100%",

              paddingVertical: 12,
              backgroundColor: "transparent",
              borderRadius: 6,
              borderWidth: 1,
              borderColor: colors.primary,
              alignItems: "center",
            }}
          >
            {isUpdating ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: FontWeights.semibold,
                }}
              >
                {recurringPayment.is_archived
                  ? "Reactivate"
                  : "Mark as Cancelled/Archive"}
              </Text>
            )}
          </TouchableOpacity>
          {recurringPayment.is_archived && (
            <TouchableOpacity
              onPress={onDelete}
              disabled={isMutating}
              style={{
                width: "100%",
                paddingVertical: 12,
                backgroundColor: "transparent",
                borderRadius: 6,
                borderWidth: 1,
                borderColor: colors.danger,
                alignItems: "center",
              }}
            >
              {isDeleting ? (
                <ActivityIndicator color={colors.danger} />
              ) : (
                <Text
                  style={{
                    color: colors.danger,
                    fontWeight: FontWeights.semibold,
                  }}
                >
                  Delete
                </Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {openHint && (
        <InfoModal
          visible
          onClose={() => setOpenHint(null)}
          title={openHint.title}
          message={openHint.message}
        />
      )}

      {recurringPayment && isConfirmCycleModalOpen && (
        <ConfirmBillingCycleModal
          onClose={onCloseConfirmCycleModal}
          recurringPayment={recurringPayment}
        />
      )}
    </View>
  );
}
