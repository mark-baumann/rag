"use server";

import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema/documents";
import { nanoid } from "@/lib/utils";
import { eq } from "drizzle-orm";

export type DocumentRow = typeof documents.$inferSelect;

export const createDocument = async (input: {
  id?: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}) => {
  const id = input.id ?? nanoid();
  const [doc] = await db
    .insert(documents)
    .values({ id, name: input.name, url: input.url, mimeType: input.mimeType, size: input.size })
    .returning();
  return doc;
};

export const listDocuments = async (): Promise<DocumentRow[]> => {
  // Simple ordered list by createdAt desc
  const rows = await db.select().from(documents);
  // Sort in JS if DB default doesn't order
  return rows.sort((a, b) => (a.createdAt && b.createdAt ? b.createdAt.getTime() - a.createdAt.getTime() : 0));
};

export const getDocumentById = async (id: string) => {
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  return doc ?? null;
};

