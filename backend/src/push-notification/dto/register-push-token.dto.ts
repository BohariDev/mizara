import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

import { PushPlatform } from '@/common/enum';

export class RegisterPushTokenDto {
    @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
    @IsString()
    @IsNotEmpty()
    token!: string;

    @ApiProperty({ example: PushPlatform.Android, enum: PushPlatform })
    @IsEnum(PushPlatform)
    platform!: PushPlatform;
}
