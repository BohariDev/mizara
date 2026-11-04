import {
    RecurringPaymentBillingCycle,
    ReminderOffsetDays,
} from '@/common/enum';
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { format } from 'date-fns';

@Injectable()
export class EmailService {
    private readonly transporter: Transporter;
    private readonly from: string;

    constructor() {
        const isProduction = process.env.NODE_ENV === 'production';

        this.transporter = nodemailer.createTransport({
            host: isProduction
                ? process.env.PROD_EMAIL_SMTP_HOST
                : process.env.DEV_EMAIL_SMTP_HOST,

            port: Number(
                isProduction
                    ? process.env.PROD_EMAIL_SMTP_PORT
                    : process.env.DEV_EMAIL_SMTP_PORT,
            ),

            secure: true,

            auth: {
                user: isProduction
                    ? process.env.PROD_EMAIL_SMTP_USER
                    : process.env.DEV_EMAIL_SMTP_USER,

                pass: isProduction
                    ? process.env.PROD_EMAIL_SMTP_PASSWORD
                    : process.env.DEV_EMAIL_SMTP_PASSWORD,
            },
        });

        this.from = isProduction
            ? process.env.PROD_EMAIL_SMTP_FROM!
            : process.env.DEV_EMAIL_SMTP_FROM!;
    }

    async sendEmailVerificationCode(
        email: string,
        code: string,
    ): Promise<void> {
        await this.transporter.sendMail({
            from: this.from,
            to: email,
            subject: 'Verify your Mizara account',
            html: `
                <h2>Verify your email</h2>
                <p>Your verification code is:</p>
                <h1>${code}</h1>
                <p>This code will expire soon.</p>
            `,
        });
    }

    async sendPasswordResetCode(email: string, code: string): Promise<void> {
        await this.transporter.sendMail({
            from: this.from,
            to: email,
            subject: 'Reset your Mizara password',
            html: `
                <h2>Reset your password</h2>
                <p>Your password reset code is:</p>
                <h1>${code}</h1>
                <p>This code will expire soon.</p>
            `,
        });
    }

    async sendChangeEmailVerificationCode(
        email: string,
        code: string,
    ): Promise<void> {
        await this.transporter.sendMail({
            from: this.from,
            to: email,
            subject: 'Confirm your new email address',
            html: `
                <h2>Confirm your new email address</h2>
                <p>We received a request to change the email address associated with your Mizara account to this email address.</p>
                <p>Your verification code is:</p>
                <h1>${code}</h1>
                <p>This code will expire soon.</p>
            `,
        });
    }

    async sendDueReminder(
        recipientEmail: string,
        recipientName: string,
        paymentName: string,
        amount: string,
        currency: string,
        dueDate: Date,
        remainingDays: ReminderOffsetDays,
    ): Promise<void> {
        const formattedDueDate = format(dueDate, 'MMMM d, yyyy');
        const formattedDueTime = format(dueDate, 'h:mm a');
        const dueMessage =
            remainingDays === ReminderOffsetDays.DueDay
                ? `Your recurring payment is due <strong>right now</strong>.`
                : remainingDays === ReminderOffsetDays.OneDayBefore
                  ? `Your recurring payment is due <strong>tomorrow at ${formattedDueTime}</strong>.`
                  : `Your recurring payment is due in <strong>${remainingDays} days</strong>.`;

        await this.transporter.sendMail({
            from: this.from,
            to: recipientEmail,
            subject: `Reminder: ${paymentName} is due soon`,
            html: `
            <h2>Payment Reminder</h2>

            <p>Hello, ${recipientName}!</p>

            <p>${dueMessage}</p>

            <p><strong>Payment:</strong> ${paymentName}</p>
            <p><strong>Amount:</strong> ${currency} ${amount}</p>
            <p><strong>Due date:</strong> ${formattedDueDate}</p>
            <p><strong>Due time:</strong> ${formattedDueTime}</p>

            <p>
                Please make sure you have sufficient funds for this payment.
            </p>
        `,
        });
    }
    async sendFreeTrialReminder(
        recipientEmail: string,
        recipientName: string,
        paymentName: string,
        amount: string,
        currency: string,
        trialEndDate: Date,
        remainingDays: ReminderOffsetDays,
        billingCycle: RecurringPaymentBillingCycle,
    ): Promise<void> {
        const formattedDate = format(trialEndDate, 'MMMM d, yyyy');
        const formattedTime = format(trialEndDate, 'h:mm a');

        const trialMessage =
            remainingDays === ReminderOffsetDays.DueDay
                ? `Your free trial for <strong>${paymentName}</strong> ends <strong>right now</strong>.`
                : remainingDays === ReminderOffsetDays.OneDayBefore
                  ? `Your free trial for <strong>${paymentName}</strong> ends <strong>tomorrow at ${formattedTime}</strong>.`
                  : `Your free trial for <strong>${paymentName}</strong> ends <strong>in ${remainingDays} days</strong>.`;

        await this.transporter.sendMail({
            from: this.from,
            to: recipientEmail,
            subject: `Reminder: ${paymentName} free trial ends soon`,
            html: `
            <h2>Free Trial Reminder</h2>

            <p>Hello, ${recipientName}!</p>

            <p>${trialMessage}</p>

            <p><strong>Subscription:</strong> ${paymentName}</p>
            <p><strong>Trial ends:</strong> ${formattedDate}, ${formattedTime}</p>
            <p><strong>Then you'll be charged:</strong> ${currency} ${amount} / ${billingCycle}</p>

            <p>
                Your subscription will transition to a paid subscription
                after your free trial ends.
            </p>
        `,
        });
    }

    async sendFreeTrialConvertedToPaid(
        recipientEmail: string,
        recipientName: string,
        paymentName: string,
        amount: string,
        currency: string,
        nextDueDate: Date,
        billingCycle: RecurringPaymentBillingCycle,
    ): Promise<void> {
        const formattedNextDueDate = format(nextDueDate, 'MMMM d, yyyy');
        const formattedNextDueTime = format(nextDueDate, 'h:mm a');

        await this.transporter.sendMail({
            from: this.from,
            to: recipientEmail,
            subject: `${paymentName} free trial has ended - now a paid subscription`,
            html: `
            <h2>Free Trial Ended</h2>

            <p>Hello, ${recipientName}!</p>

            <p>
                Your free trial for <strong>${paymentName}</strong> has ended
                and your subscription has transitioned to a
                <strong>paid subscription</strong>.
            </p>

            <p><strong>Subscription:</strong> ${paymentName}</p>
            <p><strong>Amount:</strong> ${currency} ${amount} / ${billingCycle}</p>
            <p><strong>Next payment:</strong> ${formattedNextDueDate}, ${formattedNextDueTime}</p>

            <p>
                Please make sure you have sufficient funds for your next
                payment.
            </p>
        `,
        });
    }

    async sendFreeTrialEnded(
        recipientEmail: string,
        recipientName: string,
        paymentName: string,
        trialEndDate: Date,
    ): Promise<void> {
        const formattedTrialEndDate = format(trialEndDate, 'MMMM d, yyyy');
        const formattedTrialEndTime = format(trialEndDate, 'h:mm a');

        await this.transporter.sendMail({
            from: this.from,
            to: recipientEmail,
            subject: `${paymentName} free trial has ended`,
            html: `
            <h2>Free Trial Ended</h2>

            <p>Hello, ${recipientName}!</p>

            <p>
                Your free trial for <strong>${paymentName}</strong> ended on
                <strong>${formattedTrialEndDate}, ${formattedTrialEndTime}</strong>.
            </p>

            <p>
                Since auto-renew was turned off, this subscription will not
                transition to a paid subscription and has been cancelled and archived.
            </p>
        `,
        });
    }

    async sendBillOverdue(
        recipientEmail: string,
        recipientName: string,
        paymentName: string,
        amount: string,
        currency: string,
        dueDate: Date,
    ): Promise<void> {
        const formattedDueDate = format(dueDate, 'MMMM d, yyyy');
        const formattedDueTime = format(dueDate, 'h:mm a');

        await this.transporter.sendMail({
            from: this.from,
            to: recipientEmail,
            subject: `Overdue: ${paymentName} has not been paid`,
            html: `
            <h2>Bill Overdue</h2>

            <p>Hello, ${recipientName}!</p>

            <p>
                Your bill <strong>${paymentName}</strong> was due on
                <strong>${formattedDueDate}, ${formattedDueTime}</strong>
                and has not been marked as paid yet.
            </p>

            <p><strong>Bill:</strong> ${paymentName}</p>
            <p><strong>Amount:</strong> ${currency} ${amount}</p>
            <p><strong>Due date:</strong> ${formattedDueDate}, ${formattedDueTime}</p>

            <p>
                Please settle this bill as soon as possible to avoid late fees
                or service interruption. If you've already paid it, mark it as
                paid in Mizara so it moves on to the next billing cycle.
            </p>
        `,
        });
    }

    async sendBillCycleConfirmationRequest(
        recipientEmail: string,
        recipientName: string,
        paymentName: string,
        estimatedAmount: string,
        currency: string,
        estimatedDueDate: Date,
    ): Promise<void> {
        const formattedDueDate = format(estimatedDueDate, 'MMMM d, yyyy');
        const formattedDueTime = format(estimatedDueDate, 'h:mm a');

        await this.transporter.sendMail({
            from: this.from,
            to: recipientEmail,
            subject: `Confirm your new ${paymentName} bill`,
            html: `
            <h2>New Billing Cycle</h2>

            <p>Hello, ${recipientName}!</p>

            <p>
                A new billing cycle has started for
                <strong>${paymentName}</strong>. Since its amount or dates can
                change every cycle, please check your latest bill and confirm
                the details in Mizara.
            </p>

            <p><strong>Bill:</strong> ${paymentName}</p>
            <p><strong>Estimated amount:</strong> ${currency} ${estimatedAmount}</p>
            <p><strong>Estimated due date:</strong> ${formattedDueDate}, ${formattedDueTime}</p>

            <p>
                Until confirmed, your reminders will use these estimated values.
            </p>
        `,
        });
    }

    async sendPaymentArchived(
        recipientEmail: string,
        recipientName: string,
        paymentName: string,
        dueDate: Date,
    ): Promise<void> {
        const formattedDueDate = format(dueDate, 'MMMM d, yyyy');
        const formattedDueTime = format(dueDate, 'h:mm a');

        await this.transporter.sendMail({
            from: this.from,
            to: recipientEmail,
            subject: `${paymentName} has been cancelled`,
            html: `
            <h2>Payment Cancelled</h2>

            <p>Hello, ${recipientName}!</p>

            <p>
                Your recurring payment <strong>${paymentName}</strong>, which
                was due on <strong>${formattedDueDate}, ${formattedDueTime}</strong>,
                has been cancelled.
            </p>

            <p>
                Since auto-renew was turned off, this payment will not repeat
                and has been moved to your archived payments.
            </p>
        `,
        });
    }
}
