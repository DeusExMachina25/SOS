import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3113";
const SHOTS = process.env.SHOTS;
mkdirSync(SHOTS, { recursive: true });
const out = {};
const log = (k, v) => { out[k] = v; };

const browser = await chromium.launch();
const newPage = async (w = 1440, h = 900, init) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  // never touch the real backend from the rehearsal
  await page.route(/supabase\.co/, (r) => r.abort());
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message.slice(0, 120)));
  page.__errors = errors;
  if (init) await page.addInitScript(init);
  return page;
};

// ---------- 1. horizontal overflow + console on every public page x size
const pages = ["/", "/us", "/platter", "/login", "/privacy", "/terms", "/refunds", "/nope"];
const sizes = [[1440, 900], [1024, 768], [768, 1024], [375, 812]];
const overflow = [];
for (const [w, h] of sizes) {
  const page = await newPage(w, h);
  for (const p of pages) {
    await page.goto(BASE + p, { waitUntil: "load" });
    await page.waitForTimeout(2600);
    const r = await page.evaluate(() => {
      const de = document.documentElement;
      const wide = [...document.querySelectorAll("body *")].filter((e) => {
        const b = e.getBoundingClientRect();
        return b.width > 0 && b.right > innerWidth + 4 && getComputedStyle(e).position !== "fixed" && !e.closest("[aria-hidden=true]");
      }).slice(0, 3).map((e) => e.tagName + "." + String(e.className).slice(0, 40));
      return { sw: de.scrollWidth, iw: innerWidth, wide };
    });
    if (r.sw > r.iw + 1) overflow.push(`${w}px ${p}: page scrolls sideways (${r.sw}>${r.iw}) via ${r.wide.join(", ")}`);
  }
  await page.context().close();
}
log("overflow", overflow);

// ---------- 2. keyboard: first tab stops on home (do any land on invisible things?)
{
  const page = await newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  const stops = [];
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    stops.push(await page.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return "body";
      let o = 1;
      for (let n = a; n && n !== document.body; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity);
      const v = getComputedStyle(a).visibility;
      return `${a.tagName} "${(a.textContent || a.getAttribute("aria-label") || "").trim().slice(0, 22)}" opacity=${o.toFixed(2)} vis=${v}`;
    }));
  }
  log("homeTabOrder", stops);
  await page.context().close();
}

// ---------- 3. theme persistence + first-paint flash
{
  const page = await newPage(1440, 900, () => {
    window.__themeAtDCL = null;
    document.addEventListener("DOMContentLoaded", () => { window.__themeAtDCL = document.documentElement.getAttribute("data-theme"); });
  });
  await page.goto(BASE + "/platter", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: /toggle mode/i }).click();
  const afterToggle = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  const keys = await page.evaluate(() => Object.keys(localStorage));
  await page.goto(BASE + "/us", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const onUs = await page.evaluate(() => ({ now: document.documentElement.getAttribute("data-theme"), atDCL: window.__themeAtDCL }));
  log("theme", { afterToggle, storageKeys: keys, onUs });
  await page.context().close();
}

// ---------- 4. back/forward + scroll restoration
{
  const page = await newPage();
  await page.goto(BASE + "/us", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.scrollTo(0, 5000));
  await page.waitForTimeout(800);
  await page.getByRole("link", { name: /^platter$/i }).first().click().catch(() => {});
  await page.waitForTimeout(1500);
  const there = page.url();
  await page.goBack();
  await page.waitForTimeout(2500);
  log("backNav", { wentTo: there.replace(BASE, ""), backOn: page.url().replace(BASE, ""), scrollYAfterBack: await page.evaluate(() => Math.round(scrollY)), preloaderReplayed: await page.evaluate(() => !!document.querySelector(".sos-preloader") && getComputedStyle(document.querySelector(".sos-preloader")).display !== "none") });
  await page.context().close();
}

// ---------- 5. navbar behaviour on scroll (can a user reach nav while reading?)
{
  const page = await newPage();
  await page.goto(BASE + "/platter", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(900);
  const hidden = await page.evaluate(() => getComputedStyle(document.querySelector("nav.sos-nav")).opacity);
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(900);
  const back = await page.evaluate(() => getComputedStyle(document.querySelector("nav.sos-nav")).opacity);
  log("navOnScroll", { opacityAfterScrollDown: hidden, opacityAfterSmallScrollUp: back });
  await page.context().close();
}

// ---------- 6. login: validation + backend-down behaviour
{
  const page = await newPage();
  await page.goto(BASE + "/login", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  const input = page.getByPlaceholder("phone number or email");
  const btn = page.getByRole("button", { name: /send magic link/i });
  const res = {};
  await input.fill("abc");
  await btn.click();
  await page.waitForTimeout(600);
  res.invalidInput = (await page.locator("body").innerText()).replace(/\s+/g, " ").match(/(invalid|valid|enter|please)[^.]{0,60}/i)?.[0] ?? "(no message found)";
  await input.fill("rehearsal@example.com");
  await btn.click();
  await page.waitForTimeout(2500);
  res.backendDown = (await page.locator("body").innerText()).replace(/\s+/g, " ").match(/(failed|error|unable|could not|try again|fetch)[^.]{0,80}/i)?.[0] ?? "(no message found)";
  res.stillOnLogin = page.url().replace(BASE, "");
  // tabs
  await page.getByRole("button", { name: /^expert$/i }).click();
  await page.waitForTimeout(500);
  res.expertFormFields = await page.evaluate(() => [...document.querySelectorAll("input")].map((i) => i.type + ":" + (i.placeholder || i.name)));
  await page.screenshot({ path: `${SHOTS}/login-expert.png` });
  log("login", res);
  await page.context().close();
}

// ---------- 7. platter: tier -> login handoff, and 404 / homus looks
{
  const page = await newPage();
  await page.goto(BASE + "/platter", { waitUntil: "load" });
  await page.waitForTimeout(3000);
  const rows = await page.locator("section li").filter({ hasText: /per 60 min|On request/ }).count();
  const firstRow = page.locator("section li").filter({ hasText: /per 60 min|On request/ }).first();
  const rateText = (await firstRow.innerText()).replace(/\s+/g, " ");
  await firstRow.getByRole("button", { name: /book session/i }).scrollIntoViewIfNeeded();
  await firstRow.getByRole("button", { name: /book session/i }).click();
  await page.waitForTimeout(1500);
  log("rateHandoff", {
    expertRateRows: rows,
    firstRow: rateText,
    landedOn: page.url().replace(BASE, ""),
    expertRemembered: await page.evaluate(() => !!localStorage.getItem("platter_selected_expert")),
    tiersGone: !(await page.locator("body").innerText()).match(/Tier 0|Advance Booking|On-Spot/),
  });
  await page.goto(BASE + "/nope", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/404.png` });
  log("homusStatus", (await page.goto(BASE + "/homus")).status());
  await page.context().close();
}

// ---------- 8. mobile menu: focus handling
{
  const page = await newPage(375, 812);
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: /open menu/i }).click();
  await page.waitForTimeout(400);
  const seq = [];
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press("Tab");
    seq.push(await page.evaluate(() => {
      const a = document.activeElement;
      const inMenu = !!a?.closest("#mobile-menu");
      return `${inMenu ? "menu" : "OUTSIDE"}:${(a?.textContent || a?.getAttribute("aria-label") || "").trim().slice(0, 14)}`;
    }));
  }
  log("mobileMenuFocus", seq);
  await page.context().close();
}

await browser.close();
console.log(JSON.stringify(out, null, 1));
