#!/usr/bin/env node
// Zig-first launcher for lift bench_stats with Homebrew tap bootstrap and Python fallback.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const zigBinary = resolve(here, "bench_stats_zig");
const zigSource = resolve(here, "bench_stats.zig");
const pyFallback = resolve(here, "bench_stats.py");
const tapFormula = process.env.LIFT_BENCH_STATS_FORMULA ?? "tkersey/tap/lift-bench-stats";
const tapBinary = process.env.LIFT_BENCH_STATS_BIN ?? "lift-bench-stats";

function run(cmd, args, options = {}) {
  return spawnSync(cmd, args, { encoding: "utf8", ...options });
}

function commandAvailable(cmd, args = ["--help"]) {
  const res = run(cmd, args);
  return !res.error;
}

function maybeInstallFromBrew() {
  if (process.platform !== "darwin") return false;
  if (!commandAvailable("brew", ["--version"])) return false;
  run("brew", ["install", tapFormula], { stdio: "ignore" });
  return commandAvailable(tapBinary, ["--help"]);
}

function execWithArgs(target, argv) {
  const result = run(target.cmd, [...target.args, ...argv], { stdio: "inherit" });
  if (result.error) {
    process.stderr.write(`Fatal: ${result.error.message}\n`);
    return 1;
  }
  return result.status ?? 1;
}

function main() {
  const argv = process.argv.slice(2);
  if (commandAvailable(tapBinary, ["--help"])) return execWithArgs({ cmd: tapBinary, args: [] }, argv);
  if (maybeInstallFromBrew()) return execWithArgs({ cmd: tapBinary, args: [] }, argv);
  if (existsSync(zigBinary)) return execWithArgs({ cmd: zigBinary, args: [] }, argv);
  if (commandAvailable("zig", ["version"])) return execWithArgs({ cmd: "zig", args: ["run", zigSource, "--"] }, argv);
  if (existsSync(pyFallback)) return execWithArgs({ cmd: "uv", args: ["run", "python", pyFallback] }, argv);
  process.stderr.write("Fatal: no Zig runtime and Python fallback missing.\n");
  return 1;
}

process.exit(main());
