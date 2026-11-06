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
    HasOne,
    UpdatedAt,
    CreatedAt,
    DeletedAt,
    HasMany,
} from 'sequelize-typescript';

import { UserModel } from '@/user/models/user.model';
import { ReminderSettingsModel } from '@/reminder/models/reminder-settings.model';
import {
    RecurringPaymentBillingCycle,
    RecurringPaymentCategory,
    RecurringPaymentBillingDateType,
    RecurringPaymentDueDateType,
    RecurringPaymentPricingType,
    RecurringPaymentType,
} from '@/common/enum';
import { SentReminderModel } from '@/reminder/models/sent-reminder.model';

interface RecurringPayment {
    id?: string;
    user_id?: string;
    name: string;
    type: RecurringPaymentType;
    description?: string;
    amount: number;
    currency?: string;
    billing_cycle: RecurringPaymentBillingCycle;
    is_auto_renew: boolean;
    is_archived: boolean;
    is_free_trial: boolean;
    icon?: string;
    due_date: Date;
    pricing_type?: RecurringPaymentPricingType;
    billing_date?: Date | null;
    billing_date_type?: RecurringPaymentBillingDateType;
    due_date_type?: RecurringPaymentDueDateType;
    is_paid?: boolean;
    needs_cycle_confirmation?: boolean;
    category?: RecurringPaymentCategory | null;
    created_at?: Date | null;
    updated_at?: Date | null;
    deleted_at?: Date | null;
}

@Table({
    tableName: 'recurring_payments',
    underscored: true,
    timestamps: true,
    paranoid: true,
})
export class RecurringPaymentModel extends Model<RecurringPayment> {
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
    })
    declare name: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare type: RecurringPaymentType;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    declare description: string | null;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false,
    })
    declare amount: number;

    @Default('PHP')
    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare currency: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare billing_cycle: RecurringPaymentBillingCycle;

    @Default(true)
    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
    })
    declare is_auto_renew: boolean;

    @Default(false)
    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
    })
    declare is_archived: boolean;

    @Default(false)
    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
    })
    declare is_free_trial: boolean;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare icon: string | null;

    @Column({
        type: DataType.DATE,
        allowNull: false,
    })
    declare due_date: Date;

    @Default(RecurringPaymentPricingType.Fixed)
    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare pricing_type: RecurringPaymentPricingType;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    declare billing_date: Date | null;

    @Default(RecurringPaymentBillingDateType.Fixed)
    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare billing_date_type: RecurringPaymentBillingDateType;

    @Default(RecurringPaymentDueDateType.Fixed)
    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare due_date_type: RecurringPaymentDueDateType;

    @Default(false)
    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
    })
    declare is_paid: boolean;

    @Default(false)
    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
    })
    declare needs_cycle_confirmation: boolean;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare category: RecurringPaymentCategory | null;

    @CreatedAt
    declare created_at: Date;

    @UpdatedAt
    declare updated_at: Date;

    @DeletedAt
    declare deleted_at: Date;

    @BelongsTo(() => UserModel, {
        foreignKey: 'user_id',
        as: 'user',
    })
    declare user: UserModel;

    @HasOne(() => ReminderSettingsModel, {
        foreignKey: 'recurring_payment_id',
        as: 'reminder_settings',
    })
    declare reminder_settings: ReminderSettingsModel | null;

    @HasMany(() => SentReminderModel, {
        foreignKey: 'recurring_payment_id',
        as: 'sent_reminders',
    })
    declare sent_reminders: SentReminderModel[];
}
