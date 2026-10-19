import type { Page } from "playwright-core";
import type { StatusExpectation, Target } from "./schema.js";
import type { FocusStop, KeyboardPage } from "./runner.js";
import type { AxSnapshot, StatusObservation } from "./oracle.js";
import type { ErrorEvidence } from "./model.js";
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
  async observeError(target: Target): Promise<ErrorEvidence> {
    const locator = this.page.getByRole(target.role as never, {
      name: target.name,
      exact: false,
    });
    if ((await locator.count()) === 0)
      return {
        field: { exists: false, focused: false, describedBy: [] },
        descriptions: [],
        errors: [],
        liveRegions: [],
      };
    return locator.first().evaluate((element) => {
      const text = (node: Element | null) => node?.textContent?.trim() ?? "";
      const ids = (element.getAttribute("aria-describedby") ?? "")
        .split(/\s+/)
        .filter(Boolean);
      const described = ids
        .map((id) => document.getElementById(id))
        .filter(Boolean);
      const errorId = element.getAttribute("aria-errormessage");
      const errorNode = errorId ? document.getElementById(errorId) : null;
      const errors = Array.from(
        document.querySelectorAll('[role="alert"], [aria-live="assertive"]'),
      )
        .map(text)
        .filter(Boolean);
      const liveRegions = Array.from(
        document.querySelectorAll("[aria-live], [role=alert], [role=status]"),
      )
        .map((node) => ({
          role: node.getAttribute("role") ?? undefined,
          ariaLive: node.getAttribute("aria-live") ?? undefined,
          text: text(node),
        }))
        .filter((region) => region.text.length > 0);
      return {
        field: {
          exists: true,
          focused: element === document.activeElement,
          ariaInvalid: element.getAttribute("aria-invalid") === "true",
          describedBy: ids,
          errorMessage: text(errorNode) || undefined,
          validationMessage:
            element instanceof HTMLInputElement ||
            element instanceof HTMLSelectElement ||
            element instanceof HTMLTextAreaElement
              ? element.validationMessage || undefined
              : undefined,
        },
        descriptions: described.map(text).filter(Boolean),
        errors,
        liveRegions,
      };
    });
  }
  async observeStatus(
    expectation: StatusExpectation,
  ): Promise<StatusObservation | null> {
    return this.page.evaluate((expected) => {
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[role="status"], [role="alert"], [role="log"], [aria-live], [tabindex], input, textarea, button',
        ),
      );
      const matching = candidates.find((element) => {
        const text = (element.innerText || element.textContent || "").trim();
        const role = element.getAttribute("role") || undefined;
        return (
          (!expected.role || role === expected.role) &&
          (!expected.text || text === expected.text) &&
          (!expected.containsText || text.includes(expected.containsText))
        );
      });
      if (!matching) return null;
      const role = matching.getAttribute("role") || undefined;
      const live = matching.getAttribute("aria-live") || undefined;
      return {
        exists: true,
        role,
        text: (matching.innerText || matching.textContent || "").trim(),
        live,
        semantic:
          role === "status" ||
          role === "alert" ||
          role === "log" ||
          live !== undefined,
        focused: matching === document.activeElement,
      };
    }, expectation);
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
