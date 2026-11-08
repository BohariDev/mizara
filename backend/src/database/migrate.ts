import { createRequire } from 'module';

import { Logger } from '@nestjs/common';
import { QueryInterface, Sequelize as SequelizeLib } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { SequelizeStorage, Umzug } from 'umzug';

// Same folder and table sequelize-cli uses, so migrations applied with
// `pnpm migration:all` are recognized and never re-run.
const MIGRATIONS_GLOB = 'src/database/migrations/*.js';
const MIGRATIONS_TABLE = 'migrations';

type CliMigration = {
    up: (
        queryInterface: QueryInterface,
        sequelize: typeof SequelizeLib,
    ) => Promise<unknown>;
    down: (
        queryInterface: QueryInterface,
        sequelize: typeof SequelizeLib,
    ) => Promise<unknown>;
};

const loadMigration = createRequire(__filename);

/**
 * Applies pending sequelize-cli migrations on startup. Set RUN_MIGRATIONS=false
 * to skip (e.g. locally, to apply them manually with `pnpm migration:all`).
 */
export async function runMigrations(sequelize: Sequelize): Promise<void> {
    const logger = new Logger('Migrations');

    if (process.env.RUN_MIGRATIONS === 'false') {
        logger.log('Skipped (RUN_MIGRATIONS=false)');
        return;
    }

    logger.log('Applying pending migrations...');

    const umzug = new Umzug({
        migrations: {
            glob: [MIGRATIONS_GLOB, { cwd: process.cwd() }],
            resolve: ({ name, path, context }) => {
                const migration = loadMigration(path!) as CliMigration;
                return {
                    name,
                    up: () => migration.up(context, SequelizeLib),
                    down: () => migration.down(context, SequelizeLib),
                };
            },
        },
        context: sequelize.getQueryInterface(),
        storage: new SequelizeStorage({
            sequelize,
            tableName: MIGRATIONS_TABLE,
        }),
        // Silence umzug's own output; the summary below goes through Nest's logger.
        logger: undefined,
    });

    const applied = await umzug.up();
    logger.log(
        applied.length
            ? `Applied ${applied.length}: ${applied.map((m) => m.name).join(', ')}`
            : 'Up to date',
    );
}
