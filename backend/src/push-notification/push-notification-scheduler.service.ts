import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PushNotificationService } from './push-notification.service';

@Injectable()
export class PushNotificationSchedulerService {
    private readonly logger = new Logger(PushNotificationSchedulerService.name);

    constructor(
        private readonly pushNotificationService: PushNotificationService,
    ) {}

    @Cron(CronExpression.EVERY_10_MINUTES)
    async handleReceipts() {
        this.logger.log('Running cron job for push notification receipts...');

        await this.pushNotificationService.checkReceipts();

        this.logger.log('Completed cron job for push notification receipts');
    }
}
