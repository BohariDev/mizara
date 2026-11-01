import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard, seconds } from '@nestjs/throttler';

import { AuthModule } from '@/auth/auth.module';
import { UserModule } from '@/user/user.module';
import { EmailModule } from '@/email/email.module';
import { RecurringPaymentModule } from './recurring-payment/recurring-payment.module';
import { ReminderModule } from './reminder/reminder.module';
import { CategoryModule } from './category/category.module';
import { TransformInterceptor } from '@/common/interceptors/transform.interceptor';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationModule } from './notification/notification.module';
import { PushNotificationModule } from './push-notification/push-notification.module';

@Module({
    providers: [
        {
            provide: APP_INTERCEPTOR,
            useClass: TransformInterceptor,
        },
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        ThrottlerModule.forRoot({
            throttlers: [
                {
                    ttl: seconds(60),
                    limit: 60,
                },
            ],
        }),
        SequelizeModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],

            useFactory: (configService: ConfigService) => ({
                dialect: 'postgres',
                uri: configService.get<string>('DATABASE_URL'),
                autoLoadModels: true,
                synchronize: false,
                logging: false,
                timezone: 'UTC',
            }),
        }),
        ScheduleModule.forRoot(),
        AuthModule,
        UserModule,
        EmailModule,
        RecurringPaymentModule,
        ReminderModule,
        CategoryModule,
        DashboardModule,
        NotificationModule,
        PushNotificationModule,
    ],
})
export class AppModule {}
