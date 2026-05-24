import { expect, test } from "@playwright/test";

const sampleReadings = [
  {
    readingId: 1,
    sensorId: 101,
    timestamp: "2026-05-24T10:00:00Z",
    temperature: 22.4,
    humidity: 45.2,
    co2Level: 650,
    tvoc: 120,
    eco2: 700,
    aqi: 1,
    classification: "Normal",
  },
];

const devices = [
  {
    sensorId: 101,
    status: "active",
    readingCount: 12,
    firstTimestamp: "2026-05-24T09:00:00Z",
    latestTimestamp: new Date().toISOString(),
  },
];

async function mockApi(page, { readingsOk = true } = {}) {
  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        token: "blackbox-token",
        user: {
          id: 1,
          username: "tester",
          role: "admin",
          assignedSensorId: null,
        },
      }),
    });
  });

  await page.route("**/api/readings/devices", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(devices),
    });
  });

  await page.route("**/api/readings?**", async (route) => {
    if (!readingsOk) {
      await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(sampleReadings),
    });
  });

  await page.route("**/api/readings/stream?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: "",
    });
  });
}

async function signIn(page) {
  await page.goto("/");
  await page.getByLabel("Username").fill("tester");
  await page.getByLabel("Password").fill("secret");
  await page.getByRole("button", { name: "Sign in" }).click();
}

test.describe("frontend black-box flow", () => {
  test("renders dashboard data after sign in", async ({ page }) => {
    await mockApi(page);

    await signIn(page);

    await expect(page.getByRole("heading", { name: "Home Overview" })).toBeVisible();
    await expect(page.getByText("Normal").first()).toBeVisible();
    await expect(page.getByText("650").first()).toBeVisible();
  });

  test("shows offline screen when readings API fails", async ({ page }) => {
    await mockApi(page, { readingsOk: false });

    await signIn(page);

    await expect(page.getByRole("heading", { name: "Dashboard offline" })).toBeVisible();
    await expect(page.getByText("Backend API not reachable.")).toBeVisible();
  });

  test("keeps main dashboard usable on responsive viewports", async ({ page }) => {
    await mockApi(page);

    await signIn(page);

    await expect(page.getByRole("heading", { name: "Home Overview" })).toBeVisible();
    await expect(page.getByRole("navigation")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
});
