import { describe, expect, it } from "vitest";
import { runJourney, type Oracle } from "../../packages/core/src/index.js";

describe("expectError execution", () => {
  it("reaches the field, submits with Enter, and passes bridge evidence to oracles", async () => {
    const pressed: string[] = [];
    const observed: string[] = [];
    const fakePage = {
      keyboard: {
        press: async (key: string) => pressed.push(key),
        type: async () => {},
      },
      goto: async () => {},
      evaluate: async (callback: () => unknown) =>
        callback.toString().includes("focus-visible")
          ? true
          : { selector: "#email" },
      getByRole: () => ({
        count: async () => 1,
        first: () => ({
          evaluate: async (callback: () => unknown) => {
            if (callback.toString().includes("ariaInvalid")) {
              observed.push("error");
              return {
                field: {
                  exists: true,
                  focused: true,
                  ariaInvalid: true,
                  describedBy: ["email-error"],
                },
                descriptions: ["Email is required"],
                errors: ["Email is required"],
                liveRegions: [],
              };
            }
            return { exists: true, focused: true, label: "Email" };
          },
        }),
      }),
    };
    let afterCaptured = false;
    const oracle: Oracle = {
      id: "test-error-context",
      evaluate: (context) => {
        afterCaptured = context.errorAfter?.errors[0] === "Email is required";
        return undefined;
      },
    };
    const result = await runJourney(
      fakePage as never,
      {
        journey: {
          version: 1,
          name: "required email",
          start: "https://example.test",
          options: { maxTabStops: 2, timeoutMs: 1000 },
          steps: [
            { expectError: { field: { role: "textbox", name: "Email" } } },
          ],
        },
        steps: [
          {
            id: "step-001",
            action: {
              expectError: { field: { role: "textbox", name: "Email" } },
            },
          },
        ],
      },
      { oracles: [oracle] },
    );
    expect(pressed).toEqual(["Tab", "Enter"]);
    expect(observed).toEqual(["error", "error"]);
    expect(afterCaptured).toBe(true);
    expect(result.traces[0]?.action).toBe("expectError");
  });
});
