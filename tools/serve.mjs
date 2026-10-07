import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
const port = 8782,
  files = {
    "/": ["index.html", "text/html"],
    "/main.js": ["main.js", "text/javascript"],
    "/main.css": ["main.css", "text/css"],
    "/grid.worker.js": ["grid.worker.js", "text/javascript"],
  };
createServer(async (req, res) => {
  const host = req.headers.host;
  if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(host)) {
    res.writeHead(403);
    res.end("Loopback Host required");
    return;
  }
  const file = files[req.url];
  if (req.method !== "GET" || !file) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  try {
    const raw = await readFile(new URL("../dist/" + file[0], import.meta.url));
    res.writeHead(200, {
      "Content-Type": file[1] + "; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self'; object-src 'none'; frame-ancestors 'none'",
    });
    res.end(raw);
  } catch {
    res.writeHead(503);
    res.end("Build first: npm run build");
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`GridPilot http://127.0.0.1:${port}`),
);
