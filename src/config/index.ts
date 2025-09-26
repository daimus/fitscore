import { config } from "dotenv";
import { z } from "zod";
import process from "process";
config({ path: '.env' });

const envSchema = z.object({
    APP_NAME: z.string().default('Fit Score'),
    NODE_ENV: z.enum(['production', 'testing', 'development']).default('development'),
    TZ: z.string().default('Asia/Jakarta'),
    PORT: z.string().default("3000"),
    DATABASE_URI: z.string().min(1, "DATABASE_URI is required"),
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
    }
}