import type { Page } from "playwright";
import type { Target } from "../spec/schema.js";
import type { FocusStop, KeyboardPage } from "./keyboard-navigator.js";

/** Observation-only Playwright bridge; all journey actions still use page.keyboard. */
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
  async observeTarget(
    target: Target,
  ): Promise<{ exists: boolean; focused: boolean; label: string }> {
    return this.page
      .getByRole(target.role as never, { name: target.name, exact: true })
      .evaluate((element) => ({
        exists: true,
        focused: element === document.activeElement,
        label:
          element.getAttribute("aria-label") ??
          element.textContent?.trim() ??
          element.tagName.toLowerCase(),
      }))
      .catch(() => ({
        exists: false,
        focused: false,
        label: `${target.role} ${target.name}`,
      }));
  }
  async screenshot(path: string): Promise<void> {
    await this.page.screenshot({ path, fullPage: true });
  }
}
