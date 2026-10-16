'use strict';
const {app,BrowserWindow,session}=require('electron');
const path=require('node:path');
const smoke=process.argv.includes('--smoke-test');
app.whenReady().then(async()=>{
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_d,cb)=>cb({cancel:true}));
 const w=new BrowserWindow({width:1580,height:1120,minWidth:760,minHeight:650,backgroundColor:'#0b151b',autoHideMenuBar:true,show:!smoke,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 w.webContents.setWindowOpenHandler(()=>({action:'deny'}));w.webContents.on('will-navigate',e=>e.preventDefault());
 await w.loadFile(path.join(__dirname,'index.html'));
 if(smoke){try{const result=await w.webContents.executeJavaScript(`(async()=>{for(let i=0;i<600&&!window.__ECO_MOCK__?.snapshot().ready;i++)await new Promise(r=>setTimeout(r,100));const m=window.__ECO_MOCK__;if(!m?.snapshot().ready)throw Error('mock not ready');await m.advance(20);const s=m.snapshot();if(s.world.turn!==20||!s.world.ate||!s.world.births)throw Error('no ecological feeding');return {ok:true,turn:s.world.turn,ate:s.world.ate,births:s.world.births,population:s.world.creatures.filter(c=>c.alive).length,ready:s.ready,nodeExposed:typeof require!=='undefined'};})()`);console.log(JSON.stringify(result));if(result.nodeExposed)throw Error('Node exposed');app.exit(0);}catch(e){console.error(e);app.exit(1);}}
}).catch(e=>{console.error(e);app.exit(1);});app.on('window-all-closed',()=>app.quit());
