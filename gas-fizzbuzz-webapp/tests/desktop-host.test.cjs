'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const {EventEmitter} = require('node:events');
const {pathToFileURL} = require('node:url');
const {HistoryStore,validateRecord} = require('./archive/history-store-v1.6.0.cjs');
const {createDesktopApp,localEntry,trustedSender} = require('../src/desktop/main.cjs');
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aR1kAAAAASUVORK5CYII=';
function record(id = 'run-a',seed = 15) {
  return {schemaVersion:1,runId:id,createdAt:'2026-10-14T00:00:00.000Z',updatedAt:'2026-10-14T00:00:01.000Z',status:'complete',seed,processed:seed,engineVersion:1,assetVersion:'desktop-art-v1',state:{seed,current:seed,points:2,stage:0,dna:{seed,body:.5}},snapshots:[],portrait:PNG};
}
async function directory(t) { const dir = await fs.mkdtemp(path.join(os.tmpdir(),'valis-host-test-'));t.after(() => fs.rm(dir,{recursive:true,force:true}));return dir; }
test('separate runs of the same N survive process-style store reload and list newest first',async t => {
  const dir = await directory(t),store = new HistoryStore(dir),a = record('a'),b = record('b');
  b.updatedAt = '2026-10-14T00:00:02.000Z';
  await Promise.all([store.save(a),store.save(b)]);await store.flush();
  const loaded = await new HistoryStore(dir).list();
  assert.equal(loaded.warning,null);assert.deepEqual(loaded.records.map(r=>r.runId),['b','a']);assert.equal(loaded.records[0].portrait,PNG);
  const previous = JSON.parse(await fs.readFile(path.join(dir,'history.backup.json'),'utf8'));
  assert.deepEqual(previous.records.map(r=>r.runId),['a']);
  loaded.records[0].state.points = 99;
  assert.equal((await store.list()).records[0].state.points,2);
});
test('queued updates keep latest progress and reject older or changed birth records',async t => {
  const store = new HistoryStore(await directory(t)),a = record();a.status='growing';a.processed=0;a.state.current=0;
  const later = record();later.updatedAt='2026-10-14T00:00:03.000Z';
  await Promise.all([store.save(a),store.save(later)]);
  assert.equal((await store.list()).records[0].processed,15);
  await assert.rejects(store.save(a),/古い更新/);
  const changed = record();changed.seed=16;changed.processed=16;changed.state.seed=16;changed.state.current=16;changed.state.dna.seed=16;
  await assert.rejects(store.save(changed),/出生記録/);
});
test('corrupt primary keeps original and backup untouched and prevents automatic overwrite',async t => {
  const dir=await directory(t),store=new HistoryStore(dir);
  await store.save(record('a'));await store.save(record('b'));
  const backup=await fs.readFile(store.backup,'utf8');await fs.writeFile(store.file,'broken JSON');
  const damaged=new HistoryStore(dir),list=await damaged.list();
  assert.deepEqual(list.records,[]);assert.match(list.warning,/保存を停止/);
  await assert.rejects(damaged.save(record('c')),/保存を停止/);
  assert.equal(await fs.readFile(store.file,'utf8'),'broken JSON');assert.equal(await fs.readFile(store.backup,'utf8'),backup);
});
test('atomic write failure preserves previous primary, warns and blocks flush until retry succeeds',async t => {
  const store = new HistoryStore(await directory(t));await store.save(record('a'));
  const before=await fs.readFile(store.file,'utf8');
  store.fs={...fs,rename:async (from,to)=>{if(to===store.file){const err=new Error('denied');err.code='EACCES';throw err;}return fs.rename(from,to);}};
  await assert.rejects(store.save(record('b')),/保存できません/);
  await assert.rejects(store.flush(),/保存できません/);
  assert.equal(await fs.readFile(store.file,'utf8'),before);assert.match((await store.list()).warning,/保存できません/);
  assert.deepEqual((await fs.readdir(store.directory)).filter(n=>n.endsWith('.tmp')),[]);
  store.fs=fs;await store.save(record('b'));await store.flush();assert.equal((await store.list()).warning,null);
});
test('external history change is not overwritten by cached state',async t => {
  const store = new HistoryStore(await directory(t));await store.save(record('a'));
  const outside=JSON.stringify({schemaVersion:1,records:[record('external')]});await fs.writeFile(store.file,outside);
  await assert.rejects(store.save(record('b')),/外部で変更/);assert.equal(await fs.readFile(store.file,'utf8'),outside);
});
test('record validator rejects unsafe N, progress, IDs, malformed images and mismatched snapshots',()=> {
  const edits=[r=>r.seed=1001,r=>r.processed=16,r=>r.runId='../escape',r=>r.state.current=2,r=>r.state.points=Infinity,r=>r.status='demo',r=>r.assetVersion='',r=>r.portrait='data:image/svg+xml,<svg/>',r=>r.portrait=PNG+'A'.repeat(2*1024*1024),r=>r.path='/arbitrary/file',r=>r.snapshots=[{stage:1,processed:5,state:{seed:15,current:5,points:20,stage:0},portrait:PNG}]];
  for(const edit of edits){const r=record();edit(r);assert.throws(()=>validateRecord(r),/不正/);}
  const valid=record();valid.snapshots=[{stage:0,processed:0,state:{seed:15,current:0,points:0,stage:0},portrait:PNG}];assert.deepEqual(validateRecord(valid),valid);
});
function hostMock(entry,store) {
  const app = new EventEmitter();app.setName=()=>{};app.setPath=()=>{};app.getPath=()=>'/tmp/valis-unit-host';app.requestSingleInstanceLock=()=>true;app.whenReady=()=>Promise.resolve();app.quit=()=>{};app.exit=()=>{};
  const handlers = new Map();let window;
  class Window extends EventEmitter {
    constructor(options){super();this.options=options;this.destroyed=false;this.sent=[];this.webContents=new EventEmitter();this.webContents.mainFrame={url:pathToFileURL(entry).href};this.webContents.session={webRequest:{onBeforeRequest:(filter,handler)=>{this.network=handler;}}};this.webContents.setWindowOpenHandler=fn=>{this.open=fn;};this.webContents.send=(...args)=>this.sent.push(args);window=this;}
    isDestroyed(){return this.destroyed;}loadFile(){return Promise.resolve();}show(){}isMinimized(){return false;}focus(){}
    close(){let blocked=false;this.emit('close',{preventDefault(){blocked=true;}});if(!blocked){this.destroyed=true;this.emit('closed');}}
  }
  const controller=createDesktopApp({app,BrowserWindow:Window,ipcMain:{handle:(name,fn)=>handlers.set(name,fn)},Menu:{setApplicationMenu(){}},dialog:{showErrorBox(){}}},{entry,store});
  return {controller,handlers,app,window:()=>window,event:()=>({sender:window.webContents,senderFrame:window.webContents.mainFrame})};
}
test('IPC accepts only local top frame; arbitrary frame/path and remote navigation cannot use host',async()=> {
  const entry=path.resolve('/tmp/valis entry/Index.html'),mock=hostMock(entry,{list:async()=>({records:[],warning:null}),save:async r=>r,flush:async()=>{}});
  await new Promise(resolve=>setImmediate(resolve));const w=mock.window();
  assert.equal(w.options.webPreferences.nodeIntegration,false);assert.equal(w.options.webPreferences.contextIsolation,true);assert.equal(w.options.webPreferences.sandbox,true);
  assert.equal(localEntry(pathToFileURL(entry).href+'#history',entry),true);assert.equal(localEntry('https://example.com/',entry),false);
  assert.equal(trustedSender(mock.event(),w,entry),true);await mock.handlers.get('valis:list')(mock.event());
  await assert.rejects(mock.handlers.get('valis:list')({sender:w.webContents,senderFrame:{url:pathToFileURL(entry).href}}),/許可/);
  const e=mock.event();e.senderFrame={url:'file:///etc/passwd'};assert.equal(trustedSender(e,w,entry),false);
  let canceled;w.network({url:'https://example.com/'},result=>canceled=result.cancel);assert.equal(canceled,true);assert.deepEqual(w.open(),{action:'deny'});
});
test('close waits for renderer preparation and successful flush; failed flush keeps window open',async()=> {
  let fail=true,flushes=0;const mock=hostMock(path.resolve('/tmp/Index.html'),{flush:async()=>{flushes++;if(fail)throw Error('保存失敗');}});
  await new Promise(resolve=>setImmediate(resolve));const w=mock.window();w.close();
  assert.equal(w.isDestroyed(),false);assert.deepEqual(w.sent,[['valis:prepare-close']]);
  await assert.rejects(mock.handlers.get('valis:close-ready')(mock.event()),/保存失敗/);assert.equal(w.isDestroyed(),false);
  fail=false;w.close();await mock.handlers.get('valis:close-ready')(mock.event());assert.equal(w.isDestroyed(),true);assert.equal(flushes,2);
});
test('sandbox preload exposes fixed IPC methods and unsubscribes close callbacks',async()=> {
  const code=await fs.readFile(path.join(__dirname,'../src/desktop/preload.cjs'),'utf8');const listeners=new Map(),calls=[];let api;
  vm.runInNewContext(code,{process:{argv:['--valis-test-mode']},require:name=>{assert.equal(name,'electron');return{contextBridge:{exposeInMainWorld:(name,value)=>{assert.equal(name,'valis');api=value;}},ipcRenderer:{invoke:async(...args)=>calls.push(args),on:(name,fn)=>listeners.set(name,fn),removeListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name);}}};}});
  assert.equal(api.testMode,true);await api.listSpecimens();await api.saveSpecimen(record());await api.closeReady();assert.deepEqual(calls.map(c=>c[0]),['valis:list','valis:save','valis:close-ready']);
  let prepared=0;const unsubscribe=api.onPrepareClose(()=>prepared++);listeners.get('valis:prepare-close')();unsubscribe();assert.equal(prepared,1);assert.equal(listeners.size,0);assert.equal(api.readFile,undefined);
});

test('engine1 and engine4 records coexist without rewriting legacy state or portraits',async t=>{
 const E=require('../src/composite/legacy-engine-v4'),L=require('../src/composite/legacy-engine'),store=new HistoryStore(await directory(t)),legacy=record('old'),current=record('new',927);
 legacy.seed=1000;legacy.processed=1000;legacy.state=JSON.parse(JSON.stringify(L.runAll(1000,'signal')));current.engineVersion=4;current.assetVersion='desktop-art-v4';current.state=JSON.parse(JSON.stringify(E.runAll(927)));
 await store.save(legacy);await store.save(current);const loaded=(await new HistoryStore(store.directory).list()).records;assert.deepEqual(loaded.find(r=>r.runId==='old'),legacy);assert.deepEqual(loaded.find(r=>r.runId==='new'),current);
 for(const version of [0,6,99])assert.throws(()=>validateRecord({...current,engineVersion:version}),/対応していない/);assert.throws(()=>validateRecord({...current,state:{...current.state,engineVersion:1}}),/成長版/);
});

test('legacy2 final portraits coexist with new4 fourth-phase snapshots',async t=>{const E=require('../src/composite/legacy-engine-v4'),L2=require('../src/composite/legacy-engine-v2'),store=new HistoryStore(await directory(t)),old=record('legacy2',927),fresh=record('fresh4',927);old.engineVersion=2;old.state=JSON.parse(JSON.stringify(L2.runAll(927)));fresh.engineVersion=4;fresh.state=JSON.parse(JSON.stringify(E.runAll(927)));fresh.snapshots=[{stage:3,processed:927,state:fresh.state,portrait:PNG}];await store.save(old);await store.save(fresh);const list=(await new HistoryStore(store.directory).list()).records;assert.deepEqual(list.find(r=>r.runId==='legacy2'),old);assert.deepEqual(list.find(r=>r.runId==='fresh4'),fresh);});

test('legacy3 saved final result coexists with new4 and cannot change edition in place',async t=>{const E=require('../src/composite/legacy-engine-v4'),L3=require('../src/composite/legacy-engine-v3'),store=new HistoryStore(await directory(t)),old=record('legacy3',927),fresh=record('fresh4',927);old.engineVersion=3;old.assetVersion='desktop-art-v3';old.state=JSON.parse(JSON.stringify(L3.runAll(927)));fresh.engineVersion=4;fresh.assetVersion='desktop-art-v4';fresh.state=JSON.parse(JSON.stringify(E.runAll(927)));await store.save(old);await store.save(fresh);const list=(await new HistoryStore(store.directory).list()).records;assert.deepEqual(list.find(r=>r.runId==='legacy3'),old);assert.deepEqual(list.find(r=>r.runId==='fresh4'),fresh);await assert.rejects(()=>store.save({...old,engineVersion:4,state:fresh.state}),/出生記録/);});

test('old4 and revised4 retain their appearance revision across storage and snapshots',async t=>{
 const E=require('../src/composite/legacy-engine-v4'),Old=require('./archive/engine-v4.cjs'),store=new HistoryStore(await directory(t));
 const old=record('old4',927),fresh=record('revised4',927);old.engineVersion=fresh.engineVersion=4;
 old.assetVersion='desktop-art-v4';old.state=JSON.parse(JSON.stringify(Old.runAll(927)));
 fresh.assetVersion='desktop-art-v4.1';fresh.state=JSON.parse(JSON.stringify(E.runAll(927)));
 fresh.snapshots=[{stage:3,processed:927,state:fresh.state,portrait:PNG}];
 await store.save(old);await store.save(fresh);const list=(await new HistoryStore(store.directory).list()).records;
 assert.deepEqual(list.find(r=>r.runId===old.runId),old);assert.deepEqual(list.find(r=>r.runId===fresh.runId),fresh);
 for(const revision of [0,3,true,'2',null])assert.throws(()=>validateRecord({...fresh,state:{...fresh.state,appearanceRevision:revision}}),/外見版/);
 for(const revision of [0,3,true,'2',null])assert.throws(()=>validateRecord({...fresh,state:{...fresh.state,finalAppearance:{...fresh.state.finalAppearance,appearanceRevision:revision}}}),/成熟外見版/);
 assert.throws(()=>validateRecord({...fresh,state:{...fresh.state,finalAppearance:{...fresh.state.finalAppearance,appearanceRevision:1}}}),/成熟外見版/);
 assert.throws(()=>validateRecord({...fresh,snapshots:[{...fresh.snapshots[0],state:old.state}]}),/相の外見版/);
 await assert.rejects(()=>store.save({...old,state:fresh.state,snapshots:fresh.snapshots}),/出生記録/);
});

test('engine5 awakening records and legacy4 coexist, retaining edition boundaries',async t=>{
 const E=require('../src/composite/creature-engine'),L4=require('../src/composite/legacy-engine-v4'),store=new HistoryStore(await directory(t));
 const a=record('ecology5',1000),b=record('living4',927);a.engineVersion=5;a.assetVersion='desktop-art-v5';a.state=JSON.parse(JSON.stringify(E.runAll(1000)));b.engineVersion=4;b.state=JSON.parse(JSON.stringify(L4.runAll(927)));
 await store.save(a);await store.save(b);const list=(await store.list()).records;assert.deepEqual(list.find(r=>r.runId===a.runId),a);assert.deepEqual(list.find(r=>r.runId===b.runId),b);
 assert.throws(()=>validateRecord({...a,state:{...a.state,appearanceRevision:2}}),/生態版/);
 await assert.rejects(()=>store.save({...b,engineVersion:5,state:a.state}),/Nと再生位置|出生記録/);
});

test('current session archive stores only final results and starts empty in each process',async()=>{
 const {SessionStore}=require('../src/desktop/history-store.cjs'),a=new SessionStore(),b=new SessionStore();const first=record('first'),second=record('second');await a.save(first);await a.save(second);assert.deepEqual((await a.list()).records.map(r=>r.runId),['second','first']);assert.deepEqual((await b.list()).records,[]);const list=await a.list();list.records[0].state.points=88;assert.equal((await a.list()).records[0].state.points,2);const partial=record('partial');partial.status='paused';partial.processed=1;partial.state.current=1;await assert.rejects(a.save(partial),/完走/);await assert.rejects(a.save({...first,state:{...first.state,points:3}}),/変更/);await a.save(first);assert.equal((await a.list()).records.length,2);a.clear();assert.deepEqual((await a.list()).records,[]);
});

test('current archive module has no filesystem dependency even with a large corrupt legacy archive',async t=>{
 const dir=await directory(t),legacy=path.join(dir,'history.json'),bytes='corrupt '+'x'.repeat(4*1024*1024);await fs.writeFile(legacy,bytes);const source=await fs.readFile(path.join(__dirname,'../src/desktop/history-store.cjs'),'utf8'),module={exports:{}};vm.runInNewContext(source,{module,structuredClone,require:name=>{assert.equal(name,'./record-schema.cjs');return require('../src/desktop/record-schema.cjs');}});const store=new module.exports.SessionStore();await store.save(record());await store.flush();assert.equal(await fs.readFile(legacy,'utf8'),bytes);assert.deepEqual(await fs.readdir(dir),['history.json']);assert.equal((await store.list()).warning,null);
});
