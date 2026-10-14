'use strict';
const path = require('node:path');
const fs = require('node:fs/promises');
const {fileURLToPath} = require('node:url');
const {HistoryStore} = require('./history-store.cjs');
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
async function runSmoke(window, store, reportFile, phase = 'create') {
  await window.webContents.executeJavaScript('new Promise((resolve,reject)=>{const started=Date.now();const timer=setInterval(()=>{if(window.__VALIS_TEST__ && window.__VALIS_TEST__.snapshot().ready){clearInterval(timer);resolve(true);}else if(Date.now()-started>20000){clearInterval(timer);reject(new Error("Renderer did not become ready"));}},25);})');
  const result = await window.webContents.executeJavaScript('(async()=>{const T=window.__VALIS_TEST__;const phase=' + JSON.stringify(phase) + ';const checks=[];function ok(value,name){if(!value)throw new Error(name);checks.push(name);}if(phase==="create"){document.getElementById("reduced").checked=true;document.getElementById("seed").value="15";document.getElementById("seed").dispatchEvent(new Event("input",{bubbles:true}));ok(T.snapshot().preview.seed===15,"Immediate numeric input preview");await new Promise((resolve,reject)=>{const start=Date.now();const poll=setInterval(()=>{if(T.snapshot().runStatus==="complete"&&!T.snapshot().busy){clearInterval(poll);resolve();}else if(Date.now()-start>15000){clearInterval(poll);reject(new Error("Automatic birth timeout"));}},25);});let s=T.snapshot();ok(s.runStatus==="complete","N15 completion");ok(s.log==="1\\n2\\nFizz\\n4\\nBuzz\\nFizz\\n7\\n8\\nFizz\\nBuzz\\n11\\nFizz\\n13\\n14\\nFizzBuzz","N15 original rows");await T.run(1000,{reduced:false});await T.skip();s=T.snapshot();ok(s.state.current===1000 && s.state.points===100 && s.state.stage===2 && s.state.matured && s.state.maturedAt<1000,"N1000 trait-based maturation");ok(s.log.split("\\n").length===1000 && s.log.split("\\n")[999]==="Buzz","N1000 original rows");}await T.reloadRecords();const saved=await window.valis.listSpecimens();ok(!saved.warning,"History readable");const full=saved.records.find(r=>r.seed===1000 && r.processed===1000 && r.status==="complete");ok(Boolean(full),"Persisted complete N1000 record");ok(saved.records.some(r=>r.seed===15 && r.status==="complete"),"Persisted distinct N15 record");ok(new Set(saved.records.map(r=>r.runId)).size===saved.records.length,"Distinct run IDs");ok(full.state.points===100 && full.state.stage===2,"Restored maturation state");ok(typeof require==="undefined" && !window.google,"No renderer Node or GAS dependency");ok(![...document.images].some(im=>/^https?:/.test(im.src)),"No remote image dependency");return {phase,checks,records:saved.records.map(r=>({runId:r.runId,seed:r.seed,processed:r.processed,status:r.status,points:r.state.points,stage:r.state.stage})),rendererReady:T.snapshot().ready};})()');
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
    store = options.store || new HistoryStore(path.join(app.getPath('userData'),'specimens'));
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
