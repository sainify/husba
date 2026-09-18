import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const root = path.resolve(process.argv[2] || "dist");
const port = Number(process.argv[3] || 4173);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", "http://localhost");
  let safePath;
  try {
    safePath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  } catch {
    response.writeHead(400).end("Bad request");
    return;
  }
  let filePath = path.resolve(root, safePath || "index.html");
  if (/^products\/[^/]+\/?$/.test(safePath)) filePath = path.join(root, "product", "index.html");
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = path.join(filePath, "index.html");
    await stat(filePath);
  } catch {
    filePath = path.join(root, "404.html");
  }
  response.writeHead(filePath.endsWith("404.html") ? 404 : 200, {
    "Content-Type": types[path.extname(filePath)] || "application/octet-stream",
    "Cache-Control": "no-cache",
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, "0.0.0.0", () => console.log(`Preview: http://localhost:${port}`));
