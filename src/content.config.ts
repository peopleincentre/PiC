import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const themes = z.array(
  z.enum([
    "resilience",
    "ecological-balance",
    "urban-space",
    "institutional-initiatives",
  ])
);

const projects = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/projects",
  }),

  schema: z.object({
  title: z.string(),
  summary: z.string(),
  description: z.string(),
  country: z.string(),
  location: z.string().optional(),
  startYear: z.number(),
  endYear: z.number().optional(),
  client: z.string().optional(),
  partners: z.array(z.string()).optional(),
  themes: z.array(
    z.enum([
      "resilience",
      "ecological-balance",
      "urban-space",
      "institutional-initiatives",
    ])
  ),
  featured: z.boolean().default(false),
  coverImage: z.string().optional(),
  gallery: z.array(
   z.object({
     image: z.string(),
     caption: z.string().optional(),
    })
   ).optional(),
  featured: z.boolean().default(false),
  }),
});


const reports = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/reports",
  }),

  schema: z.object({
    title: z.string(),
    year: z.number(),
    authors: z.string().optional(),
    summary: z.string(),
    pdf: z.string(),

    themes,
  }),
});


const papers = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/papers",
  }),

  schema: z.object({
    title: z.string(),
    year: z.number(),
    authors: z.string(),
    journal: z.string().optional(),
    summary: z.string(),
    pdf: z.string().optional(),

    themes,
  }),
});


const videos = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/videos",
  }),

  schema: z.object({
    title: z.string(),
    year: z.number(),
    summary: z.string(),
    youtube: z.string(),

    themes,
  }),
});


const team = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/team",
  }),

  schema: z.object({
    name: z.string(),
    designation: z.string(),
    photo: z.string().optional(),
    bio: z.string(),
  }),
});


const annualReports = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/annual-reports",
  }),

  schema: z.object({
    year: z.number(),
    summary: z.string(),
    pdf: z.string(),
  }),
});


export const collections = {
  projects,
  reports,
  papers,
  videos,
  team,
  "annual-reports": annualReports,
};
