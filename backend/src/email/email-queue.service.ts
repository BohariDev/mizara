import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { JobsOptions, Queue } from 'bullmq';

import { VerificationCodeType } from '@/common/enum';
import {
    EMAIL_QUEUE,
    EmailJobArgs,
    EmailJobData,
    EmailJobName,
    VERIFICATION_EMAIL_JOB_OPTIONS,
    serializeEmailArgs,
} from './email-queue.constants';

const VERIFICATION_EMAIL_METHODS = {
    [VerificationCodeType.EmailVerification]: 'sendEmailVerificationCode',
    [VerificationCodeType.PasswordReset]: 'sendPasswordResetCode',
    [VerificationCodeType.ChangeEmail]: 'sendChangeEmailVerificationCode',
} as const satisfies Record<VerificationCodeType, EmailJobName>;

/**
 * Enqueues emails so they are sent in the background with retries,
 * instead of blocking the caller on SMTP.
 */
@Injectable()
export class EmailQueueService {
    constructor(@InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue) {}

    /** Queues a call to the `EmailService` method of the same name. */
    async enqueue<M extends EmailJobName>(
        method: M,
        args: EmailJobArgs<M>,
        options?: JobsOptions,
    ): Promise<void> {
        const data: EmailJobData = { args: serializeEmailArgs(args) };

        await this.emailQueue.add(method, data, options);
    }

    async enqueueVerificationCode(
        type: VerificationCodeType,
        email: string,
        code: string,
    ): Promise<void> {
        await this.enqueue(
            VERIFICATION_EMAIL_METHODS[type],
            [email, code],
            VERIFICATION_EMAIL_JOB_OPTIONS,
        );
    }
}
