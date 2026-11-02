import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { RecurringPaymentType } from '@/common/enum';

export class FindAllRecurringPaymentPresetDto {
    @ApiProperty({
        enum: RecurringPaymentType,
        required: false,
        description: 'Only return presets of this type.',
    })
    @IsOptional()
    @IsEnum(RecurringPaymentType)
    type?: RecurringPaymentType;
}
