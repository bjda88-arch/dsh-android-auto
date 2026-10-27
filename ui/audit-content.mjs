import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const url = process.env.DSH_PREVIEW_URL;
if (!url) throw new Error("DSH_PREVIEW_URL is required");

const width = Number(process.env.VIEWPORT_WIDTH || 412);
const height = Number(process.env.VIEWPORT_HEIGHT || 697);
const colorScheme = process.env.COLOR_SCHEME || "light";
const scrollMode = process.env.SCROLL_MODE || "bottom";
const textScale = Number(process.env.TEXT_SCALE || 100);
const cssPath = path.resolve(process.env.CSS_PATH || "ui/mobile.css");
const jsPath = process.env.JS_PATH
  ? path.resolve(process.env.JS_PATH)
  : null;
const shotPath = path.resolve(
  process.env.SHOT_PATH || "ui-content-preview.png",
);
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
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  colorScheme,
});
const page = await context.newPage();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(4500);
await page.addStyleTag({ content: fs.readFileSync(cssPath, "utf8") });
if (textScale !== 100) {
  await page.addStyleTag({
    content:
      `html { -webkit-text-size-adjust: ${textScale}% !important;` +
      ` text-size-adjust: ${textScale}% !important; }`,
  });
  await page.evaluate((scale) => {
    document.documentElement.classList.toggle(
      "dsh-mobile-large-text",
      scale > 116,
    );
  }, textScale);
}
if (jsPath) {
  await page.addScriptTag({ content: fs.readFileSync(jsPath, "utf8") });
  await page.waitForTimeout(250);
}

await page.evaluate((scrollMode) => {
  for (const el of document.querySelectorAll(
    '[role="presentation"], [aria-hidden="true"]._mask_o6lrb_18',
  )) {
    el.remove();
  }

  const root = document.querySelector(".wSkVaW_root");
  const header = document.querySelector(".wSkVaW_header");
  const scrollBody = document.querySelector(".wSkVaW_scrollBody");
  const composerSeat = document.querySelector(".wSkVaW_composerSeat");
  if (!root || !header || !scrollBody || !composerSeat) {
    throw new Error("Conversation shell was not found");
  }

  root.dataset.phase = "active";
  header.classList.remove("wSkVaW_headerBlank");
  const headerCorner = header.querySelector(".wSkVaW_headerCorner");
  header.replaceChildren();

  const leading = document.createElement("div");
  leading.className = "wSkVaW_headerLeading";
  const titleRow = document.createElement("div");
  titleRow.className = "wSkVaW_titleRow";
  titleRow.innerHTML =
    '<div class="wSkVaW_titleCluster"><div class="wSkVaW_crumbs">' +
    '<span class="wSkVaW_crumbSeg"><span class="wSkVaW_crumb wSkVaW_crumbCurrent">' +
    "今天天气</span></span></div></div>";
  const tabs = document.createElement("div");
  tabs.className = "wSkVaW_tabs";
  tabs.innerHTML =
    '<button type="button" class="wSkVaW_tab wSkVaW_tabActive">对话</button>' +
    '<button type="button" class="wSkVaW_tab">轨迹</button>' +
    '<button type="button" class="wSkVaW_tab">圆桌</button>';
  if (headerCorner) titleRow.append(headerCorner);
  header.append(leading, titleRow, tabs);

  composerSeat
    .querySelectorAll(".pXSMma_root, .wSkVaW_heroWorkspaceRow")
    .forEach((el) => el.remove());
  composerSeat
    .querySelectorAll(".wSkVaW_composerHero, .uV2eYG_hero")
    .forEach((el) => {
      el.classList.remove("wSkVaW_composerHero", "uV2eYG_hero");
    });

  const modelLabel = composerSeat.querySelector(
    '[class*="_7KE1Ra_triggerLabel"]',
  );
  if (modelLabel) modelLabel.textContent = "DeepSeek-V4.1-Flash";
  const modelTrigger = composerSeat.querySelector(
    '[class*="_7KE1Ra_trigger"]',
  );
  if (modelTrigger) {
    modelTrigger.setAttribute("aria-label", "模型：DeepSeek-V4.1-Flash");
    modelTrigger.setAttribute("title", "DeepSeek-V4.1-Flash");
  }

  const input = composerSeat.querySelector('[contenteditable="true"]');
  if (input) {
    input.textContent = "";
    input.setAttribute(
      "aria-label",
      "发消息或创建任务，/ 调用指令，@ 文件或对话",
    );
    const placeholder = composerSeat.querySelector(
      '[data-composer-placeholder]',
    );
    if (placeholder) {
      placeholder.textContent = "发消息或创建任务，/ 调用指令，@ 文件或对话";
    }
  }

  const dock = composerSeat.querySelector(".uV2eYG_dock");
  if (dock) {
    dock.innerHTML =
      '<span data-composer-stat="activity"><span class="bOPqQW_pill">' +
      '<span class="bOPqQW_label">缓慢 10 步 · 239 tok/s</span></span></span>' +
      '<span data-composer-stat="usage"><button type="button" class="bOPqQW_pill">' +
      '<span class="bOPqQW_label">231K tok · 缓存命中 90%</span></button></span>' +
      '<span data-composer-stat="context"><span class="bOPqQW_pill">' +
      '<span class="bOPqQW_label">上下文 3%</span></span></span>';
  }

  const viewArea = document.createElement("div");
  viewArea.className = "wSkVaW_viewArea";
  viewArea.dataset.conversationScroll = "true";
  viewArea.innerHTML = `
    <div class="EvIC1a_frame">
      <div class="EvIC1a_root" data-chat-following-tail="false">
        <div class="EvIC1a_scroll">
          <div class="EvIC1a_column">
            <div class="EvIC1a_flowItem" data-chat-flow-kind="assistant">
              <div class="_markdown_1ypvv_5">
                <div class="_tableScroll_1ypvv_192">
                  <table>
                    <tbody>
                      <tr><td>天气</td><td>晴，午后转为少云</td></tr>
                      <tr><td>气温</td><td>3°C 到 14°C（凌晨当前 5.8°C，体感 2.8°C）</td></tr>
                      <tr><td>降水</td><td>无，降水概率 0%</td></tr>
                      <tr><td>风</td><td>偏北风，最大约 9 km/h（2 级）</td></tr>
                      <tr><td>日出/日落</td><td>06:38 / 17:17</td></tr>
                      <tr><td>紫外线</td><td>中等（UV 3.9）</td></tr>
                    </tbody>
                  </table>
                </div>
                <p>逐时气温：06 时 3.6°C → 10 时 7.5°C → 14 时 13.5°C → 18 时 11.5°C → 22 时 9.3°C</p>
                <h4>生活提示</h4>
                <ul>
                  <li>早晚只有 3~5°C，昼夜温差超过 10°C，出门时最好套上件厚外套或冲锋衣，早上出门时尤其冷。</li>
                </ul>
                <p>午后云量逐渐减少，适合通风和短时间户外活动。</p>
              </div>
            </div>
            <div class="EvIC1a_toBottomSlot">
              <button type="button" class="EvIC1a_toBottom" aria-label="回到底部">
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M4 6L8 10L12 6" fill="none" stroke="currentColor"
                    stroke-width="1.5" stroke-linecap="round"
                    stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  scrollBody.replaceChildren(viewArea, composerSeat);
  requestAnimationFrame(() => {
    const seatHeight = composerSeat.getBoundingClientRect().height;
    const cardHeight =
      composerSeat.querySelector("[data-composer-card]")?.getBoundingClientRect()
        .height || 0;
    const dockHeight =
      composerSeat.querySelector(".uV2eYG_dock")?.getBoundingClientRect()
        .height || 0;
    scrollBody.style.setProperty("--dsh-composer-height", `${seatHeight}px`);
    document.documentElement.style.setProperty(
      "--dsh-mobile-composer-card-height",
      `${cardHeight}px`,
    );
    document.documentElement.style.setProperty(
      "--dsh-mobile-composer-dock-height",
      `${dockHeight}px`,
    );
    scrollBody.scrollTop =
      scrollMode === "top" ? 0 : scrollBody.scrollHeight;
    const inputScroll = composerSeat.querySelector("[data-input-scroll]");
    if (
      inputScroll &&
      inputScroll.scrollHeight > inputScroll.clientHeight + 1
    ) {
      inputScroll.tabIndex = 0;
      inputScroll.setAttribute("role", "region");
      inputScroll.setAttribute("aria-label", "消息输入内容");
    }
  });
}, scrollMode);

await page.waitForTimeout(500);
const metrics = await page.evaluate(() => {
  const box = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      x: Math.round(r.x * 10) / 10,
      y: Math.round(r.y * 10) / 10,
      width: Math.round(r.width * 10) / 10,
      height: Math.round(r.height * 10) / 10,
      fontSize: cs.fontSize,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    };
  };
  const overlaps = (a, b) =>
    a && b &&
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;
  const paragraphs = [
    ...document.querySelectorAll("._markdown_1ypvv_5 p"),
  ];
  const lastParagraph = paragraphs.at(-1);
  const lastBox = lastParagraph
    ? box("._markdown_1ypvv_5 p:last-of-type")
    : null;
  const bubbleBox = box('[class*="_toBottomSlot"] button');
  const composerBox = box("[data-composer-card]");
  const tableCells = [...document.querySelectorAll("table tr:first-child td")];
  return {
    viewport: {
      width: innerWidth,
      height: innerHeight,
      ratio: Math.round((innerWidth / innerHeight) * 10000) / 10000,
      documentWidth: document.documentElement.scrollWidth,
    },
    header: box(".wSkVaW_header"),
    title: box(".wSkVaW_crumbCurrent"),
    tabs: box(".wSkVaW_tabs"),
    activeTab: box(".wSkVaW_tabActive"),
    content: box(".EvIC1a_column"),
    table: box("._tableScroll_1ypvv_192"),
    tableColumns: tableCells.map((cell) => Math.round(cell.getBoundingClientRect().width)),
    paragraph: box("._markdown_1ypvv_5 p"),
    composer: composerBox,
    input: box("[data-composer-input]"),
    inputScroll: box("[data-input-scroll]"),
    composerDock: box(".uV2eYG_dock"),
    model: box('[class*="_7KE1Ra_trigger"]'),
    modelLabel: box('[class*="_7KE1Ra_triggerLabel"]'),
    bubble: bubbleBox,
    lastParagraph: lastBox,
    bubbleObscuresVisibleParagraph:
      overlaps(bubbleBox, lastBox) &&
      Boolean(bubbleBox && composerBox && bubbleBox.y < composerBox.y),
    safeBottomPadding: getComputedStyle(
      document.documentElement,
    ).getPropertyValue("--dsh-mobile-safe-bottom"),
  };
});

await page.addScriptTag({ content: axeSource });
const a11y = await page.evaluate(async () => {
  const result = await window.axe.run(document, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
    },
  });
  const smallTargets = [
    ...document.querySelectorAll(
      'button, [role="button"], input, select, textarea, a[href], [tabindex]',
    ),
  ]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return (
        r.width > 0 &&
        r.height > 0 &&
        cs.visibility !== "hidden" &&
        cs.display !== "none" &&
        (r.width < 44 || r.height < 44)
      );
    })
    .map((el) => {
      const r = el.getBoundingClientRect();
      return {
        label: (
          el.getAttribute("aria-label") ||
          el.textContent ||
          el.getAttribute("title") ||
          ""
        )
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 80),
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    });
  return {
    violations: result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => ({
        target: node.target,
        summary: node.failureSummary,
      })),
    })),
    incomplete: result.incomplete.map((item) => item.id),
    smallTargets,
  };
});

fs.mkdirSync(path.dirname(shotPath), { recursive: true });
await page.screenshot({ path: shotPath, fullPage: false });
console.log(JSON.stringify({ metrics, a11y }, null, 2));
await browser.close();
