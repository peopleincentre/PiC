# Updates

This folder holds **Updates** — frequent, lightweight posts from the team:
what's happening with our work, where we participated in events, and
reflections from practice. Text + photos. Published pieces appear at
`/updates/`, on the homepage teaser, and in the site navigation.

## Adding an update

Create a Markdown file in this folder. The **filename becomes the URL
slug** (e.g. `uday-pdna-workshop-gujarat.md` → `/updates/uday-pdna-workshop-gujarat/`).

Required frontmatter:

```yaml
---
title: Site visit to the flood-resilient housing clusters
date: 2026-11-18
summary: One or two sentences shown on cards, in search metadata, and as the page description.
---
```

Optional frontmatter:

```yaml
author: Full Name                  # byline shown on cards and the post
category: event                    # work-update (default) | event | reflection
cover: /src/assets/updates/cover.webp   # hero photo on the post page + card image
gallery:                           # extra photos shown below the text
  - image: /src/assets/updates/photo-1.webp
    caption: Masonry training session, day 2
  - image: /src/assets/updates/photo-2.webp
themes:                            # optional tags linking to your work themes:
  - resilience                     # resilience, ecological-balance,
                                   # urban-space, institutional-initiatives
draft: true                        # keep a post out of the build
```

The text below the frontmatter is regular Markdown (headings, lists,
links, blockquotes, emphasis).

## Photos

- Put photos in `src/assets/updates/` (create the folder if needed).
- Use **`.webp`** at **1600px wide or less**. To convert a batch, follow
  `scripts/compress-images.mjs` conventions (projects rule: maxW 1600, q78).
- Reference images **from the site root** (`/src/assets/updates/…`) in
  `cover:` / `gallery:` — Astro generates the optimized/responsive versions
  at build time.

## Notes

- **Dates** are `YYYY-MM-DD`. Updates are listed newest first.
- **Drafts** (`draft: true`) are excluded from the site build entirely.
- Do not delete this README — the content loader is configured to skip it.
