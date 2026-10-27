import { chromium } from "playwright";
import fs from "node:fs";

const url = process.env.DSH_PREVIEW_URL;
if (!url) throw new Error("DSH_PREVIEW_URL is required");

const width = Number(process.env.VIEWPORT_WIDTH || 360);
const height = Number(process.env.VIEWPORT_HEIGHT || 607);
const colorScheme = process.env.COLOR_SCHEME || "light";
const axeSource = fs.readFileSync(
  new URL("../node_modules/axe-core/axe.min.js", import.meta.url),
  "utf8",
);

const browser = await chromium.launch({
  executablePath:
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width, height },
  colorScheme,
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const page = await context.newPage();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(5000);
await page.evaluate(() => {
  for (const el of document.querySelectorAll(
    '[role="presentation"], [aria-hidden="true"]._mask_o6lrb_18',
  )) {
    el.remove();
  }
});

if (process.env.OPEN_DRAWER === "1") {
  await page.evaluate(() => {
    const menu =
      document.querySelector(".dsh-mobile-menu-btn") ||
      [...document.querySelectorAll("[aria-label]")].find((el) =>
        /展开侧边栏|打开侧边栏/.test(el.getAttribute("aria-label") || ""),
      );
    if (menu) menu.click();
  });
  await page.waitForTimeout(300);
}
if (process.env.CLICK_TEXTS) {
  for (const wanted of process.env.CLICK_TEXTS.split(";")) {
    await page.evaluate((text) => {
      const el = [...document.querySelectorAll("button, [role=button]")]
        .find((node) => (node.textContent || "").replace(/\s+/g, " ").includes(text));
      if (el) el.click();
    }, wanted.trim());
    await page.waitForTimeout(500);
  }
}

await page.addScriptTag({ content: axeSource });
const result = await page.evaluate(async () => {
  const axe = await window.axe.run(document, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
    },
  });
  const small = [...document.querySelectorAll(
    'button, [role="button"], input, select, textarea, a[href], [tabindex]',
  )]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 &&
        cs.visibility !== "hidden" && cs.display !== "none" &&
        (r.width < 44 || r.height < 44);
    })
    .slice(0, 80)
    .map((el) => {
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        text: (
          el.getAttribute("aria-label") ||
          el.textContent ||
          el.getAttribute("title") ||
          ""
        ).replace(/\s+/g, " ").trim().slice(0, 100),
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    });
  return {
    violations: axe.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.slice(0, 12).map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
    incomplete: axe.incomplete.map((v) => v.id),
    small,
  };
});

console.log(JSON.stringify({ width, height, colorScheme, ...result }, null, 2));
await browser.close();
