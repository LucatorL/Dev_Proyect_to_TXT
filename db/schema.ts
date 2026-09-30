import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const leaderboardProfiles = sqliteTable('leaderboard_profiles', {
  id: text('id').primaryKey(),
  secretHash: text('secret_hash').notNull().unique(),
  displayName: text('display_name').notNull(),
  customName: integer('custom_name').notNull().default(0),
  autoAuthorUsed: integer('auto_author_used').notNull().default(0),
  totalFiles: integer('total_files').notNull().default(0),
  unificationCount: integer('unification_count').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const leaderboardEvents = sqliteTable('leaderboard_events', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => leaderboardProfiles.id),
  fileCount: integer('file_count').notNull(),
  createdAt: integer('created_at').notNull(),
});
