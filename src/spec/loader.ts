import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { journeySchema, normalizeJourney, type Journey } from "./schema.js";
export class JourneyLoadError extends Error {
  constructor(public readonly diagnostics: string[]) {
    super(`Invalid journey:\n${diagnostics.join("\n")}`);
  }
}
export async function loadJourney(path: string): Promise<{
  journey: Journey;
  steps: ReturnType<typeof normalizeJourney>["steps"];
}> {
  let source: string;
  try {
    source = await readFile(path, "utf8");
  } catch (error) {
    throw new JourneyLoadError([`file: ${(error as Error).message}`]);
  }
  let parsed: unknown;
  try {
    parsed = parse(source);
  } catch (error) {
    throw new JourneyLoadError([`document: ${(error as Error).message}`]);
  }
  const result = journeySchema.safeParse(parsed);
  if (!result.success)
    throw new JourneyLoadError(
      result.error.issues.map(
        (issue) =>
          `${issue.path.length ? issue.path.join(".") : "journey"}: ${issue.message}`,
      ),
    );
  return normalizeJourney(result.data);
}
