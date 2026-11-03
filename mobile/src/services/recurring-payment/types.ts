export type RecurringPaymentType = "Subscription" | "Bills";

export type RecurringPaymentBillingCycle =
  | "Weekly"
  | "Monthly"
  | "Quarterly"
  | "Yearly";

export type RecurringPaymentPricingType = "Fixed" | "Variable";

export type RecurringPaymentDueDateType = "Fixed" | "Variable";

export type RecurringPaymentBillingDateType = "Fixed" | "Variable";

export type RecurringPaymentSortBy = "due_date" | "amount" | "name";

export type SortOrder = "ASC" | "DESC";

export type RecurringPayment = {
  id: string;
  user_id: string;
  name: string;
  type: RecurringPaymentType;
  description: string | null;
  amount: string;
  currency: string;
  billing_cycle: RecurringPaymentBillingCycle;
  is_auto_renew: boolean;
  is_archived: boolean;
  is_free_trial: boolean;
  icon: string | null;
  due_date: string;
  pricing_type: RecurringPaymentPricingType;
  billing_date: string | null;
  billing_date_type: RecurringPaymentBillingDateType;
  due_date_type: RecurringPaymentDueDateType;
  is_paid: boolean;
  needs_cycle_confirmation: boolean;
  category_id: string | null;
  created_at: string;
  updated_at: string;
};

export type FindAllRecurringPaymentParams = {
  page?: number;
  limit?: number;
  sort_by?: RecurringPaymentSortBy;
  sort_order?: SortOrder;
  type?: RecurringPaymentType;
  is_archived?: boolean;
  is_auto_renew?: boolean;
  is_free_trial?: boolean;
  category_id?: string;
  search?: string;
  needs_cycle_confirmation?: boolean;
  confirmation_due_before?: string;
};

export type FindAllRecurringPaymentResponse = {
  message: string;
  data: RecurringPayment[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type CreateRecurringPaymentPayload = {
  name: string;
  type: RecurringPaymentType;
  description?: string;
  amount: number;
  currency?: string;
  billing_cycle: RecurringPaymentBillingCycle;
  is_auto_renew: boolean;
  is_archived: boolean;
  is_free_trial: boolean;
  icon?: string;
  due_date: string;
  pricing_type?: RecurringPaymentPricingType;
  billing_date?: string;
  billing_date_type?: RecurringPaymentBillingDateType;
  due_date_type?: RecurringPaymentDueDateType;
  is_paid?: boolean;
  category_id?: string;
};

export type CreateRecurringPaymentResponse = {
  message: string;
  data: { id: string };
};

export type FindOneRecurringPaymentResponse = {
  message: string;
  data: RecurringPayment;
};

export type UpdateRecurringPaymentPayload =
  Partial<CreateRecurringPaymentPayload>;

export type UpdateRecurringPaymentResponse = {
  message: string;
};

export type DeleteRecurringPaymentResponse = {
  message: string;
};

export type ConfirmBillingCyclePayload = {
  billing_date?: string;
  due_date?: string;
  amount?: number;
};

export type ConfirmBillingCycleResponse = {
  message: string;
};

export type RecurringPaymentPreset = {
  slug: string;
  name: string;
  type: RecurringPaymentType;
  category: string;
  icon: string;
  aliases: string[];
  default_billing_cycle: RecurringPaymentBillingCycle;
  default_pricing_type: RecurringPaymentPricingType | null;
};

export type FindAllRecurringPaymentPresetResponse = {
  message: string;
  data: RecurringPaymentPreset[];
};
