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
  country: z.string().optional(),
  location: z.string().optional(),
  startYear: z.number().optional(),
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
    year: z.number().optional(),
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
    category: z.enum(["core", "past"]),
    designation: z.string().optional(),
    photo: z.string().optional(),
    email: z.string().optional(),
    bio: z.string(),
  }),
});


const governance = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/governance",
  }),

  schema: z.object({
    name: z.string(),
    kind: z.enum(["director", "shareholder"]),
    designation: z.string().optional(),
    photo: z.string().optional(),
    bio: z.string().optional(),
    isShareholder: z.boolean().default(false),
  }),
});


const annualReports = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/annual-reports",
  }),

  schema: z.object({
    title: z.string(),
    year: z.number(),
    summary: z.string().optional(),
    cover: z.string().optional(),
    pdf: z.string(),
  }),
});


export const collections = {
  projects,
  papers,
  videos,
  team,
  governance,
  "annual-reports": annualReports,
};
