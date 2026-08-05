import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "data");
const BASE = "https://www.peopleincentre.org";

async function getJSON(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (peopleincentre-migration)" },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function fetchAll(rest, perPage = 100, extra = "") {
  const items = [];
  let page = 1;
  for (;;) {
    const query = `per_page=${perPage}&page=${page}` + (extra ? `&${extra}` : "");
    const url = `${BASE}/wp-json/wp/v2/${rest}?${query}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (peopleincentre-migration)" },
    });
    if (res.status === 400) break;
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    const batch = await res.json();
    items.push(...batch);
    const totalPages = Number(res.headers.get("x-wp-totalpages") || 1);
    if (page >= totalPages) break;
    page += 1;
  }
  return items;
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const posts = await fetchAll("posts", 100, "_embed");
  await writeFile(join(OUT, "posts.json"), JSON.stringify(posts, null, 2));

  const pages = await getJSON(`${BASE}/wp-json/wp/v2/pages?per_page=100`);
  await writeFile(join(OUT, "pages.json"), JSON.stringify(pages, null, 2));

  const categories = await getJSON(`${BASE}/wp-json/wp/v2/categories?per_page=100`);
  await writeFile(join(OUT, "categories.json"), JSON.stringify(categories, null, 2));

  const media = await fetchAll("media", 100);
  await writeFile(join(OUT, "media.json"), JSON.stringify(media, null, 2));

  console.log(`posts: ${posts.length}`);
  console.log(`pages: ${pages.length}`);
  console.log(`categories: ${categories.length}`);
  console.log(`media: ${media.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
