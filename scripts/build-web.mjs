import fs from "node:fs/promises";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "apps", "web");
const output = path.join(root, "dist");

const cleanOrigin = (value = "") => {
  const trimmed = value.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.origin : "";
  } catch {
    return "";
  }
};

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });

const assetVersion = "20260921-03";
const outputEntries = await readdir(output, { recursive: true });
for (const entry of outputEntries.filter((name) => name.endsWith(".html"))) {
  const htmlPath = path.join(output, entry);
  const html = await readFile(htmlPath, "utf8");
  const versioned = html.replace(/((?:src|href)=")(\/(?:assets\/[^"?]+\.(?:css|js)|config\.js))("?)/g, `$1$2?v=${assetVersion}$3`);
  await writeFile(htmlPath, versioned);
}

const templatePath = path.join(output, "config.template.js");
const template = await readFile(templatePath, "utf8");
// Production-safe fallbacks keep phone/Codespaces builds connected even when
// Cloudflare build variables are temporarily unavailable. These are public
// origins, not credentials; explicit environment values still take priority.
const apiBase = cleanOrigin(process.env.API_BASE_URL || "https://husba-beads-api.husainsathi13.workers.dev");
const siteUrl = cleanOrigin(process.env.SITE_URL || process.env.CF_PAGES_URL || "");
const config = template
  .replace("__API_BASE_URL__", JSON.stringify(apiBase))
  .replace("__TURNSTILE_SITE_KEY__", JSON.stringify(process.env.TURNSTILE_SITE_KEY || ""))
  .replace("__SITE_URL__", JSON.stringify(siteUrl))
  .replace("__DEMO_MODE__", JSON.stringify(process.env.DEMO_MODE !== "false"));

await writeFile(path.join(output, "config.js"), config);
await fs.rm(path.join(output, "_redirects"), { force: true });
await rm(templatePath);

const headersPath = path.join(output, "_headers");
const headers = await readFile(headersPath, "utf8");
await writeFile(headersPath, headers.replace("__API_CONNECT_SRC__", apiBase || ""));

const indexPath = path.join(output, "index.html");
const indexHtml = await readFile(indexPath, "utf8");
await writeFile(indexPath, indexHtml.replaceAll("__SITE_URL__", siteUrl));

const staticPaths = ["/", "/collections/", "/videos/", "/about/", "/contact/", "/privacy/", "/terms/"];
if (siteUrl) {
  const urls = staticPaths.map((pathname) => `  <url><loc>${siteUrl}${pathname}</loc></url>`).join("\n");
  await writeFile(
    path.join(output, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  );
  await writeFile(path.join(output, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${siteUrl}/sitemap.xml\n`);
} else {
  await writeFile(path.join(output, "robots.txt"), "User-agent: *\nAllow: /\nDisallow: /admin/\n");
}

console.log(`Built HUSBA Beads frontend at ${output}`);
