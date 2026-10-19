"use strict";
const path = require("node:path");
const fs = require("node:fs/promises");
const os = require("node:os");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const root = path.resolve(__dirname, "..");
async function walk(dir) {
  const files = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(p)));
    else files.push(p);
  }
  return files.sort();
}
async function sha(file) {
  return crypto
    .createHash("sha256")
    .update(await fs.readFile(file))
    .digest("hex");
}
async function checksums(folder) {
  const sums = [];
  for (const p of await walk(folder))
    if (path.basename(p) !== "SHA256SUMS.txt")
      sums.push(
        (await sha(p)) +
          "  " +
          path.relative(folder, p).split(path.sep).join("/"),
      );
  await fs.writeFile(
    path.join(folder, "SHA256SUMS.txt"),
    sums.join("\n") + "\n",
  );
  return sums;
}
function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(Error(command + " exit " + code)),
    );
  });
}
async function packageWindows() {
  const { packager } = await import(
    pathToFileURL(require.resolve("@electron/packager")).href
  );
  const stage = await fs.mkdtemp(path.join(os.tmpdir(), "lifegame-package-"));
  try {
    await fs.cp(path.join(root, "src"), path.join(stage, "src"), {
      recursive: true,
    });
    const pkg = JSON.parse(
      await fs.readFile(path.join(root, "package.json"), "utf8"),
    );
    await fs.writeFile(
      path.join(stage, "package.json"),
      JSON.stringify(
        {
          name: pkg.name,
          productName: pkg.productName,
          version: pkg.version,
          main: pkg.main,
          author: "VALIS project",
          private: true,
        },
        null,
        2,
      ),
    );
    const out = path.join(root, "dist");
    await fs.mkdir(out, { recursive: true });
    const [folder] = await packager({
      ...(process.env.LIFEGAME_ELECTRON_ZIP_DIR
        ? { electronZipDir: process.env.LIFEGAME_ELECTRON_ZIP_DIR }
        : {}),
      dir: stage,
      out,
      name: "LifeGame",
      executableName: "LifeGame",
      platform: "win32",
      arch: "x64",
      electronVersion: pkg.devDependencies.electron,
      asar: true,
      prune: true,
      overwrite: true,
    });
    const destination = path.join(out, "LifeGame-Windows-x64");
    // Only this tool's generated output directory is replaceable.
    await fs.rm(destination, { recursive: true, force: true });
    await fs.rename(folder, destination);
    const exe = await fs.readFile(path.join(destination, "LifeGame.exe")),
      offset = exe.readUInt32LE(0x3c);
    if (
      exe.toString("ascii", 0, 2) !== "MZ" ||
      exe.toString("ascii", offset, offset + 4) !== "PE\0\0" ||
      exe.readUInt16LE(offset + 4) !== 0x8664
    )
      throw Error("Invalid Windows x64 executable");
    await fs.writeFile(
      path.join(destination, "README.txt"),
      "LifeGame — Windows 10/11 x64\r\nZIPをすべて展開し LifeGame.exe を起動してください。\r\nDLL・resources・localesを同じフォルダに保ってください。\r\n利用時にNode.js・GAS・ネット接続は不要です。\r\n図鑑へ明示保存した結果は次回の起動後も参照できます。進行中の状態は自動保存されません。全期間のCSV・JSONも書き出せます。\r\n",
    );
    await checksums(destination);
    const zip = path.join(out, "LifeGame-Windows-x64.zip");
    await fs.rm(zip, { force: true });
    if (process.platform === "win32")
      await run(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          '$ErrorActionPreference="Stop"; Compress-Archive -LiteralPath $env:LIFEGAME_ZIP_SOURCE -DestinationPath $env:LIFEGAME_ZIP_TARGET -Force',
        ],
        {
          env: {
            ...process.env,
            LIFEGAME_ZIP_SOURCE: destination,
            LIFEGAME_ZIP_TARGET: zip,
          },
        },
      );
    else
      await run("zip", ["-q", "-r", zip, path.basename(destination)], {
        cwd: out,
      });
    const report = {
      version: pkg.version,
      electron: pkg.devDependencies.electron,
      exe: "LifeGame.exe",
      platform: "win32",
      arch: "x64",
      zip: path.basename(zip),
      sha256: await sha(zip),
      bytes: (await fs.stat(zip)).size,
    };
    await fs.writeFile(
      path.join(out, "package-report.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    await fs.writeFile(
      zip + ".sha256",
      report.sha256 + "  " + path.basename(zip) + "\n",
    );
    console.log(JSON.stringify(report));
  } finally {
    await fs.rm(stage, { recursive: true, force: true });
  }
}
if (require.main === module)
  packageWindows().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
module.exports = { walk, sha, checksums };
