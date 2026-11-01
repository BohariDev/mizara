import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationModel } from './models/notification.model';
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
        PushNotificationModule,
    ],
    controllers: [NotificationController],
    providers: [NotificationService],
    exports: [NotificationService],
})
export class NotificationModule {}
