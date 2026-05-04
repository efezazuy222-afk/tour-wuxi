import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const pages = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    updated: z.string().optional(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    cover: z.string(),
    date: z.string(),
    category: z.string(),
    tags: z.array(z.string()),
    readTime: z.number(),
    description: z.string(),
    author: z.object({
      name: z.string(),
      job: z.string(),
      avatar: z.string(),
    }),
  }),
});

const tours = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/tours" }),
  schema: z.object({
    title: z.string(),
    category: z.string(),
    description: z.string(),
    cover: z.string(),
    gallery: z.array(z.string()).optional(),
    duration: z.string(),
    location: z.string(),
    price: z.number().optional(),
    pricing: z.array(
      z.object({
        label: z.string(),
        price: z.number(),
        multiplier: z.number().optional(),
      })
    ),
    rating: z.number().optional(),
    reviews: z.number().optional(),
    facilities: z.array(z.string()).optional(),
  }),
});

export const collections = { pages, blog, tours };
