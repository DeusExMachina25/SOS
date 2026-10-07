import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3113";
const out = {};
const browser = await chromium.launch();
const mk = async (w = 1440, h = 900) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, (r) => r.abort());
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  return page;
};

// 1. back button with scroll restoration (scroll up a touch so the nav is visible)
{
  const page = await mk();
  await page.goto(BASE + "/us", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.scrollTo(0, 5000));
  await page.waitForTimeout(600);
  await page.mouse.wheel(0, -80);
  await page.waitForTimeout(900);
  const y0 = await page.evaluate(() => Math.round(scrollY));
  await page.evaluate(() => document.querySelector('nav a[href="/platter"]').click());
  await page.waitForURL("**/platter");
  await page.waitForTimeout(1500);
  const y1 = await page.evaluate(() => Math.round(scrollY));
  await page.goBack();
  await page.waitForTimeout(2500);
  out.backButton = {
    scrolledTo: y0,
    arrivedAtPlatterScrollY: y1,
    afterBack: { url: page.url().replace(BASE, ""), scrollY: await page.evaluate(() => Math.round(scrollY)) },
  };
  await page.context().close();
}

// 2. platter: pie -> field -> expert card -> profile switch -> Secure Slot handoff
{
  const page = await mk();
  await page.goto(BASE + "/platter", { waitUntil: "load" });
  await page.waitForTimeout(3000);
  const steps = [];
  const pie = page.locator('svg[aria-label="Field selector"]');
  await pie.scrollIntoViewIfNeeded();
  const slices = pie.locator(".fp-slice");
  steps.push(`slices=${await slices.count()}`);
  await slices.nth(1).click({ force: true });
  await page.waitForTimeout(700);
  const header = await page.locator("text=/experts? available/").first().innerText().catch(() => "(none)");
  steps.push(`open slice 2 -> ${header}`);
  const card = page.locator("button.fp-card").first();
  steps.push(`cards=${await page.locator("button.fp-card").count()}`);
  await card.click();
  await page.waitForTimeout(900);
  const profileName = await page.locator("h3").filter({ hasText: /[A-Z][a-z]+ [A-Z][a-z]+/ }).first().innerText();
  steps.push(`profile now shows: ${profileName}`);
  // does the profile card scroll into view, or does the user have to hunt for it?
  const vis = await page.evaluate(() => {
    const h = [...document.querySelectorAll("h3")].find((e) => /Sudhamshu|Yasasvi|Shravani/.test(e.textContent));
    const r = h.getBoundingClientRect();
    return { top: Math.round(r.top), inViewport: r.top >= 0 && r.bottom <= innerHeight };
  });
  steps.push(`profile heading in viewport after selecting: ${JSON.stringify(vis)}`);
  await page.getByText(/secure slot/i).first().scrollIntoViewIfNeeded();
  await page.getByText(/secure slot/i).first().click();
  await page.waitForURL("**/login*", { timeout: 5000 }).catch(() => {});
  steps.push(`secure slot -> ${page.url().replace(BASE, "")}; stored expert id: ${await page.evaluate(() => localStorage.getItem("platter_selected_expert") ? "yes" : "no")}`);
  out.platterFlow = steps;
  await page.context().close();
}

// 3. accessibility basics on every public page
{
  const page = await mk();
  const res = {};
  for (const p of ["/", "/us", "/platter", "/login", "/privacy"]) {
    await page.goto(BASE + p, { waitUntil: "load" });
    await page.waitForTimeout(2200);
    res[p] = await page.evaluate(() => {
      const name = (e) => (e.getAttribute("aria-label") || e.textContent || e.getAttribute("title") || "").trim();
      return {
        h1: document.querySelectorAll("h1").length,
        unnamedButtons: [...document.querySelectorAll("button,a")].filter((e) => !name(e)).length,
        inputsWithoutLabel: [...document.querySelectorAll("input:not([type=hidden]),textarea,select")].filter((i) => !i.labels?.length && !i.getAttribute("aria-label") && i.type !== "checkbox").length,
        imgNoAlt: [...document.images].filter((i) => !i.hasAttribute("alt")).length,
        skipLink: !!document.querySelector('a[href="#main"],a[href="#content"]'),
        mainLandmark: !!document.querySelector("main"),
        reducedMotionHandled: matchMedia("(prefers-reduced-motion: reduce)").media !== "not all",
      };
    });
  }
  out.a11y = res;
  // reduced-motion rehearsal: does the home page still work?
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const rp = await ctx.newPage();
  await rp.route(/supabase\.co/, (r) => r.abort());
  await rp.goto(BASE + "/", { waitUntil: "load" });
  await rp.waitForTimeout(2500);
  out.reducedMotion = await rp.evaluate(() => ({ preloaderVisible: !!document.querySelector(".sos-preloader") && getComputedStyle(document.querySelector(".sos-preloader")).display !== "none", pageHeightVh: Math.round(document.documentElement.scrollHeight / innerHeight) }));
  await ctx.close();
  await page.context().close();
}

await browser.close();
console.log(JSON.stringify(out, null, 1));
