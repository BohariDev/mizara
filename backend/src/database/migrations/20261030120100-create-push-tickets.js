'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Expo push tickets awaiting a delivery receipt check.
        await queryInterface.createTable('push_tickets', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },

            ticket_id: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            },

            push_token_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'push_tokens',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },

            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
            },

            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
            },
        });

        await queryInterface.addIndex('push_tickets', ['push_token_id']);
        await queryInterface.addIndex('push_tickets', ['created_at']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('push_tickets');
    },
};
