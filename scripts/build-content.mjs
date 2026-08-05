import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA = join(__dirname, "data");
const PUBLIC = join(ROOT, "public");
const PROJECTS_DIR = join(ROOT, "src", "content", "projects");
const PAPERS_DIR = join(ROOT, "src", "content", "papers");
const VIDEOS_DIR = join(ROOT, "src", "content", "videos");
const IMG_PROJECTS = join(PUBLIC, "images", "projects");

const THEME_BY_CAT = {
  "37": "ecological-balance",
  "15": "resilience",
  "7": "urban-space",
  "1": "institutional-initiatives",
};

const FEATURED_IDS = new Set([
  2655, 2515, 2509, 2663, 2455, 2467, 2386, 2381, 2312, 2305, 2368, 2234, 2144, 2127,
  2129, 2078,
]);

const EXISTING_POST_IDS = new Set([2509, 2455, 873, 2381, 2078]);

const NAMED_ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…",
  ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’", sbquo: "‚", ldquo: "“",
  rdquo: "”", bull: "•", times: "×", middot: "·", copy: "©", rsquor: "’",
};

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d))
    .replace(/&([a-zA-Z][a-zA-Z0-9]+);/g, (m, name) => NAMED_ENTITIES[name] ?? m);
}

function inlineToMarkdown(html) {
  let s = html;
  s = s.replace(
    /<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    (m, href, text) => `[${inlineToMarkdown(text).trim()}](${href.trim()})`
  );
  s = s.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**");
  s = s.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**");
  s = s.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*");
  s = s.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  return s;
}

function htmlToMarkdown(html) {
  let s = html;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<a[^>]*>\s*<\/a>/gi, "");
  s = s.replace(/<a\s*>/gi, "</A>");
  s = s.replace(/<\/a>/gi, "</A>");
  s = s.replace(/<a\b([^>]*)>/g, "<A$1>");
  s = s.replace(
    /\[?<A ([^>]*)>([\s\S]*?)<\/A>\]?/g,
    (m, attrs, text) => {
      const hrefMatch = attrs.match(/href=["']([^"']*)["']/);
      const href = hrefMatch ? decodeEntities(hrefMatch[1].trim()) : "";
      const label = text.replace(/<[^>]*>/g, "").trim();
      return href ? `[${label}](${href})` : label;
    }
  );
  s = s.replace(
    /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi,
    (m, lvl, inner) => "#".repeat(+lvl) + " " + inlineToMarkdown(inner).trim() + "\n\n"
  );
  s = s.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (m, inner) => {
    const items = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map(
      (x) => "1. " + inlineToMarkdown(x[1]).replace(/\s+/g, " ").trim()
    );
    return items.join("\n") + "\n\n";
  });
  s = s.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (m, inner) => {
    const items = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map(
      (x) => "- " + inlineToMarkdown(x[1]).replace(/\s+/g, " ").trim()
    );
    return items.join("\n") + "\n\n";
  });
  s = s.replace(
    /<p[^>]*>([\s\S]*?)<\/p>/gi,
    (m, inner) => inlineToMarkdown(inner).replace(/[ \t]+/g, " ").trim() + "\n\n"
  );
  s = s.replace(/<img[^>]*>/gi, "");
  s = s.replace(
    /<\/?(div|span|figure|figcaption|section|article|table|thead|tbody|tr|td|th)[^>]*>/gi,
    "\n"
  );
  s = s.replace(/<[^>]+>/g, "");
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/\n{3,}/g, "\n\n");
  s = s.replace(/^\s+|\s+$/g, "");
  const decoded = decodeEntities(s).trim();
  return decoded.replace(/<\/?(strong|b|em|i|p|a|span|div|ul|ol|li)[^>]*>/gi, "").trim();
}

function yamlScalar(value) {
  const s = value == null ? "" : String(value);
  if (s === "") return '""';
  if (s.includes("\n")) {
    return "|\n" + s.split("\n").map((line) => "  " + line).join("\n");
  }
  if (/^[A-Za-z0-9 _\-,./:()'%&+]+$/.test(s) && !/[:#]\s|^\s|['"@`]/m.test(s)) {
    return s;
  }
  return JSON.stringify(s);
}

function frontmatterField(key, value) {
  if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) {
    return "";
  }
  if (Array.isArray(value)) {
    if (typeof value[0] === "string") {
      return key + ":\n" + value.map((v) => "  - " + yamlScalar(v)).join("\n") + "\n";
    }
    if (typeof value[0] === "object") {
      const lines = [key + ":"];
      for (const obj of value) {
        lines.push("  - image: " + yamlScalar(obj.image));
        if (obj.caption) lines.push("    caption: " + yamlScalar(obj.caption));
      }
      return lines.join("\n") + "\n";
    }
  }
  return key + ": " + yamlScalar(value) + "\n";
}

async function download(url, dest) {
  if (existsSync(dest)) return;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (peopleincentre-migration)" } });
  if (!res.ok) throw new Error(`download ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, buf);
}

function cleanUrl(url) {
  return decodeEntities(url.trim().replace(/^["']|["']$/g, ""));
}

function fileExtFromUrl(url) {
  try {
    const path = new URL(url).pathname;
    const ext = extname(basename(path)).toLowerCase();
    return /^\.(jpe?g|png|webp|gif|svg|avif)$/.test(ext) ? ext : ".jpg";
  } catch {
    return ".jpg";
  }
}

function slugifyTitle(title) {
  return title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

async function main() {
  const posts = JSON.parse(await readFile(join(DATA, "posts.json"), "utf8"));
  const pages = JSON.parse(await readFile(join(DATA, "pages.json"), "utf8"));

  await mkdir(PROJECTS_DIR, { recursive: true });
  await mkdir(PAPERS_DIR, { recursive: true });
  await mkdir(VIDEOS_DIR, { recursive: true });

  let createdProjects = 0;
  let skippedExisting = 0;
  let downloadedImages = 0;

  for (const post of posts) {
    const id = post.id;
    const slug = post.slug;
    const title = decodeEntities(post.title?.rendered || "").replace(/&#8211;/g, "–");

    if (EXISTING_POST_IDS.has(id)) {
      skippedExisting += 1;
      continue;
    }

    const date = post.date || "";
    const year = parseInt(date.slice(0, 4), 10);
    const cats = post.categories || [];
    const theme = cats.map((c) => THEME_BY_CAT[String(c)]).filter(Boolean)[0] || "institutional-initiatives";

    const contentHtml = post.content?.rendered || "";
    const excerptHtml = post.excerpt?.rendered || "";
    const excerpt = htmlToMarkdown(excerptHtml.replace(/\[\&hellip;\]$/, ""))
      .replace(/\s*\[\s*…\s*\]\s*$/, "")
      .trim();

    const bodyMd = htmlToMarkdown(contentHtml);

    const description =
      bodyMd.split(/\n\n+/)[0] || excerpt || "Project update from People in Centre.";

    const featuredMedia = post._embedded?.["wp:featuredmedia"]?.[0];
    const coverUrl = featuredMedia?.media_type === "image" ? featuredMedia.source_url : null;

    const folder = slug;
    const folderPath = join(IMG_PROJECTS, folder);
    await mkdir(folderPath, { recursive: true });

    let coverImage = null;
    if (coverUrl) {
      const url = cleanUrl(coverUrl);
      const ext = fileExtFromUrl(url);
      const dest = join(folderPath, `${folder}-cover${ext}`);
      try {
        await download(url, dest);
        coverImage = `/images/projects/${folder}/${folder}-cover${ext}`;
        downloadedImages += 1;
      } catch (e) {
        console.warn(`cover fail ${id}: ${e.message}`);
      }
    }

    const gallery = [];
    const imgSrc = [...contentHtml.matchAll(/<img[^>]*>/gi)].map((m) => m[0]);
    const seen = new Set();
    let idx = 0;
    for (const imgTag of imgSrc) {
      const srcMatch = imgTag.match(/src="([^"]+)"/);
      if (!srcMatch) continue;
      let url = cleanUrl(srcMatch[1]);
      if (!/wp-content\/uploads/.test(url) && !/peopleincentre\.org/.test(url)) continue;
      if (seen.has(url)) continue;
      seen.add(url);
      idx += 1;
      const altMatch = imgTag.match(/alt="([^"]*)"/);
      const caption = altMatch && altMatch[1] ? decodeEntities(altMatch[1]).trim() : "";
      const ext = fileExtFromUrl(url);
      const dest = join(folderPath, `${folder}-gallery-${String(idx).padStart(2, "0")}${ext}`);
      try {
        await download(url, dest);
        gallery.push({ image: `/images/projects/${folder}/${folder}-gallery-${String(idx).padStart(2, "0")}${ext}`, caption });
        downloadedImages += 1;
      } catch (e) {
        console.warn(`gallery fail ${id}: ${e.message}`);
      }
    }

    const body = [bodyMd]
      .filter(Boolean)
      .join("\n\n");

    const frontmatter = [
      "---",
      "title: " + yamlScalar(title),
      "",
      "summary: " + yamlScalar(excerpt || description),
      "",
      "description: " + yamlScalar(description),
      "",
      frontmatterField("country", ""),
      frontmatterField("location", ""),
      "",
      frontmatterField("startYear", null),
      frontmatterField("endYear", Number.isFinite(year) ? year : null),
      "",
      frontmatterField("client", ""),
      frontmatterField("partners", []),
      "",
      "themes:",
      "  - " + yamlScalar(theme),
      "",
      frontmatterField("featured", FEATURED_IDS.has(id)),
      frontmatterField("coverImage", coverImage),
      frontmatterField("gallery", gallery),
      "---",
    ]
      .filter((line) => line !== "")
      .join("\n")
      .replace(/\n{3,}/g, "\n\n");

    await writeFile(
      join(PROJECTS_DIR, `${slug}.md`),
      frontmatter + "\n\n" + (body || "Project update from People in Centre.") + "\n"
    );
    createdProjects += 1;
  }

  console.log(`projects created: ${createdProjects}, skipped existing: ${skippedExisting}, images downloaded: ${downloadedImages}`);

  await writePapers(pages, PAPERS_DIR);
  await writeVideos(pages, VIDEOS_DIR, posts);
}

async function writePapers(pages, outDir) {
  const page = pages.find((p) => p.slug === "research-papers-publications");
  const html = page.content.rendered;

  const sections = [];
  const sectionPattern =
    /<h4[^>]*>[\s\S]*?href="[^"]*page_id=(\d+)"[^>]*>[\s\S]*?<\/h4>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/gi;
  let m;
  while ((m = sectionPattern.exec(html))) {
    const pageId = m[1];
    let theme;
    if (pageId === "1681") theme = "ecological-balance";
    else if (pageId === "1607") theme = "resilience";
    else if (pageId === "1684") theme = "urban-space";
    else theme = "institutional-initiatives";
    sections.push({ theme, ul: m[2] });
  }

  let count = 0;
  for (const { theme, ul } of sections) {
    const items = [...ul.matchAll(/<li>([\s\S]*?)<\/li>/gi)];
    for (const [, liHtml] of items) {
      const links = [...liHtml.matchAll(/<a[^>]+href="([^"]+)"/gi)].map((x) => cleanUrl(x[1]));
      const noLinks = liHtml.replace(/<a[^>]*>[\s\S]*?<\/a>/gi, "");
      const text = decodeEntities(noLinks.replace(/<[^>]+>/g, " "))
        .replace(/[ \t]+/g, " ")
        .replace(/\s*[\u00A0]+\s*/g, " ")
        .replace(/[ \t]*\n[ \t]*/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();

      const match = text.match(/^(.*?)\((\d{4})\)\.?\s*([\s\S]*)$/);
      let authors, year, citationTitle;
      if (match) {
        authors = match[1].replace(/[.,\s]+$/, "").trim();
        year = parseInt(match[2], 10);
        citationTitle = match[3]
          .replace(/[.,\s]+$/, "")
          .replace(/\.?\s*$/g, "")
          .trim();
      } else {
        authors = "";
        year = 0;
        citationTitle = text;
      }

      const url = links[0] || "";
      const slug = slugifyTitle(citationTitle || text || `paper-${count}`);

      const fullCitation = [authors, year ? `(${year})` : "", citationTitle].join(" ").trim();

      const frontmatter = [
        "---",
        "title: " + yamlScalar(citationTitle || text),
        "year: " + year,
        "authors: " + yamlScalar(authors || "People in Centre"),
        frontmatterField("journal", ""),
        "summary: " + yamlScalar(fullCitation),
        frontmatterField("pdf", url),
        "",
        "themes:",
        "  - " + yamlScalar(theme),
        "---",
      ]
        .filter((line) => line !== "")
        .join("\n");

      await writeFile(join(outDir, `${slug}.md`), frontmatter + "\n");
      count += 1;
    }
  }
  console.log(`papers created: ${count}`);
}

async function writeVideos(pages, outDir, posts) {
  const postByTitle = {};
  for (const p of posts) {
    const t = decodeEntities(p.title?.rendered || "").replace(/&#8211;/g, "–");
    postByTitle[t.toLowerCase()] = p;
  }

  const getSummary = (title, fallback) => {
    const key = title.toLowerCase();
    const post = postByTitle[key];
    if (post) {
      const md = htmlToMarkdown(post.content?.rendered || "");
      return md.split(/\n\n+/)[0] || fallback;
    }
    return fallback;
  };

  const getYear = (title) => {
    const key = title.toLowerCase();
    const post = postByTitle[key];
    return post ? parseInt((post.date || "").slice(0, 4), 10) : null;
  };

  const VIDEOS = [
    {
      title: "Farmers First for used water",
      youtube: "7CVk94W4dEI",
      themes: ["ecological-balance"],
      fallback:
        "Explores Punjab's wastewater reuse model, where policy, infrastructure and farmer participation come together to move treated water from treatment plants to farmlands.",
    },
    {
      title: "Flowing Back: Stories of Claiming Usedwater",
      youtube: "yIM46clCXRw",
      themes: ["ecological-balance"],
      fallback:
        "Highlights unrecognised wastewater users and the informal yet essential use of used water by farmers for irrigation.",
    },
    {
      title: "Villages on the Frontline – A BBC Film",
      youtube: "QSxx8KnOZUk",
      themes: ["ecological-balance"],
      fallback:
        "A BBC documentary film on Alka Palrecha's work on drinking water and coastal salinity in coastal Gujarat.",
    },
    {
      title: "A Water Swap: Gwalior's Water Reuse Story",
      youtube: "ES4TaT05S-I",
      themes: ["ecological-balance"],
      fallback:
        "On freshwater – wastewater transactions, telling the story of water reuse in Gwalior.",
    },
    {
      title: "Wastewater Bazaar",
      youtube: "qZUxptX1018",
      themes: ["ecological-balance"],
      fallback:
        "On the municipal auction mechanism for wastewater in Unjha, Gujarat.",
    },
    {
      title: "TEDx Talk: Wastewater Reuse from Past to Present",
      youtube: "Ny2365kjbqQ",
      themes: ["ecological-balance"],
      fallback: "TEDx talk by Alka Palrecha on wastewater reuse from past to present.",
    },
    {
      title: "Case Study of Wastewater Bazaar",
      youtube: "A4rK4imBcrk",
      themes: ["ecological-balance"],
      fallback:
        "Alka Palrecha delivered this talk on the Wastewater Bazaar case study in Pune, Maharashtra.",
    },
    {
      title: "Keynote Address for the 3rd UNDRR Masterclass",
      youtube: "kw-mK5uV5v8",
      themes: ["resilience"],
      fallback:
        "Keynote address by Vivek Rawal on post-disaster housing reconstruction for the 3rd Masterclass organized by UNDRR.",
    },
  ];

  let count = 0;
  for (const v of VIDEOS) {
    const year = getYear(v.title);
    const summary = getSummary(v.title, v.fallback);
    const slug = slugifyTitle(v.title);

    const frontmatter = [
      "---",
      "title: " + yamlScalar(v.title),
      frontmatterField("year", year),
      "summary: " + yamlScalar(summary),
      "youtube: " + yamlScalar(v.youtube),
      "",
      "themes:",
      ...v.themes.map((t) => "  - " + yamlScalar(t)),
      "---",
    ]
      .filter((line) => line !== "")
      .join("\n");

    await writeFile(join(outDir, `${slug}.md`), frontmatter + "\n");
    count += 1;
  }
  console.log(`videos created: ${count}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
