import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { RecurringPaymentService } from './recurring-payment.service';
import { RecurringPaymentController } from './recurring-payment.controller';
import { RecurringPaymentModel } from './models/recurring-payment.model';
import { RecurringPaymentSchedulerService } from './recurring-payment-scheduler.service';
import { RecurringPaymentPresetService } from './recurring-payment-preset.service';
import { UserModule } from '@/user/user.module';
import { EmailModule } from '@/email/email.module';
import { NotificationModule } from '@/notification/notification.module';

@Module({
    imports: [
        SequelizeModule.forFeature([RecurringPaymentModel]),
        UserModule,
        EmailModule,
        NotificationModule,
    ],
    controllers: [RecurringPaymentController],
    providers: [
        RecurringPaymentService,
        RecurringPaymentSchedulerService,
        RecurringPaymentPresetService,
    ],
    exports: [RecurringPaymentService],
})
export class RecurringPaymentModule {}
