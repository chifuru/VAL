'use strict';
const path = require('node:path');
const fs = require('node:fs/promises');
const {fileURLToPath} = require('node:url');
const {SessionStore} = require('./history-store.cjs');
function testMode(env = process.env, argv = process.argv) { return env.VALIS_DESKTOP_SMOKE === '1' || argv.includes('--smoke-test'); }
function localEntry(url, entry) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'file:') return false;
    let actual = path.resolve(fileURLToPath(parsed));
    let expected = path.resolve(entry);
    if (process.platform === 'win32') { actual = actual.toLowerCase(); expected = expected.toLowerCase(); }
    return actual === expected;
  } catch { return false; }
}
function trustedSender(event, window, entry) {
  return Boolean(window && !window.isDestroyed() && event.sender === window.webContents && event.senderFrame === window.webContents.mainFrame && localEntry(event.senderFrame.url, entry));
}
async function smokeScenario(phase){
 const T=window.__VALIS_TEST__,checks=[];function ok(v,name){if(!v)throw Error(name);checks.push(name);}async function wait(fn){const start=Date.now();while(!fn()){if(Date.now()-start>25000)throw Error('UI wait timeout');await new Promise(r=>setTimeout(r,25));}}
 ok(T.snapshot().records.length===0,'New process starts with an empty session archive');ok(!document.getElementById('notice').textContent,'Legacy history files are not parsed');
 ok(!document.querySelector('details')&&document.getElementById('dna').getBoundingClientRect().height>30&&document.getElementById('log').getBoundingClientRect().height>50,'DNA and original output are always visible');ok(document.getElementById('speed').value==='100','100ms default output interval');
 if(phase==='create'){
  document.getElementById('seed').value='15';document.getElementById('seed').dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,100));ok(!T.snapshot().activeRun&&T.snapshot().state.current===0,'Input alone never births or runs');document.getElementById('load').click();await wait(()=>T.snapshot().preparedSeed===15&&!T.snapshot().busy);ok(!T.snapshot().activeRun&&T.snapshot().state.current===0,'Loading only prepares the individual');document.getElementById('start').click();await wait(()=>T.snapshot().runStatus==='complete'&&!T.snapshot().busy);let s=T.snapshot();ok(s.log===CreatureEngine.linesFor(15).join('\n'),'N15 original rows');ok(s.records.length===1,'Only the final completed result is recorded');
  await T.run(1000);await T.skip();s=T.snapshot();ok(s.state.current===1000&&s.state.stage===3&&s.state.matured&&s.state.maturedAt>580,'N1000 condition-qualified fourth phase');ok(s.log===CreatureEngine.linesFor(1000).join('\n'),'N1000 original rows');
  const full=s.records.find(r=>r.seed===1000);ok(full.engineVersion===5&&full.assetVersion==='desktop-art-v5'&&full.snapshots.length===1,'Final result contains one exact final portrait');ok(document.querySelectorAll('.phase-card img').length===4,'Live evolution history keeps all four actual phases');
  const state=full.state,plain=T.renderFrame(state,{time:1000,still:false}),modes=[];for(const kind of ['fizz','buzz','fizzbuzz']){const png=T.renderFrame(state,{time:1000,still:false,energyEvents:[{kind,count:1,sequence:1000,time:1000-FoodScene.durations[kind]/2}]});ok(png!==plain,'Whole-body response '+kind);modes.push(T.motion().cross.join(','));}ok(new Set(modes).size===3,'Three nutritional motions differ');
  const fixed=T.renderFrame(state,{time:0,still:true});ok(fixed===T.renderFrame(state,{time:800,still:true,growthEvents:[{type:'evolution',sequence:1000,time:0}]}),'Static portrait omits all presentation events');
  document.getElementById('nav-archive').click();ok(!document.getElementById('back-live').hidden&&document.querySelectorAll('#records .record').length===2,'Two actual completed results and prominent archive return');document.getElementById('back-live').click();ok(!T.snapshot().archiveOpen&&document.querySelectorAll('#records .record').length===0,'Returning unloads archive image nodes');
 }else{ok(T.snapshot().records.length===0&&!T.snapshot().activeRun,'Previous process results are absent');document.getElementById('nav-archive').click();ok(document.querySelectorAll('#records .record').length===0&&document.getElementById('record-count').textContent==='0','Restart archive is visibly empty');document.getElementById('back-live').click();ok(!T.snapshot().archiveOpen,'Empty archive can return to cultivation');}
 ok(typeof require==='undefined'&&!window.google,'Renderer has no Node or GAS');ok(![...document.images].some(im=>/^https?:/.test(im.src)),'Images are local');return {phase,checks,records:T.snapshot().records.map(r=>({runId:r.runId,seed:r.seed,processed:r.processed,status:r.status})),rendererReady:T.snapshot().ready};
}
async function runSmoke(window, store, reportFile, phase = 'create') {
 await window.webContents.executeJavaScript('new Promise((resolve,reject)=>{const started=Date.now();const timer=setInterval(()=>{if(window.__VALIS_TEST__?.snapshot().ready){clearInterval(timer);resolve(true);}else if(Date.now()-started>20000){clearInterval(timer);reject(Error("Renderer did not become ready"));}},25);})');
 const result=await window.webContents.executeJavaScript('('+smokeScenario.toString()+')('+JSON.stringify(phase)+')');
  await store.flush();
  const image = await window.webContents.capturePage();
  await fs.mkdir(path.dirname(reportFile),{recursive:true});
  await fs.writeFile(reportFile.replace(/\.json$/i,'') + '.png',image.toPNG());
  const report = {scope:'Native Electron smoke on ' + process.platform + '; hosted runner is not a Windows 10/11 user-device acceptance test',platform:process.platform,arch:process.arch,versions:process.versions,...result,generatedAt:new Date().toISOString(),network:'Remote requests disabled by desktop host'};
  await fs.writeFile(reportFile,JSON.stringify(report,null,2) + '\n');
  return report;
}
function createDesktopApp(electron, options = {}) {
  const {app,BrowserWindow,ipcMain,Menu,dialog} = electron;
  const entry = options.entry || path.join(__dirname,'..','Index.html');
  const mode = testMode();
  app.setName('VALIS');
  if (mode && process.env.VALIS_USER_DATA_DIR) app.setPath('userData',path.resolve(process.env.VALIS_USER_DATA_DIR));
  if (!app.requestSingleInstanceLock()) { app.quit(); return null; }
  let window = null, store = null, closing = false, allowClose = false;
  function assertSender(event) { if (!trustedSender(event,window,entry)) throw new Error('この画面からの個体記録操作は許可されていません。'); }
  ipcMain.handle('valis:list',async event => { assertSender(event); return store.list(); });
  ipcMain.handle('valis:save',async (event,record) => {
    assertSender(event);
    try { return await store.save(record); }
    catch (err) { closing = false; throw new Error(err.message); }
  });
  ipcMain.handle('valis:close-ready',async event => {
    assertSender(event);
    if (!closing) return false;
    try { await store.flush(); }
    catch (err) { closing = false; throw new Error(err.message); }
    allowClose = true; window.close(); app.quit(); return true;
  });
  function prepareClose(event) {
    if (allowClose) return;
    event.preventDefault();
    if (!closing) { closing = true; window.webContents.send('valis:prepare-close'); }
  }
  app.on('second-instance',() => { if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } });
  app.on('before-quit',event => { if (window && !window.isDestroyed() && !allowClose) { event.preventDefault(); window.close(); } });
  app.on('window-all-closed',() => app.quit());
  app.whenReady().then(async () => {
    store = options.store || new SessionStore();
    Menu.setApplicationMenu(null);
    window = new BrowserWindow({title:'VALIS',width:1440,height:960,minWidth:760,minHeight:620,backgroundColor:'#071326',show:false,
      webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,additionalArguments:mode?['--valis-test-mode']:[]}});
    window.on('close',prepareClose);
    window.on('closed',() => { window = null; });
    window.webContents.setWindowOpenHandler(() => ({action:'deny'}));
    window.webContents.on('will-navigate',(event,url) => { if (!localEntry(url,entry)) event.preventDefault(); });
    window.webContents.session.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*','ws://*/*','wss://*/*']},(_details,callback) => callback({cancel:true}));
    await window.loadFile(entry);
    window.show();
    if (process.argv.includes('--smoke-test')) {
      const reportFile = path.resolve(process.env.VALIS_SMOKE_REPORT || path.join(app.getPath('userData'),'desktop-smoke.json'));
      try {
        await runSmoke(window,store,reportFile,process.env.VALIS_SMOKE_PHASE || 'create');
        window.close();
      } catch (err) {
        await fs.mkdir(path.dirname(reportFile),{recursive:true});
        await fs.writeFile(reportFile,JSON.stringify({platform:process.platform,failed:err.message,generatedAt:new Date().toISOString()},null,2));
        allowClose = true; app.exit(1);
      }
    }
  }).catch(err => { if (mode) console.error(err); else dialog.showErrorBox('VALISを起動できません','アプリのファイルを読み込めません。配布フォルダを展開し直して起動してください。'); allowClose = true; app.exit(1); });
  return {getWindow:() => window,getStore:() => store};
}
// Electron's main entry can be loaded by its bootstrap rather than Node's CLI.
if (process.versions.electron && process.type === 'browser') createDesktopApp(require('electron'));
module.exports = {createDesktopApp,testMode,localEntry,trustedSender,runSmoke};
