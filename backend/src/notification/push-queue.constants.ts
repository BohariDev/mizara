import type { JobsOptions } from 'bullmq';

export const PUSH_QUEUE = 'push-notification';

export enum PushJobName {
    Deliver = 'deliver',
}

export interface PushJobData {
    notification_id: string;
}

// A push is only useful while it's timely, so give up after ~5 minutes.
export const PUSH_QUEUE_JOB_OPTIONS: JobsOptions = {
    attempts: 4,
    backoff: { type: 'exponential', delay: 30 * 1000 },
    removeOnComplete: { age: 60 * 60, count: 1000 },
    removeOnFail: { age: 7 * 24 * 60 * 60 },
};
