import * as dotenv from 'dotenv';

dotenv.config({ quiet: true });

interface SequelizeConfig {
  [key: string]: {
    url: string;
    dialect: string;
    migrationStorage: string;
    migrationStorageTableName: string;
    migrationPath: string;
    seederStorage: string;
    seederStorageTableName: string;
    seederPath: string;
  };
}

const config: SequelizeConfig = {
  development: {
    url: process.env.DATABASE_URL || '',
    dialect: 'postgres',

    migrationStorage: 'sequelize',
    migrationStorageTableName: 'migrations',
    migrationPath: './src/database/migrations',

    seederStorage: 'sequelize',
    seederStorageTableName: 'seeders',
    seederPath: './src/database/seeders',
  },
};

export default config;