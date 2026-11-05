import { Test, TestingModule } from '@nestjs/testing';

import { RecurringPaymentPresetService } from './recurring-payment-preset.service';
import { RECURRING_PAYMENT_PRESETS } from './recurring-payment-presets.data';
import { RECURRING_PAYMENT_CATEGORIES } from './recurring-payment-categories.data';
import {
    RecurringPaymentBillingCycle,
    RecurringPaymentCategory,
    RecurringPaymentType,
} from '@/common/enum';

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
                category: RecurringPaymentCategory.Streaming,
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
    });

    describe('RECURRING_PAYMENT_CATEGORIES data', () => {
        it('lists every category exactly once', () => {
            const ids = RECURRING_PAYMENT_CATEGORIES.map((c) => c.id);
            expect([...ids].sort()).toEqual(
                Object.values(RecurringPaymentCategory).sort(),
            );
        });

        // Every preset category needs a label for the app to show.
        it('has a label for every category a preset uses', () => {
            const ids = new Set(RECURRING_PAYMENT_CATEGORIES.map((c) => c.id));
            const unknown = RECURRING_PAYMENT_PRESETS.filter(
                (preset) => !ids.has(preset.category),
            ).map((preset) => `${preset.slug}: ${preset.category}`);

            expect(unknown).toEqual([]);
        });
    });
});
