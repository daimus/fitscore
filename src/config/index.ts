import { config } from "dotenv";
import process from "process";
config({ path: '.env' });
export default {
    appName: process.env.APP_NAME || 'Fit Score',
    env: process.env.NODE_ENV || 'development',
    tz: process.env.TZ || 'Asia/Jakarta',
    port: process.env.PORT || 3000,
}