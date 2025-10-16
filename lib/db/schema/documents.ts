import { sql } from "drizzle-orm";
import { pgTable, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { nanoid } from "@/lib/utils";

export const documents = pgTable("documents", {
  id: varchar("id", { length: 191 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  url: text("url").notNull(),
  mimeType: varchar("mime_type", { length: 128 }).notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`now()`),
});

