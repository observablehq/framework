import {mkdir, unlink, writeFile} from "node:fs/promises";
import {join} from "node:path";
import {expect, test} from "@playwright/test";
import {testDir} from "../playwright.config.js";

// ensure config file is created after testing for the no config case first
test.describe.configure({mode: "serial"});

test.describe("without config", () => {
  test("sidebar", async ({page}) => {
    await page.goto("/");
    await page.getByText("Home");
    await page.locator("#observablehq-sidebar-toggle").click();
    const sidebar = await page.locator("nav#observablehq-sidebar");
    expect(await sidebar.isVisible()).toBe(true);
    const activeLinks = await page.locator(".observablehq-link-active").all();
    expect(activeLinks.length).toBe(2); // highlights the home and index pages
  });

  test("page navigation", async ({page}) => {
    await page.goto("/");
    // sidebar navigation
    await Promise.all([page.waitForURL("/code/code"), page.getByRole("link", {name: "Code", exact: true}).click()]);
    await page.goBack();
    // prev/next navigation
    await Promise.all([page.waitForURL("/code/code"), page.getByRole("link", {name: "Next page Code"}).click()]);
  });
});

test.describe("with config", () => {
  const configDir = join(testDir, "dashboard/.observablehq");
  const title = "With Config";

  test.beforeAll(async () => {
    const config = {
      title,
      pages: [{path: "/code/code", name: "Code"}]
    };
    await mkdir(configDir, {recursive: true});
    await writeFile(join(configDir, "config.ts"), `export default ${JSON.stringify(config)}`, "utf8");
  });

  test.afterAll(async () => await unlink(join(configDir, "config.ts")));

  test("sidebar", async ({page}) => {
    await page.goto("/");
    await page.locator("#observablehq-sidebar-toggle").click();
    const sidebar = await page.locator("nav#observablehq-sidebar");
    expect(await sidebar.isVisible()).toBe(true);
    expect(await page.getByText(title)).toBeVisible();
    const activeLinks = await page.locator(".observablehq-link-active").all();
    expect(activeLinks.length).toBe(1);
  });
});
