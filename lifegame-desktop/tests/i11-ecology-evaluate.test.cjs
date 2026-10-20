'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),zlib=require('node:zlib'),cp=require('node:child_process');
const R=require('../tools/i11-ecology-evaluate.cjs'),root=path.resolve(__dirname,'..'),matrixPath=path.join(root,'operations/plans/i11-evaluation-matrix-v1.json'),m=R.matrixRead(matrixPath);
test('fixed partition seeds, versions and variant config are explicit',()=>{
 const opts=R.parse(['--group','W','--seeds','00,01','--turns','2','--variant','baseline']),cases=R.casesFor(m,opts);
 assert.equal(cases.length,2);assert.equal(cases[0].seed,'i11/evaluation/mixed/W/00');
 assert.equal(R.configFor(m,cases[0],'baseline').balanceModel,undefined);assert.equal(R.configFor(m,cases[0],'candidate').balanceModel,'survival/1');
 assert.throws(()=>R.casesFor(m,{...opts,seeds:'99'}),/fixed seed/);assert.throws(()=>R.casesFor(m,{...opts,seeds:'00,00'}),/duplicate/);
 assert.throws(()=>R.parse(['--group','W','--turns','501']),/500/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'i11-matrix-version-'));try{const p=path.join(dir,'matrix.json');fs.writeFileSync(p,JSON.stringify({...m,version:'future/9'}));assert.throws(()=>R.matrixRead(p),/Unsupported evaluation matrix version/);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('R4 uses mean counts, inclusive60%/5% and turn500 presence; global totals do not certify R3',()=>{
 const rows=Array.from({length:501},(_,turn)=>({turn,counts:{a:60,b:35,c:5},main:100}));
 const result=R.terminalSignature(rows,['a','b','c'],m.criteria.R4);assert.equal(result.signature,'a|a+b+c');assert.equal(result.shares.a,.6);assert.equal(result.shares.c,.05);
 assert.equal(R.terminalSignature(rows.slice(0,500),['a','b','c'],m.criteria.R4).status,'unassessed');
 const noMain=rows.map(r=>({...r,counts:{a:0,b:0,c:0}}));assert.equal(R.terminalSignature(noMain,['a','b','c'],m.criteria.R4).reason,'all-main-extinct');
 const evidence={generation:{renewalProofs:{}},flow:{finalWindow:{productionE:10,uptakeE:10,maintenanceE:0,births:1,regrowthB:1,perTurn:rows.slice(450)},primary:{},hyper:{}},parasiteTransitions:[],emergenceCandidates:[]},assessment=R.evaluateCriteria(rows,evidence,['a','b','c'],m);
 assert.equal(assessment.R3.necessaryConditionsPass,true);assert.equal(assessment.R3.pass,null);assert.equal(assessment.R3.observed.maintenanceE,null);assert.equal(assessment.R4.status,'provisional-foodweb-unverified');assert.equal(assessment.R6.status,'unassessed-causality');
});
test('two real product turns retain all raw observations; completed resume skips and refuses mismatched identity',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'i11-runner-product-')),args=['tools/i11-ecology-evaluate.cjs','--group','W','--partition','evaluation','--seeds','00','--turns','2','--variant','candidate','--out',dir],env={...process.env};delete env.NODE_TEST_CONTEXT;const run=()=>cp.spawnSync(process.execPath,args,{cwd:root,env,encoding:'utf8',timeout:30000});
 try{
  const first=run();assert.equal(first.status,0,first.stderr);const summaryPath=path.join(dir,'candidate/W/evaluation/00-T2.summary.json'),dataPath=path.join(dir,'candidate/W/evaluation/00-T2.observations.json.gz'),s=JSON.parse(fs.readFileSync(summaryPath)),snapshot=JSON.parse(zlib.gunzipSync(fs.readFileSync(dataPath)));
  assert.equal(s.requestedConfig.balanceModel,'survival/1');assert.equal(s.effectiveConfig.seed,'i11/evaluation/mixed/W/00');assert.deepEqual(snapshot.rows.map(r=>r.turn),[0,1,2]);assert.equal(snapshot.schema,'observation-snapshot/1');assert.equal(snapshot.metadata.version,s.request.replaySignature);assert.equal(s.invariants.checkedTurns,3);assert.equal(s.invariants.observationRestoreValid,true);assert.equal(s.criteria.presence.abyss.continuous150to250,null);assert.equal(s.timing.step.count,2);
  const bytes=fs.readFileSync(dataPath),summaryBytes=fs.readFileSync(summaryPath),mtime=fs.statSync(summaryPath).mtimeMs;const second=run();assert.equal(second.status,0,second.stderr);assert.deepEqual(fs.readFileSync(dataPath),bytes);assert.deepEqual(fs.readFileSync(summaryPath),summaryBytes);assert.equal(fs.statSync(summaryPath).mtimeMs,mtime);
  const request=structuredClone(s.request);s.request.replaySignature='future-invalid-signature';fs.writeFileSync(summaryPath,JSON.stringify(s));assert.throws(()=>R.existing({summary:summaryPath,observations:dataPath},request),/config\/model\/version mismatch/);const mismatch=run();assert.equal(mismatch.status,1);assert.deepEqual(fs.readFileSync(dataPath),bytes);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
