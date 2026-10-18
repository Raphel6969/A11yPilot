import { z } from "zod";
export const targetSchema = z
  .object({ role: z.string().min(1), name: z.string().min(1) })
  .strict();
const targetStep = z.object({ target: targetSchema }).strict();
const rawStepSchema = z
  .object({
    goal: z.string().optional(),
    goto: z.string().url().optional(),
    expect: targetSchema.optional(),
    type: targetStep.extend({ text: z.string() }).optional(),
    activate: targetSchema.optional(),
    press: targetStep.extend({ key: z.string().min(1) }).optional(),
    expectError: z
      .object({ field: targetSchema, announced: z.boolean().optional() })
      .strict()
      .optional(),
    expectStatus: z
      .object({ text: z.string().min(1), role: z.string().optional() })
      .strict()
      .optional(),
    snapshot: z.boolean().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const actions = [
      "goto",
      "expect",
      "type",
      "activate",
      "press",
      "expectError",
      "expectStatus",
      "snapshot",
    ] as const;
    if (actions.filter((key) => value[key] !== undefined).length !== 1)
      ctx.addIssue({
        code: "custom",
        message: "A step must contain exactly one action",
      });
  });
export const journeySchema = z
  .object({
    version: z.literal(1),
    name: z.string().min(1),
    start: z.string().url(),
    options: z
      .object({
        maxTabStops: z.number().int().positive().default(80),
        timeoutMs: z.number().int().positive().default(5000),
      })
      .default({}),
    steps: z.array(rawStepSchema).min(1),
  })
  .strict();
export type Target = z.infer<typeof targetSchema>;
export type RawStep = z.infer<typeof rawStepSchema>;
export type Journey = z.infer<typeof journeySchema>;
export type NormalizedStep = { id: string; goal?: string; action: RawStep };
export function normalizeJourney(journey: Journey): {
  journey: Journey;
  steps: NormalizedStep[];
} {
  return {
    journey,
    steps: journey.steps.map((step, index) => ({
      id: `step-${String(index + 1).padStart(3, "0")}`,
      goal: step.goal,
      action: step,
    })),
  };
}
