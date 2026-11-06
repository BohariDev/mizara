import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { NotificationService } from './notification.service';
import { PUSH_QUEUE, PushJobData, PushJobName } from './push-queue.constants';

@Processor(PUSH_QUEUE)
export class PushProcessor extends WorkerHost {
    private readonly logger = new Logger(PushProcessor.name);

    constructor(private readonly notificationService: NotificationService) {
        super();
    }

    async process(job: Job<PushJobData>): Promise<void> {
        switch (job.name as PushJobName) {
            case PushJobName.Deliver:
                return this.notificationService.deliverPush(
                    job.data.notification_id,
                );
            default:
                throw new Error(`Unknown push job: ${job.name}`);
        }
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job | undefined, error: Error) {
        this.logger.error(
            `Push job ${job?.name} (${job?.id}) failed on attempt ${job?.attemptsMade}: ${error.message}`,
        );
    }
}
