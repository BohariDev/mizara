import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcrypt';
import { randomInt, randomBytes, randomUUID, createHash } from 'crypto';
import { Sequelize, Transaction } from 'sequelize';

import { UserService } from '@/user/user.service';
import { UserStatus } from '@/common/enum';
import { VerificationCodeModel } from '@/auth/models/verification-code.model';
import { RefreshTokenModel } from '@/auth/models/refresh-token.model';
import { EmailQueueService } from '@/email/email-queue.service';
import { VerificationCodeType } from '@/common/enum';
import { ChangeEmailDto } from '@/auth/dto/change-email.dto';
import { ChangePasswordDto } from '@/auth/dto/change-password.dto';
import { VerifyChangeEmailDto } from './dto/verify-change-email.dto';
import { UserModel } from '@/user/models/user.model';

const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 30;

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly googleClient = new OAuth2Client();

    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly emailQueueService: EmailQueueService,
        @InjectModel(VerificationCodeModel)
        private readonly verificationCodeModel: typeof VerificationCodeModel,
        @InjectModel(RefreshTokenModel)
        private readonly refreshTokenModel: typeof RefreshTokenModel,
        @InjectConnection()
        private readonly sequelize: Sequelize,
    ) {}

    async signup(
        first_name: string,
        last_name: string,
        email: string,
        password: string,
    ) {
        const transaction = await this.sequelize.transaction();
        try {
            this.logger.log(`Signing up user with email: ${email}`);

            const user = await this.userService.findByEmail(email);
            if (user) {
                this.logger.warn(`User already exists with email: ${email}`);
                throw new BadRequestException(
                    `User with email ${email} already exists`,
                );
            }

            const createdUser = await this.userService.create(
                first_name,
                last_name,
                email,
                password,
                transaction,
            );

            await this.createAndSendVerificationCode(
                createdUser.data.id,
                email,
                VerificationCodeType.EmailVerification,
                transaction,
            );

            await transaction.commit();

            this.logger.log(
                `User signed up successfully with email: ${createdUser.data.email}`,
            );

            return {
                message: `User ${createdUser.data.email} signed up successfully. Please check your email for the verification code.`,
            };
        } catch (error) {
            await transaction.rollback();

            if (error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error(
                `Error signing up user with email: ${email}`,
                error,
            );
            throw error;
        }
    }

    async signin(email: string, password: string) {
        this.logger.log(`Signing in user with email: ${email}`);

        const validatedUser = await this.userService.validateCredentials(
            email,
            password,
        );

        if (!validatedUser) {
            this.logger.warn(`Invalid email or password for email: ${email}`);
            throw new BadRequestException('Invalid email or password');
        }

        if (validatedUser.data.status === UserStatus.Unverified) {
            this.logger.warn(
                `User email is not yet verified for email: ${email}`,
            );
            throw new BadRequestException('Email is not yet verified');
        }

        const session = await this.issueSession(
            validatedUser.data.id,
            validatedUser.data.email,
        );

        this.logger.log(
            `User signed in successfully with email: ${validatedUser.data.email}`,
        );

        return {
            message: `User ${validatedUser.data.email} signed in successfully`,
            data: session,
        };
    }

    async googleSignin(idToken: string) {
        this.logger.log('Processing Google sign-in');

        const googleUser = await this.verifyGoogleIdToken(idToken);
        const email = googleUser.email!.toLowerCase();

        const transaction = await this.sequelize.transaction();

        try {
            let user = await this.userService.findByGoogleId(googleUser.sub);

            if (!user) {
                user = await this.userService.findByEmail(email);

                if (user) {
                    user = await this.linkGoogleAccount(
                        user,
                        googleUser.sub,
                        transaction,
                    );
                } else {
                    const { first_name, last_name } =
                        this.getGoogleUserName(googleUser);

                    user = await this.userService.createFromGoogle(
                        first_name,
                        last_name,
                        email,
                        googleUser.sub,
                        transaction,
                    );
                }
            }

            await transaction.commit();

            const session = await this.issueSession(user.id, user.email);

            this.logger.log(
                `User signed in with Google successfully with email: ${user.email}`,
            );

            return {
                message: `User ${user.email} signed in successfully`,
                data: session,
            };
        } catch (error) {
            await transaction.rollback();

            if (error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error(
                `Error signing in with Google for email: ${email}`,
                error,
            );
            throw error;
        }
    }

    private async verifyGoogleIdToken(idToken: string): Promise<TokenPayload> {
        // Comma-separated OAuth client IDs the token may be issued for. The
        // mobile app passes the Web client ID, so that one is enough.
        const audience = (process.env.GOOGLE_OAUTH_CLIENT_IDS ?? '')
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean);

        if (audience.length === 0) {
            this.logger.error('GOOGLE_OAUTH_CLIENT_IDS is not configured');
            throw new Error('Google sign-in is not configured');
        }

        let payload: TokenPayload | undefined;

        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken,
                audience,
            });
            payload = ticket.getPayload();
        } catch (error) {
            this.logger.warn(
                `Invalid Google ID token: ${(error as Error).message}`,
            );
            throw new UnauthorizedException('Invalid Google token');
        }

        if (!payload?.sub || !payload.email) {
            this.logger.warn('Google ID token is missing sub or email');
            throw new UnauthorizedException('Invalid Google token');
        }

        if (!payload.email_verified) {
            this.logger.warn(
                `Google email is not verified for email: ${payload.email}`,
            );
            throw new UnauthorizedException('Google email is not verified');
        }

        return payload;
    }

    private async linkGoogleAccount(
        user: UserModel,
        googleId: string,
        transaction: Transaction,
    ) {
        if (user.google_id && user.google_id !== googleId) {
            this.logger.warn(
                `User is already linked to another Google account: ${user.email}`,
            );
            throw new BadRequestException(
                'This email is already linked to a different Google account.',
            );
        }

        this.logger.log(`Linking Google account for user: ${user.email}`);

        // An unverified account was never proven to belong to this email's
        // owner, so drop its password. Otherwise whoever registered it could
        // still sign in after the real owner links Google.
        return user.update(
            {
                google_id: googleId,
                is_email_verified: true,
                ...(!user.is_email_verified && { password: null }),
            },
            { transaction },
        );
    }

    private getGoogleUserName(googleUser: TokenPayload) {
        if (googleUser.given_name) {
            return {
                first_name: googleUser.given_name,
                last_name: googleUser.family_name ?? '',
            };
        }

        const [first, ...rest] = (googleUser.name ?? '').trim().split(/\s+/);

        return {
            first_name: first || googleUser.email!.split('@')[0],
            last_name: rest.join(' '),
        };
    }

    private async issueSession(userId: string, email: string) {
        const accessToken = this.jwtService.sign({ sub: userId, email });
        const { rawToken: refreshToken } = await this.issueRefreshToken(userId);

        return { accessToken, refreshToken };
    }

    private hashRefreshToken(token: string) {
        return createHash('sha256').update(token).digest('hex');
    }

    private async issueRefreshToken(
        userId: string,
        familyId: string = randomUUID(),
        transaction?: Transaction,
    ) {
        const rawToken = randomBytes(64).toString('hex');
        const expiresAt = new Date(
            Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
        );

        const refreshToken = await this.refreshTokenModel.create(
            {
                user_id: userId,
                token_hash: this.hashRefreshToken(rawToken),
                family_id: familyId,
                expires_at: expiresAt,
            },
            transaction ? { transaction } : undefined,
        );

        return { rawToken, refreshToken };
    }

    async refreshTokens(rawToken: string) {
        this.logger.log('Processing refresh token request');

        const tokenHash = this.hashRefreshToken(rawToken);

        const existingToken = await this.refreshTokenModel.findOne({
            where: { token_hash: tokenHash },
        });

        if (!existingToken) {
            this.logger.warn('Refresh token not found');
            throw new UnauthorizedException('Invalid refresh token');
        }

        if (existingToken.revoked_at) {
            this.logger.warn(
                `Reuse of a rotated refresh token detected for user: ${existingToken.user_id}`,
            );

            await this.refreshTokenModel.update(
                { revoked_at: new Date() },
                {
                    where: {
                        family_id: existingToken.family_id,
                        revoked_at: null,
                    },
                },
            );

            throw new UnauthorizedException(
                'Refresh token reuse detected. All sessions have been revoked.',
            );
        }

        if (existingToken.expires_at.getTime() < Date.now()) {
            this.logger.warn(
                `Refresh token expired for user: ${existingToken.user_id}`,
            );
            throw new UnauthorizedException('Refresh token has expired');
        }

        const user = await this.userService.findById(existingToken.user_id);

        if (!user) {
            this.logger.warn(
                `User not found for refresh token: ${existingToken.user_id}`,
            );
            throw new UnauthorizedException('Invalid refresh token');
        }

        const transaction = await this.sequelize.transaction();

        try {
            const { rawToken: newRawToken, refreshToken: newRecord } =
                await this.issueRefreshToken(
                    user.id,
                    existingToken.family_id,
                    transaction,
                );

            existingToken.revoked_at = new Date();
            existingToken.replaced_by_id = newRecord.id;
            await existingToken.save({ transaction });

            await transaction.commit();

            const payload = { sub: user.id, email: user.email };
            const accessToken = this.jwtService.sign(payload);

            this.logger.log(
                `Refresh token rotated successfully for user: ${user.email}`,
            );

            return {
                message: 'Token refreshed successfully',
                data: { accessToken, refreshToken: newRawToken },
            };
        } catch (error) {
            await transaction.rollback();

            this.logger.error(
                `Error rotating refresh token for user: ${existingToken.user_id}`,
                error,
            );
            throw error;
        }
    }

    async logout(rawToken: string) {
        const tokenHash = this.hashRefreshToken(rawToken);

        const existingToken = await this.refreshTokenModel.findOne({
            where: { token_hash: tokenHash },
        });

        if (existingToken && !existingToken.revoked_at) {
            await this.refreshTokenModel.update(
                { revoked_at: new Date() },
                {
                    where: {
                        family_id: existingToken.family_id,
                        revoked_at: null,
                    },
                },
            );

            this.logger.log(
                `User logged out, refresh token family revoked for user: ${existingToken.user_id}`,
            );
        }

        return { message: 'Logged out successfully' };
    }

    private async createAndSendVerificationCode(
        userId: string,
        email: string,
        verificationType: VerificationCodeType,
        transaction: Transaction,
    ) {
        this.logger.log(`Creating ${verificationType} code for user: ${email}`);
        const code = randomInt(100000, 1000000).toString();

        const codeHash = await bcrypt.hash(code, 10);

        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await this.verificationCodeModel.create(
            {
                user_id: userId,
                email: email,
                code_hash: codeHash,
                expires_at: expiresAt,
                attempts: 0,
                type: verificationType,
            },
            { transaction },
        );

        this.logger.log(`${verificationType} code created for user: ${email}`);

        await this.emailQueueService.enqueueVerificationCode(
            verificationType,
            email,
            code,
        );

        this.logger.log(`${verificationType} code queued for user: ${email}`);
    }

    private async enforceResendCooldown(
        userId: string,
        type: VerificationCodeType,
    ) {
        const latestVerification = await this.verificationCodeModel.findOne({
            where: { user_id: userId, type },
            order: [['created_at', 'DESC']],
        });

        if (!latestVerification) {
            return;
        }

        const cooldown = Date.now() - latestVerification.created_at.getTime();

        if (cooldown < 60 * 1000) {
            this.logger.warn(
                `${type} code requested too soon for user: ${userId}`,
            );
            throw new BadRequestException(
                'Please wait before requesting another code.',
            );
        }
    }

    private async validateVerificationCode(
        userId: string,
        type: VerificationCodeType,
        code: string,
    ): Promise<VerificationCodeModel> {
        const verification = await this.verificationCodeModel.findOne({
            where: {
                user_id: userId,
                type,
                used_at: null,
            },
            order: [['created_at', 'DESC']],
        });

        if (!verification) {
            this.logger.warn(
                `No active ${type} code found for user: ${userId}`,
            );
            throw new BadRequestException(
                'Invalid or expired verification code.',
            );
        }

        if (verification.expires_at.getTime() < Date.now()) {
            this.logger.warn(`${type} code expired for user: ${userId}`);
            throw new BadRequestException('Verification code has expired.');
        }

        if (verification.attempts >= 5) {
            this.logger.warn(
                `Too many attempts for ${type} code, user: ${userId}`,
            );
            throw new BadRequestException(
                'Too many attempts. Please request a new verification code.',
            );
        }

        const isValid = await bcrypt.compare(code, verification.code_hash);

        if (!isValid) {
            this.logger.warn(`Invalid ${type} code for user: ${userId}`);
            await verification.increment('attempts');
            throw new BadRequestException('Invalid verification code.');
        }

        return verification;
    }

    async verifyEmail(email: string, code: string) {
        this.logger.log(`Verifying email for user: ${email}`);

        const user = await this.userService.findByEmail(email);

        if (!user) {
            this.logger.warn(`User not found for email: ${email}`);
            throw new NotFoundException('User not found.');
        }

        if (user.is_email_verified) {
            this.logger.warn(`Email already verified for user: ${email}`);
            throw new BadRequestException('Email is already verified.');
        }

        const verification = await this.validateVerificationCode(
            user.id,
            VerificationCodeType.EmailVerification,
            code,
        );

        const transaction = await this.sequelize.transaction();

        try {
            user.is_email_verified = true;

            await user.save({
                transaction,
            });

            verification.used_at = new Date();

            await verification.save({
                transaction,
            });

            await transaction.commit();

            this.logger.log(`Email verified successfully for user: ${email}`);

            return {
                message: 'Email verified successfully.',
            };
        } catch (error) {
            await transaction.rollback();

            if (error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error(
                `Error verifying email for user: ${email}`,
                error,
            );
            throw error;
        }
    }

    async resendVerificationCode(email: string) {
        const transaction = await this.sequelize.transaction();
        try {
            this.logger.log(`Resending verification code for user: ${email}`);
            const user = await this.userService.findByEmail(email);

            if (!user) {
                this.logger.warn(`User not found for email: ${email}`);
                throw new NotFoundException('User not found.');
            }

            if (user.is_email_verified) {
                this.logger.warn(
                    `Email is already verified for user: ${email}`,
                );
                throw new BadRequestException('Email is already verified.');
            }

            await this.enforceResendCooldown(
                user.id,
                VerificationCodeType.EmailVerification,
            );

            await this.createAndSendVerificationCode(
                user.id,
                user.email,
                VerificationCodeType.EmailVerification,
                transaction,
            );

            await transaction.commit();

            this.logger.log(`Verification code resent for user: ${email}`);

            return {
                message: `A new verification code has been sent to ${user.email}`,
            };
        } catch (error) {
            await transaction.rollback();

            if (error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error(
                `Error resending verification code for user: ${email}`,
                error,
            );
            throw error;
        }
    }

    async forgotPassword(email: string) {
        const transaction = await this.sequelize.transaction();
        try {
            this.logger.log(`Processing forgot password for user: ${email}`);
            const user = await this.userService.findByEmail(email);

            if (!user) {
                this.logger.warn(`User not found for email: ${email}`);
                throw new NotFoundException('User not found.');
            }

            await this.enforceResendCooldown(
                user.id,
                VerificationCodeType.PasswordReset,
            );

            await this.createAndSendVerificationCode(
                user.id,
                user.email,
                VerificationCodeType.PasswordReset,
                transaction,
            );

            await transaction.commit();

            this.logger.log(`Forgot password code sent for user: ${email}`);

            return {
                message: `A password reset code has been sent to ${user.email}`,
            };
        } catch (error) {
            await transaction.rollback();

            if (error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error(
                `Error processing forgot password for user: ${email}`,
                error,
            );
            throw error;
        }
    }

    async verifyPasswordResetCode(email: string, code: string) {
        this.logger.log(`Verifying password reset code for user: ${email}`);

        const user = await this.userService.findByEmail(email);

        if (!user) {
            this.logger.warn(`User not found for email: ${email}`);
            throw new NotFoundException('User not found.');
        }

        await this.validateVerificationCode(
            user.id,
            VerificationCodeType.PasswordReset,
            code,
        );

        this.logger.log(`Password reset code verified for user: ${email}`);

        return {
            message: 'Password reset code verified successfully.',
        };
    }

    async resetPassword(email: string, code: string, new_password: string) {
        this.logger.log(`Resetting password for user: ${email}`);

        const user = await this.userService.findByEmail(email);

        if (!user) {
            this.logger.warn(`User not found for email: ${email}`);
            throw new NotFoundException('User not found.');
        }

        const verification = await this.validateVerificationCode(
            user.id,
            VerificationCodeType.PasswordReset,
            code,
        );

        const transaction = await this.sequelize.transaction();

        try {
            user.password = await bcrypt.hash(new_password, 12);
            await user.save({ transaction });

            verification.used_at = new Date();
            await verification.save({ transaction });

            await transaction.commit();

            this.logger.log(`Password reset successfully for user: ${email}`);

            return {
                message: 'Password has been reset successfully.',
            };
        } catch (error) {
            await transaction.rollback();

            if (error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error(
                `Error resetting password for user: ${email}`,
                error,
            );
            throw error;
        }
    }

    async changeEmail(currentEmail: string, dto: ChangeEmailDto) {
        const transaction = await this.sequelize.transaction();
        try {
            this.logger.log(`Changing email for user: ${currentEmail}`);

            const user = await this.userService.findByEmail(currentEmail);

            if (!user) {
                this.logger.warn(`User not found for email: ${currentEmail}`);
                throw new NotFoundException('User not found.');
            }

            if (
                user.email.toLocaleLowerCase() ===
                dto.new_email.toLocaleLowerCase()
            ) {
                this.logger.warn(
                    `New email is the same as current email for user: ${currentEmail}`,
                );
                throw new BadRequestException(
                    'New email cannot be the same as the current email.',
                );
            }

            if (!user.password) {
                this.logger.warn(
                    `User has no password set (Google sign-in only): ${currentEmail}`,
                );
                throw new BadRequestException(
                    'Your account uses Google sign-in. Set a password via forgot password first.',
                );
            }

            const isPasswordValid = await bcrypt.compare(
                dto.password,
                user.password,
            );

            if (!isPasswordValid) {
                this.logger.warn(
                    `Invalid password provided for user: ${currentEmail}`,
                );
                throw new BadRequestException('Invalid password.');
            }

            const existingUser = await this.userService.findByEmail(
                dto.new_email,
            );

            if (existingUser) {
                this.logger.warn(`Email already in use: ${dto.new_email}`);
                throw new BadRequestException('Email is already in use.');
            }

            await this.createAndSendVerificationCode(
                user.id,
                dto.new_email,
                VerificationCodeType.ChangeEmail,
                transaction,
            );

            await transaction.commit();

            this.logger.log(
                `Change email verification code sent to new email: ${dto.new_email}`,
            );

            return {
                message: `A verification code has been sent to ${dto.new_email}. Please verify to complete the email change.`,
            };
        } catch (error) {
            await transaction.rollback();

            if (
                error instanceof BadRequestException ||
                error instanceof NotFoundException
            ) {
                throw error;
            }

            this.logger.error(
                `Error changing email for user: ${currentEmail}`,
                error,
            );
            throw error;
        }
    }

    async verifyChangeEmail(currentEmail: string, dto: VerifyChangeEmailDto) {
        const transaction = await this.sequelize.transaction();
        try {
            this.logger.log(
                `Verifying change email code for user: ${currentEmail}`,
            );

            const user = await this.userService.findByEmail(currentEmail);

            if (!user) {
                this.logger.warn(`User not found for email: ${currentEmail}`);
                throw new NotFoundException('User not found.');
            }

            const verification = await this.validateVerificationCode(
                user.id,
                VerificationCodeType.ChangeEmail,
                dto.code,
            );

            await user.update(
                { email: verification.email, is_email_verified: true },
                { transaction },
            );

            await verification.update({ used_at: new Date() }, { transaction });

            await transaction.commit();

            const payload = {
                sub: user.id,
                email: verification.email,
            };

            const newAccessToken = this.jwtService.sign(payload);

            this.logger.log(
                `Email changed successfully for user: ${currentEmail}`,
            );

            return {
                message: 'Email has been changed successfully.',
                data: { newAccessToken: newAccessToken },
            };
        } catch (error) {
            await transaction.rollback();

            if (error instanceof NotFoundException) {
                throw error;
            }

            this.logger.error(
                `Error verifying email change for user: ${currentEmail}`,
                error,
            );
            throw error;
        }
    }

    async changePassword(email: string, dto: ChangePasswordDto) {
        const transaction = await this.sequelize.transaction();
        try {
            this.logger.log(`Changing password for user: ${email}`);

            const user = await this.userService.findByEmail(email);

            if (!user) {
                this.logger.warn(`User not found for email: ${email}`);
                throw new NotFoundException('User not found.');
            }

            if (!user.password) {
                this.logger.warn(
                    `User has no password set (Google sign-in only): ${email}`,
                );
                throw new BadRequestException(
                    'Your account uses Google sign-in. Set a password via forgot password first.',
                );
            }

            const isPasswordValid = await bcrypt.compare(
                dto.current_password,
                user.password,
            );

            if (!isPasswordValid) {
                this.logger.warn(
                    `Invalid current password provided for user: ${email}`,
                );
                throw new BadRequestException('Current password is incorrect.');
            }

            const isSamePassword = await bcrypt.compare(
                dto.new_password,
                user.password,
            );

            if (isSamePassword) {
                this.logger.warn(
                    `New password is the same as current password for user: ${email}`,
                );
                throw new BadRequestException(
                    'New password cannot be the same as the current password.',
                );
            }

            user.password = await bcrypt.hash(dto.new_password, 12);
            await user.save({ transaction });

            await transaction.commit();

            this.logger.log(`Password changed successfully for user: ${email}`);

            return {
                message: 'Password has been changed successfully.',
            };
        } catch (error) {
            await transaction.rollback();

            if (
                error instanceof BadRequestException ||
                error instanceof NotFoundException
            ) {
                throw error;
            }

            this.logger.error(
                `Error changing password for user: ${email}`,
                error,
            );
            throw error;
        }
    }
}
