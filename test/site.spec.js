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

test("CV preserves date precision and contact presentation without publishing the PDF", async ({ page, request }) => {
  await page.goto("/cv/", { waitUntil: "domcontentloaded" });
  const article = page.locator("article");
  const formatDate = (value) => (value ? value.slice(0, 7).replace("-", ".") : "Present");
  const dates = [...resume.work, ...resume.education]
    .filter((entry) => entry.startDate || entry.date)
    .map((entry) => (entry.startDate ? `${formatDate(entry.startDate)} - ${formatDate(entry.endDate)}` : formatDate(entry.date)));
  await expect(article.locator(".date-column .badge")).toHaveText(dates);
  const email = article.getByRole("link", { name: resume.basics.email, exact: true });
  await expect(email).toBeVisible();
  await expect(email).toHaveAttribute("href", `mailto:${resume.basics.email}`);
  await expect(article).not.toContainText(resume.basics.location.address);
  for (const entry of resume.work) {
    await expect(article).toContainText(entry.position);
    await expect(article).toContainText(entry.name);
  }
  for (const entry of resume.education) {
    await expect(article).toContainText(entry.studyType);
    await expect(article).toContainText(entry.institution);
  }
  for (const entry of resume.languages) {
    await expect(article).toContainText(entry.language);
    await expect(article).toContainText(entry.fluency);
  }
  await expect(page.locator('.post-header .fa-file-pdf, a[href$="/assets/pdf/CV.pdf"]')).toHaveCount(0);
  expect((await request.get("/assets/pdf/CV.pdf")).status()).toBe(404);
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
