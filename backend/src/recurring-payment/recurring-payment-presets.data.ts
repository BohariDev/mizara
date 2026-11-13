// Relative import (not '@/...') so scripts/logos/build-logos.js can load
// this file with ts-node, which doesn't resolve the path alias.
import {
    RecurringPaymentBillingCycle as Cycle,
    RecurringPaymentCategory as Category,
    RecurringPaymentPricingType as Pricing,
    RecurringPaymentType as Type,
} from '../common/enum';

export type RecurringPaymentPresetData = {
    /** Unique and stable; also the logo file name (presets/<slug>.webp). */
    slug: string;
    name: string;
    type: Type;
    /** One of the constant categories in recurring-payment-categories.data.ts. */
    category: Category;
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
            category: Category.Streaming,
        },
        {
            slug: 'spotify',
            name: 'Spotify',
            type: Type.Subscription,
            category: Category.Streaming,
        },
        {
            slug: 'youtube-premium',
            name: 'YouTube Premium',
            type: Type.Subscription,
            category: Category.Streaming,
            aliases: ['YT Premium', 'YouTube Music'],
        },
        {
            slug: 'disney-plus',
            name: 'Disney+',
            type: Type.Subscription,
            category: Category.Streaming,
            aliases: ['Disney Plus'],
        },
        {
            slug: 'hbo-max',
            name: 'HBO Max',
            type: Type.Subscription,
            category: Category.Streaming,
            aliases: ['Max'],
        },
        {
            slug: 'prime-video',
            name: 'Prime Video',
            type: Type.Subscription,
            category: Category.Streaming,
            aliases: ['Amazon Prime'],
        },
        {
            slug: 'apple-music',
            name: 'Apple Music',
            type: Type.Subscription,
            category: Category.Streaming,
        },
        {
            slug: 'viu',
            name: 'Viu',
            type: Type.Subscription,
            category: Category.Streaming,
        },
        {
            slug: 'iwanttfc',
            name: 'iWantTFC',
            type: Type.Subscription,
            category: Category.Streaming,
            aliases: ['iWant', 'TFC'],
        },
        {
            slug: 'crunchyroll',
            name: 'Crunchyroll',
            type: Type.Subscription,
            category: Category.Streaming,
        },

        // Software & Subscriptions
        {
            slug: 'icloud',
            name: 'iCloud+',
            type: Type.Subscription,
            category: Category.Software,
            aliases: ['iCloud', 'Apple'],
        },
        {
            slug: 'google-one',
            name: 'Google One',
            type: Type.Subscription,
            category: Category.Software,
            aliases: ['Google Drive storage'],
        },
        {
            slug: 'microsoft-365',
            name: 'Microsoft 365',
            type: Type.Subscription,
            category: Category.Software,
            aliases: ['Office 365'],
        },
        {
            slug: 'chatgpt-plus',
            name: 'ChatGPT Plus',
            type: Type.Subscription,
            category: Category.Software,
            aliases: ['OpenAI'],
        },
        {
            slug: 'claude-pro',
            name: 'Claude Pro',
            type: Type.Subscription,
            category: Category.Software,
            aliases: ['Anthropic'],
        },
        {
            slug: 'canva-pro',
            name: 'Canva Pro',
            type: Type.Subscription,
            category: Category.Software,
            aliases: ['Canva'],
        },
        {
            slug: 'adobe-creative-cloud',
            name: 'Adobe Creative Cloud',
            type: Type.Subscription,
            category: Category.Software,
            aliases: ['Adobe', 'Photoshop'],
        },
        {
            slug: 'notion',
            name: 'Notion',
            type: Type.Subscription,
            category: Category.Software,
        },

        // Entertainment
        {
            slug: 'playstation-plus',
            name: 'PlayStation Plus',
            type: Type.Subscription,
            category: Category.Entertainment,
            aliases: ['PS Plus'],
        },
        {
            slug: 'xbox-game-pass',
            name: 'Xbox Game Pass',
            type: Type.Subscription,
            category: Category.Entertainment,
            aliases: ['Game Pass'],
        },
        {
            slug: 'nintendo-switch-online',
            name: 'Nintendo Switch Online',
            type: Type.Subscription,
            category: Category.Entertainment,
            default_billing_cycle: Cycle.Yearly,
        },

        // Utilities: electricity and water change every month.
        {
            slug: 'meralco',
            name: 'Meralco',
            type: Type.Bills,
            category: Category.Utilities,
            default_pricing_type: Pricing.Variable,
            aliases: ['Manila Electric', 'Electricity'],
        },
        {
            slug: 'maynilad',
            name: 'Maynilad',
            type: Type.Bills,
            category: Category.Utilities,
            default_pricing_type: Pricing.Variable,
            aliases: ['Water'],
        },
        {
            slug: 'manila-water',
            name: 'Manila Water',
            type: Type.Bills,
            category: Category.Utilities,
            default_pricing_type: Pricing.Variable,
            aliases: ['Water'],
        },
        {
            slug: 'cepalco',
            name: 'CEPALCO',
            type: Type.Bills,
            category: Category.Utilities,
            default_pricing_type: Pricing.Variable,
            aliases: ['Cagayan Electric', 'Electricity'],
        },
        {
            slug: 'cagayan-de-oro-water-district',
            name: 'Cagayan de Oro Water District',
            type: Type.Bills,
            category: Category.Utilities,
            default_pricing_type: Pricing.Variable,
            aliases: ['Water'],
        },

        // Utilities: internet and postpaid plans are usually a fixed amount.
        {
            slug: 'pldt-home',
            name: 'PLDT Home Fiber',
            type: Type.Bills,
            category: Category.Utilities,
            default_pricing_type: Pricing.Fixed,
            aliases: ['PLDT', 'Internet'],
        },
        {
            slug: 'globe-at-home',
            name: 'Globe At Home',
            type: Type.Bills,
            category: Category.Utilities,
            default_pricing_type: Pricing.Fixed,
            aliases: ['Globe Fiber', 'Internet'],
        },
        {
            slug: 'converge',
            name: 'Converge ICT',
            type: Type.Bills,
            category: Category.Utilities,
            default_pricing_type: Pricing.Fixed,
            aliases: ['Converge', 'Internet'],
        },
        {
            slug: 'sky-fiber',
            name: 'Sky Fiber',
            type: Type.Bills,
            category: Category.Utilities,
            default_pricing_type: Pricing.Fixed,
            aliases: ['Sky', 'Internet'],
        },
        {
            slug: 'globe-postpaid',
            name: 'Globe Postpaid',
            type: Type.Bills,
            category: Category.Utilities,
            default_pricing_type: Pricing.Fixed,
            aliases: ['Globe Platinum', 'Mobile'],
        },
        {
            slug: 'smart-postpaid',
            name: 'Smart Postpaid',
            type: Type.Bills,
            category: Category.Utilities,
            default_pricing_type: Pricing.Fixed,
            aliases: ['Smart Signature', 'Mobile'],
        },
        {
            slug: 'dito-postpaid',
            name: 'DITO Postpaid',
            type: Type.Bills,
            category: Category.Utilities,
            default_pricing_type: Pricing.Fixed,
            aliases: ['DITO', 'Mobile'],
        },

        // Government contributions (voluntary / self-employed members).
        {
            slug: 'sss',
            name: 'SSS Contribution',
            type: Type.Bills,
            category: Category.Insurance,
            default_pricing_type: Pricing.Fixed,
            aliases: ['Social Security System'],
        },
        {
            slug: 'philhealth',
            name: 'PhilHealth Contribution',
            type: Type.Bills,
            category: Category.Insurance,
            default_pricing_type: Pricing.Fixed,
            aliases: ['PhilHealth'],
        },
        {
            slug: 'pag-ibig',
            name: 'Pag-IBIG Contribution',
            type: Type.Bills,
            category: Category.Housing,
            default_pricing_type: Pricing.Fixed,
            aliases: ['HDMF', 'Pag-IBIG Fund', 'MP2'],
        },

        // Health & Fitness
        {
            slug: 'anytime-fitness',
            name: 'Anytime Fitness',
            type: Type.Subscription,
            category: Category.HealthFitness,
            aliases: ['Gym'],
        },
    ];
