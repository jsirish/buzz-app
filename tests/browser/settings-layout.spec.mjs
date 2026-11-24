import {
  openSettings,
  selectSettingsSection,
  settingsDialog,
} from "./navigation.mjs";
import { test, expect } from "./fixture.mjs";
import { npubEncode } from "nostr-tools/nip19";

test.use({ historyCounts: { alpha: 0, beta: 0 } });

// Real text selection and keyboard focus need a browser. Settings appearance,
// emoji actions and hosted setup states have no separate browser sweep here.
test("a failed identity copy leaves the full ID selectable and preserves keyboard focus", async ({
  page,
  app,
}) => {
  await page.goto(app.origin);
  await openSettings(page);
  await expect(settingsDialog(page).locator(":focus")).toHaveCount(1);
  await selectSettingsSection(page, "Identity");
  // Copy failure must leave the entire value selectable as ordinary text.
  const identity = page.getByRole("region", {
    name: "Identity",
    exact: true,
  });
  const copyId = identity.getByRole("button", {
    name: "Copy Buzz ID",
    exact: true,
  });
  await expect(copyId).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Clipboard unavailable");
        },
      },
    });
  });
  await copyId.click();
  await expect(page.getByText(/Select it and copy manually/)).toBeVisible();
  // The card abbreviates the ID; clipboard failure exposes the full value below it.
  const publicKey = identity.getByText(/^Full Buzz ID:/).locator("code");
  const key = npubEncode(app.viewer);
  await expect(publicKey).toHaveText(key);
  await publicKey.click();
  await expect
    .poll(() => page.evaluate(() => window.getSelection()?.toString()))
    .toBe(key);
  await copyId.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(
    identity.getByRole("button", { name: "More options", exact: true }),
  ).toBeFocused();
  await page.getByRole("dialog", { name: "Identity wasn’t copied" }).hover();
  await page
    .getByRole("dialog", { name: "Identity wasn’t copied" })
    .getByRole("button", { name: "Dismiss notification" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Identity wasn’t copied" }),
  ).toHaveCount(0);
});

test("accent controls remain keyboard reachable in narrow Settings at 200%", async ({
  page,
  app,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(app.origin);
  await openSettings(page);
  await selectSettingsSection(page, "Appearance");
  for (let step = 0; step < 10; step++) {
    await page.getByRole("button", { name: "Increase interface size" }).click();
  }
  await expect(page.getByRole("status", { name: "Interface size" })).toHaveText(
    "200%",
  );
  const swatches = page
    .getByRole("region", { name: "Appearance", exact: true })
    .getByRole("button", { name: / accent color$/ });
  await expect(swatches.first()).toBeVisible();
  for (const swatch of await swatches.all()) {
    await swatch.focus();
    await expect(swatch).toBeFocused();
    await expect(swatch).toBeInViewport({ ratio: 1 });
  }
});
