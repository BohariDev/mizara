import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import { RecurringPaymentModel } from '@/recurring-payment/models/recurring-payment.model';
import { RecurringPaymentBillingCycle } from '@/common/enum';

@Injectable()
export class DashboardService {
    private readonly logger = new Logger(DashboardService.name);

    constructor(
        @InjectModel(RecurringPaymentModel)
        private recurringPaymentModel: typeof RecurringPaymentModel,
    ) {}

    async getOverview(currentUserId: string, currentUserEmail: string) {
        try {
            this.logger.log(
                `Fetching dashboard overview for user: ${currentUserEmail}`,
            );

            const recurringPayments = await this.recurringPaymentModel.findAll({
                where: {
                    user_id: currentUserId,
                    is_archived: false,
                    is_paid: false,
                },
            });

            const now = new Date();

            // Start of today
            const startOfToday = new Date(now);
            startOfToday.setHours(0, 0, 0, 0);

            // 7 days from today
            const endOfUpcomingPeriod = new Date(startOfToday);
            endOfUpcomingPeriod.setDate(endOfUpcomingPeriod.getDate() + 7);
            endOfUpcomingPeriod.setHours(23, 59, 59, 999);

            const upcomingPayments = recurringPayments
                .filter((payment) => {
                    const dueDate = new Date(payment.due_date);

                    return (
                        dueDate >= startOfToday &&
                        dueDate <= endOfUpcomingPeriod
                    );
                })
                .sort(
                    (a, b) =>
                        new Date(a.due_date).getTime() -
                        new Date(b.due_date).getTime(),
                );

            // Free trials ending within the next 7 days
            const freeTrialsEnding = recurringPayments.filter((payment) => {
                if (!payment.is_free_trial) {
                    return false;
                }

                const dueDate = new Date(payment.due_date);

                return (
                    dueDate >= startOfToday && dueDate <= endOfUpcomingPeriod
                );
            });

            // Current month spending: everything billed this calendar month, paid or not
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(
                now.getFullYear(),
                now.getMonth() + 1,
                0,
                23,
                59,
                59,
                999,
            );

            const currentMonthSpending = recurringPayments
                .filter((payment) => !payment.is_free_trial)
                .reduce((total, payment) => {
                    const amount = Number(payment.amount);
                    const dueDate = new Date(payment.due_date);

                    if (
                        payment.billing_cycle ===
                        RecurringPaymentBillingCycle.Weekly
                    ) {
                        // Count every weekly occurrence that lands in this month
                        const occurrence = new Date(dueDate);

                        if (occurrence < startOfMonth) {
                            const weeksBehind = Math.ceil(
                                (startOfMonth.getTime() -
                                    occurrence.getTime()) /
                                    (7 * 24 * 60 * 60 * 1000),
                            );
                            occurrence.setDate(
                                occurrence.getDate() + weeksBehind * 7,
                            );
                        }

                        let count = 0;
                        while (occurrence <= endOfMonth) {
                            count++;
                            occurrence.setDate(occurrence.getDate() + 7);
                        }

                        return total + amount * count;
                    }

                    // Monthly, quarterly and yearly: only if due within this month
                    return dueDate >= startOfMonth && dueDate <= endOfMonth
                        ? total + amount
                        : total;
                }, 0);

            this.logger.log(
                `Fetched dashboard overview successfully for user: ${currentUserEmail}`,
            );

            return {
                message: 'Fetched dashboard overview successfully.',
                data: {
                    total: String(recurringPayments.length),
                    total_upcoming_this_week: String(upcomingPayments.length),
                    free_trials_ending: String(freeTrialsEnding.length),
                    current_month_spending: `P${currentMonthSpending.toFixed(2)}`, // TODO: replace with actual currency sign
                    upcoming_due: upcomingPayments.map((payment) => {
                        const daysLeft = this.getDaysUntilDue(payment.due_date);

                        return {
                            id: payment.id,
                            name: payment.name,
                            type: payment.type,
                            amount: Number(payment.amount),
                            currency: payment.currency,
                            due_date: payment.due_date,
                            days_left: daysLeft,
                            is_free_trial: payment.is_free_trial,
                            icon: payment.icon,
                        };
                    }),
                },
            };
        } catch (error) {
            this.logger.error(
                `Error fetching dashboard overview for user: ${currentUserEmail}`,
            );

            throw error;
        }
    }

    private getDaysUntilDue(dueDate: Date) {
        const due = new Date(dueDate);
        const today = new Date();

        const dueDateOnly = Date.UTC(
            due.getFullYear(),
            due.getMonth(),
            due.getDate(),
        );
        const todayDateOnly = Date.UTC(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
        );

        return Math.round(
            (dueDateOnly - todayDateOnly) / (1000 * 60 * 60 * 24),
        );
    }
}
