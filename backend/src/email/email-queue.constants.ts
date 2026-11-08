import type { JobsOptions } from 'bullmq';

import type { EmailService } from './email.service';

export const EMAIL_QUEUE = 'email';

/** Each job is named after the `EmailService` method that sends it. */
export type EmailJobName = keyof EmailService;

export type EmailJobArgs<M extends EmailJobName> = Parameters<EmailService[M]>;

/**
 * A job argument as stored in Redis. Dates don't survive JSON, so they're
 * stored as `{ $date: isoString }` and revived by the worker.
 */
export type SerializedEmailArg = unknown;

export interface EmailJobData {
    args: SerializedEmailArg[];
}

// Retry for ~15 minutes so a short SMTP outage doesn't lose the email.
export const EMAIL_QUEUE_JOB_OPTIONS: JobsOptions = {
    attempts: 5,
    backoff: { type: 'exponential', delay: 60 * 1000 },
    removeOnComplete: { age: 60 * 60, count: 1000 },
    removeOnFail: { age: 7 * 24 * 60 * 60 },
};

// Codes expire after 10 minutes, so retry quickly and never keep the
// plaintext code in Redis once it's sent.
export const VERIFICATION_EMAIL_JOB_OPTIONS: JobsOptions = {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5 * 1000 },
    removeOnComplete: true,
    removeOnFail: { age: 24 * 60 * 60 },
};

export const serializeEmailArgs = (args: unknown[]): SerializedEmailArg[] =>
    args.map((arg) =>
        arg instanceof Date ? { $date: arg.toISOString() } : arg,
    );

export const deserializeEmailArgs = (args: SerializedEmailArg[]): unknown[] =>
    args.map((arg) =>
        arg !== null &&
        typeof arg === 'object' &&
        '$date' in arg &&
        typeof arg.$date === 'string'
            ? new Date(arg.$date)
            : arg,
    );
