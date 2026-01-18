/**
 * Auto-screenshot all prototype routes (Express/EJS) using Playwright.
 *
 * Usage:
 *   1) Start your server: npm start
 *   2) Run: node scripts/screenshot-all.js
 *
 * Output:
 *   ./screenshots/<timestamp>/<sanitized_filename>.png
 */

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// If your app needs time for loading screens to auto-redirect,
// we intentionally wait a bit after navigation.
const DEFAULT_WAIT_MS = 1800;

function tsFolderName() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function safeName(s) {
  return s
    .replace(/^https?:\/\//, "")
    .replace(/[\/\?\=&:]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_/, "")
    .replace(/_$/, "");
}

async function shot(page, outDir, relativeUrl, waitMs = DEFAULT_WAIT_MS) {
  const url = `${BASE_URL}${relativeUrl}`;
  console.log("→", url);
  await page.goto(url, { waitUntil: "domcontentloaded" });

  // Wait a bit to let the UI fully render (and auto-redirect pages settle)
  await page.waitForTimeout(waitMs);

  const file = path.join(outDir, `${safeName(relativeUrl)}.png`);
  await page.screenshot({ path: file, fullPage: true });
}

(async () => {
  const outDir = path.join(process.cwd(), "screenshots", tsFolderName());
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } }); // mobile-like

  // ---- Core pages (baseline) ----
  const baseRoutes = [
    "/reset",
    "/dashboard",
    "/withdraw",
    "/withdraw/confirm",
    "/withdraw/insufficient",
    "/withdraw/screening",
    "/withdraw/under-review",
    "/withdraw/blocked",
    "/withdraw/limit-check",
    "/withdraw/limit-exceeded",
    "/withdraw/bank-processing",
    "/withdraw/bank-declined",
    "/withdraw/timeout",
    "/withdraw/success",
    "/misuse/fraud-withdrawal",
    "/misuse/add-bank",
    "/misuse/security-alert",
    "/security/tips",

    // These were the “missing pages” you added:
    "/security/2fa",
    "/security/linked-banks",
    "/security/limits",
    "/security/report",
    "/admin/audit",
  ];

  // ---- Scenario variants (demo outcomes) ----
  // We screenshot each key route with each scenario state.
  const scenarios = ["success", "hold", "blocked", "limit", "nack", "timeout"];

  const scenarioRoutes = [
    "/withdraw",
    "/withdraw/confirm",
    "/withdraw/screening",
    "/withdraw/limit-check",
    "/withdraw/bank-processing",
    "/dashboard",
  ];

  // 1) Screenshot baseline routes
  for (const r of baseRoutes) {
    // Some pages are “loading” pages that auto-redirect; we still capture them.
    const isLoading =
      r === "/withdraw/screening" || r === "/withdraw/limit-check" || r === "/withdraw/bank-processing";

    await shot(page, outDir, r, isLoading ? 900 : DEFAULT_WAIT_MS);
  }

  // 2) Screenshot scenario variants
  for (const s of scenarios) {
    for (const r of scenarioRoutes) {
      const url = `${r}?scenario=${encodeURIComponent(s)}`;
      const isLoading =
        r === "/withdraw/screening" || r === "/withdraw/limit-check" || r === "/withdraw/bank-processing";
      await shot(page, outDir, url, isLoading ? 900 : DEFAULT_WAIT_MS);
    }
  }

  console.log("\n✅ Done. Screenshots saved to:", outDir);
  await browser.close();
})().catch((err) => {
  console.error("❌ Screenshot run failed:", err);
  process.exit(1);
});
