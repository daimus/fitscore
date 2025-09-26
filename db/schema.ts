import { sql } from "drizzle-orm";
import { pgTable, uuid } from "drizzle-orm/pg-core";

export const applicantTable = pgTable('applicants', {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
});