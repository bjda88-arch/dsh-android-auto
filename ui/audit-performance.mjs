import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const jsPath = path.resolve(process.env.JS_PATH || "ui/mobile.js");
const cssPath = path.resolve(process.env.CSS_PATH || "ui/mobile.css");
const browser = await chromium.launch({
  executablePath:
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
});

async function runScenario(name) {
  const context = await browser.newContext({
    viewport: { width: 440, height: 744 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.setContent(
    "<!doctype html><html><body><div id='root'>" +
      "<div class='wSkVaW_body'><div class='wSkVaW_scrollBody'>" +
      "<div class='_markdown_probe'></div>" +
      "<div data-composer-card><div data-input-scroll>" +
      "<div contenteditable='true' role='textbox'></div></div></div>" +
      "<div data-composer-dock></div>" +
      "</div></div></div></body></html>",
  );
  await page.addStyleTag({ content: fs.readFileSync(cssPath, "utf8") });
  await page.addScriptTag({ content: fs.readFileSync(jsPath, "utf8") });

  const client = await context.newCDPSession(page);
  await client.send("Performance.enable");
  const metricsBefore = await client.send("Performance.getMetrics");
  const result = await page.evaluate(async (scenario) => {
    const longTasks = [];
    let observer = null;
    if (typeof PerformanceObserver === "function") {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          longTasks.push(entry.duration);
        }
      });
      try {
        observer.observe({ type: "longtask", buffered: true });
      } catch {}
    }

    const markdown = document.querySelector("._markdown_probe");
    if (scenario === "stream") {
      for (let i = 0; i < 80; i += 1) {
        const p = document.createElement("p");
        p.textContent =
          `逐时气温 ${i}：06 时 3.6°C → 10 时 7.5°C → ` +
          "14 时 13.5°C → 18 时 11.5°C → 22 时 9.3°C";
        markdown.appendChild(p);
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const frames = [];
      let previous = performance.now();
      await new Promise((resolve) => {
        let frame = 0;
        function tick(now) {
          frames.push(now - previous);
          previous = now;
          for (const p of markdown.children) {
            p.firstChild.data += " ";
          }
          frame += 1;
          if (frame < 60) requestAnimationFrame(tick);
          else resolve();
        }
        requestAnimationFrame(tick);
      });
      if (observer) observer.disconnect();
      frames.sort((a, b) => a - b);
      return {
        frames: frames.length,
        averageFrameMs:
          Math.round((frames.reduce((sum, value) => sum + value, 0) / frames.length) * 100) /
          100,
        p95FrameMs: Math.round(frames[Math.floor(frames.length * 0.95)] * 100) / 100,
        longTasks: longTasks.length,
        longTaskMs:
          Math.round(longTasks.reduce((sum, value) => sum + value, 0) * 100) / 100,
        textNodes: markdown.children.length,
      };
    }

    const input = document.querySelector('[contenteditable="true"]');
    const frames = [];
    let previous = performance.now();
    await new Promise((resolve) => {
      let frame = 0;
      function tick(now) {
        frames.push(now - previous);
        previous = now;
        input.dispatchEvent(new InputEvent("input", { bubbles: true }));
        frame += 1;
        if (frame < 120) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
    if (observer) observer.disconnect();
    frames.sort((a, b) => a - b);
    return {
      frames: frames.length,
      averageFrameMs:
        Math.round((frames.reduce((sum, value) => sum + value, 0) / frames.length) * 100) /
        100,
      p95FrameMs: Math.round(frames[Math.floor(frames.length * 0.95)] * 100) / 100,
      longTasks: longTasks.length,
      longTaskMs:
        Math.round(longTasks.reduce((sum, value) => sum + value, 0) * 100) / 100,
    };
  }, name);

  const metricsAfter = await client.send("Performance.getMetrics");
  const map = (metrics) =>
    Object.fromEntries(metrics.metrics.map(({ name, value }) => [name, value]));
  const before = map(metricsBefore);
  const after = map(metricsAfter);
  const delta = (key) =>
    Math.round(((after[key] || 0) - (before[key] || 0)) * 10000) / 10000;
  await context.close();
  return {
    name,
    ...result,
    scriptDuration: delta("ScriptDuration"),
    layoutDuration: delta("LayoutDuration"),
    recalcStyleDuration: delta("RecalcStyleDuration"),
    taskDuration: delta("TaskDuration"),
  };
}

const results = [];
results.push(await runScenario("stream"));
results.push(await runScenario("typing"));
console.log(JSON.stringify(results, null, 2));
await browser.close();
