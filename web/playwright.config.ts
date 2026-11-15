import { defineConfig, devices } from "@playwright/test"

const deployedUrl = process.env.PLAYWRIGHT_BASE_URL

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  use: { baseURL: deployedUrl || "http://127.0.0.1:3000", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: deployedUrl ? undefined : {
    command: "npm run start -- --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
