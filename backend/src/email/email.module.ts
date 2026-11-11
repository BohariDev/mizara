import { Module } from '@nestjs/common';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

import { EmailService } from './email.service';
import { EmailQueueService } from './email-queue.service';
import { EmailProcessor } from './email.processor';
import { EMAIL_QUEUE, EMAIL_QUEUE_JOB_OPTIONS } from './email-queue.constants';

@Module({
    imports: [
        // No Redis locally, so the queue isn't registered.
        ...(process.env.NODE_ENV === 'local'
            ? []
            : [
                  BullModule.registerQueue({
                      name: EMAIL_QUEUE,
                      defaultJobOptions: EMAIL_QUEUE_JOB_OPTIONS,
                  }),
                  BullBoardModule.forFeature({
                      name: EMAIL_QUEUE,
                      adapter: BullMQAdapter,
                  }),
              ]),
    ],
    providers: [
        EmailService,
        EmailQueueService,
        // Locally jobs run inline, so stub the queue instead of starting a worker.
        ...(process.env.NODE_ENV === 'local'
            ? [{ provide: getQueueToken(EMAIL_QUEUE), useValue: null }]
            : [EmailProcessor]),
    ],
    exports: [EmailQueueService],
})
export class EmailModule {}
