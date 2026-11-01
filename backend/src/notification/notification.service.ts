import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Transaction } from 'sequelize';

import { NotificationModel } from '@/notification/models/notification.model';
import { FindAllNotificationDto } from '@/notification/dto/find-all-notification.dto';
import { CreateNotification } from '@/notification/types/create-notification.type';
import { PushNotificationService } from '@/push-notification/push-notification.service';
import { UserSettingsModel } from '@/user/models/user-settings.model';
import { ReminderSettingsModel } from '@/reminder/models/reminder-settings.model';
import { ReminderChannel } from '@/common/enum';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(
        private readonly pushNotificationService: PushNotificationService,
        @InjectModel(NotificationModel)
        private notificationModel: typeof NotificationModel,
        @InjectModel(UserSettingsModel)
        private userSettingsModel: typeof UserSettingsModel,
        @InjectModel(ReminderSettingsModel)
        private reminderSettingsModel: typeof ReminderSettingsModel,
    ) {}

    // Called by other modules (reminder, recurring-payment) when an event
    // should show up in the user's notification feed.
    async create(notification: CreateNotification, transaction?: Transaction) {
        this.logger.log(
            `Creating ${notification.type} notification for user: ${notification.user_id}`,
        );

        const createdNotification = await this.notificationModel.create(
            {
                user_id: notification.user_id,
                recurring_payment_id: notification.recurring_payment_id ?? null,
                type: notification.type,
                title: notification.title,
                body: notification.body,
                data: notification.data ?? null,
            },
            { transaction },
        );

        // Don't push a notification that a rollback could still undo.
        if (transaction) {
            transaction.afterCommit(() => this.sendPush(createdNotification));
        } else {
            await this.sendPush(createdNotification);
        }

        return createdNotification;
    }

    // A failed push shouldn't fail the notification it belongs to.
    private async sendPush(notification: NotificationModel) {
        try {
            if (!(await this.isPushEnabled(notification))) {
                return;
            }

            await this.pushNotificationService.sendToUser(
                notification.user_id,
                {
                    title: notification.title,
                    body: notification.body,
                    data: {
                        notification_id: notification.id,
                        recurring_payment_id: notification.recurring_payment_id,
                        type: notification.type,
                    },
                },
            );
        } catch (error) {
            this.logger.error(
                `Error sending push for notification: ${notification.id}`,
                error,
            );
        }
    }

    // Push needs the account-wide toggle and, for payment events, the
    // payment's reminders to be on with the push channel selected.
    private async isPushEnabled(notification: NotificationModel) {
        const userSettings = await this.userSettingsModel.findOne({
            attributes: ['push_notifications_enabled'],
            where: { user_id: notification.user_id },
        });

        // Settings are created lazily, so no row means the defaults (on).
        if (userSettings && !userSettings.push_notifications_enabled) {
            return false;
        }

        if (!notification.recurring_payment_id) {
            return true;
        }

        const reminderSettings = await this.reminderSettingsModel.findOne({
            attributes: ['is_enabled', 'channels'],
            where: { recurring_payment_id: notification.recurring_payment_id },
        });

        return (
            !!reminderSettings?.is_enabled &&
            reminderSettings.channels.includes(ReminderChannel.Push)
        );
    }

    async findAll(
        currentUserId: string,
        currentUserEmail: string,
        query: FindAllNotificationDto,
    ) {
        try {
            this.logger.log(
                `Fetching notifications for user: ${currentUserEmail}`,
            );

            const page = query.page ?? 1;
            const limit = query.limit ?? 20;

            const { rows, count } =
                await this.notificationModel.findAndCountAll({
                    where: {
                        user_id: currentUserId,
                        ...(query.is_read !== undefined && {
                            read_at: query.is_read ? { [Op.ne]: null } : null,
                        }),
                    },
                    limit,
                    offset: (page - 1) * limit,
                    order: [
                        ['created_at', 'DESC'],
                        ['id', 'DESC'],
                    ],
                });

            this.logger.log(
                `Fetched notifications successfully for user: ${currentUserEmail}`,
            );

            return {
                message: 'Fetched notifications successfully',
                data: rows,
                metadata: {
                    total: count,
                    page,
                    limit,
                    totalPages: Math.ceil(count / limit),
                },
            };
        } catch (error) {
            this.logger.error(
                `Error fetching notifications for user: ${currentUserEmail}`,
                error,
            );

            throw error;
        }
    }

    async getUnreadCount(currentUserId: string, currentUserEmail: string) {
        this.logger.log(
            `Fetching unread notification count for user: ${currentUserEmail}`,
        );

        const unreadCount = await this.notificationModel.count({
            where: { user_id: currentUserId, read_at: null },
        });

        return {
            message: 'Fetched unread notification count successfully',
            data: { unread_count: unreadCount },
        };
    }

    async markAsRead(
        id: string,
        currentUserId: string,
        currentUserEmail: string,
    ) {
        this.logger.log(
            `Marking notification ${id} as read for user: ${currentUserEmail}`,
        );

        const notification = await this.findByIdAndOwnerId(
            id,
            currentUserId,
            currentUserEmail,
        );

        // Keep the first read time if it was already read.
        if (!notification.read_at) {
            await notification.update({ read_at: new Date() });
        }

        this.logger.log(
            `Successfully marked notification ${id} as read for user: ${currentUserEmail}`,
        );

        return {
            message: 'Marked notification as read successfully',
            data: notification,
        };
    }

    async markAllAsRead(currentUserId: string, currentUserEmail: string) {
        this.logger.log(
            `Marking all notifications as read for user: ${currentUserEmail}`,
        );

        const [updatedCount] = await this.notificationModel.update(
            { read_at: new Date() },
            { where: { user_id: currentUserId, read_at: null } },
        );

        this.logger.log(
            `Successfully marked ${updatedCount} notification(s) as read for user: ${currentUserEmail}`,
        );

        return {
            message: 'Marked all notifications as read successfully',
            data: { updated_count: updatedCount },
        };
    }

    async remove(id: string, currentUserId: string, currentUserEmail: string) {
        this.logger.log(
            `Deleting notification ${id} for user: ${currentUserEmail}`,
        );

        const notification = await this.findByIdAndOwnerId(
            id,
            currentUserId,
            currentUserEmail,
        );

        await notification.destroy();

        this.logger.log(
            `Successfully deleted notification ${id} for user: ${currentUserEmail}`,
        );

        return { message: 'Successfully deleted notification' };
    }

    private async findByIdAndOwnerId(
        id: string,
        currentUserId: string,
        currentUserEmail: string,
    ) {
        const notification = await this.notificationModel.findOne({
            where: { id, user_id: currentUserId },
        });

        if (!notification) {
            this.logger.warn(
                `Notification ${id} not found for user: ${currentUserEmail}`,
            );
            throw new NotFoundException('Notification not found');
        }

        return notification;
    }
}
