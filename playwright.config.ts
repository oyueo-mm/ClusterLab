import { defineConfig, devices } from "@playwright/test";
const production = process.env.CLUSTERLAB_PRODUCTION === "1";
const externalURL = process.env.CLUSTERLAB_BASE_URL;
const crossBrowser = process.env.CLUSTERLAB_CROSS_BROWSER === "1";
const url =
  externalURL ?? `http://127.0.0.1:${production ? "4173" : "5173"}/ClusterLab/`;
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
    ...(crossBrowser
      ? [
          {
            name: "firefox",
            testMatch: "platform.spec.ts",
            use: { ...devices["Desktop Firefox"] },
          },
          {
            name: "webkit",
            testMatch: "platform.spec.ts",
            use: { ...devices["Desktop Safari"] },
          },
        ]
      : []),
  ],
  webServer: externalURL
    ? undefined
    : {
        command: production
          ? "npm run preview -- --port 4173"
          : "npm run dev -- --port 5173",
        url,
        reuseExistingServer: true,
      },
});
