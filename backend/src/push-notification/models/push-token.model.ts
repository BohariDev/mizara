import {
    Table,
    Model,
    IsUUID,
    PrimaryKey,
    Default,
    DataType,
    Column,
    ForeignKey,
    BelongsTo,
    UpdatedAt,
    CreatedAt,
} from 'sequelize-typescript';

import { UserModel } from '@/user/models/user.model';
import { PushPlatform } from '@/common/enum';

interface PushToken {
    id?: string;
    user_id: string;
    token: string;
    platform: PushPlatform;
    last_seen_at: Date;
    created_at?: Date | null;
    updated_at?: Date | null;
}

@Table({
    tableName: 'push_tokens',
    underscored: true,
    timestamps: true,
})
export class PushTokenModel extends Model<PushToken> {
    @IsUUID(4)
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id: string;

    @ForeignKey(() => UserModel)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare user_id: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
    })
    declare token: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare platform: PushPlatform;

    @Column({
        type: DataType.DATE,
        allowNull: false,
    })
    declare last_seen_at: Date;

    @CreatedAt
    declare created_at: Date;

    @UpdatedAt
    declare updated_at: Date;

    @BelongsTo(() => UserModel, {
        foreignKey: 'user_id',
        as: 'user',
    })
    declare user: UserModel;
}
