import type { Page } from "playwright-core";
import type { Target } from "./schema.js";
import type { FocusStop, KeyboardPage } from "./runner.js";
import type { AxSnapshot } from "./oracle.js";
export class PlaywrightKeyboardPage implements KeyboardPage {
  constructor(private readonly page: Page) {}
  keyboard = {
    press: (key: string) => this.page.keyboard.press(key),
    type: (text: string) => this.page.keyboard.type(text),
  };
  async goto(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: "domcontentloaded" });
  }
  async activeFocus(): Promise<FocusStop | null> {
    return this.page.evaluate(() => {
      const element = document.activeElement;
      if (!(element instanceof HTMLElement)) return null;
      return {
        selector: element.id ? `#${element.id}` : element.tagName.toLowerCase(),
        role: element.getAttribute("role") ?? undefined,
        name:
          element.getAttribute("aria-label") ??
          element.textContent?.trim() ??
          undefined,
      };
    });
  }
  async focusVisible(): Promise<boolean | null> {
    return this.page.evaluate(() => {
      const element = document.activeElement;
      if (!(element instanceof HTMLElement)) return null;
      return element.matches(":focus-visible");
    });
  }
  async observeTarget(
    target: Target,
  ): Promise<{ exists: boolean; focused: boolean; label: string }> {
    const locator = this.page.getByRole(target.role as never, {
      name: target.name,
      exact: false,
    });
    if ((await locator.count()) === 0)
      return {
        exists: false,
        focused: false,
        label: `${target.role} ${target.name}`,
      };
    return locator.first().evaluate((element) => ({
      exists: true,
      focused: element === document.activeElement,
      label:
        element.getAttribute("aria-label") ??
        element.textContent?.trim() ??
        element.tagName.toLowerCase(),
    }));
  }
  async screenshot(path: string): Promise<void> {
    await this.page.screenshot({ path, fullPage: true });
  }
  async accessibilitySnapshot(): Promise<AxSnapshot | null> {
    const page = this.page as Page & {
      ariaSnapshotJSON?: () => Promise<unknown>;
      accessibility?: {
        snapshot: (options?: { interestingOnly?: boolean }) => Promise<unknown>;
      };
    };
    const raw = page.ariaSnapshotJSON
      ? await page.ariaSnapshotJSON()
      : page.accessibility
        ? await page.accessibility.snapshot({ interestingOnly: false })
        : null;
    return normalizeAxSnapshot(raw);
  }
}

function normalizeAxSnapshot(value: unknown): AxSnapshot | null {
  if (value === null || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const children = Array.isArray(source.children)
    ? source.children
        .map(normalizeAxSnapshot)
        .filter((child): child is AxSnapshot => child !== null)
    : undefined;
  const stateEntries = Object.entries(source)
    .filter(
      ([key, entry]) =>
        key !== "role" &&
        key !== "name" &&
        key !== "children" &&
        entry !== undefined,
    )
    .sort(([left], [right]) => left.localeCompare(right));
  const snapshot: AxSnapshot = {};
  if (typeof source.role === "string") snapshot.role = source.role;
  if (typeof source.name === "string" && source.name.length > 0)
    snapshot.name = source.name;
  if (stateEntries.length > 0)
    snapshot.state = Object.fromEntries(stateEntries) as AxSnapshot["state"];
  if (children !== undefined) snapshot.children = children;
  return snapshot;
}
