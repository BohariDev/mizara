import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Op, Sequelize } from 'sequelize';
import { addMonths, addQuarters, addWeeks, addYears, format } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

import { RecurringPaymentModel } from '@/recurring-payment/models/recurring-payment.model';
import { CreateRecurringPaymentDto } from '@/recurring-payment/dto/create-recurring-payment.dto';
import { FindAllRecurringPaymentDto } from '@/recurring-payment/dto/find-all-recurring-payment.dto';
import { UpdateRecurringPaymentDto } from '@/recurring-payment/dto/update-recurring-payment.dto';
import { ConfirmBillingCycleDto } from '@/recurring-payment/dto/confirm-billing-cycle.dto';
import {
    NotificationType,
    RecurringPaymentBillingCycle,
    RecurringPaymentBillingDateType,
    RecurringPaymentDueDateType,
    RecurringPaymentPricingType,
    RecurringPaymentSortBy,
    RecurringPaymentType,
    SortOrder,
} from '@/common/enum';
import { UserService } from '@/user/user.service';
import { EmailService } from '@/email/email.service';
import { NotificationService } from '@/notification/notification.service';
import { UserModel } from '@/user/models/user.model';
import { UserSettingsModel } from '@/user/models/user-settings.model';

const DEFAULT_TIMEZONE = 'Asia/Manila';

@Injectable()
export class RecurringPaymentService {
    private readonly logger = new Logger(RecurringPaymentService.name);

    constructor(
        @InjectModel(RecurringPaymentModel)
        private recurringPaymentModel: typeof RecurringPaymentModel,
        @InjectConnection()
        private readonly sequelize: Sequelize,
        private readonly userService: UserService,
        private readonly emailService: EmailService,
        private readonly notificationService: NotificationService,
    ) {}

    async create(
        dto: CreateRecurringPaymentDto,
        currentUserId: string,
        currentUserEmail: string,
    ) {
        const transaction = await this.sequelize.transaction();
        try {
            this.logger.log(
                `Creating recurring payment for user: ${currentUserEmail}`,
            );

            const createdRecurringPayment =
                await this.recurringPaymentModel.create(
                    {
                        user_id: currentUserId,
                        name: dto.name,
                        type: dto.type,
                        description: dto.description,
                        amount: dto.amount,
                        currency: dto.currency,
                        billing_cycle: dto.billing_cycle,
                        due_date: new Date(dto.due_date),
                        pricing_type: dto.pricing_type,
                        billing_date: dto.billing_date
                            ? new Date(dto.billing_date)
                            : null,
                        billing_date_type: dto.billing_date_type,
                        due_date_type: dto.due_date_type,
                        is_paid: dto.is_paid,
                        is_auto_renew: dto.is_auto_renew,
                        is_archived: dto.is_archived,
                        is_free_trial: dto.is_free_trial,
                        icon: dto.icon,
                        category: dto.category,
                    },
                    { transaction },
                );

            await transaction.commit();

            this.logger.log(
                `Successfully created recurring payment for user: ${currentUserEmail}`,
            );

            return {
                message: 'Successfully created recurring payment',
                data: { id: createdRecurringPayment.id },
            };
        } catch (error) {
            await transaction.rollback();

            if (error instanceof NotFoundException) {
                throw error;
            }

            this.logger.error(
                `Error creating recurring payment for user: ${currentUserEmail}`,
                error,
            );

            throw error;
        }
    }

    async findAll(
        currentUserId: string,
        currentUserEmail: string,
        query: FindAllRecurringPaymentDto,
    ) {
        try {
            this.logger.log(
                `Fetching recurring payments for user: ${currentUserEmail}`,
            );

            const page = query.page ?? 1;
            const limit = query.limit ?? 10;
            const sortBy = query.sort_by ?? RecurringPaymentSortBy.DueDate;
            const sortOrder = query.sort_order ?? SortOrder.ASC;

            const { rows, count } =
                await this.recurringPaymentModel.findAndCountAll({
                    where: {
                        user_id: currentUserId,
                        ...(query.type !== undefined && { type: query.type }),
                        ...(query.is_archived !== undefined && {
                            is_archived: query.is_archived,
                        }),
                        ...(query.is_auto_renew !== undefined && {
                            is_auto_renew: query.is_auto_renew,
                        }),
                        ...(query.is_free_trial !== undefined && {
                            is_free_trial: query.is_free_trial,
                        }),
                        ...(query.category !== undefined && {
                            category: query.category,
                        }),
                        ...(query.needs_cycle_confirmation !== undefined && {
                            needs_cycle_confirmation:
                                query.needs_cycle_confirmation,
                        }),
                        // Rolled-over dates are only expected until the
                        // billing date arrives - ask then, when the user has
                        // the actual bill.
                        ...(query.confirmation_due_before !== undefined && {
                            needs_cycle_confirmation: true,
                            [Op.and]: [
                                {
                                    [Op.or]: [
                                        { billing_date: null },
                                        {
                                            billing_date: {
                                                [Op.lt]: new Date(
                                                    query.confirmation_due_before,
                                                ),
                                            },
                                        },
                                    ],
                                },
                            ],
                        }),
                        ...(query.search && {
                            [Op.or]: [
                                { name: { [Op.iLike]: `%${query.search}%` } },
                                {
                                    description: {
                                        [Op.iLike]: `%${query.search}%`,
                                    },
                                },
                            ],
                        }),
                    },
                    limit,
                    offset: (page - 1) * limit,
                    order: [[sortBy, sortOrder]],
                });

            this.logger.log(
                `Fetched recurring payments successfully for user: ${currentUserEmail}`,
            );

            return {
                message: 'Fetched recurring payments successfully',
                data: rows,
                metadata: {
                    total: count,
                    page,
                    limit,
                    totalPages: Math.ceil(count / limit),
                },
            };
        } catch (error) {
            this.logger.error(
                `Error fetching recurring payments for user: ${currentUserEmail}`,
            );

            throw error;
        }
    }

    async findOne(id: string, currentUserId: string, currentUserEmail: string) {
        this.logger.log(
            `Fetching recurring payment ${id} for user: ${currentUserEmail}`,
        );

        const recurringPayment = await this.findByIdAndOwnerId(
            id,
            currentUserId,
            currentUserEmail,
        );

        this.logger.log(
            `Fetched recurring payment ${id} successfully for user: ${currentUserEmail}`,
        );

        return {
            message: 'Fetched recurring payment successfully',
            data: recurringPayment,
        };
    }

    async update(
        id: string,
        dto: UpdateRecurringPaymentDto,
        currentUserId: string,
        currentUserEmail: string,
    ) {
        const transaction = await this.sequelize.transaction();
        try {
            this.logger.log(
                `Updating recurring payment ${id} for user: ${currentUserEmail}`,
            );

            const recurringPayment = await this.recurringPaymentModel.findOne({
                where: { id, user_id: currentUserId },
                transaction,
            });

            if (!recurringPayment) {
                this.logger.warn(
                    `Recurring payment ${id} not found for user: ${currentUserEmail}`,
                );
                throw new NotFoundException('Recurring payment not found');
            }

            await recurringPayment.update(
                {
                    ...(dto.name !== undefined && { name: dto.name }),
                    ...(dto.type !== undefined && { type: dto.type }),
                    ...(dto.description !== undefined && {
                        description: dto.description,
                    }),
                    ...(dto.amount !== undefined && { amount: dto.amount }),
                    ...(dto.currency !== undefined && {
                        currency: dto.currency,
                    }),
                    ...(dto.billing_cycle !== undefined && {
                        billing_cycle: dto.billing_cycle,
                    }),
                    ...(dto.due_date !== undefined && {
                        due_date: new Date(dto.due_date),
                    }),
                    ...(dto.pricing_type !== undefined && {
                        pricing_type: dto.pricing_type,
                    }),
                    ...(dto.billing_date !== undefined && {
                        billing_date: new Date(dto.billing_date),
                    }),
                    ...(dto.billing_date_type !== undefined && {
                        billing_date_type: dto.billing_date_type,
                    }),
                    ...(dto.due_date_type !== undefined && {
                        due_date_type: dto.due_date_type,
                    }),
                    ...(dto.is_paid !== undefined && {
                        is_paid: dto.is_paid,
                    }),
                    ...(dto.is_auto_renew !== undefined && {
                        is_auto_renew: dto.is_auto_renew,
                    }),
                    ...(dto.is_archived !== undefined && {
                        is_archived: dto.is_archived,
                    }),
                    ...(dto.is_free_trial !== undefined && {
                        is_free_trial: dto.is_free_trial,
                    }),
                    ...(dto.icon !== undefined && { icon: dto.icon }),
                    ...(dto.category !== undefined && {
                        category: dto.category,
                    }),
                },
                { transaction },
            );

            await transaction.commit();

            this.logger.log(
                `Successfully updated recurring payment ${id} for user: ${currentUserEmail}`,
            );

            return { message: 'Successfully updated recurring payment' };
        } catch (error) {
            await transaction.rollback();

            if (error instanceof NotFoundException) {
                throw error;
            }

            this.logger.error(
                `Error updating recurring payment ${id} for user: ${currentUserEmail}`,
                error,
            );

            throw error;
        }
    }

    async remove(id: string, currentUserId: string, currentUserEmail: string) {
        const transaction = await this.sequelize.transaction();
        try {
            this.logger.log(
                `Deleting recurring payment ${id} for user: ${currentUserEmail}`,
            );

            const recurringPayment = await this.recurringPaymentModel.findOne({
                where: { id, user_id: currentUserId },
                transaction,
            });

            if (!recurringPayment) {
                this.logger.warn(
                    `Recurring payment ${id} not found for user: ${currentUserEmail}`,
                );
                throw new NotFoundException('Recurring payment not found');
            }

            await recurringPayment.destroy({ transaction });

            await transaction.commit();

            this.logger.log(
                `Successfully deleted recurring payment ${id} for user: ${currentUserEmail}`,
            );

            return { message: 'Successfully deleted recurring payment' };
        } catch (error) {
            await transaction.rollback();

            if (error instanceof NotFoundException) {
                throw error;
            }

            this.logger.error(
                `Error deleting recurring payment ${id} for user: ${currentUserEmail}`,
                error,
            );

            throw error;
        }
    }

    async findByIdAndOwnerId(
        id: string,
        currentUserId: string,
        currentUserEmail: string,
    ) {
        const recurringPayment = await this.recurringPaymentModel.findOne({
            where: { id: id, user_id: currentUserId },
        });

        if (!recurringPayment) {
            this.logger.warn(
                `Recurring payment ${id} not found for user: ${currentUserEmail}`,
            );
            throw new NotFoundException('Recurring payment not found');
        }

        return recurringPayment;
    }

    async rolloverBillingCycles() {
        this.logger.log(
            'Rolling over billing cycles for elapsed recurring payments...',
        );

        const elapsedPayments = await this.recurringPaymentModel.findAll({
            where: {
                is_archived: false,
                due_date: {
                    [Op.lt]: new Date(),
                },
            },
            include: [
                {
                    model: UserModel,
                    as: 'user',
                    attributes: ['id'],
                    include: [
                        {
                            model: UserSettingsModel,
                            as: 'settings',
                            attributes: ['timezone'],
                        },
                    ],
                },
            ],
        });

        let processedCount = 0;

        for (const payment of elapsedPayments) {
            const userSettingsTimezone =
                payment.user.settings?.timezone ?? DEFAULT_TIMEZONE;

            const now = toZonedTime(new Date(), userSettingsTimezone);
            const todayDateOnly = format(now, 'yyyy-MM-dd');

            const dueDateInTz = toZonedTime(
                payment.due_date,
                userSettingsTimezone,
            );

            const isDueToday =
                format(dueDateInTz, 'yyyy-MM-dd') >= todayDateOnly;

            // Auto-renewing free trials convert to paid on their end day,
            // since that's when the first charge happens. They get no
            // end-day reminder - the conversion notice replaces it.
            const isTrialConvertingToday =
                isDueToday && payment.is_free_trial && payment.is_auto_renew;

            // Due date's calendar day may still be today (reminders may
            // still be firing for it) - only roll forward past due dates.
            if (isDueToday && !isTrialConvertingToday) {
                continue;
            }

            // Unpaid bills stay on their current cycle so they show as overdue.
            if (
                payment.type === RecurringPaymentType.Bills &&
                !payment.is_paid
            ) {
                continue;
            }

            const wasFreeTrial = payment.is_free_trial;
            let wasArchived = false;
            let nextDueDate: Date | null = null;

            const transaction = await this.sequelize.transaction();
            try {
                if (!payment.is_auto_renew) {
                    await payment.update(
                        { is_archived: true },
                        { transaction },
                    );
                    await transaction.commit();
                    processedCount++;
                    wasArchived = true;
                } else {
                    if (payment.is_free_trial) {
                        await payment.update(
                            { is_free_trial: false },
                            { transaction },
                        );
                    }

                    if (payment.is_paid) {
                        await payment.update(
                            { is_paid: false },
                            { transaction },
                        );
                    }

                    let nextDueDateInTz = dueDateInTz;
                    let nextBillingDateInTz = payment.billing_date
                        ? toZonedTime(
                              payment.billing_date,
                              userSettingsTimezone,
                          )
                        : null;
                    do {
                        nextDueDateInTz = this.getNextDueDate(
                            nextDueDateInTz,
                            payment.billing_cycle,
                        );
                        // Billing date moves in lockstep with the due date so
                        // they stay the same number of cycles apart.
                        if (nextBillingDateInTz) {
                            nextBillingDateInTz = this.getNextDueDate(
                                nextBillingDateInTz,
                                payment.billing_cycle,
                            );
                        }
                    } while (
                        format(nextDueDateInTz, 'yyyy-MM-dd') < todayDateOnly
                    );

                    nextDueDate = fromZonedTime(
                        nextDueDateInTz,
                        userSettingsTimezone,
                    );

                    await payment.update(
                        {
                            due_date: nextDueDate,
                            billing_date: nextBillingDateInTz
                                ? fromZonedTime(
                                      nextBillingDateInTz,
                                      userSettingsTimezone,
                                  )
                                : null,
                            is_paid: false,
                            needs_cycle_confirmation:
                                this.hasVariableCycleFields(payment),
                        },
                        { transaction },
                    );
                    await transaction.commit();
                    processedCount++;
                }
            } catch (error) {
                await transaction.rollback();

                this.logger.error(
                    `Error rolling over billing cycle for recurring payment: ${payment.id}`,
                    error,
                );
                continue;
            }

            if (wasFreeTrial) {
                try {
                    if (wasArchived) {
                        await this.notifyFreeTrialEnded(payment, dueDateInTz);
                    } else if (nextDueDate) {
                        await this.notifyFreeTrialConvertedToPaid(
                            payment,
                            nextDueDate,
                            userSettingsTimezone,
                        );
                    }
                } catch (error) {
                    this.logger.error(
                        `Error sending free trial email for recurring payment: ${payment.id}`,
                        error,
                    );
                }
            } else if (wasArchived) {
                try {
                    await this.notifyPaymentArchived(payment, dueDateInTz);
                } catch (error) {
                    this.logger.error(
                        `Error sending archived email for recurring payment: ${payment.id}`,
                        error,
                    );
                }
            }
        }

        this.logger.log(
            `Completed rolling over billing cycles for ${processedCount} recurring payment(s)`,
        );
    }

    private async notifyFreeTrialConvertedToPaid(
        payment: RecurringPaymentModel,
        nextDueDate: Date,
        timezone: string,
    ) {
        const foundUser = await this.userService.findById(payment.user_id);

        if (!foundUser) {
            this.logger.warn(
                `User not found for recurring payment: ${payment.id} - free trial converted email not sent.`,
            );
            return;
        }

        await this.createNotification(payment, {
            type: NotificationType.FreeTrialConvertedToPaid,
            title: `${payment.name} is now a paid subscription`,
            body: `Your free trial has ended. Your next payment of ${payment.currency} ${payment.amount} is due on ${format(toZonedTime(nextDueDate, timezone), 'MMMM d, yyyy')}.`,
            data: { due_date: nextDueDate },
        });

        await this.emailService.sendFreeTrialConvertedToPaid(
            foundUser.email,
            foundUser.first_name,
            payment.name,
            String(payment.amount),
            payment.currency,
            nextDueDate,
            payment.billing_cycle,
        );
    }

    private async notifyFreeTrialEnded(
        payment: RecurringPaymentModel,
        trialEndDate: Date,
    ) {
        const foundUser = await this.userService.findById(payment.user_id);

        if (!foundUser) {
            this.logger.warn(
                `User not found for recurring payment: ${payment.id} - free trial ended email not sent.`,
            );
            return;
        }

        await this.createNotification(payment, {
            type: NotificationType.FreeTrialEnded,
            title: `${payment.name} free trial has ended`,
            body: `Your trial ended on ${format(trialEndDate, 'MMMM d, yyyy')}. It wasn't set to auto-renew, so it was cancelled and archived.`,
            data: { due_date: payment.due_date },
        });

        await this.emailService.sendFreeTrialEnded(
            foundUser.email,
            foundUser.first_name,
            payment.name,
            trialEndDate,
        );
    }

    private async notifyPaymentArchived(
        payment: RecurringPaymentModel,
        dueDate: Date,
    ) {
        const foundUser = await this.userService.findById(payment.user_id);

        if (!foundUser) {
            this.logger.warn(
                `User not found for recurring payment: ${payment.id} - archived email not sent.`,
            );
            return;
        }

        await this.createNotification(payment, {
            type: NotificationType.PaymentArchived,
            title: `${payment.name} was archived`,
            body: `It was due on ${format(dueDate, 'MMMM d, yyyy')} and isn't set to auto-renew, so it was moved to your archived payments.`,
            data: { due_date: payment.due_date },
        });

        await this.emailService.sendPaymentArchived(
            foundUser.email,
            foundUser.first_name,
            payment.name,
            dueDate,
        );
    }

    // A failed notification shouldn't stop the email from being sent.
    private async createNotification(
        payment: RecurringPaymentModel,
        notification: {
            type: NotificationType;
            title: string;
            body: string;
            data: Record<string, unknown>;
        },
    ) {
        try {
            await this.notificationService.create({
                user_id: payment.user_id,
                recurring_payment_id: payment.id,
                ...notification,
            });
        } catch (error) {
            this.logger.error(
                `Error creating ${notification.type} notification for recurring payment: ${payment.id}`,
                error,
            );
        }
    }

    async confirmBillingCycle(
        id: string,
        dto: ConfirmBillingCycleDto,
        currentUserId: string,
        currentUserEmail: string,
    ) {
        const transaction = await this.sequelize.transaction();
        try {
            this.logger.log(
                `Confirming billing cycle for recurring payment ${id} for user: ${currentUserEmail}`,
            );

            const recurringPayment = await this.recurringPaymentModel.findOne({
                where: { id, user_id: currentUserId },
                transaction,
            });

            if (!recurringPayment) {
                this.logger.warn(
                    `Recurring payment ${id} not found for user: ${currentUserEmail}`,
                );
                throw new NotFoundException('Recurring payment not found');
            }

            // Omitted fields mean the user confirmed the rolled-over values.
            await recurringPayment.update(
                {
                    ...(dto.billing_date !== undefined && {
                        billing_date: new Date(dto.billing_date),
                    }),
                    ...(dto.due_date !== undefined && {
                        due_date: new Date(dto.due_date),
                    }),
                    ...(dto.amount !== undefined && { amount: dto.amount }),
                    needs_cycle_confirmation: false,
                },
                { transaction },
            );

            await transaction.commit();

            this.logger.log(
                `Successfully confirmed billing cycle for recurring payment ${id} for user: ${currentUserEmail}`,
            );

            return { message: 'Successfully confirmed billing cycle' };
        } catch (error) {
            await transaction.rollback();

            if (error instanceof NotFoundException) {
                throw error;
            }

            this.logger.error(
                `Error confirming billing cycle for recurring payment ${id} for user: ${currentUserEmail}`,
                error,
            );

            throw error;
        }
    }

    private hasVariableCycleFields(payment: RecurringPaymentModel): boolean {
        return (
            payment.billing_date_type ===
                RecurringPaymentBillingDateType.Variable ||
            payment.due_date_type === RecurringPaymentDueDateType.Variable ||
            payment.pricing_type === RecurringPaymentPricingType.Variable
        );
    }

    private getNextDueDate(
        dueDate: Date,
        billingCycle: RecurringPaymentBillingCycle,
    ): Date {
        switch (billingCycle) {
            case RecurringPaymentBillingCycle.Weekly:
                return addWeeks(dueDate, 1);
            case RecurringPaymentBillingCycle.Monthly:
                return addMonths(dueDate, 1);
            case RecurringPaymentBillingCycle.Quarterly:
                return addQuarters(dueDate, 1);
            case RecurringPaymentBillingCycle.Yearly:
                return addYears(dueDate, 1);
        }
    }
}
