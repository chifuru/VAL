"use strict";
const fs = require("node:fs/promises"),
  path = require("node:path"),
  os = require("node:os"),
  { spawn } = require("node:child_process");
async function main() {
  const exeIndex = process.argv.indexOf("--exe");
  const command =
    exeIndex >= 0
      ? path.resolve(process.argv[exeIndex + 1])
      : require("electron");
  const report = path.resolve(
    process.env.LIFEGAME_SMOKE_REPORT || "artifacts/desktop-smoke.json",
  );
  await fs.mkdir(path.dirname(report), { recursive: true });
  const args = exeIndex >= 0 ? ["--smoke-test"] : [".", "--smoke-test"];
  if (process.platform === "linux") args.push("--no-sandbox");
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "lifegame-smoke-"));
  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: path.resolve(__dirname, ".."),
        env: { ...process.env, LIFEGAME_SMOKE_REPORT: report },
        stdio: "inherit",
      });
      const timer = setTimeout(() => {
        child.kill();
        reject(Error("Desktop smoke timed out"));
      }, 45000);
      child.on("error", (e) => {
        clearTimeout(timer);
        reject(e);
      });
      child.on("exit", (code) => {
        clearTimeout(timer);
        code === 0 ? resolve() : reject(Error("Desktop exit " + code));
      });
    });
    const data = JSON.parse(await fs.readFile(report, "utf8"));
    if (
      !data.ok ||
      !data.workerPlayback ||
      data.turn < 1 ||
      data.nodeExposed ||
      !data.local ||
      !data.assetsLoaded ||
      data.assetErrors.length
    )
      throw Error("Invalid native report");
    console.log(JSON.stringify(data));
    return result;
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
