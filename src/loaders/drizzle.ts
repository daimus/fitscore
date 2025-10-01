import { drizzle } from 'drizzle-orm/node-postgres';
import { Container } from "typedi";
import config from "@/config";
import { Pool } from "pg";
import { Logger as DrizzleLogger } from 'drizzle-orm/logger';
import Logger from "@/loaders/logger";
import * as schema from "$/schema";

export default async () => {
    class CustomDrizzleLogger implements DrizzleLogger {
        logQuery(query: string, params: unknown[]): void {
            Logger.verbose("Query: %s - params: %j", query, params)
        }
    }
    const pool = new Pool({
        connectionString: config.database.uri,
    });
    const db = drizzle({ client: pool, schema: schema, logger: new CustomDrizzleLogger() });

    Container.set('db', db);
}