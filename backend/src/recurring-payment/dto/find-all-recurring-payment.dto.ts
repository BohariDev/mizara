import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

import {
    RecurringPaymentSortBy,
    RecurringPaymentType,
    SortOrder,
    RecurringPaymentCategory,
} from '@/common/enum';
import { IsDateStringWithOffset } from '@/common/validators/is-date-string-with-offset.validator';

const toBoolean = ({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
};

export class FindAllRecurringPaymentDto {
    @ApiPropertyOptional({ default: 1, example: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ default: 10, example: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @ApiPropertyOptional({
        enum: RecurringPaymentSortBy,
        default: RecurringPaymentSortBy.DueDate,
        example: RecurringPaymentSortBy.DueDate,
    })
    @IsOptional()
    @IsEnum(RecurringPaymentSortBy)
    sort_by?: RecurringPaymentSortBy = RecurringPaymentSortBy.DueDate;

    @ApiPropertyOptional({
        enum: SortOrder,
        default: SortOrder.ASC,
        example: SortOrder.ASC,
    })
    @IsOptional()
    @IsEnum(SortOrder)
    sort_order?: SortOrder = SortOrder.ASC;

    @ApiPropertyOptional({
        enum: RecurringPaymentType,
        example: RecurringPaymentType.Subscription,
    })
    @IsOptional()
    @IsEnum(RecurringPaymentType)
    type?: RecurringPaymentType;

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @Transform(toBoolean)
    @IsBoolean()
    is_archived?: boolean;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @Transform(toBoolean)
    @IsBoolean()
    is_auto_renew?: boolean;

    @ApiPropertyOptional({
        example: 'Netflix',
        description: 'Searches by name or description',
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @Transform(toBoolean)
    @IsBoolean()
    is_free_trial?: boolean;

    @ApiPropertyOptional({
        example: true,
        description:
            'Filters payments awaiting the user to confirm the new billing cycle',
    })
    @IsOptional()
    @Transform(toBoolean)
    @IsBoolean()
    needs_cycle_confirmation?: boolean;

    @ApiPropertyOptional({
        example: '2026-10-11T00:00:00+08:00',
        description:
            "Returns payments awaiting cycle confirmation whose billing date is before this time, or that have no billing date. Pass the start of tomorrow in the user's timezone to get the prompts that are ready today.",
    })
    @IsOptional()
    @IsDateStringWithOffset()
    confirmation_due_before?: string;

    @ApiPropertyOptional({
        enum: RecurringPaymentCategory,
        example: RecurringPaymentCategory.Streaming,
    })
    @IsOptional()
    @IsEnum(RecurringPaymentCategory)
    category?: RecurringPaymentCategory;
}
