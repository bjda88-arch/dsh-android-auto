import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const url = process.env.DSH_PREVIEW_URL;
if (!url) throw new Error("DSH_PREVIEW_URL is required");

const width = Number(process.env.VIEWPORT_WIDTH || 440);
const height = Number(process.env.VIEWPORT_HEIGHT || 744);
const colorScheme = process.env.COLOR_SCHEME || "light";
const deviceScaleFactor = Number(process.env.DEVICE_SCALE_FACTOR || 3);
const reducedMotion =
  process.env.REDUCED_MOTION === "1" ? "reduce" : "no-preference";
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
  deviceScaleFactor,
  reducedMotion,
});
const page = await context.newPage();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(5000);
if (process.env.CSS_PATH) {
  await page.addStyleTag({
    content: fs.readFileSync(path.resolve(process.env.CSS_PATH), "utf8"),
  });
}
if (process.env.JS_PATH) {
  await page.addScriptTag({
    content: fs.readFileSync(path.resolve(process.env.JS_PATH), "utf8"),
  });
  await page.waitForTimeout(250);
}
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
    if (menu) {
      menu.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          pointerType: "touch",
        }),
      );
      menu.click();
    }
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
if (process.env.CLICK_LABELS) {
  for (const wanted of process.env.CLICK_LABELS.split(";")) {
    const label = wanted.trim();
    if (!label) continue;
    await page.evaluate((exactLabel) => {
      const candidate = [...document.querySelectorAll("button, [role=button]")]
        .find((el) => (el.getAttribute("aria-label") || "").startsWith(exactLabel));
      if (candidate) candidate.click();
    }, label);
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
      if (el.matches('input[type="file"][hidden]')) return false;
      if (el.closest('[inert], [aria-hidden="true"]')) return false;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 &&
        cs.visibility !== "hidden" && cs.display !== "none" &&
        Number(cs.opacity) > 0 && cs.pointerEvents !== "none" &&
        (r.width < 44 || r.height < 44);
    })
    .slice(0, 80)
    .map((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute("type") || "",
        x: Math.round(r.x),
        y: Math.round(r.y),
        opacity: cs.opacity,
        pointerEvents: cs.pointerEvents,
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
