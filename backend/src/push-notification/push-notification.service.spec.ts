import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { BadRequestException } from '@nestjs/common';
import { subHours, subMinutes } from 'date-fns';
import { Op } from 'sequelize';

import { PushNotificationService } from './push-notification.service';
import { PushTokenModel } from './models/push-token.model';
import { PushTicketModel } from './models/push-ticket.model';
import { EXPO_CLIENT } from './constants';
import { PushPlatform } from '@/common/enum';

const TOKEN_A = 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]';
const TOKEN_B = 'ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]';

describe('PushNotificationService', () => {
    let service: PushNotificationService;
    const expo = {
        chunkPushNotifications: jest.fn((messages: unknown[]) => [messages]),
        chunkPushNotificationReceiptIds: jest.fn((ids: string[]) => [ids]),
        sendPushNotificationsAsync: jest.fn(),
        getPushNotificationReceiptsAsync: jest.fn(),
    };
    const pushTokenModel = {
        findOne: jest.fn(),
        findAll: jest.fn(),
        create: jest.fn(),
        destroy: jest.fn(),
    };
    const pushTicketModel = {
        findAll: jest.fn(),
        bulkCreate: jest.fn(),
        destroy: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PushNotificationService,
                { provide: EXPO_CLIENT, useValue: expo },
                {
                    provide: getModelToken(PushTokenModel),
                    useValue: pushTokenModel,
                },
                {
                    provide: getModelToken(PushTicketModel),
                    useValue: pushTicketModel,
                },
            ],
        }).compile();

        service = module.get<PushNotificationService>(PushNotificationService);
    });

    describe('registerToken', () => {
        it('rejects tokens that are not Expo push tokens', async () => {
            await expect(
                service.registerToken(
                    { token: 'not-a-token', platform: PushPlatform.Android },
                    'user-id',
                    'a@b.com',
                ),
            ).rejects.toThrow(BadRequestException);
            expect(pushTokenModel.create).not.toHaveBeenCalled();
        });

        it('creates a new token', async () => {
            pushTokenModel.findOne.mockResolvedValue(null);

            await service.registerToken(
                { token: TOKEN_A, platform: PushPlatform.Android },
                'user-id',
                'a@b.com',
            );

            expect(pushTokenModel.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    user_id: 'user-id',
                    token: TOKEN_A,
                    platform: PushPlatform.Android,
                }),
            );
        });

        it('moves an existing token to the signed-in user', async () => {
            const existingToken = { update: jest.fn() };
            pushTokenModel.findOne.mockResolvedValue(existingToken);

            await service.registerToken(
                { token: TOKEN_A, platform: PushPlatform.Android },
                'new-user-id',
                'a@b.com',
            );

            expect(existingToken.update).toHaveBeenCalledWith(
                expect.objectContaining({ user_id: 'new-user-id' }),
            );
            expect(pushTokenModel.create).not.toHaveBeenCalled();
        });
    });

    it('scopes removeToken to the current user', async () => {
        await service.removeToken(TOKEN_A, 'user-id', 'a@b.com');

        expect(pushTokenModel.destroy).toHaveBeenCalledWith({
            where: { token: TOKEN_A, user_id: 'user-id' },
        });
    });

    describe('sendToUser', () => {
        const message = { title: 'Title', body: 'Body' };

        it('does nothing when the user has no devices', async () => {
            pushTokenModel.findAll.mockResolvedValue([]);

            await service.sendToUser('user-id', message);

            expect(expo.sendPushNotificationsAsync).not.toHaveBeenCalled();
        });

        it('saves tickets and removes unregistered devices', async () => {
            pushTokenModel.findAll.mockResolvedValue([
                { id: 'token-a', token: TOKEN_A },
                { id: 'token-b', token: TOKEN_B },
            ]);
            expo.sendPushNotificationsAsync.mockResolvedValue([
                { status: 'ok', id: 'ticket-a' },
                {
                    status: 'error',
                    message: 'Not registered',
                    details: { error: 'DeviceNotRegistered' },
                },
            ]);

            await service.sendToUser('user-id', message);

            expect(pushTicketModel.bulkCreate).toHaveBeenCalledWith([
                { ticket_id: 'ticket-a', push_token_id: 'token-a' },
            ]);
            expect(pushTokenModel.destroy).toHaveBeenCalledWith({
                where: { id: { [Op.in]: ['token-b'] } },
            });
        });

        it('keeps going when Expo cannot be reached', async () => {
            pushTokenModel.findAll.mockResolvedValue([
                { id: 'token-a', token: TOKEN_A },
            ]);
            expo.sendPushNotificationsAsync.mockRejectedValue(
                new Error('Network error'),
            );

            await expect(
                service.sendToUser('user-id', message),
            ).resolves.toBeUndefined();
            expect(pushTicketModel.bulkCreate).not.toHaveBeenCalled();
        });
    });

    describe('checkReceipts', () => {
        it('removes devices whose receipts say they are unregistered', async () => {
            pushTicketModel.findAll.mockResolvedValue([
                {
                    id: 'row-ok',
                    ticket_id: 'ticket-ok',
                    push_token_id: 'token-a',
                    created_at: subMinutes(new Date(), 20),
                },
                {
                    id: 'row-dead',
                    ticket_id: 'ticket-dead',
                    push_token_id: 'token-b',
                    created_at: subMinutes(new Date(), 20),
                },
                {
                    id: 'row-pending',
                    ticket_id: 'ticket-pending',
                    push_token_id: 'token-a',
                    created_at: subMinutes(new Date(), 20),
                },
                {
                    id: 'row-expired',
                    ticket_id: 'ticket-expired',
                    push_token_id: 'token-a',
                    created_at: subHours(new Date(), 25),
                },
            ]);
            expo.getPushNotificationReceiptsAsync.mockResolvedValue({
                'ticket-ok': { status: 'ok' },
                'ticket-dead': {
                    status: 'error',
                    message: 'Not registered',
                    details: { error: 'DeviceNotRegistered' },
                },
            });

            await service.checkReceipts();

            // A receipt that isn't ready yet is kept for the next run.
            expect(pushTicketModel.destroy).toHaveBeenCalledWith({
                where: {
                    id: { [Op.in]: ['row-ok', 'row-dead', 'row-expired'] },
                },
            });
            expect(pushTokenModel.destroy).toHaveBeenCalledWith({
                where: { id: { [Op.in]: ['token-b'] } },
            });
        });
    });
});
