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

import { PushTokenModel } from './push-token.model';

interface PushTicket {
    id?: string;
    ticket_id: string;
    push_token_id: string;
    created_at?: Date | null;
    updated_at?: Date | null;
}

@Table({
    tableName: 'push_tickets',
    underscored: true,
    timestamps: true,
})
export class PushTicketModel extends Model<PushTicket> {
    @IsUUID(4)
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
    })
    declare ticket_id: string;

    @ForeignKey(() => PushTokenModel)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare push_token_id: string;

    @CreatedAt
    declare created_at: Date;

    @UpdatedAt
    declare updated_at: Date;

    @BelongsTo(() => PushTokenModel, {
        foreignKey: 'push_token_id',
        as: 'push_token',
    })
    declare push_token: PushTokenModel;
}
