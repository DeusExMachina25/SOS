import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3113";
const SHOTS = process.env.SHOTS;
mkdirSync(SHOTS, { recursive: true });

const SIZES = [
  { name: "desktop1440", width: 1440, height: 900 },
  { name: "laptop1024", width: 1024, height: 768 },
  { name: "tablet768", width: 768, height: 1024 },
  { name: "phone375", width: 375, height: 812 },
];
// settled moments of the 13.5s master timeline, as scroll fractions
const BEATS = [
  ["01-logo", 0.0], ["02-headline+compass", 0.15], ["03-too-close", 0.285], ["04-why-second", 0.43],
  ["05-how-session", 0.576], ["06-grounded", 0.72], ["07-nine-dot", 0.87], ["08-cta", 0.995],
];

const browser = await chromium.launch();
const report = {};

for (const s of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 140)));
  page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message.slice(0, 140)));
  await page.goto(BASE + "/", { waitUntil: "load" });

  // --- preloader timing
  const t0 = Date.now();
  await page.waitForSelector(".sos-preloader", { state: "detached", timeout: 8000 }).catch(() => {});
  const preloaderMs = Date.now() - t0;

  // --- invisible clickable overlays at the very start of the page
  const hazards = await page.evaluate(() => {
    const out = [];
    const pts = [[0.5, 0.5], [0.3, 0.5], [0.7, 0.5], [0.5, 0.35], [0.5, 0.65]];
    for (const [px, py] of pts) {
      const el = document.elementFromPoint(innerWidth * px, innerHeight * py);
      if (!el) continue;
      const a = el.closest("a,button");
      if (a) {
        let o = 1;
        for (let n = a; n && n !== document.body; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity);
        if (o < 0.1) out.push(`(${px},${py}) -> "${a.textContent.trim().slice(0, 30)}" opacity ${o.toFixed(2)} href=${a.getAttribute("href")}`);
      }
    }
    return out;
  });

  const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const beats = [];
  for (const [name, f] of BEATS) {
    await page.evaluate((y) => window.scrollTo(0, y), H * f);
    await page.waitForTimeout(3200); // scrub lag 1.5s + settle
    const data = await page.evaluate(() => {
      const cont = document.querySelector("div.fixed.overflow-hidden");
      const iw = innerWidth, ih = innerHeight;
      const kids = [...cont.children].filter((e) => e.classList.contains("absolute") && /z-/.test(e.className));
      const vis = [];
      kids.forEach((e) => {
        const op = parseFloat(getComputedStyle(e).opacity);
        if (op < 0.25) return;
        const r = e.getBoundingClientRect();
        // measure real content, not the (possibly full-width) wrapper
        const inner = e.firstElementChild ?? e;
        const ir = inner.getBoundingClientRect();
        const label = (e.innerText || "").replace(/\s+/g, " ").trim().slice(0, 24) || (e.querySelector("video") ? "[video]" : "[graphic]");
        vis.push({ label, op: +op.toFixed(2), l: Math.round(ir.left), r: Math.round(ir.right), t: Math.round(ir.top), b: Math.round(ir.bottom) });
      });
      const issues = [];
      vis.forEach((v) => {
        if (v.l < -2 || v.r > iw + 2) issues.push(`HORIZONTAL CLIP: ${v.label} x${v.l}..${v.r} (screen ${iw})`);
        if (v.t < -2 || v.b > ih + 2) issues.push(`VERTICAL CLIP: ${v.label} y${v.t}..${v.b} (screen ${ih})`);
      });
      for (let i = 0; i < vis.length; i++)
        for (let j = i + 1; j < vis.length; j++) {
          const a = vis[i], b = vis[j];
          const w = Math.min(a.r, b.r) - Math.max(a.l, b.l), h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
          if (w > 0 && h > 0) {
            const small = Math.min((a.r - a.l) * (a.b - a.t), (b.r - b.l) * (b.b - b.t));
            if ((w * h) / small > 0.15 && a.op > 0.6 && b.op > 0.6) issues.push(`OVERLAP ${Math.round((100 * w * h) / small)}%: ${a.label} / ${b.label}`);
          }
        }
      return { shown: vis.map((v) => `${v.label} (${v.l}-${v.r},${v.t}-${v.b} op${v.op})`), issues };
    });
    beats.push({ name, ...data });
    if (s.name === "desktop1440" || s.name === "phone375")
      await page.screenshot({ path: `${SHOTS}/${s.name}-${name}.png` });
  }

  // --- fps during a scroll
  const fps = await page.evaluate(async () => {
    let n = 0; const t = performance.now();
    await new Promise((res) => { const f = () => { n++; if (performance.now() - t < 1500) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); window.scrollBy(0, 400); });
    return Math.round(n / 1.5);
  });

  report[s.name] = { preloaderMs, hazards, fps, errors: [...new Set(errors)].slice(0, 5), beats };
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 1));
