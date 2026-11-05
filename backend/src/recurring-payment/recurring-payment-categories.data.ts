// Relative import (not '@/...') to match recurring-payment-presets.data.ts,
// which scripts/logos/build-logos.js loads with ts-node.
import { RecurringPaymentCategory as Category } from '../common/enum';

export type RecurringPaymentCategoryData = {
    /** Stored on recurring_payments.category; never rename an existing one. */
    id: Category;
    /** Label shown in the app; safe to change. */
    name: string;
};

/**
 * The categories a recurring payment can have. The order here is the order
 * in the app. To add one, add it to RecurringPaymentCategory first.
 */
export const RECURRING_PAYMENT_CATEGORIES: readonly RecurringPaymentCategoryData[] =
    [
        { id: Category.Entertainment, name: 'Entertainment' },
        { id: Category.Food, name: 'Food & Dining' },
        { id: Category.HealthFitness, name: 'Health & Fitness' },
        { id: Category.Housing, name: 'Housing & Rent' },
        { id: Category.Insurance, name: 'Insurance' },
        { id: Category.Software, name: 'Software & Subscriptions' },
        { id: Category.Streaming, name: 'Streaming' },
        { id: Category.Transportation, name: 'Transportation' },
        { id: Category.Utilities, name: 'Utilities' },
        { id: Category.Other, name: 'Other' },
    ];
