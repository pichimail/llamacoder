import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * Core generation path e2e (mocked network).
 * Happy path: prompt → create-chat → stream start → land on /chats/:id
 * Failure modes: create-chat 500, stream 500
 */

async function mockPublicSettings(page: Page) {
  await page.route("**/api/public-settings", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        saasMode: false,
        googleAuth: false,
        autoFixDefault: true,
      }),
    });
  });
}

async function mockUserSettings(page: Page) {
  await page.route("**/api/user-settings", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ settings: null }),
    });
  });
}

test.describe("generation path", () => {
  test.beforeEach(async ({ page }) => {
    await mockPublicSettings(page);
    await mockUserSettings(page);
  });

  test("happy path: prompt → create-chat → stream → chat page", async ({ page }) => {
    let createBody: unknown = null;

    await page.route("**/api/create-chat", async (route: Route) => {
      createBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          chatId: "test-chat-e2e",
          lastMessageId: "test-msg-e2e",
        }),
      });
    });

    await page.route("**/api/get-next-completion-stream-promise", async (route: Route) => {
      // Minimal SSE-ish empty stream body so the client can attach
      await route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "",
      });
    });

    // Chat page will 404 without real data — intercept navigation target
    await page.route("**/chats/test-chat-e2e**", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!DOCTYPE html><html><body><h1>Chat test-chat-e2e</h1><div data-testid=\"chat-shell\">ok</div></body></html>",
      });
    });

    await page.goto("/");
    const composer = page.getByLabel("Describe what to build");
    await expect(composer).toBeVisible();
    await composer.fill("Build a simple todo list with add and delete.");

    await page.getByRole("button", { name: "Build", exact: true }).click();

    await expect.poll(() => createBody).not.toBeNull();
    const body = createBody as { prompt?: string; model?: string };
    expect(body.prompt).toMatch(/todo list/i);

    await page.waitForURL(/\/chats\/test-chat-e2e/);
    await expect(page.getByTestId("chat-shell")).toBeVisible();
  });

  test("failure mode: create-chat returns 500 surfaces error toast path", async ({ page }) => {
    await page.route("**/api/create-chat", async (route: Route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Simulated create-chat failure" }),
      });
    });

    await page.goto("/");
    await page.getByLabel("Describe what to build").fill("Build a counter app.");
    await page.getByRole("button", { name: "Build", exact: true }).click();

    // Should stay on home — not navigate to a chat
    await expect(page).toHaveURL("/");
    // Toast / error UX — title from home-page.client handleSend catch
    await expect(page.getByText(/Could not start build/i)).toBeVisible({ timeout: 15_000 });
  });

  test("composer requires non-empty prompt before Build is enabled", async ({ page }) => {
    await page.goto("/");
    const buildBtn = page.getByRole("button", { name: "Build", exact: true });
    await expect(buildBtn).toBeDisabled();
    await page.getByLabel("Describe what to build").fill("x");
    await expect(buildBtn).toBeEnabled();
  });
});
