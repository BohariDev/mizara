import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import WalletCardsIcon from "@/assets/icons/wallet-cards.svg";
import CalendarDaysIcon from "@/assets/icons/calendar-days.svg";
import HourglassIcon from "@/assets/icons/hourglass.svg";
import BanknoteIcon from "@/assets/icons/banknote.svg";
import TriangleAlertIcon from "@/assets/icons/triangle-alert.svg";
import ChevronRightIcon from "@/assets/icons/chevron-right.svg";
import { Styles } from "@/styles/stylesheets";
import { useTheme } from "@/contexts/ThemeContext";
import { FontWeights } from "@/styles/typography";
import { useTypography } from "@/hooks/useTypography";
import { useRefresh } from "@/hooks/useRefresh";
import { OverviewCard } from "@/components/OverviewCard";
import { Skeleton, UpcomingDueListSkeleton } from "@/components/Skeleton";
import {
  SCREEN_PADDING_BOTTOM_RATIO,
  SCREEN_PADDING_TOP_RATIO,
  SCREEN_WIDTH_RATIO,
} from "@/constants/dimensions";
import { useOverview } from "@/services/dashboard/hooks";
import { Badge, Variant } from "@/components/Badge";
import { useRecurringPayments } from "@/services/recurring-payment/hooks";
import { getStartOfTomorrow } from "@/utils/recurring-payment";
import { useMyProfile, useUserSettings } from "@/services/user/hooks";
import { getGreeting } from "@/utils/greeting";
import { PaymentIcon } from "@/components/PaymentIcon";

const formatDaysLeft = (daysLeft: number) => {
  if (daysLeft <= 0) return "Today";
  if (daysLeft === 1) return "Tomorrow";
  return `${daysLeft} days left`;
};

export default function Home() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const FontSizes = useTypography();
  const { colors } = useTheme();
  const {
    overview,
    isPending: isOverviewPending,
    refetch: refetchOverview,
  } = useOverview();

  const {
    recurringPayments: pendingConfirmations,
    refetch: refetchPendingConfirmations,
  } = useRecurringPayments({
    confirmation_due_before: getStartOfTomorrow().toISOString(),
    is_archived: false,
    limit: 5,
  });

  const {
    myProfile,
    isPending: isProfilePending,
    refetch: refetchMyProfile,
  } = useMyProfile();
  const {
    userSettings,
    isPending: isSettingsPending,
    refetch: refetchUserSettings,
  } = useUserSettings();
  const { isRefreshing, onRefresh } = useRefresh([
    refetchOverview,
    refetchPendingConfirmations,
    refetchMyProfile,
    refetchUserSettings,
  ]);

  const greeting = getGreeting(userSettings?.timezone.key);
  const firstName = myProfile?.first_name?.trim();

  const upcomingDues = overview?.upcoming_due ?? [];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
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
        Styles.container,
        {
          flex: undefined,
          flexGrow: 1,
          paddingTop: insets.top + height * SCREEN_PADDING_TOP_RATIO,
          paddingBottom: height * SCREEN_PADDING_BOTTOM_RATIO,
          justifyContent: "flex-start",
        },
      ]}
    >
      <View style={{ width: width * SCREEN_WIDTH_RATIO }}>
        {isProfilePending || isSettingsPending ? (
          <Skeleton width={width * 0.6} height={FontSizes.xLarge * 1.2} />
        ) : (
          <Text
            style={{
              color: colors.textPrimary,
              fontWeight: FontWeights.bold,
              fontSize: FontSizes.xLarge,
            }}
          >
            {firstName ? `${greeting}, ${firstName}!` : `${greeting}!`}
          </Text>
        )}
        <Text
          style={{
            color: colors.textSecondary,
            fontWeight: FontWeights.medium,
            fontSize: FontSizes.medium,
          }}
        >
          Here's your payments overview
        </Text>
      </View>

      <View
        style={[
          Styles.flexRow,
          { flexWrap: "wrap", gap: 15, marginTop: height * 0.04 },
        ]}
      >
        <OverviewCard
          title="Total Active Payments"
          value={overview?.total ?? "0"}
          backgroundColor={colors.overviewBgBlue}
          isLoading={isOverviewPending}
          color={colors.overviewFontBlue}
          icon={
            <WalletCardsIcon color={colors.primary} width={20} height={20} />
          }
        />
        <OverviewCard
          title="Upcoming This Week"
          value={overview?.total_upcoming_this_week ?? "0"}
          backgroundColor={colors.overviewBgGreen}
          isLoading={isOverviewPending}
          color={colors.overviewFontGreen}
          icon={<CalendarDaysIcon width={20} height={20} />}
        />
        <OverviewCard
          title="Free Trials Ending"
          value={overview?.free_trials_ending ?? "0"}
          backgroundColor={colors.overviewBgYellow}
          isLoading={isOverviewPending}
          color={colors.overviewFontYellow}
          icon={<HourglassIcon width={20} height={20} />}
        />
        <OverviewCard
          title="Current Month Spending"
          value={overview?.current_month_spending ?? "0"}
          backgroundColor={colors.overviewBgPurple}
          isLoading={isOverviewPending}
          color={colors.overviewFontPurple}
          icon={<BanknoteIcon width={20} height={20} />}
        />
      </View>
      {pendingConfirmations.length > 0 && (
        <View
          style={{
            width: width * SCREEN_WIDTH_RATIO,
            marginTop: height * 0.03,
            padding: 12,
            gap: 8,
            borderWidth: 1,
            borderColor: colors.warning,
            borderRadius: 8,
            backgroundColor: colors.warningBg,
          }}
        >
          <View
            style={[Styles.flexRow, { gap: 8, justifyContent: "flex-start" }]}
          >
            <TriangleAlertIcon color={colors.warning} width={18} height={18} />
            <Text
              style={{
                color: colors.textPrimary,
                fontWeight: FontWeights.bold,
                fontSize: FontSizes.small,
              }}
            >
              Confirm your bill details for this cycle
            </Text>
          </View>
          {pendingConfirmations.map((payment) => (
            <TouchableOpacity
              key={payment.id}
              onPress={() =>
                router.push({
                  pathname: "/recurring-payments/[id]",
                  params: { id: payment.id, confirm: "1" },
                })
              }
              style={[
                Styles.flexRow,
                { justifyContent: "space-between", paddingVertical: 4 },
              ]}
            >
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  flexShrink: 1,
                  color: colors.textPrimary,
                  fontWeight: FontWeights.semibold,
                  fontSize: FontSizes.small,
                }}
              >
                {payment.name}
              </Text>
              <ChevronRightIcon
                color={colors.textSecondary}
                width={18}
                height={18}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View
        style={{ width: width * SCREEN_WIDTH_RATIO, marginTop: height * 0.035 }}
      >
        <View style={[Styles.flexRow, { justifyContent: "space-between" }]}>
          <Text
            style={{
              color: colors.textPrimary,
              fontWeight: FontWeights.bold,
              fontSize: FontSizes.medium,
            }}
          >
            Upcoming Due
          </Text>
          <TouchableOpacity onPress={() => router.push("/recurring-payments")}>
            <Text
              style={{
                color: colors.primary,
                fontWeight: FontWeights.bold,
                fontSize: FontSizes.small,
              }}
            >
              View all
            </Text>
          </TouchableOpacity>
        </View>
        <View
          style={{
            borderColor: colors.border,
            borderWidth: 1,
            padding: 10,
            borderRadius: 8,
            marginTop: height * 0.02,
            gap: 10,
          }}
        >
          {isOverviewPending && <UpcomingDueListSkeleton />}
          {!isOverviewPending && upcomingDues.length === 0 && (
            <Text
              style={{
                fontSize: FontSizes.small,
                fontWeight: FontWeights.medium,
                color: colors.textSecondary,
                textAlign: "center",
                paddingVertical: 10,
              }}
            >
              No upcoming dues this week.
            </Text>
          )}
          {upcomingDues.map((dues) => (
            <TouchableOpacity
              key={dues.id}
              onPress={() =>
                router.push({
                  pathname: "/recurring-payments/[id]",
                  params: { id: dues.id },
                })
              }
              style={[Styles.flexRow, { justifyContent: "space-between" }]}
            >
              <View
                style={[
                  Styles.flexRow,
                  {
                    gap: 5,
                    width: width * 0.22,
                    justifyContent: "flex-start",
                  },
                ]}
              >
                <PaymentIcon icon={dues.icon} name={dues.name} size={24} />
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{
                    fontSize: FontSizes.small,
                    fontWeight: FontWeights.semibold,
                    color: colors.textPrimary,
                  }}
                >
                  {dues.name}
                </Text>
                {dues.is_free_trial && <Badge variant={Variant.FreeTrial} />}
              </View>
              <View style={[Styles.flexRow, { gap: 10 }]}>
                <Text
                  style={{
                    fontSize: FontSizes.small,
                    fontWeight: FontWeights.semibold,
                    color: dues.days_left <= 1 ? colors.danger : colors.warning,
                  }}
                >
                  {formatDaysLeft(dues.days_left)}
                </Text>
                <Text
                  style={{
                    fontSize: FontSizes.small,
                    fontWeight: FontWeights.bold,
                    color: colors.textPrimary,
                  }}
                >
                  {dues.currency}
                  {dues.amount}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
