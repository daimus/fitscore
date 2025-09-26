import { config } from "dotenv";
import { z } from "zod";
import process from "process";
config({ path: '.env' });

const envSchema = z.object({
    APP_NAME: z.string().default('Fit Score'),
    NODE_ENV: z.enum(['production', 'testing', 'development']).default('development'),
    TZ: z.string().default('Asia/Jakarta'),
    PORT: z.coerce.number().default(3000),
    DATABASE_URI: z.string().min(1, "DATABASE_URI is required"),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_HOST: z.string().min(1, "REDIS_HOST is required"),
    REDIS_DB_NUMBER: z.coerce.number().default(0),
    REDIS_USERNAME: z.string().optional().nullable(),
    REDIS_PASSWORD: z.string().optional().nullable()
});

const env = envSchema.parse(process.env);

export default {
    appName: env.APP_NAME,
    env: env.NODE_ENV,
    tz: env.TZ,
    port: env.PORT,
    database: {
        uri: env.DATABASE_URI,
        log: env.NODE_ENV === 'development'
    },
    redis: {
        port: env.REDIS_PORT,
        host: env.REDIS_HOST,
        db: env.REDIS_DB_NUMBER,
        username: env.REDIS_USERNAME,
        password: env.REDIS_PASSWORD
    },
}