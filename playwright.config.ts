import { defineConfig, devices } from "@playwright/test";
const production = process.env.CLUSTERLAB_PRODUCTION === "1";
const url = `http://127.0.0.1:${production ? "4173" : "5173"}/ClusterLab/`;
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["json", { outputFile: ".local/e2e-results.json" }],
  ],
  use: {
    baseURL: url,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: production
      ? "npm run preview -- --port 4173"
      : "npm run dev -- --port 5173",
    url,
    reuseExistingServer: true,
  },
});
