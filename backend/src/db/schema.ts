import {
  pgTable,
  bigserial,
  text,
  timestamp,
  uuid,
  varchar,
  boolean,
  integer,
  primaryKey,
  index,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// Enum for account status & role
export const accountStatusEnum = pgEnum("account_status", [
  "active",
  "suspended",
  "deleted",
]);
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

// USERS table
export const usersTable = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: varchar("username", { length: 30 }).notNull(),
    email: varchar("email", { length: 100 }).notNull(),
    hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
    status: accountStatusEnum("status").default("active"),
    role: userRoleEnum("role").notNull().default("user"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("username_idx").on(table.username),
    uniqueIndex("email_idx").on(table.email),
    index("user_created_idx").on(table.createdAt),
  ]
);

// USER_DETAILS table
export const userDetailsTable = pgTable(
  "user_details",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id")
      .references(() => usersTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull()
      .unique(),
    fullName: varchar("full_name", { length: 100 }),
    bio: text("bio"),
    isPublic: boolean("is_public").default(true),
    location: varchar("location", { length: 100 }),
    website: varchar("website", { length: 255 }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("user_details_full_name_idx").on(table.fullName)]
);

// CATEGORIES table
export const categoriesTable = pgTable(
  "categories",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 50 }).notNull(),
    slug: varchar("slug", { length: 60 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("category_name_idx").on(table.name),
    uniqueIndex("category_slug_idx").on(table.slug),
  ]
);

// POSTS table
export const postsTable = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => usersTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    categoryId: integer("category_id").references(() => categoriesTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    title: varchar("title", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull(),
    content: text("content").notNull(),
    excerpt: varchar("excerpt", { length: 300 }),
    isPublished: boolean("is_published").default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [
    index("posts_user_id_idx").on(table.userId),
    index("posts_category_id_idx").on(table.categoryId),
    uniqueIndex("posts_slug_idx").on(table.slug),
    index("posts_created_idx").on(table.createdAt),
    index("posts_published_idx").on(table.publishedAt),
  ]
);

// LIKES table (using composite primary key)
export const likesTable = pgTable(
  "likes",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),

    postId: uuid("post_id")
      .notNull()
      .references(() => postsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.postId] }),
    index("likes_post_id_idx").on(table.postId),
    index("likes_created_idx").on(table.createdAt),
  ]
);

// COMMENTS table
export const commentsTable = pgTable(
  "comments",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id")
      .references(() => usersTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    postId: uuid("post_id")
      .references(() => postsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("comments_post_id_idx").on(table.postId),
    index("comments_user_id_idx").on(table.userId),
  ]
);

// Drizzle-level relations mapping

export const usersTableRelations = relations(usersTable, ({ one, many }) => ({
  details: one(userDetailsTable, {
    fields: [usersTable.id],
    references: [userDetailsTable.userId],
  }),
  posts: many(postsTable),
  likes: many(likesTable),
  comments: many(commentsTable),
}));

export const userDetailsTableRelations = relations(
  userDetailsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [userDetailsTable.userId],
      references: [usersTable.id],
    }),
  })
);

export const postsTableRelations = relations(postsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [postsTable.userId],
    references: [usersTable.id],
  }),
  category: one(categoriesTable, {
    fields: [postsTable.categoryId],
    references: [categoriesTable.id],
  }),
  likes: many(likesTable),
  comments: many(commentsTable),
}));

export const categoriesTableRelations = relations(
  categoriesTable,
  ({ many }) => ({
    posts: many(postsTable),
  })
);

export const likesTableRelations = relations(likesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [likesTable.userId],
    references: [usersTable.id],
  }),
  post: one(postsTable, {
    fields: [likesTable.postId],
    references: [postsTable.id],
  }),
}));

export const commentsTableRelations = relations(commentsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [commentsTable.userId],
    references: [usersTable.id],
  }),
  post: one(postsTable, {
    fields: [commentsTable.postId],
    references: [postsTable.id],
  }),
}));
