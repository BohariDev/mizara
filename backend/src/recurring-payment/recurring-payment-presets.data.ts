// Relative import (not '@/...') so scripts/logos/build-logos.js can load
// this file with ts-node, which doesn't resolve the path alias.
import {
    RecurringPaymentBillingCycle as Cycle,
    RecurringPaymentPricingType as Pricing,
    RecurringPaymentType as Type,
} from '../common/enum';

export type RecurringPaymentPresetData = {
    /** Unique and stable; also the logo file name (presets/<slug>.webp). */
    slug: string;
    name: string;
    type: Type;
    /** Name of a system category from the categories seeder. */
    category: string;
    /** Other names users may search for. */
    aliases?: string[];
    /** Suggested values for the form. Defaults to Monthly. */
    default_billing_cycle?: Cycle;
    default_pricing_type?: Pricing;
};

/**
 * Predefined subscriptions and bills shown in the app's "Choose a service"
 * step. Edit this list and deploy the backend to change them; the order here
 * is the order in the app. After adding one, add its domain to
 * scripts/logos/logos.config.js and run `pnpm logos:build`.
 */
export const RECURRING_PAYMENT_PRESETS: readonly RecurringPaymentPresetData[] =
    [
        // Streaming
        {
            slug: 'netflix',
            name: 'Netflix',
            type: Type.Subscription,
            category: 'Streaming',
        },
        {
            slug: 'spotify',
            name: 'Spotify',
            type: Type.Subscription,
            category: 'Streaming',
        },
        {
            slug: 'youtube-premium',
            name: 'YouTube Premium',
            type: Type.Subscription,
            category: 'Streaming',
            aliases: ['YT Premium', 'YouTube Music'],
        },
        {
            slug: 'disney-plus',
            name: 'Disney+',
            type: Type.Subscription,
            category: 'Streaming',
            aliases: ['Disney Plus'],
        },
        {
            slug: 'hbo-max',
            name: 'HBO Max',
            type: Type.Subscription,
            category: 'Streaming',
            aliases: ['Max'],
        },
        {
            slug: 'prime-video',
            name: 'Prime Video',
            type: Type.Subscription,
            category: 'Streaming',
            aliases: ['Amazon Prime'],
        },
        {
            slug: 'apple-music',
            name: 'Apple Music',
            type: Type.Subscription,
            category: 'Streaming',
        },
        {
            slug: 'viu',
            name: 'Viu',
            type: Type.Subscription,
            category: 'Streaming',
        },
        {
            slug: 'iwanttfc',
            name: 'iWantTFC',
            type: Type.Subscription,
            category: 'Streaming',
            aliases: ['iWant', 'TFC'],
        },
        {
            slug: 'crunchyroll',
            name: 'Crunchyroll',
            type: Type.Subscription,
            category: 'Streaming',
        },

        // Software & Subscriptions
        {
            slug: 'icloud',
            name: 'iCloud+',
            type: Type.Subscription,
            category: 'Software & Subscriptions',
            aliases: ['iCloud', 'Apple'],
        },
        {
            slug: 'google-one',
            name: 'Google One',
            type: Type.Subscription,
            category: 'Software & Subscriptions',
            aliases: ['Google Drive storage'],
        },
        {
            slug: 'microsoft-365',
            name: 'Microsoft 365',
            type: Type.Subscription,
            category: 'Software & Subscriptions',
            aliases: ['Office 365'],
        },
        {
            slug: 'chatgpt-plus',
            name: 'ChatGPT Plus',
            type: Type.Subscription,
            category: 'Software & Subscriptions',
            aliases: ['OpenAI'],
        },
        {
            slug: 'claude-pro',
            name: 'Claude Pro',
            type: Type.Subscription,
            category: 'Software & Subscriptions',
            aliases: ['Anthropic'],
        },
        {
            slug: 'canva-pro',
            name: 'Canva Pro',
            type: Type.Subscription,
            category: 'Software & Subscriptions',
            aliases: ['Canva'],
        },
        {
            slug: 'adobe-creative-cloud',
            name: 'Adobe Creative Cloud',
            type: Type.Subscription,
            category: 'Software & Subscriptions',
            aliases: ['Adobe', 'Photoshop'],
        },
        {
            slug: 'notion',
            name: 'Notion',
            type: Type.Subscription,
            category: 'Software & Subscriptions',
        },

        // Entertainment
        {
            slug: 'playstation-plus',
            name: 'PlayStation Plus',
            type: Type.Subscription,
            category: 'Entertainment',
            aliases: ['PS Plus'],
        },
        {
            slug: 'xbox-game-pass',
            name: 'Xbox Game Pass',
            type: Type.Subscription,
            category: 'Entertainment',
            aliases: ['Game Pass'],
        },
        {
            slug: 'nintendo-switch-online',
            name: 'Nintendo Switch Online',
            type: Type.Subscription,
            category: 'Entertainment',
            default_billing_cycle: Cycle.Yearly,
        },

        // Utilities: electricity and water change every month.
        {
            slug: 'meralco',
            name: 'Meralco',
            type: Type.Bills,
            category: 'Utilities',
            default_pricing_type: Pricing.Variable,
            aliases: ['Manila Electric', 'Electricity'],
        },
        {
            slug: 'maynilad',
            name: 'Maynilad',
            type: Type.Bills,
            category: 'Utilities',
            default_pricing_type: Pricing.Variable,
            aliases: ['Water'],
        },
        {
            slug: 'manila-water',
            name: 'Manila Water',
            type: Type.Bills,
            category: 'Utilities',
            default_pricing_type: Pricing.Variable,
            aliases: ['Water'],
        },

        // Utilities: internet and postpaid plans are usually a fixed amount.
        {
            slug: 'pldt-home',
            name: 'PLDT Home Fiber',
            type: Type.Bills,
            category: 'Utilities',
            default_pricing_type: Pricing.Fixed,
            aliases: ['PLDT', 'Internet'],
        },
        {
            slug: 'globe-at-home',
            name: 'Globe At Home',
            type: Type.Bills,
            category: 'Utilities',
            default_pricing_type: Pricing.Fixed,
            aliases: ['Globe Fiber', 'Internet'],
        },
        {
            slug: 'converge',
            name: 'Converge ICT',
            type: Type.Bills,
            category: 'Utilities',
            default_pricing_type: Pricing.Fixed,
            aliases: ['Converge', 'Internet'],
        },
        {
            slug: 'sky-fiber',
            name: 'Sky Fiber',
            type: Type.Bills,
            category: 'Utilities',
            default_pricing_type: Pricing.Fixed,
            aliases: ['Sky', 'Internet'],
        },
        {
            slug: 'globe-postpaid',
            name: 'Globe Postpaid',
            type: Type.Bills,
            category: 'Utilities',
            default_pricing_type: Pricing.Fixed,
            aliases: ['Globe Platinum', 'Mobile'],
        },
        {
            slug: 'smart-postpaid',
            name: 'Smart Postpaid',
            type: Type.Bills,
            category: 'Utilities',
            default_pricing_type: Pricing.Fixed,
            aliases: ['Smart Signature', 'Mobile'],
        },
        {
            slug: 'dito-postpaid',
            name: 'DITO Postpaid',
            type: Type.Bills,
            category: 'Utilities',
            default_pricing_type: Pricing.Fixed,
            aliases: ['DITO', 'Mobile'],
        },

        // Government contributions (voluntary / self-employed members).
        {
            slug: 'sss',
            name: 'SSS Contribution',
            type: Type.Bills,
            category: 'Insurance',
            default_pricing_type: Pricing.Fixed,
            aliases: ['Social Security System'],
        },
        {
            slug: 'philhealth',
            name: 'PhilHealth Contribution',
            type: Type.Bills,
            category: 'Insurance',
            default_pricing_type: Pricing.Fixed,
            aliases: ['PhilHealth'],
        },
        {
            slug: 'pag-ibig',
            name: 'Pag-IBIG Contribution',
            type: Type.Bills,
            category: 'Housing & Rent',
            default_pricing_type: Pricing.Fixed,
            aliases: ['HDMF', 'Pag-IBIG Fund', 'MP2'],
        },

        // Health & Fitness
        {
            slug: 'anytime-fitness',
            name: 'Anytime Fitness',
            type: Type.Subscription,
            category: 'Health & Fitness',
            aliases: ['Gym'],
        },
    ];
