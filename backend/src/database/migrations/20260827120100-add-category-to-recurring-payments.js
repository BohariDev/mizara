'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Holds a RecurringPaymentCategory value; the list itself lives in
        // code (recurring-payment-categories.data.ts), not in a table.
        await queryInterface.addColumn('recurring_payments', 'category', {
            type: Sequelize.STRING,
            allowNull: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('recurring_payments', 'category');
    },
};
