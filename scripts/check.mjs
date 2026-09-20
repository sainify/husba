import { access, readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const required = [
  "dist/index.html",
  "dist/admin/index.html",
  "dist/assets/css/styles.css",
  "dist/assets/js/shared.js",
  "worker/src/index.js",
  "worker/migrations/0001_initial.sql",
];

for (const file of required) await access(path.join(root, file));

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const resolved = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(resolved)));
    else files.push(resolved);
  }
  return files;
};

const javascript = [...(await walk(path.join(root, "dist"))), ...(await walk(path.join(root, "worker", "src")))]
  .filter((file) => file.endsWith(".js"));
for (const file of javascript) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`JavaScript syntax error in ${path.relative(root, file)}\n${result.stderr}`);
}

const frontendFiles = await walk(path.join(root, "dist"));
for (const file of frontendFiles.filter((item) => /\.(?:html|js|css)$/.test(item))) {
  const source = await readFile(file, "utf8");
  if (/CLOUDINARY_API_SECRET|api_secret\s*[:=]/i.test(source)) {
    throw new Error(`Possible secret exposed in ${path.relative(root, file)}`);
  }
  if (/__(?:API_BASE_URL|API_CONNECT_SRC|TURNSTILE_SITE_KEY|SITE_URL|DEMO_MODE)__/g.test(source)) {
    throw new Error(`Unresolved build token in ${path.relative(root, file)}`);
  }
}

const canAccess = async (file) => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};

const resolvePublicFile = (publicPath) => {
  const clean = decodeURIComponent(publicPath.split(/[?#]/)[0]).replace(/^\//, "");
  if (!clean) return path.join(root, "dist", "index.html");
  if (clean.endsWith("/")) return path.join(root, "dist", clean, "index.html");
  return path.join(root, "dist", clean);
};

for (const file of frontendFiles.filter((item) => item.endsWith(".html"))) {
  const source = await readFile(file, "utf8");
  if (/\son[a-z]+\s*=/i.test(source)) throw new Error(`Inline event handler found in ${path.relative(root, file)}`);
  for (const match of source.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const reference = match[1];
    if (!reference.startsWith("/") || reference.startsWith("//") || reference.startsWith("/products/")) continue;
    const resolved = resolvePublicFile(reference);
    if (!(await canAccess(resolved))) throw new Error(`Broken local reference ${reference} in ${path.relative(root, file)}`);
  }
  for (const image of source.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt="[^"]*"/i.test(image[0])) throw new Error(`Image without alt text in ${path.relative(root, file)}`);
  }
}

for (const file of javascript.filter((item) => item.startsWith(path.join(root, "dist")))) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(/(?:from\s+|import\s*)["'](\.[^"']+)["']/g)) {
    const resolved = path.resolve(path.dirname(file), match[1]);
    if (!(await canAccess(resolved))) throw new Error(`Broken module import ${match[1]} in ${path.relative(root, file)}`);
  }
  for (const match of source.matchAll(/["'`]\s*(\/assets\/[^"'`?#]+)/g)) {
    const resolved = resolvePublicFile(match[1]);
    if (!(await canAccess(resolved))) throw new Error(`Broken asset reference ${match[1]} in ${path.relative(root, file)}`);
  }
}

const wrangler = await readFile(path.join(root, "worker", "wrangler.toml"), "utf8");
if (!/binding\s*=\s*"DB"/.test(wrangler) || !/migrations_dir\s*=\s*"migrations"/.test(wrangler)) {
  throw new Error("The Worker D1 binding or migrations path is missing.");
}

console.log(`Checks passed: ${javascript.length} JavaScript files and ${frontendFiles.length} frontend files.`);
