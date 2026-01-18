/**
 * Auto-screenshot ALL UC-008 related pages
 * Stack: Express + EJS
 *
 * How to use:
 * 1) npm start
 * 2) node scripts/screenshot_uc008.js
 *
 * Output:
 * /screenshots/<timestamp>/*.png
 */

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE_URL = "http://localhost:3000";
const WAIT_MS = 1200;

// Create timestamp folder
function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

function safeName(url) {
  return url
    .replace(BASE_URL, "")
    .replace(/[\/\?\=&]+/g, "_")
    .replace(/^_/, "");
}

async function shot(page, outDir, route, wait = WAIT_MS) {
  const url = `${BASE_URL}${route}`;
  console.log("→", url);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(wait);
  await page.screenshot({
    path: path.join(outDir, `${safeName(route)}.png`),
    fullPage: true
  });
}

(async () => {
  const outDir = path.join(process.cwd(), "screenshots", timestamp());
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 430, height: 932 } // mobile-like
  });

  // =========================
  // UC-008 Core Flow
  // =========================
  const coreRoutes = [
    "/dashboard",
    "/reinvest",
    "/reinvest/confirm",
    "/reinvest/eligibility",
    "/reinvest/not-eligible",
    "/reinvest/insufficient",
    "/reinvest/screening",
    "/reinvest/blocked",
    "/reinvest/success",
  ];

  // =========================
  // Scenario Variants
  // =========================
  const scenarios = ["success", "insufficient", "noteligible", "blocked"];

  const scenarioRoutes = [
    "/reinvest",
    "/reinvest/confirm",
    "/reinvest/eligibility",
    "/reinvest/screening"
  ];

  // =========================
  // Misuse + Security
  // =========================
  const securityRoutes = [
    "/misuse/fraud-withdrawal", // misuse reused for reinvest
    "/security/tips",
    "/security/2fa",
    "/security/linked-banks",
    "/security/limits",
    "/security/report",
    "/admin/audit"
  ];

  // 1) Core routes
  for (const r of coreRoutes) {
    await shot(page, outDir, r);
  }

  // 2) Scenario-based screenshots
  for (const s of scenarios) {
    for (const r of scenarioRoutes) {
      await shot(page, outDir, `${r}?scenario=${s}`);
    }
  }

  // 3) Security / misuse / audit
  for (const r of securityRoutes) {
    await shot(page, outDir, r);
  }

  console.log("\n✅ Screenshots saved to:", outDir);
  await browser.close();
})();
