import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const variants = ["broken", "fixed"];
const journeys = [
  ["modal-focus-return.yml", "focus-return"],
  ["keyboard-trap.yml", "no-keyboard-trap"],
];

const server = createServer(async (request, response) => {
  const variant = request.url?.startsWith("/fixed") ? "fixed" : "broken";
  const html = await readFile(
    path.join(root, "examples", "demo-site", variant, "index.html"),
    "utf8",
  );
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(html);
});

function run(journeyPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["packages/cli/dist/cli.js", "run", journeyPath, "--format", "json"],
      { cwd: root, stdio: ["ignore", "pipe", "inherit"] },
    );
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.once("error", reject);
    child.once("close", (code) => {
      try {
        resolve({ code: code ?? 1, result: JSON.parse(output) });
      } catch (error) {
        reject(new Error(`Invalid CLI output: ${error.message}\n${output}`));
      }
    });
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await new Promise((resolve, reject) =>
  server.listen(0, "127.0.0.1", (error) => (error ? reject(error) : resolve())),
);
const address = server.address();
if (!address || typeof address === "string")
  throw new Error("Could not determine demo server port");
const port = address.port;
try {
  for (const variant of variants) {
    for (const [filename, oracle] of journeys) {
      const source = await readFile(
        path.join(root, "examples", "journeys", filename),
        "utf8",
      );
      const journeyPath = path.join(root, `.demo-${variant}-${filename}`);
      await writeFile(
        journeyPath,
        source.replace(
          "http://127.0.0.1:4174/",
          `http://127.0.0.1:${port}/${variant}/`,
        ),
      );
      try {
        const { code, result } = await run(journeyPath);
        const finding = result.findings.find(
          (entry) => entry.oracle === oracle,
        );
        const expectedStatus = variant === "broken" ? "fail" : "pass";
        assert(
          finding?.status === expectedStatus,
          `${variant} ${filename}: expected ${oracle} ${expectedStatus}`,
        );
        assert(
          variant === "broken" ? code === 1 : code === 0,
          `${variant} ${filename}: unexpected CLI exit code ${code}`,
        );
        console.log(`PASS ${variant}/${filename}: ${finding.status}`);
      } finally {
        await rm(journeyPath, { force: true });
      }
    }
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}
