import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { format, isSameDay, subDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Op } from 'sequelize';

import { RecurringPaymentModel } from '@/recurring-payment/models/recurring-payment.model';
import { ReminderSettingsModel } from './models/reminder-settings.model';
import { SentReminderModel } from './models/sent-reminder.model';
import {
    NotificationType,
    RecurringPaymentType,
    ReminderChannel,
    ReminderOffsetDays,
    SentReminderType,
} from '@/common/enum';
import { DueReminder } from './types/due-reminder.type';
import { UserService } from '@/user/user.service';
import { EmailService } from '@/email/email.service';
import { NotificationService } from '@/notification/notification.service';
import { UserModel } from '@/user/models/user.model';
import { UserSettingsModel } from '@/user/models/user-settings.model';

const DEFAULT_TIMEZONE = 'Asia/Manila';

@Injectable()
export class ReminderService {
    private readonly logger = new Logger(ReminderService.name);

    constructor(
        private readonly userService: UserService,
        private readonly emailService: EmailService,
        private readonly notificationService: NotificationService,
        @InjectModel(RecurringPaymentModel)
        private recurringPaymentModel: typeof RecurringPaymentModel,
        @InjectModel(SentReminderModel)
        private sentReminderModel: typeof SentReminderModel,
    ) {}

    async findDueReminders() {
        this.logger.log(`Finding due reminders...`);

        const recurringPayments = await this.recurringPaymentModel.findAll({
            attributes: [
                'id',
                'name',
                'type',
                'amount',
                'due_date',
                'user_id',
                'is_paid',
                'is_free_trial',
                'is_auto_renew',
                'billing_cycle',
            ],
            where: {
                is_archived: false,
                // A bill already paid this cycle needs no more reminders.
                [Op.or]: [
                    { type: { [Op.ne]: RecurringPaymentType.Bills } },
                    { is_paid: false },
                ],
            },
            include: [
                {
                    model: ReminderSettingsModel,
                    as: 'reminder_settings',
                    required: true,
                    where: { is_enabled: true },
                },
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

        // "Today" is per-user timezone, so a single global date can't
        // bound this query - widen it to cover every timezone's current
        // date and disambiguate per-user in the loop below.
        const alreadySent = await this.sentReminderModel.findAll({
            attributes: [
                'recurring_payment_id',
                'offset_days',
                'reminder_date',
            ],
            where: {
                type: SentReminderType.Due,
                reminder_date: {
                    [Op.gte]: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
                },
            },
        });
        const alreadySentKeys = new Set(
            alreadySent.map(
                (sentReminder) =>
                    `${sentReminder.recurring_payment_id}:${sentReminder.offset_days}:${sentReminder.reminder_date}`,
            ),
        );

        const dueReminders: DueReminder[] = [];

        for (const recurringPayment of recurringPayments) {
            const userSettingsTimezone =
                recurringPayment.user.settings?.timezone ?? DEFAULT_TIMEZONE;

            const now = toZonedTime(new Date(), userSettingsTimezone);
            const todayDateOnly = format(now, 'yyyy-MM-dd');

            const dueDate = toZonedTime(
                recurringPayment.due_date,
                userSettingsTimezone,
            );
            const remindBeforeDays =
                recurringPayment.reminder_settings?.remind_before_days ?? [];

            for (const offsetDays of remindBeforeDays) {
                // Auto-renewing free trials convert to paid on their end day,
                // and that conversion notice replaces the end-day reminder.
                if (
                    offsetDays === ReminderOffsetDays.DueDay &&
                    recurringPayment.is_free_trial &&
                    recurringPayment.is_auto_renew
                ) {
                    continue;
                }

                // due_date's time-of-day is preserved, so within the target
                // day the reminder only fires once "now" reaches it. Once
                // the target day has passed, it's skipped, not backfilled.
                const reminderInstant = subDays(dueDate, offsetDays);
                const isDue =
                    isSameDay(reminderInstant, now) && reminderInstant <= now;
                const key = `${recurringPayment.id}:${offsetDays}:${todayDateOnly}`;

                if (isDue && !alreadySentKeys.has(key)) {
                    dueReminders.push({
                        recurringPayment,
                        offsetDays,
                        timezone: userSettingsTimezone,
                    });
                }
            }
        }

        this.logger.log(`Found ${dueReminders.length} due reminder(s)`);

        return dueReminders;
    }

    async sendDueReminders(dueReminders: DueReminder[]) {
        for (const dueReminder of dueReminders) {
            const userId = dueReminder.recurringPayment.user_id;
            const foundUser = await this.userService.findById(userId);

            if (!foundUser) {
                this.logger.warn(
                    `User not found for recurring payment: ${dueReminder.recurringPayment.id} - cron job not completed.`,
                );
                return;
            }

            const reminderChannels =
                dueReminder.recurringPayment.reminder_settings?.channels ?? [];

            for (const reminderChannel of reminderChannels) {
                this.logger.log(
                    `Sending reminder to user: ${foundUser.email} via ${reminderChannel}`,
                );

                const dueDate = toZonedTime(
                    dueReminder.recurringPayment.due_date,
                    dueReminder.timezone,
                );

                if (reminderChannel === ReminderChannel.Email) {
                    if (dueReminder.recurringPayment.is_free_trial) {
                        await this.emailService.sendFreeTrialReminder(
                            foundUser.email,
                            foundUser.first_name,
                            dueReminder.recurringPayment.name,
                            String(dueReminder.recurringPayment.amount),
                            dueDate,
                            dueReminder.offsetDays,
                            dueReminder.recurringPayment.billing_cycle,
                        );
                    } else {
                        await this.emailService.sendDueReminder(
                            foundUser.email,
                            foundUser.first_name,
                            dueReminder.recurringPayment.name,
                            String(dueReminder.recurringPayment.amount),
                            dueDate,
                            dueReminder.offsetDays,
                        );
                    }
                }

                await this.recordSent(
                    dueReminder.recurringPayment.id,
                    dueReminder.offsetDays,
                    reminderChannel,
                    dueReminder.timezone,
                );
                this.logger.log(
                    `Successfully sent reminder to user: ${foundUser.email} via ${reminderChannel}`,
                );
            }

            await this.createDueNotification(dueReminder);
        }
    }

    private async createDueNotification(dueReminder: DueReminder) {
        const { recurringPayment, offsetDays, timezone } = dueReminder;
        const dueDate = toZonedTime(recurringPayment.due_date, timezone);
        const when =
            offsetDays === ReminderOffsetDays.DueDay
                ? 'today'
                : offsetDays === ReminderOffsetDays.OneDayBefore
                  ? 'tomorrow'
                  : `in ${offsetDays} days`;
        const amount = `${recurringPayment.currency} ${recurringPayment.amount}`;
        const formattedDueDate = format(dueDate, 'MMMM d, yyyy');
        const data = {
            due_date: recurringPayment.due_date,
            offset_days: offsetDays,
        };

        await this.createNotification(
            recurringPayment,
            recurringPayment.is_free_trial
                ? {
                      type: NotificationType.FreeTrialEndingSoon,
                      title: `${recurringPayment.name} free trial ends ${when}`,
                      body: `Your trial ends on ${formattedDueDate}. You'll be charged ${amount} (${recurringPayment.billing_cycle}) unless you cancel.`,
                      data,
                  }
                : {
                      type: NotificationType.Due,
                      title: `${recurringPayment.name} is due ${when}`,
                      body: `${amount} is due on ${formattedDueDate}.`,
                      data,
                  },
        );
    }

    // A failed notification shouldn't stop the email from being sent.
    private async createNotification(
        recurringPayment: RecurringPaymentModel,
        notification: {
            type: NotificationType;
            title: string;
            body: string;
            data: Record<string, unknown>;
        },
    ) {
        try {
            await this.notificationService.create({
                user_id: recurringPayment.user_id,
                recurring_payment_id: recurringPayment.id,
                ...notification,
            });
        } catch (error) {
            this.logger.error(
                `Error creating ${notification.type} notification for recurring payment: ${recurringPayment.id}`,
                error,
            );
        }
    }

    async sendOverdueBillReminders() {
        this.logger.log('Finding overdue unpaid bills...');

        // Unpaid bills don't roll over, so their due_date stays in the past.
        // Notify once per cycle, a day after the due date, so the due-day
        // reminder isn't immediately followed by an overdue one.
        const overdueBills = await this.recurringPaymentModel.findAll({
            where: {
                is_archived: false,
                type: RecurringPaymentType.Bills,
                is_paid: false,
                due_date: { [Op.lte]: subDays(new Date(), 1) },
            },
            include: [
                {
                    model: ReminderSettingsModel,
                    as: 'reminder_settings',
                    required: true,
                    where: {
                        is_enabled: true,
                        channels: { [Op.contains]: [ReminderChannel.Email] },
                    },
                },
                this.userWithTimezoneInclude(),
            ],
        });

        const unnotifiedBills = await this.excludeNotifiedForCycle(
            overdueBills,
            SentReminderType.Overdue,
        );

        this.logger.log(`Found ${unnotifiedBills.length} overdue bill(s)`);

        for (const bill of unnotifiedBills) {
            try {
                const foundUser = await this.userService.findById(bill.user_id);

                if (!foundUser) {
                    this.logger.warn(
                        `User not found for recurring payment: ${bill.id} - overdue email not sent.`,
                    );
                    continue;
                }

                const timezone = this.getTimezone(bill);

                await this.emailService.sendBillOverdue(
                    foundUser.email,
                    foundUser.first_name,
                    bill.name,
                    String(bill.amount),
                    toZonedTime(bill.due_date, timezone),
                );

                await this.recordSentForCycle(
                    bill,
                    SentReminderType.Overdue,
                    timezone,
                );

                await this.createNotification(bill, {
                    type: NotificationType.Overdue,
                    title: `${bill.name} is overdue`,
                    body: `${bill.currency} ${bill.amount} was due on ${format(toZonedTime(bill.due_date, timezone), 'MMMM d, yyyy')}. Mark it as paid once it's settled.`,
                    data: { cycle_due_date: bill.due_date },
                });

                this.logger.log(
                    `Successfully sent overdue email to user: ${foundUser.email} for recurring payment: ${bill.id}`,
                );
            } catch (error) {
                this.logger.error(
                    `Error sending overdue email for recurring payment: ${bill.id}`,
                    error,
                );
            }
        }
    }

    async sendCycleConfirmationReminders() {
        this.logger.log('Finding bills awaiting cycle confirmation...');

        // Matches when the app starts asking for confirmation: once the
        // billing date arrives and the user has the actual bill.
        const pendingBills = await this.recurringPaymentModel.findAll({
            where: {
                is_archived: false,
                type: RecurringPaymentType.Bills,
                needs_cycle_confirmation: true,
                [Op.or]: [
                    { billing_date: null },
                    { billing_date: { [Op.lte]: new Date() } },
                ],
            },
            include: [this.userWithTimezoneInclude()],
        });

        const unnotifiedBills = await this.excludeNotifiedForCycle(
            pendingBills,
            SentReminderType.CycleConfirmation,
        );

        this.logger.log(
            `Found ${unnotifiedBills.length} bill(s) awaiting cycle confirmation`,
        );

        for (const bill of unnotifiedBills) {
            try {
                const foundUser = await this.userService.findById(bill.user_id);

                if (!foundUser) {
                    this.logger.warn(
                        `User not found for recurring payment: ${bill.id} - cycle confirmation email not sent.`,
                    );
                    continue;
                }

                const timezone = this.getTimezone(bill);

                await this.emailService.sendBillCycleConfirmationRequest(
                    foundUser.email,
                    foundUser.first_name,
                    bill.name,
                    String(bill.amount),
                    toZonedTime(bill.due_date, timezone),
                );

                await this.recordSentForCycle(
                    bill,
                    SentReminderType.CycleConfirmation,
                    timezone,
                );

                await this.createNotification(bill, {
                    type: NotificationType.CycleConfirmation,
                    title: `Confirm your ${bill.name} bill`,
                    body: `Your new ${bill.name} bill is ready. Confirm this cycle's amount and due date.`,
                    data: { cycle_due_date: bill.due_date },
                });

                this.logger.log(
                    `Successfully sent cycle confirmation email to user: ${foundUser.email} for recurring payment: ${bill.id}`,
                );
            } catch (error) {
                this.logger.error(
                    `Error sending cycle confirmation email for recurring payment: ${bill.id}`,
                    error,
                );
            }
        }
    }

    // A rolled-over or edited due_date is a new cycle, so it no longer
    // matches the cycle_due_date of an earlier notice.
    private async excludeNotifiedForCycle(
        recurringPayments: RecurringPaymentModel[],
        type: SentReminderType,
    ) {
        if (recurringPayments.length === 0) {
            return [];
        }

        const alreadySent = await this.sentReminderModel.findAll({
            attributes: ['recurring_payment_id', 'cycle_due_date'],
            where: {
                type,
                channel: ReminderChannel.Email,
                recurring_payment_id: {
                    [Op.in]: recurringPayments.map(({ id }) => id),
                },
            },
        });
        const alreadySentKeys = new Set(
            alreadySent.map(
                (sentReminder) =>
                    `${sentReminder.recurring_payment_id}:${sentReminder.cycle_due_date?.getTime()}`,
            ),
        );

        return recurringPayments.filter(
            (recurringPayment) =>
                !alreadySentKeys.has(
                    `${recurringPayment.id}:${recurringPayment.due_date.getTime()}`,
                ),
        );
    }

    private userWithTimezoneInclude() {
        return {
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
        };
    }

    private getTimezone(recurringPayment: RecurringPaymentModel) {
        return recurringPayment.user.settings?.timezone ?? DEFAULT_TIMEZONE;
    }

    async recordSent(
        recurringPaymentId: string,
        offsetDays: ReminderOffsetDays,
        channel: ReminderChannel,
        timezone: string,
    ) {
        const today = toZonedTime(new Date(), timezone);
        const todayDateOnly = format(today, 'yyyy-MM-dd');

        await this.sentReminderModel.create({
            recurring_payment_id: recurringPaymentId,
            type: SentReminderType.Due,
            offset_days: offsetDays,
            channel,
            reminder_date: todayDateOnly,
        });
    }

    private async recordSentForCycle(
        recurringPayment: RecurringPaymentModel,
        type: SentReminderType,
        timezone: string,
    ) {
        const today = toZonedTime(new Date(), timezone);
        const todayDateOnly = format(today, 'yyyy-MM-dd');

        await this.sentReminderModel.create({
            recurring_payment_id: recurringPayment.id,
            type,
            cycle_due_date: recurringPayment.due_date,
            channel: ReminderChannel.Email,
            reminder_date: todayDateOnly,
        });
    }
}
