import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';

import { NotificationService } from './notification.service';
import { NotificationModel } from './models/notification.model';
import { PushNotificationService } from '@/push-notification/push-notification.service';
import { UserSettingsModel } from '@/user/models/user-settings.model';
import { ReminderSettingsModel } from '@/reminder/models/reminder-settings.model';
import { NotificationType, ReminderChannel } from '@/common/enum';
import { PUSH_QUEUE, PushJobName } from './push-queue.constants';

describe('NotificationService', () => {
    let service: NotificationService;
    const notificationModel = {
        create: jest.fn(),
        findAndCountAll: jest.fn(),
        findOne: jest.fn(),
        findByPk: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
    };
    const userSettingsModel = { findOne: jest.fn() };
    const reminderSettingsModel = { findOne: jest.fn() };
    const pushNotificationService = { sendToUser: jest.fn() };
    const pushQueue = { add: jest.fn() };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationService,
                {
                    provide: getModelToken(NotificationModel),
                    useValue: notificationModel,
                },
                {
                    provide: getModelToken(UserSettingsModel),
                    useValue: userSettingsModel,
                },
                {
                    provide: getModelToken(ReminderSettingsModel),
                    useValue: reminderSettingsModel,
                },
                {
                    provide: PushNotificationService,
                    useValue: pushNotificationService,
                },
                { provide: getQueueToken(PUSH_QUEUE), useValue: pushQueue },
            ],
        }).compile();

        service = module.get<NotificationService>(NotificationService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        const notification = {
            user_id: 'user-id',
            recurring_payment_id: 'payment-id',
            type: NotificationType.Due,
            title: 'Netflix is due tomorrow',
            body: 'PHP 549 is due on November 1, 2026.',
        };

        beforeEach(() => {
            notificationModel.create.mockResolvedValue({
                id: 'notification-id',
                ...notification,
            });
        });

        it('queues one push job per notification', async () => {
            await service.create(notification);

            expect(pushQueue.add).toHaveBeenCalledWith(
                PushJobName.Deliver,
                { notification_id: 'notification-id' },
                { jobId: 'notification-notification-id' },
            );
        });

        it('still returns the notification when queueing fails', async () => {
            pushQueue.add.mockRejectedValue(new Error('Redis is down'));

            await expect(service.create(notification)).resolves.toMatchObject({
                id: 'notification-id',
            });
        });

        it('defers queueing until the transaction commits', async () => {
            const transaction = { afterCommit: jest.fn() };

            await service.create(notification, transaction as never);

            expect(pushQueue.add).not.toHaveBeenCalled();
            expect(transaction.afterCommit).toHaveBeenCalledTimes(1);
        });
    });

    describe('deliverPush', () => {
        const notification = {
            id: 'notification-id',
            user_id: 'user-id',
            recurring_payment_id: 'payment-id',
            type: NotificationType.Due,
            title: 'Netflix is due tomorrow',
            body: 'PHP 549 is due on November 1, 2026.',
        };

        beforeEach(() => {
            notificationModel.findByPk.mockResolvedValue(notification);
            userSettingsModel.findOne.mockResolvedValue({
                push_notifications_enabled: true,
            });
            reminderSettingsModel.findOne.mockResolvedValue({
                is_enabled: true,
                channels: [ReminderChannel.Email, ReminderChannel.Push],
            });
        });

        it('pushes when the account and payment allow push', async () => {
            await service.deliverPush('notification-id');

            expect(pushNotificationService.sendToUser).toHaveBeenCalledWith(
                'user-id',
                {
                    title: notification.title,
                    body: notification.body,
                    data: {
                        notification_id: 'notification-id',
                        recurring_payment_id: 'payment-id',
                        type: NotificationType.Due,
                    },
                },
            );
        });

        it('skips push when the notification was deleted', async () => {
            notificationModel.findByPk.mockResolvedValue(null);

            await service.deliverPush('notification-id');

            expect(pushNotificationService.sendToUser).not.toHaveBeenCalled();
        });

        it('skips push when the account toggle is off', async () => {
            userSettingsModel.findOne.mockResolvedValue({
                push_notifications_enabled: false,
            });

            await service.deliverPush('notification-id');

            expect(pushNotificationService.sendToUser).not.toHaveBeenCalled();
        });

        it('skips push when the payment has no push channel', async () => {
            reminderSettingsModel.findOne.mockResolvedValue({
                is_enabled: true,
                channels: [ReminderChannel.Email],
            });

            await service.deliverPush('notification-id');

            expect(pushNotificationService.sendToUser).not.toHaveBeenCalled();
        });

        it('skips push when the payment reminders are off', async () => {
            reminderSettingsModel.findOne.mockResolvedValue({
                is_enabled: false,
                channels: [ReminderChannel.Push],
            });

            await service.deliverPush('notification-id');

            expect(pushNotificationService.sendToUser).not.toHaveBeenCalled();
        });

        it('rethrows push failures so the job retries', async () => {
            pushNotificationService.sendToUser.mockRejectedValue(
                new Error('Expo is down'),
            );

            await expect(
                service.deliverPush('notification-id'),
            ).rejects.toThrow('Expo is down');
        });
    });

    it('scopes markAsRead to the current user', async () => {
        notificationModel.findOne.mockResolvedValue(null);

        await expect(
            service.markAsRead('notification-id', 'user-id', 'a@b.com'),
        ).rejects.toThrow(NotFoundException);
        expect(notificationModel.findOne).toHaveBeenCalledWith({
            where: { id: 'notification-id', user_id: 'user-id' },
        });
    });

    it('keeps the first read time when already read', async () => {
        const notification = {
            read_at: new Date('2026-10-01'),
            update: jest.fn(),
        };
        notificationModel.findOne.mockResolvedValue(notification);

        await service.markAsRead('notification-id', 'user-id', 'a@b.com');

        expect(notification.update).not.toHaveBeenCalled();
    });

    it('only marks unread notifications in markAllAsRead', async () => {
        notificationModel.update.mockResolvedValue([3]);

        const result = await service.markAllAsRead('user-id', 'a@b.com');

        const [values, options] = notificationModel.update.mock.calls[0] as [
            { read_at: Date },
            unknown,
        ];
        expect(values.read_at).toBeInstanceOf(Date);
        expect(options).toEqual({
            where: { user_id: 'user-id', read_at: null },
        });
        expect(result.data).toEqual({ updated_count: 3 });
    });
});
