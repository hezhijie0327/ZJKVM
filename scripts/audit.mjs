/**
 * ZJKVM Lighthouse gate — `pnpm audit`
 *
 * Serves the built dist/ with a zero-dependency static server (SPA fallback
 * to index.html) and audits the console page on desktop (default) and, with
 * LH_FORM_FACTOR=mobile, under mobile throttling. Thresholds:
 *   Performance 90 / Accessibility 100 / Best Practices 100 / SEO 100.
 * Raw LHR reports land in .lighthouse-archive/<run>/.
 */

import { existsSync, statSync as fsStatSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, gzipSync } from "node:zlib";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const OUT_DIR = join(ROOT, "dist");
let BASE = "http://127.0.0.1:0";
const ARCHIVE_ROOT = process.env.LH_ARCHIVE_DIR ?? join(ROOT, ".lighthouse-archive");
const MOBILE = process.env.LH_FORM_FACTOR === "mobile";

const THRESHOLDS = {
  performance: 90,
  accessibility: 100,
  "best-practices": 100,
  seo: 100,
};

/** @type {Record<string, string>} */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
};

function serveStatic(dir, port) {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", BASE);
    const pathname = decodeURIComponent(url.pathname);
    const candidates = [join(dir, pathname), join(dir, pathname, "index.html"), join(dir, "index.html")];
    const safe = candidates.map((p) => resolve(p)).filter((p) => p.startsWith(resolve(dir)));
    const filePath = safe.find((p) => existsSync(p) && !fsStatSync(p).isDirectory());
    if (!filePath) {
      res.writeHead(404, { "Content-Type": MIME[".html"] });
      res.end("Not Found");
      return;
    }
    const body = readFileSync(filePath);
    const cacheControl = pathname.startsWith("/assets/")
      ? "public, max-age=31536000, immutable"
      : "public, max-age=300";
    const type = MIME[extname(filePath)] ?? "application/octet-stream";
    const acceptEncoding = req.headers["accept-encoding"] ?? "";
    const compressible = /^(text\/|application\/(json|xml|javascript|manifest\+json))/.test(type) && body.length > 1024;
    const br = compressible && acceptEncoding.includes("br");
    const gz = compressible && !br && acceptEncoding.includes("gzip");
    const out = br ? brotliCompressSync(body) : gz ? gzipSync(body) : body;
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": cacheControl,
      ...(br ? { "Content-Encoding": "br", Vary: "Accept-Encoding" } : {}),
      ...(gz ? { "Content-Encoding": "gzip", Vary: "Accept-Encoding" } : {}),
    });
    res.end(out);
  });
  return new Promise((resolvePromise) => {
    server.listen(port, "127.0.0.1", () => resolvePromise(server));
  });
}

async function waitFor(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const resp = await fetch(url);
      if (resp.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`audit server did not come up at ${url}`);
}

process.on("unhandledRejection", (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  console.log(`  … ignored internal rejection: ${message.slice(0, 120)}`);
});

function resolveBrowserPath() {
  if (process.env.CHROME_PATH) return;
  const candidates =
    process.platform === "darwin"
      ? [
          "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Chromium.app/Contents/MacOS/Chromium",
        ]
      : process.platform === "win32"
        ? [
            "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          ]
        : ["/usr/bin/microsoft-edge", "/usr/bin/google-chrome", "/usr/bin/chromium"];
  for (const browser of candidates) {
    if (existsSync(browser)) {
      process.env.CHROME_PATH = browser;
      console.log(`using browser: ${browser}`);
      return;
    }
  }
}

/** Grab a free TCP port from the OS by binding to port 0, then releasing it. */
function reserveFreePort() {
  return new Promise((resolvePort, rejectPort) => {
    const srv = createNetServer();
    srv.once("error", rejectPort);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolvePort(port));
    });
  });
}

async function main() {
  if (!existsSync(join(OUT_DIR, "index.html"))) {
    throw new Error("dist/ missing or not built — run pnpm build first");
  }
  resolveBrowserPath();

  const server = await serveStatic(OUT_DIR, 0);
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("audit server did not report a listen port");
  }
  BASE = `http://127.0.0.1:${address.port}`;

  /** @type {import("chrome-launcher").LaunchedChrome | undefined} */
  let chrome;
  let failed = false;
  const runDir = join(
    ARCHIVE_ROOT,
    `${new Date().toISOString().replace(/[:.]/g, "-")}${MOBILE ? "-mobile" : "-desktop"}`,
  );

  try {
    await waitFor(`${BASE}/`);
    const { launch } = await import("chrome-launcher");
    const lighthouse = (await import("lighthouse")).default;
    const config = MOBILE ? undefined : (await import("lighthouse/core/config/desktop-config.js")).default;

    // Edge 156+ on Windows no longer echoes "DevTools listening on ws://…" to
    // stderr, which is how chrome-launcher discovers a port-0 launch. Reserve a
    // concrete free port ourselves so the launcher falls back to port polling.
    const debugPort = await reserveFreePort();
    chrome = await launch({ port: debugPort, chromeFlags: ["--headless=new"] });
    const port = chrome.port;
    const url = `${BASE}/`;
    console.log(`\n/${MOBILE ? "  (mobile)" : ""}`);

    const result = await lighthouse(url, { port, output: "json" }, config);
    const lhr = result?.lhr;
    if (!lhr) {
      throw new Error("lighthouse returned no report");
    }

    await mkdir(runDir, { recursive: true });
    await writeFile(join(runDir, "index.lhr.json"), JSON.stringify(lhr));

    /** @type {Record<string, number>} */
    const pageScores = {};
    for (const [cat, threshold] of Object.entries(THRESHOLDS)) {
      const score = Math.round((lhr.categories[cat]?.score ?? 0) * 100);
      const ok = score >= threshold;
      failed = failed || !ok;
      pageScores[cat] = score;
      console.log(`  ${cat.padEnd(18)} ${String(score).padStart(3)}  (min ${threshold})${ok ? "" : "  FAIL"}`);
    }

    for (const category of Object.values(lhr.categories)) {
      for (const ref of category.auditRefs) {
        const audit = lhr.audits[ref.id];
        if (
          audit &&
          audit.score !== null &&
          audit.score !== undefined &&
          audit.score < 1 &&
          !["manual", "notApplicable", "informative"].includes(audit.scoreDisplayMode)
        ) {
          console.log(`    ! ${audit.id}${audit.displayValue ? ` (${audit.displayValue})` : ""}`);
        }
      }
    }

    await writeFile(
      join(runDir, "scores.json"),
      JSON.stringify({ form_factor: MOBILE ? "mobile" : "desktop", pages: { "/": pageScores } }, null, 2),
    );
    console.log(`\narchived: ${runDir}`);
  } finally {
    if (chrome) {
      try {
        await chrome.kill();
      } catch {
        // cleanup errors do not affect the audit result
      }
    }
    server.close();
  }

  console.log(failed ? "\naudit FAILED" : "\naudit passed");
  process.exitCode = failed ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
