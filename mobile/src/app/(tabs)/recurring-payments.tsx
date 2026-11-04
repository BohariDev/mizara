import { useEffect, useMemo, useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  useWindowDimensions,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FilterIcon from "@/assets/icons/filter.svg";
import ArrowUpIcon from "@/assets/icons/arrow-up.svg";
import ArrowDownIcon from "@/assets/icons/arrow-down.svg";
import { Styles } from "@/styles/stylesheets";
import { useTypography } from "@/hooks/useTypography";
import { useRefresh } from "@/hooks/useRefresh";
import { useTheme } from "@/contexts/ThemeContext";
import { FontWeights } from "@/styles/typography";
import {
  SCREEN_PADDING_TOP_RATIO,
  SCREEN_WIDTH_RATIO,
} from "@/constants/dimensions";
import { SearchBar } from "@/components/SearchBar";
import {
  RecurringPaymentsFilterModal,
  hasActiveFilters,
  STATUS_OPTIONS,
  type RecurringPaymentFilters,
} from "@/components/RecurringPaymentsFilterModal";
import {
  RecurringPaymentsSortMenu,
  hasActiveSort,
  type RecurringPaymentSort,
} from "@/components/RecurringPaymentsSortMenu";
import { Badge, Variant } from "@/components/Badge";
import { RecurringPaymentListSkeleton } from "@/components/Skeleton";
import { useRecurringPayments } from "@/services/recurring-payment/hooks";
import { useCategories } from "@/services/category/hooks";
import type { RecurringPayment } from "@/services/recurring-payment/types";
import {
  formatAmount,
  formatDueDate,
  formatDueStatus,
  getDueStatusColor,
} from "@/utils/recurring-payment";
import { PaymentIcon } from "@/components/PaymentIcon";

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_LIMIT = 10;

export default function RecurringPayments() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const FontSizes = useTypography();
  const { colors } = useTheme();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<RecurringPaymentFilters>({});
  const [isSortMenuVisible, setIsSortMenuVisible] = useState(false);
  const [sort, setSort] = useState<RecurringPaymentSort>({
    label: "Due Date: Earliest first",
    sort_by: "due_date",
    sort_order: "ASC",
  });
  const { categories } = useCategories();
  const {
    recurringPayments,
    isPending,
    errorMessage,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useRecurringPayments({
    limit: PAGE_LIMIT,
    search: debouncedSearch || undefined,
    sort_by: sort.sort_by,
    sort_order: sort.sort_order,
    ...filters,
    is_archived: filters.is_archived ?? false,
  });
  const { isRefreshing, onRefresh } = useRefresh([refetch]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <View
      style={[
        Styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + height * SCREEN_PADDING_TOP_RATIO,
          justifyContent: "flex-start",
        },
      ]}
    >
      <Text
        style={{
          color: colors.textPrimary,
          fontWeight: FontWeights.bold,
          fontSize: FontSizes.xLarge,
          textAlign: "left",
          width: width * SCREEN_WIDTH_RATIO,
        }}
      >
        Recurring Payments
      </Text>
      <View
        style={[
          Styles.flexRow,
          {
            width: width * SCREEN_WIDTH_RATIO,
            gap: 10,
            marginTop: height * 0.025,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or description..."
            style={{ width: "100%" }}
          />
        </View>
        <TouchableOpacity
          onPress={() => setIsFilterModalVisible(true)}
          style={{
            width: 44,
            height: 44,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: hasActiveFilters(filters)
              ? colors.primary
              : colors.border,
            backgroundColor: hasActiveFilters(filters)
              ? colors.infoBg
              : colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FilterIcon
            color={
              hasActiveFilters(filters) ? colors.primary : colors.textMuted
            }
            width={18}
            height={18}
          />
        </TouchableOpacity>
      </View>
      <View
        style={[
          Styles.flexRow,
          {
            marginTop: height * 0.01,
            width: width * SCREEN_WIDTH_RATIO,
            justifyContent: "space-between",
          },
        ]}
      >
        <View style={[Styles.flexRow, { gap: 5 }]}>
          {STATUS_OPTIONS.map((status) => {
            const isArchived = status === "Archived";
            const isSelected = isArchived
              ? filters.is_archived === true
              : filters.is_archived !== true;

            return (
              <TouchableOpacity
                key={status}
                onPress={() => {
                  setFilters((prev) => ({
                    ...prev,
                    is_archived:
                      prev.is_archived === isArchived ? undefined : isArchived,
                  }));
                }}
                style={[
                  Styles.flexRow,
                  {
                    paddingVertical: 10,
                    paddingHorizontal: 15,
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: isSelected
                      ? colors.infoBg
                      : colors.surface,
                    borderRadius: 50,
                    borderWidth: 1,
                    gap: 8,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: FontSizes.small,
                    color: isSelected ? colors.primary : colors.textSecondary,
                    fontWeight: FontWeights.medium,
                  }}
                >
                  {status}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={() => setIsSortMenuVisible(true)}
          style={[
            Styles.flexRow,
            {
              padding: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              gap: 2,
            },
          ]}
        >
          <Text
            style={{
              fontSize: FontSizes.small,
              color: colors.textSecondary,
              fontWeight: FontWeights.medium,
            }}
          >
            Sort: {sort.label?.split(":")[0]}
          </Text>
          {sort.sort_order === "DESC" ? (
            <ArrowDownIcon
              color={colors.textSecondary}
              width={16}
              height={16}
            />
          ) : (
            <ArrowUpIcon color={colors.textSecondary} width={16} height={16} />
          )}
        </TouchableOpacity>
      </View>

      {isPending ? (
        <View
          style={{
            width: width * SCREEN_WIDTH_RATIO,
            paddingVertical: height * 0.02,
          }}
        >
          <RecurringPaymentListSkeleton />
        </View>
      ) : errorMessage ? (
        <Text
          style={{
            color: colors.danger,
            fontWeight: FontWeights.medium,
            fontSize: FontSizes.small,
            textAlign: "center",
            marginTop: 20,
          }}
        >
          {errorMessage}
        </Text>
      ) : (
        <FlatList
          data={recurringPayments}
          keyExtractor={(payment) => payment.id}
          contentContainerStyle={{
            gap: 10,
            paddingVertical: height * 0.025,
            width: width * SCREEN_WIDTH_RATIO,
          }}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
              progressBackgroundColor={colors.background}
            />
          }
          ListEmptyComponent={
            <Text
              style={{
                color: colors.textSecondary,
                fontWeight: FontWeights.medium,
                fontSize: FontSizes.small,
                textAlign: "center",
                marginTop: 20,
              }}
            >
              No recurring payments found.
            </Text>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator
                color={colors.primary}
                style={{ marginVertical: 10 }}
              />
            ) : null
          }
          renderItem={({ item: payment }) => (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/recurring-payments/[id]",
                  params: { id: payment.id },
                })
              }
              style={[
                Styles.flexRow,
                {
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  gap: 10,
                  padding: 10,
                },
              ]}
            >
              <PaymentIcon icon={payment.icon} name={payment.name} size={42} />
              <View
                style={[
                  Styles.flexRow,
                  {
                    justifyContent: "space-between",
                    flex: 1,
                  },
                ]}
              >
                <View>
                  <View
                    style={[
                      Styles.flexRow,
                      {
                        width: width * 0.35,
                        gap: 5,
                        justifyContent: "flex-start",
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={{
                        color: colors.textPrimary,
                        fontWeight: FontWeights.semibold,
                        fontSize: FontSizes.medium,
                      }}
                    >
                      {payment.name}
                    </Text>
                    {payment.is_free_trial ? (
                      <Badge variant={Variant.FreeTrial} />
                    ) : null}
                    {payment.is_archived ? (
                      <Badge variant={Variant.Archived} />
                    ) : null}
                  </View>

                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontWeight: FontWeights.medium,
                      fontSize: FontSizes.tiny,
                    }}
                  >
                    {payment.billing_cycle}
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontWeight: FontWeights.medium,
                      fontSize: FontSizes.tiny,
                    }}
                  >
                    {payment.type}
                  </Text>
                </View>
                <View>
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontWeight: FontWeights.semibold,
                      fontSize: FontSizes.medium,
                      textAlign: "right",
                    }}
                  >
                    {formatAmount(payment.amount)}
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontWeight: FontWeights.medium,
                      fontSize: FontSizes.tiny,
                      textAlign: "right",
                    }}
                  >
                    {formatDueDate(payment.due_date)}
                  </Text>
                  <Text
                    style={{
                      color:
                        payment.type === "Bills" && payment.is_paid
                          ? colors.success
                          : getDueStatusColor(
                              payment.due_date,
                              colors,
                              payment.is_archived ? "Archived" : "Active",
                            ),
                      fontWeight:
                        payment.type === "Bills" && payment.is_paid
                          ? FontWeights.bold
                          : FontWeights.medium,
                      fontSize: FontSizes.tiny,
                      textAlign: "right",
                    }}
                  >
                    {payment.type === "Bills" && payment.is_paid ? (
                      "PAID"
                    ) : !payment.is_archived ? (
                      <>{formatDueStatus(payment.due_date)}</>
                    ) : (
                      ""
                    )}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <RecurringPaymentsFilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        filters={filters}
        onApply={setFilters}
        categories={categories}
      />

      <RecurringPaymentsSortMenu
        visible={isSortMenuVisible}
        onClose={() => setIsSortMenuVisible(false)}
        value={sort}
        onSelect={setSort}
      />
    </View>
  );
}
