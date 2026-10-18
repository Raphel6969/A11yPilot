import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";

async function findFreePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No free port");
  await new Promise((resolve) => server.close(resolve));
  return address.port;
}

const port = await findFreePort();
const baseUrl = `http://127.0.0.1:${port}`;

function start(command, args) {
  return spawn(command, args, { stdio: "inherit", env: process.env });
}

async function waitForServer(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The preview server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

const server = start(process.execPath, [
  "node_modules/vite/bin/vite.js",
  "preview",
  "--outDir",
  "dist-ui",
  "--host",
  "127.0.0.1",
  "--port",
  String(port),
]);

const tempDir = await mkdtemp(path.join(os.tmpdir(), "a11ypilot-e2e-"));
const journeyPath = path.join(tempDir, "journey.yml");
const journey = await readFile("journey.example.yml", "utf8");
await writeFile(
  journeyPath,
  journey.replace("http://127.0.0.1:4173/", `${baseUrl}/`),
);

let exitCode = 1;
try {
  await waitForServer(`${baseUrl}/`);
  const runner = start(process.execPath, [
    "dist/src/cli.js",
    "run",
    journeyPath,
    "--format",
    "json",
  ]);
  exitCode = await new Promise((resolve) =>
    runner.on("close", (code, signal) => {
      if (signal) {
        console.error(`Journey runner stopped by ${signal}`);
        resolve(1);
      } else resolve(code ?? 1);
    }),
  );
} finally {
  server.kill("SIGTERM");
  await new Promise((resolve) => server.once("close", resolve));
  await rm(tempDir, { recursive: true, force: true });
}

process.exitCode = exitCode;
