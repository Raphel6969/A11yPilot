import type { Target } from "../spec/schema.js";
export type FocusStop = { selector: string; role?: string; name?: string };
export interface KeyboardPage {
  keyboard: {
    press(key: string): Promise<void>;
    type(text: string): Promise<void>;
  };
  activeFocus(): Promise<FocusStop | null>;
  observeTarget(
    target: Target,
  ): Promise<{ exists: boolean; focused: boolean; label: string }>;
  goto(url: string): Promise<void>;
  screenshot(path: string): Promise<void>;
}
export class KeyboardNavigator {
  constructor(private readonly page: KeyboardPage) {}
  async reach(
    target: Target,
    maxStops: number,
  ): Promise<{ reached: boolean; stops: FocusStop[] }> {
    const stops: FocusStop[] = [];
    for (let i = 0; i < maxStops; i += 1) {
      await this.page.keyboard.press("Tab");
      const focus = await this.page.activeFocus();
      if (focus) stops.push(focus);
      if ((await this.page.observeTarget(target)).focused)
        return { reached: true, stops };
    }
    return { reached: false, stops };
  }
  async type(text: string): Promise<void> {
    await this.page.keyboard.type(text);
  }
  async press(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }
}
