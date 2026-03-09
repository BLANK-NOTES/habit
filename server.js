/**
 * Habit Tracker — Local Dev Server
 * 
 * Run with:  node server.js
 * Then open: http://localhost:3000
 * 
 * Does two things:
 *  1. Serves all your .html/.js/.css files over http://
 *  2. Proxies /api/chat → Anthropic API (fixes CORS)
 */

const http  = require("http");
const https = require("https");
const fs    = require("fs");
const path  = require("path");
const url   = require("url");

const PORT   = 3000;
const FOLDER = __dirname; // same folder as this file

/* ── MIME types ── */
const MIME = {
  ".html": "text/html",
  ".js":   "application/javascript",
  ".css":  "text/css",
  ".json": "application/json",
  ".png":  "image/png",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".woff2":"font/woff2",
  ".woff": "font/woff",
};

/* ── Read API key from .env or environment ── */
const readApiKey = () => {
  // 1. Check environment variable
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  // 2. Check .env file in same folder
  const envPath = path.join(FOLDER, ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const m = line.match(/^ANTHROPIC_API_KEY\s*=\s*(.+)$/);
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  return null;
};

/* ── Proxy Anthropic API ── */
const proxyAnthropicRequest = (req, res) => {
  const apiKey = readApiKey();

  if (!apiKey) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: {
        type: "no_api_key",
        message: "No API key found. Create a .env file with: ANTHROPIC_API_KEY=sk-ant-..."
      }
    }));
    return;
  }

  let body = "";
  req.on("data", chunk => body += chunk);
  req.on("end", () => {
    const options = {
      hostname: "api.anthropic.com",
      path:     "/v1/messages",
      method:   "POST",
      headers: {
        "Content-Type":      "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key":         apiKey,
        "Content-Length":    Buffer.byteLength(body),
      },
    };

    const proxyReq = https.request(options, proxyRes => {
      res.writeHead(proxyRes.statusCode, {
        "Content-Type":                "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      proxyRes.pipe(res);
    });

    proxyReq.on("error", err => {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "Proxy error: " + err.message } }));
    });

    proxyReq.write(body);
    proxyReq.end();
  });
};

/* ── Main server ── */
const server = http.createServer((req, res) => {
  const parsed   = url.parse(req.url);
  const pathname = parsed.pathname;

  /* CORS preflight */
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, anthropic-version, x-api-key",
    });
    res.end();
    return;
  }

  /* API proxy route */
  if (pathname === "/api/chat" && req.method === "POST") {
    proxyAnthropicRequest(req, res);
    return;
  }

  /* Static file serving */
  let filePath = path.join(FOLDER, pathname === "/" ? "/monthly.html" : pathname);

  // Security: prevent directory traversal
  if (!filePath.startsWith(FOLDER)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end(`File not found: ${pathname}`);
      } else {
        res.writeHead(500); res.end("Server error");
      }
      return;
    }

    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("");
  console.log("  ✅  Habit Tracker running!");
  console.log("");
  console.log(`  Open: http://localhost:${PORT}`);
  console.log("");
  console.log("  Press Ctrl+C to stop");
  console.log("");

  // Auto-open browser
  const url = `http://localhost:${PORT}`;
  const cmd = process.platform === "win32"  ? `start "" "${url}"` :
              process.platform === "darwin" ? `open "${url}"` :
                                              `xdg-open "${url}"`;
  require("child_process").exec(cmd);
});