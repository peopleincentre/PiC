/**
 * Batch-compress public/images in place.
 *
 * - JPEG/PNG photos -> WebP (renames extension, so frontmatter must be updated)
 * - Downscales to per-directory max widths
 * - Skips files already small enough
 *
 * Usage: node scripts/compress-images.mjs [--dry]
 */
import sharp from "sharp";
import { readdirSync, statSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { join, extname, dirname } from "node:path";

const DRY = process.argv.includes("--dry");

// per-directory constraints: [maxWidth, webpQuality]
const RULES = [
  { dir: "public/images/projects", maxW: 1600, q: 78 },
  { dir: "public/images/about", maxW: 800, q: 80 },
  { dir: "public/images/themes", maxW: 1200, q: 80 },
  { dir: "public/images", maxW: 1920, q: 78 }, // hero.jpg, theme.jpg at root
];

// Leave these alone (branding, favicons, logos)
const SKIP_FILES = new Set([
  "logo.png",
  "logo-1.png",
  "favicon.svg",
  "favicon.ico",
]);

const SKIP_DIRS = new Set(["public/images/partners"]);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(dir)) continue;
      out.push(...walk(p));
    } else if (/\.(jpe?g|png|webp)$/i.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

const files = RULES.flatMap((r) =>
  walk(r.dir).filter(
    (f) =>
      !SKIP_FILES.has(f.split("/").pop()) &&
      !SKIP_DIRS.has(dirname(f)) &&
      !RULES.slice(0, RULES.indexOf(r)).some((x) => f.startsWith(x.dir))
  )
);

let totalBefore = 0;
let totalAfter = 0;
let changed = 0;

const tmp = null; // write next to target, same filesystem
mkdirSync(tmp ?? ".", { recursive: true });

for (const file of files) {
  const before = statSync(file).size;
  const rule = RULES.find((r) => file.startsWith(r.dir));
  const outName = file.replace(/\.(jpe?g|png|webp)$/i, ".webp");
  const outTmp = `${outName}.tmp`;

  try {
    const img = sharp(file);
    const meta = await img.metadata();
    const pipe = img.rotate();
    if (meta.width && meta.width > rule.maxW) {
      pipe.resize({ width: rule.maxW, withoutEnlargement: true });
    }
    await pipe.webp({ quality: rule.q, effort: 4 }).toFile(outTmp);

    const after = statSync(outTmp).size;
    totalBefore += before;
    totalAfter += after;

    if (after < before * 0.95) {
      changed++;
      if (!DRY) {
        rmSync(file);
        renameSync(outTmp, outName);
      } else {
        rmSync(outTmp);
      }
      console.log(
        `${before > 1024 ? Math.round(before / 1024) : before}K -> ${
          after > 1024 ? Math.round(after / 1024) : after
        }K  ${file.replace("public/images/", "")}`
      );
    } else {
      // no meaningful gain; keep original
      rmSync(outTmp);
      totalAfter -= after;
      totalAfter += before;
    }
  } catch (err) {
    console.error(`SKIP ${file}: ${err.message}`);
    rmSync(outTmp, { force: true });
    totalAfter += before;
    totalBefore += 0;
  }
}

const mb = (n) => (n / 1024 / 1024).toFixed(1) + "MB";
console.log(
  `\n${changed} files recompressed. ${mb(totalBefore)} -> ${mb(totalAfter)}`
);
