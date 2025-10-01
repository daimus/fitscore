import { relations, sql } from "drizzle-orm";
import { numeric } from "drizzle-orm/pg-core";
import { pgEnum, vector } from "drizzle-orm/pg-core";
import { date } from "drizzle-orm/pg-core";
import { pgTable, uuid, text, varchar, timestamp, json } from "drizzle-orm/pg-core";

export const candidateTable = pgTable('candidates', {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    name: varchar('name').notNull(),
    jobTitle: varchar('job_title').notNull(),
    summaryProfile: text('summary_profile'),
    skills: json('skills'),
    softSkills: json('soft_skills'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
});

export const experienceTable = pgTable('experiences', {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    candidateId: uuid('candidate_id').notNull(),
    dateStart: date('date_start').notNull(),
    dateEnd: date('date_end').notNull(),
    company: varchar('company'),
    position: varchar('position').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
});

export const projectTable = pgTable('projects', {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    candidateId: uuid('candidate_id').notNull(),
    name: varchar('name'),
    company: varchar('company'),
    dateStart: date('date_start').notNull(),
    dateEnd: date('date_end').notNull(),
    position: varchar('position').notNull(),
    description: text('description'),
    skills: json('skills'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
});

export const jobTable = pgTable('jobs', {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    title: varchar('title').notNull(),
    intro: text('intro').notNull(),
    work: text('work'),
    skills: text('skills'),
    qualification: text('qualification'),
    culture: text('culture'),
    other: text('other'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
});

export const jobSection = pgEnum('jobSection', ["title", "intro", "work", "skills", "qualification", "culture", "other"]);
export const jobEmbeddingTable = pgTable('job_embeddings', {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    jobId: uuid('job_id').notNull(),
    chunkIndex: numeric('chunk_index', { mode: "number" }).notNull(),
    section: jobSection('section').notNull(),
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: 768 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
});

export const matchingStatus = pgEnum('matchingStatus', ["created", "queued", "processing", "completed", "error"]);
export const matchingTable = pgTable('matchings', {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    jobId: uuid('job_id').notNull(),
    candidateId: uuid('candidate_id').notNull(),
    status: matchingStatus('status').notNull().default('created'),
    finishedAt: timestamp('finished_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
});

export const rubricType = pgEnum('rubricType', ["cv", "project"]);
export const rubricTable = pgTable('rubrics', {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    type: rubricType('type').notNull(),
    parameter: varchar('parameter').notNull(),
    description: varchar('description').notNull(),
    embedding: vector('embedding', { dimensions: 768 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
});

export const matchingResultTable = pgTable('matching_results', {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    matchingId: uuid('matching_id').notNull(),
    cvMatchRate: numeric('cv_match_rate', { mode: "number" }),
    cvFeedback: varchar('cv_feedback'),
    projectScore: numeric('project_score', { mode: "number" }),
    projectFeedback: varchar('project_feedback'),
    overallSummary: varchar('overall_summary'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
});

export const experiencesToCandidateRelation = relations(experienceTable, ({ one }) => ({
    candidate: one(candidateTable, {
        fields: [experienceTable.candidateId],
        references: [candidateTable.id],
    }),
}));

export const candidateToExperiencesRelation = relations(candidateTable, ({ many }) => ({
    experiences: many(experienceTable),
}));

export const projectsToCandidateRelation = relations(projectTable, ({ one }) => ({
    candidate: one(candidateTable, {
        fields: [projectTable.candidateId],
        references: [candidateTable.id],
    }),
}));

export const candidateToProjectsRelation = relations(candidateTable, ({ many }) => ({
    projects: many(projectTable),
}));

export const matchingResultToMatchingRelation = relations(matchingResultTable, ({ one }) => ({
    matching: one(matchingTable, {
        fields: [matchingResultTable.matchingId],
        references: [matchingTable.id],
    }),
}));

export const matchingToResultRelation = relations(matchingTable, ({ one }) => ({
    result: one(matchingResultTable, {
        fields: [matchingTable.id],
        references: [matchingResultTable.matchingId],
    }),
}));