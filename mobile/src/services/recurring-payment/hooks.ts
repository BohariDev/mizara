import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  confirmBillingCycleApi,
  createRecurringPaymentApi,
  deleteRecurringPaymentApi,
  getRecurringPaymentApi,
  getRecurringPaymentPresetsApi,
  getRecurringPaymentsApi,
  updateRecurringPaymentApi,
} from "@/services/recurring-payment/api";
import { getErrorMessage } from "@/services/get-error-message";
import { FindAllRecurringPaymentParams } from "./types";

export const useRecurringPayments = (
  params: Omit<FindAllRecurringPaymentParams, "page">,
) => {
  const {
    data,
    isPending,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["recurring-payments", params],
    queryFn: ({ pageParam }) =>
      getRecurringPaymentsApi({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.metadata.page < lastPage.metadata.totalPages
        ? lastPage.metadata.page + 1
        : undefined,
  });

  const errorMessage = getErrorMessage(error);

  return {
    recurringPayments: data?.pages.flatMap((page) => page.data) ?? [],
    metadata: data?.pages.at(-1)?.metadata,
    isPending,
    errorMessage,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  };
};

export const useCreateRecurringPayment = () => {
  const queryClient = useQueryClient();

  const {
    mutate: createRecurringPayment,
    isPending,
    error,
  } = useMutation({
    mutationFn: createRecurringPaymentApi,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["recurring-payments"],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard-overview"],
      });
    },
  });

  const errorMessage = getErrorMessage(error);

  return { createRecurringPayment, isPending, errorMessage };
};

export const useRecurringPayment = (id: string) => {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["recurring-payment", id],
    queryFn: () => getRecurringPaymentApi(id),
    enabled: !!id,
  });

  const errorMessage = getErrorMessage(error);

  return {
    recurringPayment: data?.data,
    isPending,
    errorMessage,
    refetch,
  };
};

export const useUpdateRecurringPayment = () => {
  const queryClient = useQueryClient();

  const {
    mutate: updateRecurringPayment,
    isPending,
    error,
  } = useMutation({
    mutationFn: updateRecurringPaymentApi,
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({
        queryKey: ["recurring-payment", id],
      });
      queryClient.invalidateQueries({
        queryKey: ["recurring-payments"],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard-overview"],
      });
    },
  });

  const errorMessage = getErrorMessage(error);

  return { updateRecurringPayment, isPending, errorMessage };
};

export const useDeleteRecurringPayment = () => {
  const queryClient = useQueryClient();

  const {
    mutate: deleteRecurringPayment,
    isPending,
    error,
  } = useMutation({
    mutationFn: deleteRecurringPaymentApi,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({
        queryKey: ["recurring-payment", id],
      });
      queryClient.invalidateQueries({
        queryKey: ["recurring-payments"],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard-overview"],
      });
    },
  });

  const errorMessage = getErrorMessage(error);

  return { deleteRecurringPayment, isPending, errorMessage };
};

export const useConfirmBillingCycle = () => {
  const queryClient = useQueryClient();

  const {
    mutate: confirmBillingCycle,
    isPending,
    error,
  } = useMutation({
    mutationFn: confirmBillingCycleApi,
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({
        queryKey: ["recurring-payment", id],
      });
      queryClient.invalidateQueries({
        queryKey: ["recurring-payments"],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard-overview"],
      });
    },
  });

  const errorMessage = getErrorMessage(error);

  return { confirmBillingCycle, isPending, errorMessage };
};

const ONE_DAY = 1000 * 60 * 60 * 24;

export const useRecurringPaymentPresets = () => {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["recurring-payment-presets"],
    queryFn: getRecurringPaymentPresetsApi,
    staleTime: ONE_DAY,
    gcTime: ONE_DAY,
  });

  const errorMessage = getErrorMessage(error);

  return { presets: data?.data ?? [], isPending, errorMessage, refetch };
};
