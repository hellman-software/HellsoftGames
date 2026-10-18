import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';

export const STATUSES = ['released', 'playable', 'playtest', 'prototype', 'archived'] as const;

/** YAML loaders may parse unquoted timestamps as Date objects; normalise to ISO strings. */
const isoDate = z.union([z.string(), z.date()]).transform((v) => (v instanceof Date ? v.toISOString() : v));

const games = defineCollection({
  loader: file('src/data/games.yaml'),
  schema: ({ image }) =>
    z.object({
      // --- hand-written fields ---
      title: z.string(),
      order: z.number().default(100),
      listed: z.boolean().default(true),
      status: z.enum(STATUSES),
      genre: z.string(),
      blurb: z.string().max(160),
      description: z.string(),
      playUrl: z.string().url(),
      repo: z.object({ owner: z.string(), name: z.string() }),
      tech: z.array(z.string()),
      tags: z.array(z.string()).default([]),
      pixelArt: z.boolean().default(false),
      cover: image().optional(),
      logo: image().optional(),
      video: z.object({ src: z.string().startsWith('/'), label: z.string() }).optional(),
      screenshots: z.array(z.object({ src: image(), alt: z.string() })).default([]),
      // --- owned by scripts/sync-games.mjs ---
      sync: z
        .object({
          isPrivate: z.boolean(),
          description: z.string().nullable(),
          pushedAt: isoDate.nullable(),
          release: z
            .object({
              tag: z.string(),
              name: z.string().nullable(),
              publishedAt: isoDate.nullable(),
              source: z.enum(['release', 'tag', 'package']),
            })
            .nullable(),
          syncedAt: isoDate,
        })
        .optional(),
    }),
});

export const collections = { games };
