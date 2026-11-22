import { desc, eq, like, or } from "drizzle-orm";
import { z } from "zod";
import { resources } from "../drizzle/schema";
import { mockResources } from "./mockData";
import { getDb, getResourceBySlug } from "./db";
import { storagePut } from "./storage";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";

const categoryValues = ["setups", "skripts", "plugins", "open-source", "discord-development", "maps", "configs"] as const;
const statusValues = ["draft", "published"] as const;
const categorySchema = z.enum(categoryValues);
const resourceInput = z.object({
  title: z.string().min(2).max(180),
  slug: z.string().min(2).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().min(10).max(5000),
  category: categorySchema,
  tags: z.string().max(500).optional().default(""),
  link: z.string().url().or(z.literal("")).optional().default(""),
  status: z.enum(statusValues).default("published"),
  isFeatured: z.boolean().default(false),
  imageData: z.string().optional(),
  fileData: z.string().optional(),
  fileName: z.string().max(255).optional(),
});

type ResourceInput = z.infer<typeof resourceInput>;

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/[\s-]+/g, "-").replace(/^-+|-+$/g, "");
}

function decodeDataUrl(value: string) {
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid upload payload");
  return { contentType: match[1], buffer: Buffer.from(match[2], "base64") };
}

async function uploadIfPresent(data: string | undefined, key: string) {
  if (!data) return null;
  const { contentType, buffer } = decodeDataUrl(data);
  if (buffer.byteLength > 25 * 1024 * 1024) throw new Error("الملف أكبر من 25MB");
  const uploaded = await storagePut(key, buffer, contentType);
  return uploaded.url;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  resources: router({
    list: publicProcedure.input(z.object({ category: z.string().optional(), search: z.string().optional() }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        const term = input?.search?.toLowerCase().trim();
        return mockResources.filter(item => (!input?.category || item.category === input.category) && (!term || `${item.title} ${item.description} ${item.tags}`.toLowerCase().includes(term)));
      }
      const filters = [eq(resources.status, "published")];
      if (input?.category) filters.push(eq(resources.category, input.category as typeof categoryValues[number]));
      if (input?.search?.trim()) {
        const term = `%${input.search.trim()}%`;
        filters.push(or(like(resources.title, term), like(resources.description, term), like(resources.tags, term))!);
      }
      const result = await db.select().from(resources).where(filters.length === 1 ? filters[0] : filters.reduce((a, b) => a && b ? a : b)).orderBy(desc(resources.createdAt));
      return result.length ? result : mockResources;
    }),
    bySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ input }) => {
      const found = await getResourceBySlug(input.slug);
      if (found) return found;
      return mockResources.find(item => item.slug === input.slug) ?? null;
    }),
    adminList: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return mockResources;
      return db.select().from(resources).orderBy(desc(resources.createdAt));
    }),
    create: adminProcedure.input(resourceInput).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");
      const slug = input.slug || slugify(input.title);
      const coverUrl = await uploadIfPresent(input.imageData, `razen/covers/${slug}`);
      const fileUrl = await uploadIfPresent(input.fileData, `razen/files/${slug}-${input.fileName || "download"}`);
      const result = await db.insert(resources).values({
        slug,
        title: input.title,
        description: input.description,
        category: input.category,
        tags: input.tags || null,
        link: input.link || null,
        fileUrl,
        fileName: input.fileName || null,
        coverUrl,
        coverKey: coverUrl,
        status: input.status,
        isFeatured: input.isFeatured,
      });
      return { id: Number(result[0].insertId), slug };
    }),
    update: adminProcedure.input(resourceInput.extend({ id: z.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");
      const slug = input.slug || slugify(input.title);
      const coverUrl = await uploadIfPresent(input.imageData, `razen/covers/${slug}`);
      const fileUrl = await uploadIfPresent(input.fileData, `razen/files/${slug}-${input.fileName || "download"}`);
      const patch: Record<string, unknown> = {
        slug, title: input.title, description: input.description, category: input.category,
        tags: input.tags || null, link: input.link || null, status: input.status, isFeatured: input.isFeatured,
      };
      if (input.fileName !== undefined) patch.fileName = input.fileName || null;
      if (coverUrl) { patch.coverUrl = coverUrl; patch.coverKey = coverUrl; }
      if (fileUrl) patch.fileUrl = fileUrl;
      await db.update(resources).set(patch).where(eq(resources.id, input.id));
      return { id: input.id, slug };
    }),
    remove: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("قاعدة البيانات غير متاحة");
      await db.delete(resources).where(eq(resources.id, input.id));
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
