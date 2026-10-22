const { test, expect } = require("@playwright/test");

const routes = ["/", "/publications/", "/talks/", "/teaching/", "/repositories/", "/cv/"];
const resume = require("../assets/json/resume.json");

test("main pages render with preserved navigation, blue styling and no missing local assets", async ({ page, isMobile }, testInfo) => {
  const missingAssets = [];
  const scriptErrors = [];
  page.on("response", (response) => {
    if (response.url().startsWith("http://127.0.0.1:4173/") && response.status() >= 400) {
      missingAssets.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on("pageerror", (error) => scriptErrors.push(error.message));

  for (const route of routes) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response.status()).toBe(200);
    await expect(page.locator("article")).toBeVisible();
    expect(await page.locator("#navbar a.nav-link").evaluateAll((links) => links.map((link) => link.getAttribute("href")))).toEqual(routes);
    expect(await page.locator("html").evaluate((element) => getComputedStyle(element).getPropertyValue("--global-theme-color").trim())).toBe(
      "#0076df"
    );
    await expect(page.locator("#light-toggle")).toHaveCount(0);
    if (!isMobile) await expect(page.locator('#navbar a[href="/talks/"]')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `Horizontal overflow at ${route}`).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`${route.replaceAll("/", "_") || "home"}.png`), fullPage: true });
  }
  expect(missingAssets).toEqual([]);
  expect(scriptErrors).toEqual([]);
});

test("CV preserves month-precision dates, clickable email and hidden postal address", async ({ page }) => {
  await page.goto("/cv/", { waitUntil: "domcontentloaded" });
  const article = page.locator("article");
  const formatDate = (value) => (value ? value.slice(0, 7).replace("-", ".") : "Present");
  const dates = [...resume.work, ...resume.education].map((entry) => `${formatDate(entry.startDate)} - ${formatDate(entry.endDate)}`);
  await expect(article.locator(".date-column .badge")).toHaveText(dates);
  const email = article.getByRole("link", { name: resume.basics.email, exact: true });
  await expect(email).toBeVisible();
  await expect(email).toHaveAttribute("href", `mailto:${resume.basics.email}`);
  await expect(article).not.toContainText(resume.basics.location.address);
});

test("profile image loads and mobile navigation works", async ({ page, isMobile }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const image = page.locator(".profile img");
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0)).toBe(true);
  if (isMobile) {
    const toggle = page.getByRole("button", { name: "Toggle navigation" });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  }
  await Promise.all([
    page.waitForURL("**/talks/", { waitUntil: "domcontentloaded" }),
    page.locator('#navbar a[href="/talks/"]').click({ noWaitAfter: true }),
  ]);
  await expect(page.getByRole("heading", { name: "talks", exact: true })).toBeVisible();
  await expect(page.getByText("Bayesian Estimates for Theory Uncertainties", { exact: false })).toBeVisible();
});
