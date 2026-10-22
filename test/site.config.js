const path = require("node:path");
const { defineConfig, devices } = require("@playwright/test");

const siteDir = path.resolve(process.env.SITE_DIR || "_site");

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: "site.spec.js",
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {},
  },
  webServer: {
    command: "python3 -m http.server 4173 --bind 127.0.0.1",
    cwd: siteDir,
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1366, height: 1000 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], browserName: "chromium" } },
  ],
});
