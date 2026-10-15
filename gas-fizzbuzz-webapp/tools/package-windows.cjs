#!/usr/bin/env node
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const {spawn} = require('node:child_process');
const {pathToFileURL} = require('node:url');
const ELECTRON_VERSION = '44.7.2';
const PACKAGER_VERSION = '20.3.0';
const WINDOWS_SHA256 = '10a89447ef64ac5cb9f782af48ffd83734a40ae91681259d1048ca3c9e6c5da4';
const root = path.resolve(__dirname,'..');
async function digest(file) { return crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex'); }
async function walk(directory) {
  const files = [];
  for (const item of await fs.readdir(directory,{withFileTypes:true})) {
    const full = path.join(directory,item.name);
    if (item.isSymbolicLink()) throw new Error('Symbolic links must not be packaged: ' + full);
    if (item.isDirectory()) files.push(...await walk(full));
    else if (item.isFile()) files.push(full);
  }
  return files.sort();
}
async function importTool(name) { return import(pathToFileURL(require.resolve(name)).href); }
async function runtime(cache) {
  await fs.mkdir(cache,{recursive:true});
  const name = 'electron-v' + ELECTRON_VERSION + '-win32-x64.zip';
  const file = path.join(cache,name);
  const {downloadArtifact} = await importTool('@electron/get');
  let sums = path.join(cache,'SHASUMS256-v' + ELECTRON_VERSION + '.txt');
  try { await fs.access(sums); } catch { sums = await downloadArtifact({isGeneric:true,version:ELECTRON_VERSION,artifactName:'SHASUMS256.txt',cacheRoot:cache}); }
  const match = (await fs.readFile(sums,'utf8')).split(/\r?\n/).find(line => line.trim().endsWith('*' + name) || line.trim().endsWith(' ' + name));
  if (!match) throw new Error('Official Windows runtime checksum is missing');
  const expected = match.trim().split(/\s/)[0];
  if (expected !== WINDOWS_SHA256) throw new Error('Official checksum differs from the pinned runtime version');
  let exists = true;
  try { await fs.access(file); } catch { exists = false; }
  if (!exists) {
    const downloaded = await downloadArtifact({version:ELECTRON_VERSION,artifactName:'electron',platform:'win32',arch:'x64',cacheRoot:cache});
    await fs.copyFile(downloaded,file);
  }
  if (await digest(file) !== expected) throw new Error('Official Windows runtime checksum mismatch');
  return {file,sha256:expected};
}
async function zipFolder(folder,target) {
  const stage = path.dirname(folder),name = path.basename(folder);
  const command = process.platform === 'win32' ? 'powershell.exe' : 'zip';
  const args = process.platform === 'win32'
    ? ['-NoProfile','-NonInteractive','-Command','$ErrorActionPreference="Stop"; Compress-Archive -LiteralPath $env:VALIS_ZIP_SOURCE -DestinationPath $env:VALIS_ZIP_TARGET -CompressionLevel Optimal -Force']
    : ['-q','-r',target,name];
  await new Promise((resolve,reject) => {
    const child = spawn(command,args,{cwd:stage,stdio:'inherit',env:{...process.env,VALIS_ZIP_SOURCE:folder,VALIS_ZIP_TARGET:target}});
    child.on('error',reject);
    child.on('exit',code => code === 0 ? resolve() : reject(new Error('ZIP creation failed: ' + code)));
  });
}
async function validateOutput(folder,source,asar) {
  const exe = await fs.readFile(path.join(folder,'VALIS.exe'));
  const pe = exe.readUInt32LE(0x3c);
  if (exe.subarray(0,2).toString() !== 'MZ' || exe.subarray(pe,pe+4).toString() !== 'PE\0\0' || exe.readUInt16LE(pe+4) !== 0x8664) throw new Error('Not a Windows x64 PE executable');
  const archive = path.join(folder,'resources','app.asar');
  const entries = asar.listPackage(archive).map(item => item.replace(/\\/g,'/'));
  if (!entries.includes('/src/desktop/main.cjs') || !entries.includes('/src/Index.html')) throw new Error('Desktop entry is missing in ASAR');
  if (entries.some(item => !(item === '/package.json' || item === '/src' || item.startsWith('/src/')) || item.includes('/node_modules/'))) throw new Error('Development-only files leaked into ASAR');
  let pngCount = 0;
  for (const file of await walk(path.join(source,'src'))) {
    const nativeMember = path.relative(source,file);
    const rel = nativeMember.split(path.sep).join('/');
    // ASAR's filesystem traverses path.sep; preserve native Windows separators
    // for its API, and use portable '/' only for reports and checksums.
    const packed = asar.extractFile(archive,nativeMember);
    const actual = await fs.readFile(file);
    if (!packed.equals(actual)) throw new Error('ASAR differs from source: ' + rel);
    if (/\.png$/i.test(file)) {
      if (actual.subarray(0,8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Invalid PNG signature: ' + rel);
      pngCount++;
    }
  }
  if (!pngCount) throw new Error('No local PNG images were packaged');
  for (const name of ['LICENSE','LICENSES.chromium.html']) await fs.access(path.join(folder,name));
  return {exe:'VALIS.exe',machine:'x86-64',asarEntries:entries.length,pngCount,sourceBytesMatch:true};
}
async function packageWindows(options = {}) {
  const out = path.resolve(options.out || path.join(root,'dist'));
  const cache = path.resolve(options.cache || process.env.VALIS_ELECTRON_CACHE_DIR || path.join(os.tmpdir(),'valis-electron-cache'));
  const staging = await fs.mkdtemp(path.join(os.tmpdir(),'valis-windows-source-'));
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
    await fs.cp(path.join(root,'src'),path.join(staging,'src'),{recursive:true});
    await fs.writeFile(path.join(staging,'package.json'),JSON.stringify({name:'valis',productName:'VALIS',author:'VALIS project',version:pkg.version || '1.0.0',private:true,main:'src/desktop/main.cjs'},null,2));
    const {packager} = await importTool('@electron/packager');
    const packagerPkg = JSON.parse(await fs.readFile(path.join(path.dirname(require.resolve('@electron/packager')),'..','package.json'),'utf8'));
    if (packagerPkg.version !== PACKAGER_VERSION) throw new Error('Packager version must be ' + PACKAGER_VERSION);
    const binary = await runtime(cache);
    const asar = await importTool('@electron/asar');
    await fs.mkdir(out,{recursive:true});
    const packaged = await packager({dir:staging,out:path.join(out,'staging'),name:'VALIS',executableName:'VALIS',platform:'win32',arch:'x64',electronVersion:ELECTRON_VERSION,electronZipDir:cache,asar:true,prune:true,overwrite:true,appVersion:pkg.version || '1.0.0'});
    const destination = path.join(out,'VALIS-Windows-x64');
    await fs.rm(destination,{recursive:true,force:true});
    await fs.rename(packaged[0],destination);
    const checks = await validateOutput(destination,staging,asar);
    await fs.writeFile(path.join(destination,'README.txt'),'VALIS — Windows 10/11 x64\r\n\r\nZIPをすべて展開し、VALIS.exeをダブルクリックしてください。\r\nexeだけを移動せず、DLL・resources・localesを同じフォルダに保ってください。\r\nNode.js、npm、ブラウザ、GASへの接続は不要です。\r\n図鑑は今回の起動中だけ記録され、アプリを閉じるとリセットされます。過去の図鑑ファイルは読み書きしません。\r\nデスクトップへはVALIS.exeのショートカットを作成できます。\r\n\r\nこの配布物は署名されていません。Windowsの起動表示は環境によって異なります。\r\nLICENSEおよびLICENSES.chromium.htmlを同梱しています。\r\n');
    const sums = [];
    for (const file of await walk(destination)) sums.push(await digest(file) + '  ' + path.relative(destination,file).split(path.sep).join('/'));
    await fs.writeFile(path.join(destination,'SHA256SUMS.txt'),sums.join('\n') + '\n');
    const zip = path.join(out,'VALIS-Windows-x64.zip');
    await fs.rm(zip,{force:true});
    await zipFolder(destination,zip);
    const report = {scope:'Windows x64 package integrity; actual Windows execution is a separate smoke gate',electronVersion:ELECTRON_VERSION,packagerVersion:PACKAGER_VERSION,officialRuntimeSha256:binary.sha256,...checks,zip:path.basename(zip),zipBytes:(await fs.stat(zip)).size,zipSha256:await digest(zip),generatedAt:new Date().toISOString()};
    await fs.writeFile(path.join(out,'windows-package-report.json'),JSON.stringify(report,null,2) + '\n');
    await fs.writeFile(path.join(out,'VALIS-Windows-x64.zip.sha256'),report.zipSha256 + '  ' + path.basename(zip) + '\n');
    console.log(JSON.stringify(report,null,2));
    return report;
  } finally { await fs.rm(staging,{recursive:true,force:true}); }
}
if (require.main === module) {
  const args = process.argv.slice(2),options = {};
  for (let i=0;i<args.length;i++) {
    if (!['--out','--cache'].includes(args[i]) || !args[i+1]) throw new Error('Use --out <directory> or --cache <directory>');
    options[args[i].slice(2)] = args[++i];
  }
  packageWindows(options).catch(err => { console.error(err); process.exitCode = 1; });
}
module.exports = {packageWindows,validateOutput,zipFolder,ELECTRON_VERSION,PACKAGER_VERSION};
