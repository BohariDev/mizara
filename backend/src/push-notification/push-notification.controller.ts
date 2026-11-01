import {
    Body,
    Controller,
    Delete,
    HttpCode,
    HttpStatus,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { PushNotificationService } from './push-notification.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { UnregisterPushTokenDto } from './dto/unregister-push-token.dto';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';

@ApiTags('Push Notification')
@ApiBearerAuth()
@Controller('/api/push-notification')
export class PushNotificationController {
    constructor(
        private readonly pushNotificationService: PushNotificationService,
    ) {}

    @UseGuards(JwtAuthGuard)
    @Post('token')
    @HttpCode(HttpStatus.OK)
    async registerToken(
        @CurrentUser() user: AuthenticatedUser,
        @Body() dto: RegisterPushTokenDto,
    ) {
        return this.pushNotificationService.registerToken(
            dto,
            user.id,
            user.email,
        );
    }

    @UseGuards(JwtAuthGuard)
    @Delete('token')
    @HttpCode(HttpStatus.OK)
    async removeToken(
        @CurrentUser() user: AuthenticatedUser,
        @Body() dto: UnregisterPushTokenDto,
    ) {
        return this.pushNotificationService.removeToken(
            dto.token,
            user.id,
            user.email,
        );
    }
}
