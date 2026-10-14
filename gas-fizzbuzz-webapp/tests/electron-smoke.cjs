#!/usr/bin/env node
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const root = path.resolve(__dirname,'..');
async function nativeSmoke(options = {}) {
  const out = path.resolve(options.out || process.env.VALIS_ELECTRON_EVIDENCE || path.join(root,'artifacts','desktop-electron'));
  await fs.mkdir(out,{recursive:true});
  const userData = await fs.mkdtemp(path.join(os.tmpdir(),'valis-native-smoke-'));
  const packaged = options.exe || process.env.VALIS_PACKAGED_EXE;
  const command = packaged || process.env.VALIS_ELECTRON_LAUNCHER || process.env.VALIS_ELECTRON_BINARY || require('electron');
  const args = packaged ? ['--smoke-test'] : [root,'--smoke-test'];
  const rounds = [];
  async function run(phase) {
    const reportFile = path.join(out,phase + '.json');
    let stdout = '',stderr = '';
    await new Promise((resolve,reject) => {
      const child = spawn(command,args,{cwd:root,detached:process.platform!=='win32',env:{...process.env,VALIS_DESKTOP_SMOKE:'1',VALIS_USER_DATA_DIR:userData,VALIS_SMOKE_REPORT:reportFile,VALIS_SMOKE_PHASE:phase},stdio:['ignore','pipe','pipe']});
      child.stdout.on('data',b => stdout += b);child.stderr.on('data',b => stderr += b);
      const timeout = setTimeout(() => {
        try { process.platform === 'win32' ? child.kill() : process.kill(-child.pid,'SIGTERM'); } catch {}
        reject(new Error('Electron smoke timeout: ' + phase + '\n' + stderr.slice(-3000)));
      },90000);
      child.on('error',err => { clearTimeout(timeout);reject(err); });
      child.on('exit',(code,signal) => { clearTimeout(timeout);code === 0 ? resolve() : reject(new Error('Electron failed: ' + phase + ' (' + code + '/' + signal + ')\n' + stderr.slice(-4000))); });
    });
    await fs.writeFile(path.join(out,phase + '.stdout.log'),stdout);
    await fs.writeFile(path.join(out,phase + '.stderr.log'),stderr);
    const report = JSON.parse(await fs.readFile(reportFile,'utf8'));
    assert.equal(report.failed,undefined);assert.equal(report.phase,phase);assert.ok(report.rendererReady);assert.ok(report.checks.length >= 7);
    rounds.push(report);return report;
  }
  try {
    const created = await run('create');
    const first = JSON.parse(await fs.readFile(path.join(userData,'specimens','history.json'),'utf8'));
    const restored = await run('restore');
    assert.deepEqual(restored.records,created.records,'relaunch lost creature records');
    const second = JSON.parse(await fs.readFile(path.join(userData,'specimens','history.json'),'utf8'));
    const stable = saved => saved.records.map(r => ({runId:r.runId,seed:r.seed,status:r.status,state:r.state,snapshots:r.snapshots,portrait:r.portrait})).sort((a,b)=>a.runId.localeCompare(b.runId));
    assert.deepEqual(stable(second),stable(first),'relaunch changed saved DNA, parts, snapshots or portrait');
    assert.equal(second.records.length,2,'preview or extra demo records were saved');
    const report = {scope:'Native Electron run and process restart on ' + process.platform,platform:process.platform,arch:process.arch,packaged:Boolean(packaged),rounds,checks:['actual local renderer launch','N15 original output','N1000 full calibration','two independent real runs','prepare-close save/flush','process restart preserves state, phase snapshots and portraits'],generatedAt:new Date().toISOString()};
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2) + '\n');
    console.log(JSON.stringify(report,null,2));return report;
  } finally { await fs.rm(userData,{recursive:true,force:true}); }
}
if (require.main === module) {
  const args = process.argv.slice(2),options = {};
  for (let i=0;i<args.length;i++) {
    if (!['--exe','--out'].includes(args[i]) || !args[i+1]) throw Error('Use --exe <VALIS.exe> or --out <evidence directory>');
    options[args[i].slice(2)] = args[++i];
  }
  nativeSmoke(options).catch(err => { console.error(err);process.exitCode = 1; });
}
module.exports = {nativeSmoke};
