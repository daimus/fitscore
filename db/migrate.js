import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import {Pool} from "pg";
const { config } = require("dotenv");

config({ path: '.env' });

const main = async () => {
    try {
        const pool = new Pool({
            connectionString: process.env.DATABASE_URI,
        });
        await migrate(drizzle({ client: pool }), {
            migrationsFolder: './db/drizzle'
        });

        console.log('Migration completed');
    } catch (error) {
        console.error('Error during migration:', error);
        process.exit(1);
    }
};
main();