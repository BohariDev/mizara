import {
    BadRequestException,
    Inject,
    Injectable,
    Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { subHours, subMinutes } from 'date-fns';
import { Op } from 'sequelize';
import Expo, { ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

import { PushTokenModel } from './models/push-token.model';
import { PushTicketModel } from './models/push-ticket.model';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { PushMessage } from './types/push-message.type';
import {
    ANDROID_CHANNEL_ID,
    EXPO_CLIENT,
    RECEIPT_CHECK_DELAY_MINUTES,
    RECEIPT_RETENTION_HOURS,
} from './constants';

@Injectable()
export class PushNotificationService {
    private readonly logger = new Logger(PushNotificationService.name);

    constructor(
        @Inject(EXPO_CLIENT)
        private readonly expo: Expo,
        @InjectModel(PushTokenModel)
        private pushTokenModel: typeof PushTokenModel,
        @InjectModel(PushTicketModel)
        private pushTicketModel: typeof PushTicketModel,
    ) {}

    async registerToken(
        dto: RegisterPushTokenDto,
        currentUserId: string,
        currentUserEmail: string,
    ) {
        this.logger.log(`Registering push token for user: ${currentUserEmail}`);

        if (!Expo.isExpoPushToken(dto.token)) {
            this.logger.warn(
                `Invalid push token received from user: ${currentUserEmail}`,
            );
            throw new BadRequestException('Invalid push token');
        }

        const existingToken = await this.pushTokenModel.findOne({
            where: { token: dto.token },
        });

        // A device that signs in to another account moves to that account,
        // so one phone never receives two users' notifications.
        if (existingToken) {
            await existingToken.update({
                user_id: currentUserId,
                platform: dto.platform,
                last_seen_at: new Date(),
            });
        } else {
            await this.pushTokenModel.create({
                user_id: currentUserId,
                token: dto.token,
                platform: dto.platform,
                last_seen_at: new Date(),
            });
        }

        this.logger.log(
            `Successfully registered push token for user: ${currentUserEmail}`,
        );

        return { message: 'Registered push token successfully' };
    }

    async removeToken(
        token: string,
        currentUserId: string,
        currentUserEmail: string,
    ) {
        this.logger.log(`Removing push token for user: ${currentUserEmail}`);

        await this.pushTokenModel.destroy({
            where: { token, user_id: currentUserId },
        });

        this.logger.log(
            `Successfully removed push token for user: ${currentUserEmail}`,
        );

        return { message: 'Removed push token successfully' };
    }

    async sendToUser(userId: string, message: PushMessage) {
        const pushTokens = await this.pushTokenModel.findAll({
            attributes: ['id', 'token'],
            where: { user_id: userId },
        });

        if (pushTokens.length === 0) {
            return;
        }

        this.logger.log(
            `Sending push notification to ${pushTokens.length} device(s) for user: ${userId}`,
        );

        const pushTokenIds = new Map(
            pushTokens.map((pushToken) => [pushToken.token, pushToken.id]),
        );
        const messages: ExpoPushMessage[] = pushTokens.map((pushToken) => ({
            to: pushToken.token,
            title: message.title,
            body: message.body,
            data: message.data,
            sound: 'default',
            channelId: ANDROID_CHANNEL_ID,
        }));

        const sentTickets: { ticket_id: string; push_token_id: string }[] = [];
        const deadPushTokenIds: string[] = [];

        for (const chunk of this.expo.chunkPushNotifications(messages)) {
            let tickets: ExpoPushTicket[];

            try {
                tickets = await this.expo.sendPushNotificationsAsync(chunk);
            } catch (error) {
                this.logger.error(
                    `Error sending push notifications for user: ${userId}`,
                    error,
                );
                continue;
            }

            // Tickets come back in the same order as the chunk's messages.
            tickets.forEach((ticket, index) => {
                const pushTokenId = pushTokenIds.get(chunk[index].to as string);

                if (!pushTokenId) {
                    return;
                }

                if (ticket.status === 'ok') {
                    sentTickets.push({
                        ticket_id: ticket.id,
                        push_token_id: pushTokenId,
                    });
                } else if (ticket.details?.error === 'DeviceNotRegistered') {
                    deadPushTokenIds.push(pushTokenId);
                } else {
                    this.logger.warn(
                        `Push notification rejected for user: ${userId} - ${ticket.message}`,
                    );
                }
            });
        }

        if (sentTickets.length > 0) {
            await this.pushTicketModel.bulkCreate(sentTickets);
        }

        await this.removeDeadTokens(deadPushTokenIds);
    }

    async checkReceipts() {
        this.logger.log('Checking push notification receipts...');

        const pushTickets = await this.pushTicketModel.findAll({
            attributes: ['id', 'ticket_id', 'push_token_id', 'created_at'],
            where: {
                created_at: {
                    [Op.lte]: subMinutes(
                        new Date(),
                        RECEIPT_CHECK_DELAY_MINUTES,
                    ),
                },
            },
        });

        if (pushTickets.length === 0) {
            return;
        }

        const pushTicketsByTicketId = new Map(
            pushTickets.map((pushTicket) => [pushTicket.ticket_id, pushTicket]),
        );
        const expiredBefore = subHours(new Date(), RECEIPT_RETENTION_HOURS);
        const processedPushTicketIds: string[] = [];
        const deadPushTokenIds = new Set<string>();

        for (const chunk of this.expo.chunkPushNotificationReceiptIds([
            ...pushTicketsByTicketId.keys(),
        ])) {
            let receipts: Awaited<
                ReturnType<Expo['getPushNotificationReceiptsAsync']>
            >;

            try {
                receipts =
                    await this.expo.getPushNotificationReceiptsAsync(chunk);
            } catch (error) {
                this.logger.error(
                    'Error fetching push notification receipts',
                    error,
                );
                continue;
            }

            for (const ticketId of chunk) {
                const pushTicket = pushTicketsByTicketId.get(ticketId)!;
                const receipt = receipts[ticketId];

                // Not ready yet - try again next run, unless Expo has
                // already dropped it.
                if (!receipt) {
                    if (pushTicket.created_at < expiredBefore) {
                        processedPushTicketIds.push(pushTicket.id);
                    }
                    continue;
                }

                if (receipt.status === 'error') {
                    if (receipt.details?.error === 'DeviceNotRegistered') {
                        deadPushTokenIds.add(pushTicket.push_token_id);
                    } else {
                        this.logger.warn(
                            `Push notification ${ticketId} failed - ${receipt.message}`,
                        );
                    }
                }

                processedPushTicketIds.push(pushTicket.id);
            }
        }

        if (processedPushTicketIds.length > 0) {
            await this.pushTicketModel.destroy({
                where: { id: { [Op.in]: processedPushTicketIds } },
            });
        }

        await this.removeDeadTokens([...deadPushTokenIds]);

        this.logger.log(
            `Checked ${processedPushTicketIds.length} push notification receipt(s)`,
        );
    }

    // The app was uninstalled or its token rotated, so Expo will never
    // deliver to it again.
    private async removeDeadTokens(pushTokenIds: string[]) {
        if (pushTokenIds.length === 0) {
            return;
        }

        this.logger.log(
            `Removing ${pushTokenIds.length} unregistered push token(s)`,
        );

        await this.pushTokenModel.destroy({
            where: { id: { [Op.in]: pushTokenIds } },
        });
    }
}
