import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getConnectionToken, getModelToken } from '@nestjs/sequelize';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { TokenPayload } from 'google-auth-library';

import { AuthService } from './auth.service';
import { UserService } from '@/user/user.service';
import { EmailQueueService } from '@/email/email-queue.service';
import { VerificationCodeModel } from '@/auth/models/verification-code.model';
import { RefreshTokenModel } from '@/auth/models/refresh-token.model';

describe('AuthService', () => {
    let service: AuthService;

    const transaction = { commit: jest.fn(), rollback: jest.fn() };
    const userService = {
        findByGoogleId: jest.fn(),
        findByEmail: jest.fn(),
        createFromGoogle: jest.fn(),
    };
    const refreshTokenModel = { create: jest.fn() };

    const googlePayload: TokenPayload = {
        iss: 'https://accounts.google.com',
        aud: 'web-client-id',
        sub: 'google-sub-123',
        iat: 0,
        exp: 0,
        email: 'Jane@Example.com',
        email_verified: true,
        given_name: 'Jane',
        family_name: 'Doe',
    };

    const mockGoogleToken = (payload: TokenPayload | undefined) =>
        jest
            .spyOn(service['googleClient'], 'verifyIdToken')
            .mockResolvedValue({ getPayload: () => payload } as never);

    beforeEach(async () => {
        jest.clearAllMocks();
        process.env.GOOGLE_OAUTH_CLIENT_IDS = 'web-client-id, ios-client-id';
        refreshTokenModel.create.mockResolvedValue({ id: 'rt-1' });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: UserService, useValue: userService },
                {
                    provide: JwtService,
                    useValue: { sign: jest.fn().mockReturnValue('access') },
                },
                { provide: EmailQueueService, useValue: {} },
                {
                    provide: getModelToken(VerificationCodeModel),
                    useValue: {},
                },
                {
                    provide: getModelToken(RefreshTokenModel),
                    useValue: refreshTokenModel,
                },
                {
                    provide: getConnectionToken(),
                    useValue: {
                        transaction: jest.fn().mockResolvedValue(transaction),
                    },
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    describe('googleSignin', () => {
        it('signs in a user already linked by google_id', async () => {
            mockGoogleToken(googlePayload);
            userService.findByGoogleId.mockResolvedValue({
                id: 'u1',
                email: 'jane@example.com',
            });

            const result = await service.googleSignin('token');

            expect(userService.findByEmail).not.toHaveBeenCalled();
            expect(userService.createFromGoogle).not.toHaveBeenCalled();
            expect(result.data.accessToken).toBe('access');
            expect(result.data.refreshToken).toEqual(expect.any(String));
            expect(transaction.commit).toHaveBeenCalled();
        });

        it('creates a new verified user with a lowercased email', async () => {
            mockGoogleToken(googlePayload);
            userService.findByGoogleId.mockResolvedValue(null);
            userService.findByEmail.mockResolvedValue(null);
            userService.createFromGoogle.mockResolvedValue({
                id: 'u2',
                email: 'jane@example.com',
            });

            await service.googleSignin('token');

            expect(userService.createFromGoogle).toHaveBeenCalledWith(
                'Jane',
                'Doe',
                'jane@example.com',
                'google-sub-123',
                transaction,
            );
        });

        it('falls back to the full name when given_name is missing', async () => {
            mockGoogleToken({
                ...googlePayload,
                given_name: undefined,
                family_name: undefined,
                name: 'Jane Mary Doe',
            });
            userService.findByGoogleId.mockResolvedValue(null);
            userService.findByEmail.mockResolvedValue(null);
            userService.createFromGoogle.mockResolvedValue({
                id: 'u2',
                email: 'jane@example.com',
            });

            await service.googleSignin('token');

            expect(userService.createFromGoogle).toHaveBeenCalledWith(
                'Jane',
                'Mary Doe',
                'jane@example.com',
                'google-sub-123',
                transaction,
            );
        });

        it('links Google to a verified account and keeps its password', async () => {
            mockGoogleToken(googlePayload);
            const update = jest
                .fn()
                .mockResolvedValue({ id: 'u3', email: 'jane@example.com' });
            userService.findByGoogleId.mockResolvedValue(null);
            userService.findByEmail.mockResolvedValue({
                id: 'u3',
                email: 'jane@example.com',
                google_id: null,
                is_email_verified: true,
                update,
            });

            await service.googleSignin('token');

            expect(update).toHaveBeenCalledWith(
                { google_id: 'google-sub-123', is_email_verified: true },
                { transaction },
            );
        });

        it('clears the password when linking an unverified account', async () => {
            mockGoogleToken(googlePayload);
            const update = jest
                .fn()
                .mockResolvedValue({ id: 'u4', email: 'jane@example.com' });
            userService.findByGoogleId.mockResolvedValue(null);
            userService.findByEmail.mockResolvedValue({
                id: 'u4',
                email: 'jane@example.com',
                google_id: null,
                is_email_verified: false,
                update,
            });

            await service.googleSignin('token');

            expect(update).toHaveBeenCalledWith(
                {
                    google_id: 'google-sub-123',
                    is_email_verified: true,
                    password: null,
                },
                { transaction },
            );
        });

        it('rejects an email linked to a different Google account', async () => {
            mockGoogleToken(googlePayload);
            userService.findByGoogleId.mockResolvedValue(null);
            userService.findByEmail.mockResolvedValue({
                id: 'u5',
                email: 'jane@example.com',
                google_id: 'other-sub',
                is_email_verified: true,
            });

            await expect(service.googleSignin('token')).rejects.toBeInstanceOf(
                BadRequestException,
            );
            expect(transaction.rollback).toHaveBeenCalled();
        });

        it('rejects a token Google cannot verify', async () => {
            jest.spyOn(
                service['googleClient'],
                'verifyIdToken',
            ).mockRejectedValue(new Error('Wrong recipient') as never);

            await expect(service.googleSignin('bad')).rejects.toBeInstanceOf(
                UnauthorizedException,
            );
            expect(userService.findByGoogleId).not.toHaveBeenCalled();
        });

        it('rejects a Google email that is not verified', async () => {
            mockGoogleToken({ ...googlePayload, email_verified: false });

            await expect(service.googleSignin('token')).rejects.toBeInstanceOf(
                UnauthorizedException,
            );
        });

        it('passes the configured client IDs as the token audience', async () => {
            const spy = mockGoogleToken(googlePayload);
            userService.findByGoogleId.mockResolvedValue({
                id: 'u1',
                email: 'jane@example.com',
            });

            await service.googleSignin('token');

            expect(spy).toHaveBeenCalledWith({
                idToken: 'token',
                audience: ['web-client-id', 'ios-client-id'],
            });
        });
    });
});
