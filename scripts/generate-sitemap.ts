// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://chopacosmetics.lovable.app";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://yhwrcbiemftwbklgvfzi.supabase.co";
const SUPABASE_ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlod3JjYmllbWZ0d2JrbGd2ZnppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzI2MDgsImV4cCI6MjA4Mjk0ODYwOH0.W2O7lOcq2fxhSQ3FmCJAO23e2mPJxCwZgBfGhqw5i2k";

interface Entry { path: string; changefreq?: string; priority?: string; lastmod?: string }

const staticEntries: Entry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/products", changefreq: "daily", priority: "0.9" },
  { path: "/categories", changefreq: "weekly", priority: "0.8" },
  { path: "/reviews", changefreq: "weekly", priority: "0.7" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/auth", changefreq: "yearly", priority: "0.4" },
  { path: "/cart", changefreq: "monthly", priority: "0.4" },
  { path: "/checkout", changefreq: "monthly", priority: "0.4" },
  { path: "/order-success", changefreq: "yearly", priority: "0.2" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
];

async function fetchProducts(): Promise<Entry[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/public_products?select=id,updated_at`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    if (!res.ok) {
      console.warn(`[sitemap] products fetch failed: ${res.status}`);
      return [];
    }
    const rows: Array<{ id: string; updated_at?: string }> = await res.json();
    return rows.map((r) => ({
      path: `/product/${r.id}`,
      changefreq: "weekly",
      priority: "0.7",
      lastmod: r.updated_at ? new Date(r.updated_at).toISOString().slice(0, 10) : undefined,
    }));
  } catch (e) {
    console.warn(`[sitemap] products fetch error:`, e);
    return [];
  }
}

function render(entries: Entry[]) {
  const urls = entries.map((e) => {
    const parts = [`    <loc>${BASE_URL}${e.path}</loc>`];
    if (e.lastmod) parts.push(`    <lastmod>${e.lastmod}</lastmod>`);
    if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
    if (e.priority) parts.push(`    <priority>${e.priority}</priority>`);
    return `  <url>\n${parts.join("\n")}\n  </url>`;
  });
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
    "",
  ].join("\n");
}

(async () => {
  const products = await fetchProducts();
  const all = [...staticEntries, ...products];
  writeFileSync(resolve("public/sitemap.xml"), render(all));
  console.log(`sitemap.xml written (${all.length} entries: ${staticEntries.length} static + ${products.length} products)`);
})();
