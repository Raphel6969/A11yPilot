import { describe, expect, it } from "vitest";
import { journeySchema } from "../../packages/core/src/index.js";
describe("journey schema", () => {
  it("accepts a keyboard journey", () => {
    const result = journeySchema.parse({
      version: 1,
      name: "Signup",
      start: "http://localhost/signup",
      steps: [
        { expect: { role: "textbox", name: "Email" } },
        {
          type: {
            target: { role: "textbox", name: "Email" },
            text: "a@b.test",
          },
        },
      ],
    });
    expect(result.options.maxTabStops).toBe(80);
  });
  it("rejects selectors and multiple actions", () => {
    const result = journeySchema.safeParse({
      version: 1,
      name: "Bad",
      start: "http://localhost",
      steps: [
        {
          expect: { role: "button", name: "Go" },
          activate: { role: "button", name: "Go" },
        },
      ],
    });
    expect(result.success).toBe(false);
  });
  it("accepts an executable dialog focus-return expectation", () => {
    const result = journeySchema.parse({
      version: 1,
      name: "Dialog",
      start: "http://localhost",
      steps: [
        {
          expectDialog: {
            opensFrom: { role: "button", name: "Details" },
            closesWith: "Escape",
            focusReturns: true,
          },
        },
      ],
    });
    expect(result.steps[0].expectDialog?.closesWith).toBe("Escape");
  });
  it("accepts an executable field error expectation with optional announcement", () => {
    const result = journeySchema.parse({
      version: 1,
      name: "Validation",
      start: "http://localhost",
      steps: [
        {
          expectError: {
            field: { role: "textbox", name: "Email" },
            announced: true,
          },
        },
      ],
    });
    expect(result.steps[0].expectError?.announced).toBe(true);
  });
  it("accepts text and containsText status compatibility", () => {
    const result = journeySchema.parse({
      version: 1,
      name: "Status",
      start: "http://localhost",
      steps: [
        { expectStatus: { role: "status", containsText: "Saved" } },
        { expectStatus: { text: "Saved" } },
      ],
    });
    expect(result.steps[0].expectStatus?.containsText).toBe("Saved");
  });
});
