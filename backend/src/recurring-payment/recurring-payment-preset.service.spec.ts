import { Test, TestingModule } from '@nestjs/testing';

import { RecurringPaymentPresetService } from './recurring-payment-preset.service';
import { RECURRING_PAYMENT_PRESETS } from './recurring-payment-presets.data';
import {
    RecurringPaymentBillingCycle,
    RecurringPaymentType,
} from '@/common/enum';

// The seeder is a CommonJS file, so it's loaded with require().
type CategoriesSeeder = { DEFAULT_CATEGORIES: { name: string }[] };
const SEEDER_PATH = '../database/seeders/20260829071722-categories.js';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DEFAULT_CATEGORIES } = require(SEEDER_PATH) as CategoriesSeeder;

describe('RecurringPaymentPresetService', () => {
    let service: RecurringPaymentPresetService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [RecurringPaymentPresetService],
        }).compile();

        service = module.get<RecurringPaymentPresetService>(
            RecurringPaymentPresetService,
        );
    });

    describe('findAll', () => {
        it('returns every preset in list order', () => {
            const result = service.findAll({});

            expect(result.message).toBe(
                'Fetched recurring payment presets successfully',
            );
            expect(result.data.map((preset) => preset.slug)).toEqual(
                RECURRING_PAYMENT_PRESETS.map((preset) => preset.slug),
            );
        });

        it('fills in icon, aliases and defaults', () => {
            const netflix = service
                .findAll({})
                .data.find((preset) => preset.slug === 'netflix');

            expect(netflix).toEqual({
                slug: 'netflix',
                name: 'Netflix',
                type: RecurringPaymentType.Subscription,
                category: 'Streaming',
                icon: 'presets/netflix.webp',
                aliases: [],
                default_billing_cycle: RecurringPaymentBillingCycle.Monthly,
                default_pricing_type: null,
            });
        });

        it('filters by type', () => {
            const result = service.findAll({
                type: RecurringPaymentType.Bills,
            });

            expect(result.data.length).toBeGreaterThan(0);
            expect(
                result.data.every(
                    (preset) => preset.type === RecurringPaymentType.Bills,
                ),
            ).toBe(true);
        });
    });

    describe('RECURRING_PAYMENT_PRESETS data', () => {
        it('has unique slugs', () => {
            const slugs = RECURRING_PAYMENT_PRESETS.map(
                (preset) => preset.slug,
            );
            expect(new Set(slugs).size).toBe(slugs.length);
        });

        it('only uses slugs that are safe as file names', () => {
            for (const preset of RECURRING_PAYMENT_PRESETS) {
                expect(preset.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
            }
        });

        // The app matches presets to categories by name, so a renamed
        // system category would silently leave presets without one.
        it('only uses system category names from the categories seeder', () => {
            const categoryNames = new Set(
                DEFAULT_CATEGORIES.map((c) => c.name),
            );
            const unknown = RECURRING_PAYMENT_PRESETS.filter(
                (preset) => !categoryNames.has(preset.category),
            ).map((preset) => `${preset.slug}: ${preset.category}`);

            expect(unknown).toEqual([]);
        });
    });
});
