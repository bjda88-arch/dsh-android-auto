import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const url = process.env.DSH_PREVIEW_URL;
if (!url) throw new Error("DSH_PREVIEW_URL is required");

const width = Number(process.env.VIEWPORT_WIDTH || 570);
const height = Number(process.env.VIEWPORT_HEIGHT || 960);
const mobile = process.env.MOBILE !== "0";
const cssPath = process.env.CSS_PATH;
const outPath = process.env.SHOT_PATH || "ui-preview.png";

const edge =
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

const browser = await chromium.launch({
  executablePath: edge,
  headless: true,
  args: ["--disable-dev-shm-usage"],
});
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: 2,
  isMobile: mobile,
  hasTouch: mobile,
});
const page = await context.newPage();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
if (cssPath) {
  await page.addStyleTag({
    content: fs.readFileSync(path.resolve(cssPath), "utf8"),
  });
}
await page.waitForTimeout(6000);
if (process.env.DISMISS_NOTICE === "1") {
  const next = page.getByRole("button", { name: "继续", exact: true });
  if ((await next.count()) > 0) {
    await next.first().click();
    await page.waitForTimeout(800);
  }
}
if (process.env.HIDE_NOTICES === "1") {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll(
      '[role="presentation"], [aria-hidden="true"]._mask_o6lrb_18',
    )) {
      el.remove();
    }
  });
  await page.waitForTimeout(300);
}
if (process.env.OPEN_DRAWER === "1") {
  await page.evaluate(() => {
    const menu =
      document.querySelector(".dsh-mobile-menu-btn") ||
      [...document.querySelectorAll("[aria-label]")].find((el) =>
        /展开侧边栏|打开侧边栏/.test(el.getAttribute("aria-label") || ""),
      );
    if (menu) menu.click();
  });
  await page.waitForTimeout(500);
}
if (process.env.NEW_SESSION === "1") {
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('[class*="_sidebarCol"] button')]
      .find((el) => /新会话/.test(el.textContent || ""));
    if (button) button.click();
  });
  await page.waitForTimeout(1200);
}

const audit = await page.evaluate(() => {
  const describe = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      class: el.className?.toString().slice(0, 180),
      text: (el.innerText || el.getAttribute("aria-label") || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 120),
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      display: cs.display,
      overflowX: cs.overflowX,
      overflowY: cs.overflowY,
      padding: cs.padding,
      fontSize: cs.fontSize,
    };
  };
  const pick = (selector) =>
    [...document.querySelectorAll(selector)]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.width > 0 &&
          r.height > 0 &&
          r.right > 0 &&
          r.bottom > 0 &&
          r.left < innerWidth &&
          r.top < innerHeight
        );
      })
      .slice(0, 20)
      .map(describe);
  return {
    viewport: {
      w: innerWidth,
      h: innerHeight,
      dpr: devicePixelRatio,
      bodyW: document.body.scrollWidth,
      bodyH: document.body.scrollHeight,
    },
    frame: pick('[class*="_frame"]'),
    frameStyle: (() => {
      const el = document.querySelector('[class*="_frame"]');
      return el ? getComputedStyle(el).gridTemplateColumns : null;
    })(),
    sidebarTree: (() => {
      const side = document.querySelector('[class*="_sidebarCol"]');
      if (!side) return null;
      const walk = (el, depth = 0) => {
        if (!el || depth > 3) return null;
        const r = el.getBoundingClientRect();
        return {
          class: el.className?.toString().slice(0, 120),
          inlineWidth: el.style?.width || "",
          computedWidth: Math.round(r.width),
          children: [...el.children].slice(0, 3).map((c) => walk(c, depth + 1)),
        };
      };
      return walk(side);
    })(),
    columns: pick(
      '[class*="_sidebarCol"], [class*="_centerCol"], [class*="_rightbarCol"]',
    ),
    conversation: pick(
      '[class*="_root"], [class*="_header"], [class*="_scrollBody"], [class*="_composerSeat"]',
    ),
    composer: pick(
      '[data-composer-card], [class*="_inputBar"], [class*="_composer"], textarea, [contenteditable="true"]',
    ),
    buttons: pick(
      'button, [role="button"], [data-cordis-badge], [class*="_navCell"]',
    ),
    text: document.body.innerText.slice(0, 6000),
  };
});

fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
await page.screenshot({ path: outPath, fullPage: false });
console.log(JSON.stringify(audit, null, 2));
await browser.close();
