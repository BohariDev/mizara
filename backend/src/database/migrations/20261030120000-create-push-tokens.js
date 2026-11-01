'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('push_tokens', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },

            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },

            // One row per device: a device signing in to another account
            // moves the token instead of duplicating it.
            token: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            },

            platform: {
                type: Sequelize.STRING,
                allowNull: false,
            },

            last_seen_at: {
                type: Sequelize.DATE,
                allowNull: false,
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

        await queryInterface.addIndex('push_tokens', ['user_id']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('push_tokens');
    },
};
