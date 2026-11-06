import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard, seconds } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { AuthModule } from '@/auth/auth.module';
import { UserModule } from '@/user/user.module';
import { EmailModule } from '@/email/email.module';
import { RecurringPaymentModule } from './recurring-payment/recurring-payment.module';
import { ReminderModule } from './reminder/reminder.module';
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
        // Static assets (e.g. preset logos) served from backend/public at /static.
        // process.cwd() is used because `nest build` compiles into dist/ while
        // public/ stays at the project root.
        ServeStaticModule.forRoot({
            rootPath: join(process.cwd(), 'public'),
            serveRoot: '/static',
            serveStaticOptions: {
                maxAge: '30d',
                immutable: true,
                index: false,
            },
        }),
        AuthModule,
        UserModule,
        EmailModule,
        RecurringPaymentModule,
        ReminderModule,
        DashboardModule,
        NotificationModule,
        PushNotificationModule,
    ],
})
export class AppModule {}
