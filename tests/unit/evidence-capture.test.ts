import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runJourney } from "../../packages/core/src/index.js";

describe("journey evidence capture", () => {
  it("writes a screenshot and normalized AX JSON for an actionable step", async () => {
    const evidenceDir = join(process.cwd(), ".tmp-evidence-test");
    const files = new Map<string, string>();
    const fakePage = {
      keyboard: { press: async () => {}, type: async () => {} },
      goto: async () => {},
      evaluate: async (callback: (value?: unknown) => unknown) =>
        callback.toString().includes("focus-visible")
          ? true
          : { selector: "#save", role: "button", name: "Save" },
      getByRole: () => ({
        count: async () => 1,
        first: () => ({
          evaluate: async () => ({
            exists: true,
            focused: true,
            label: "Save",
          }),
        }),
      }),
      screenshot: async ({ path }: { path: string }) => {
        files.set(path, "real screenshot bytes");
        const { writeFile } = await import("node:fs/promises");
        await writeFile(path, "real screenshot bytes");
      },
      ariaSnapshotJSON: async () => ({
        name: "Document",
        role: "WebArea",
        children: [{ name: "Save", role: "button", ignored: false }],
      }),
    };
    const loaded = {
      journey: {
        version: 1 as const,
        name: "save",
        start: "https://example.test",
        options: { maxTabStops: 1, timeoutMs: 1000 },
        steps: [{ expect: { role: "button", name: "Save" } }],
      },
      steps: [
        {
          id: "step-001",
          action: { expect: { role: "button", name: "Save" } },
        },
      ],
    };

    try {
      const result = await runJourney(fakePage as never, loaded, {
        evidenceDir,
      });
      const screenshotPath = join(evidenceDir, "001-step-001.png");
      const snapshotPath = join(evidenceDir, "001-step-001.ax.json");
      expect(files.has(screenshotPath)).toBe(true);
      expect(await readFile(screenshotPath, "utf8")).toContain(
        "screenshot bytes",
      );
      expect(JSON.parse(await readFile(snapshotPath, "utf8"))).toEqual({
        role: "WebArea",
        name: "Document",
        children: [{ role: "button", name: "Save", state: { ignored: false } }],
      });
      expect(result.findings[0]?.evidence.screenshot).toBe(screenshotPath);
      expect(result.findings[0]?.evidence.accessibilitySnapshot).toBe(
        snapshotPath,
      );
    } finally {
      await rm(evidenceDir, { recursive: true, force: true });
    }
  });
});
