import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import Expo from 'expo-server-sdk';

import { PushNotificationController } from './push-notification.controller';
import { PushNotificationService } from './push-notification.service';
import { PushNotificationSchedulerService } from './push-notification-scheduler.service';
import { PushTokenModel } from './models/push-token.model';
import { PushTicketModel } from './models/push-ticket.model';
import { EXPO_CLIENT } from './constants';

@Module({
    imports: [SequelizeModule.forFeature([PushTokenModel, PushTicketModel])],
    controllers: [PushNotificationController],
    providers: [
        {
            provide: EXPO_CLIENT,
            inject: [ConfigService],
            // Only required once "Enhanced push security" is turned on in
            // the Expo project.
            useFactory: (configService: ConfigService) =>
                new Expo({
                    accessToken:
                        configService.get<string>('EXPO_ACCESS_TOKEN') ||
                        undefined,
                }),
        },
        PushNotificationService,
        PushNotificationSchedulerService,
    ],
    exports: [PushNotificationService],
})
export class PushNotificationModule {}
