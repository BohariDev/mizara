import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { RecurringPaymentService } from '@/recurring-payment/recurring-payment.service';
import { RecurringPaymentPresetService } from '@/recurring-payment/recurring-payment-preset.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { CreateRecurringPaymentDto } from './dto/create-recurring-payment.dto';
import { FindAllRecurringPaymentDto } from './dto/find-all-recurring-payment.dto';
import { UpdateRecurringPaymentDto } from './dto/update-recurring-payment.dto';
import { ConfirmBillingCycleDto } from './dto/confirm-billing-cycle.dto';
import { FindAllRecurringPaymentPresetDto } from './dto/find-all-recurring-payment-preset.dto';
import { RECURRING_PAYMENT_CATEGORIES } from './recurring-payment-categories.data';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';

@ApiTags('Recurring Payment')
@ApiBearerAuth()
@Controller('/api/recurring-payment')
export class RecurringPaymentController {
    constructor(
        private readonly recurringPaymentService: RecurringPaymentService,
        private readonly recurringPaymentPresetService: RecurringPaymentPresetService,
    ) {}

    @UseGuards(JwtAuthGuard)
    @Post('')
    @HttpCode(HttpStatus.CREATED)
    async create(
        @CurrentUser() user: AuthenticatedUser,
        @Body() dto: CreateRecurringPaymentDto,
    ) {
        return this.recurringPaymentService.create(dto, user.id, user.email);
    }

    @UseGuards(JwtAuthGuard)
    @Get('')
    @HttpCode(HttpStatus.OK)
    async findAll(
        @CurrentUser() user: AuthenticatedUser,
        @Query() query: FindAllRecurringPaymentDto,
    ) {
        return this.recurringPaymentService.findAll(user.id, user.email, query);
    }

    // Declared before ':id' so "categories" isn't matched as an ID.
    @UseGuards(JwtAuthGuard)
    @Get('categories')
    @HttpCode(HttpStatus.OK)
    findAllCategories() {
        return {
            message: 'Fetched recurring payment categories successfully',
            data: RECURRING_PAYMENT_CATEGORIES,
        };
    }

    // Declared before ':id' so "presets" isn't matched as an ID.
    @UseGuards(JwtAuthGuard)
    @Get('presets')
    @HttpCode(HttpStatus.OK)
    findAllPresets(@Query() query: FindAllRecurringPaymentPresetDto) {
        return this.recurringPaymentPresetService.findAll(query);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async findOne(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.recurringPaymentService.findOne(id, user.id, user.email);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    async update(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateRecurringPaymentDto,
    ) {
        return this.recurringPaymentService.update(
            id,
            dto,
            user.id,
            user.email,
        );
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/confirm-cycle')
    @HttpCode(HttpStatus.OK)
    async confirmBillingCycle(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ConfirmBillingCycleDto,
    ) {
        return this.recurringPaymentService.confirmBillingCycle(
            id,
            dto,
            user.id,
            user.email,
        );
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async remove(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.recurringPaymentService.remove(id, user.id, user.email);
    }
}
