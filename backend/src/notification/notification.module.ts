import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationModel } from './models/notification.model';
import { PushProcessor } from './push.processor';
import { PUSH_QUEUE, PUSH_QUEUE_JOB_OPTIONS } from './push-queue.constants';
import { UserSettingsModel } from '@/user/models/user-settings.model';
import { ReminderSettingsModel } from '@/reminder/models/reminder-settings.model';
import { PushNotificationModule } from '@/push-notification/push-notification.module';

@Module({
    imports: [
        SequelizeModule.forFeature([
            NotificationModel,
            UserSettingsModel,
            ReminderSettingsModel,
        ]),
        // No Redis locally, so the queue isn't registered.
        ...(process.env.NODE_ENV === 'local'
            ? []
            : [
                  BullModule.registerQueue({
                      name: PUSH_QUEUE,
                      defaultJobOptions: PUSH_QUEUE_JOB_OPTIONS,
                  }),
                  BullBoardModule.forFeature({
                      name: PUSH_QUEUE,
                      adapter: BullMQAdapter,
                  }),
              ]),
        PushNotificationModule,
    ],
    controllers: [NotificationController],
    providers: [
        NotificationService,
        // Locally jobs run inline, so stub the queue instead of starting a worker.
        ...(process.env.NODE_ENV === 'local'
            ? [{ provide: getQueueToken(PUSH_QUEUE), useValue: null }]
            : [PushProcessor]),
    ],
    exports: [NotificationService],
})
export class NotificationModule {}
