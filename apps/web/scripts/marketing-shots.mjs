// Captures real screenshots of the public example report for the marketing
// site. Run against a local `next start` (it builds nothing itself):
//
//   BASE_URL=http://localhost:3160 PUPPETEER=<path to puppeteer-core> node scripts/marketing-shots.mjs
//
// Writes apps/web/public/marketing/shot-{metrics,ranking,answer,fix}.webp
// (1200x750) and shot-*-m.webp (750x900) in the light theme at 2x.

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, "..");
const outDir = path.join(webRoot, "public/marketing");
const BASE = process.env.BASE_URL ?? "http://localhost:3160";
const DEMO = process.env.DEMO_BRANCH_ID ?? "311b454f-066d-4307-81a5-3d30b659aee7";
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const puppeteer = require(process.env.PUPPETEER ?? "puppeteer-core");
const pnpmDir = path.resolve(webRoot, "../../node_modules/.pnpm");
const sharpDir = fs.readdirSync(pnpmDir).find((d) => d.startsWith("sharp@"));
const sharp = require(path.join(pnpmDir, sharpDir, "node_modules/sharp"));
const SURFACE = { r: 247, g: 247, b: 242, alpha: 1 }; // brand `surface` (light)

// Each shot: page, and a function (run in the page) returning the element to capture.
const SHOTS = [
  {
    name: "metrics",
    path: "",
    find: () => {
      const label = [...document.querySelectorAll("span")].find((s) => s.textContent?.trim() === "Visibility");
      return label?.closest("div.rounded-lg")?.parentElement ?? null;
    },
  },
  {
    name: "ranking",
    path: "",
    find: () => [...document.querySelectorAll("h2")].find((h) => h.textContent?.startsWith("Who AI recommends"))?.closest("div.rounded-lg") ?? null,
  },
  {
    name: "answer",
    path: "/prompts?mentioned=yes",
    find: () => [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Copy answer"))?.closest("article, li, div.rounded-lg") ?? null,
  },
  {
    name: "fix",
    path: "/fixes",
    find: () => document.querySelector("details[open]"),
  },
];

async function capture(page, shot, width) {
  await page.setViewport({ width, height: 1000, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/branches/${DEMO}${shot.path}`, { waitUntil: "networkidle0", timeout: 60000 });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  const handle = await page.evaluateHandle(shot.find);
  const el = handle.asElement();
  if (!el) throw new Error(`No element for ${shot.name} at width ${width}`);
  // Let grid cards size to their content rather than stretch to a neighbour.
  await el.evaluate((n) => {
    n.style.alignSelf = "start";
    n.style.height = "auto";
    n.scrollIntoView({ block: "center" });
  });
  await new Promise((r) => setTimeout(r, 400)); // let one-off reveal animations settle
  return el.screenshot({ type: "png" });
}

async function save(png, file, w, h) {
  await sharp(png)
    .resize(w, h, { fit: "contain", background: SURFACE })
    .webp({ quality: 82 })
    .toFile(path.join(outDir, file));
}

fs.mkdirSync(outDir, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
for (const shot of SHOTS) {
  await save(await capture(page, shot, 1180), `shot-${shot.name}.webp`, 1200, 750);
  await save(await capture(page, shot, 390), `shot-${shot.name}-m.webp`, 750, 900);
  console.log("saved", shot.name);
}
await browser.close();
