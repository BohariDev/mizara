import { Injectable } from '@nestjs/common';

import { FindAllRecurringPaymentPresetDto } from '@/recurring-payment/dto/find-all-recurring-payment-preset.dto';
import {
    RECURRING_PAYMENT_PRESETS,
    type RecurringPaymentPresetData,
} from '@/recurring-payment/recurring-payment-presets.data';
import { RecurringPaymentBillingCycle } from '@/common/enum';

const toResponse = (preset: RecurringPaymentPresetData) => ({
    slug: preset.slug,
    name: preset.name,
    type: preset.type,
    category: preset.category,
    icon: `presets/${preset.slug}.webp`,
    aliases: preset.aliases ?? [],
    default_billing_cycle:
        preset.default_billing_cycle ?? RecurringPaymentBillingCycle.Monthly,
    default_pricing_type: preset.default_pricing_type ?? null,
});

// Built once at startup; the list only changes when the backend is deployed.
const ALL_PRESETS = RECURRING_PAYMENT_PRESETS.map(toResponse);

@Injectable()
export class RecurringPaymentPresetService {
    /**
     * Returns the presets (optionally filtered by type) from the constant
     * list, with no database query. The app fetches the whole list once and
     * searches it on the device.
     */
    findAll(query: FindAllRecurringPaymentPresetDto) {
        const presets =
            query.type === undefined
                ? ALL_PRESETS
                : ALL_PRESETS.filter((preset) => preset.type === query.type);

        return {
            message: 'Fetched recurring payment presets successfully',
            data: presets,
        };
    }
}
