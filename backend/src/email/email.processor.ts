import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { EmailService } from './email.service';
import {
    EMAIL_QUEUE,
    EmailJobData,
    EmailJobName,
    deserializeEmailArgs,
} from './email-queue.constants';

@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
    private readonly logger = new Logger(EmailProcessor.name);

    constructor(private readonly emailService: EmailService) {
        super();
    }

    async process(job: Job<EmailJobData>): Promise<void> {
        const method = job.name as EmailJobName;

        // Only call the service's own send methods.
        if (
            method === ('constructor' as EmailJobName) ||
            !Object.prototype.hasOwnProperty.call(
                EmailService.prototype,
                method,
            )
        ) {
            throw new Error(`Unknown email job: ${job.name}`);
        }

        const emailService = this.emailService as unknown as Record<
            EmailJobName,
            (...args: unknown[]) => Promise<void>
        >;

        await emailService[method](...deserializeEmailArgs(job.data.args));
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job | undefined, error: Error) {
        this.logger.error(
            `Email job ${job?.name} (${job?.id}) failed on attempt ${job?.attemptsMade}: ${error.message}`,
        );
    }
}
