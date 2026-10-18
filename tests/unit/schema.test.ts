import { describe, expect, it } from "vitest";
import { journeySchema } from "../../src/spec/schema.js";
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
});
