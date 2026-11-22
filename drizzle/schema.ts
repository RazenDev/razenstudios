import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const resources = mysqlTable("resources", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description").notNull(),
  category: mysqlEnum("category", ["setups", "skripts", "plugins", "open-source", "discord-development", "maps", "configs"]).notNull(),
  tags: text("tags"),
  link: varchar("link", { length: 1000 }),
  fileUrl: varchar("fileUrl", { length: 1000 }),
  fileName: varchar("fileName", { length: 255 }),
  coverUrl: varchar("coverUrl", { length: 1000 }),
  coverKey: varchar("coverKey", { length: 500 }),
  status: mysqlEnum("status", ["draft", "published"]).default("published").notNull(),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Resource = typeof resources.$inferSelect;
export type InsertResource = typeof resources.$inferInsert;
