import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

/**
 * Shared Redis connection and default job options for every BullMQ queue.
 * Feature modules register their own queues with `BullModule.registerQueue`.
 */
@Module({
    imports: [
        BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                connection: {
                    host: configService.get<string>('REDIS_HOST', 'localhost'),
                    port: Number(
                        configService.get<string>('REDIS_PORT', '6379'),
                    ),
                    password:
                        configService.get<string>('REDIS_PASSWORD') ||
                        undefined,
                },
                defaultJobOptions: {
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 5000 },
                    // Keep Redis memory bounded; failed jobs stay a day for debugging.
                    removeOnComplete: { age: 60 * 60, count: 1000 },
                    removeOnFail: { age: 24 * 60 * 60 },
                },
            }),
        }),
    ],
})
export class QueueModule {}
