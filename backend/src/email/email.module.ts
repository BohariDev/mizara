import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

import { EmailService } from './email.service';
import { EmailQueueService } from './email-queue.service';
import { EmailProcessor } from './email.processor';
import { EMAIL_QUEUE, EMAIL_QUEUE_JOB_OPTIONS } from './email-queue.constants';

@Module({
    imports: [
        BullModule.registerQueue({
            name: EMAIL_QUEUE,
            defaultJobOptions: EMAIL_QUEUE_JOB_OPTIONS,
        }),
        BullBoardModule.forFeature({
            name: EMAIL_QUEUE,
            adapter: BullMQAdapter,
        }),
    ],
    providers: [EmailService, EmailQueueService, EmailProcessor],
    exports: [EmailQueueService],
})
export class EmailModule {}
