'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            // Postgres doesn't index foreign keys on its own. Every
            // user-facing read filters by user_id, and the list endpoint
            // sorts by due_date by default. Also speeds up the cascade
            // when a user is deleted.
            // transaction goes in the options object - with this form of
            // addIndex, a third argument is read as the raw table name.
            await queryInterface.addIndex('recurring_payments', {
                fields: ['user_id', 'due_date'],
                name: 'recurring_payments_user_id_due_date',
                transaction,
            });

            // The every-minute due reminder check filters by type and a
            // reminder_date range. The dedup indexes lead with
            // recurring_payment_id, so they can't serve it.
            await queryInterface.addIndex('sent_reminders', {
                fields: ['type', 'reminder_date'],
                name: 'sent_reminders_type_reminder_date',
                transaction,
            });

            // Latest code of a type for a user (resend cooldown, verify).
            await queryInterface.addIndex('verification_codes', {
                fields: [
                    'user_id',
                    'type',
                    { name: 'created_at', order: 'DESC' },
                ],
                name: 'verification_codes_user_id_type_created_at',
                transaction,
            });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    async down(queryInterface) {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            await queryInterface.removeIndex(
                'verification_codes',
                'verification_codes_user_id_type_created_at',
                { transaction },
            );
            await queryInterface.removeIndex(
                'sent_reminders',
                'sent_reminders_type_reminder_date',
                { transaction },
            );
            await queryInterface.removeIndex(
                'recurring_payments',
                'recurring_payments_user_id_due_date',
                { transaction },
            );

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },
};
