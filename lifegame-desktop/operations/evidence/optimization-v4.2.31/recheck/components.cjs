'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{chromium}=require('/workspace/VAL/lifegame-desktop/node_modules/playwright');
const root='/workspace/VAL/lifegame-desktop/src',out='/workspace/work/optimization-audit-431';
(async()=>{
 const server=http.createServer((req,res)=>{try{const f=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!f.startsWith(root+'/'))return res.writeHead(403).end();let s=fs.readFileSync(f);res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.png')?'image/png':f.endsWith('.css')?'text/css':'text/html');
 if(f.endsWith('/app.js'))s=Buffer.from(s.toString().replace('const renderer = R.create($("board"));','const renderer = R.create($("board"));window.__R__=renderer;').replace('window.__LIFE_TEST__ = {',`renderGraphs=__M__('graphs',renderGraphs);renderSelection=__M__('selection',renderSelection);render=__M__('render',render);commitTurn=__M__('commit',commitTurn);window.__LIGHT__=()=>({turn:world.turn,running,main:world.stats.main,population:world.organisms.length,resources:world.resources.length,compute:compute.metadata});window.__LIFE_TEST__ = {`));
 if(f.endsWith('/renderer.js'))s=Buffer.from(s.toString().replace('    return {\n      view,',`    draw=window.__M__('draw',draw);setWorld=window.__M__('setWorld',setWorld);\n    return {\n      view,`));
 if(f.endsWith('/scenery.js'))s=Buffer.from(s.toString().replace('    return { surface, objects, metrics: materials.metrics };',"    surface=window.__M__('background.surface',surface);return { surface, objects, metrics: materials.metrics };"));
 if(f.endsWith('/art.js'))s=Buffer.from(s.toString().replace('  root.EcoArt = {',`  cleanFrame=window.__M__('art.cleanFrame',cleanFrame);variant=window.__M__('art.variant',variant);anatomyFrame=window.__M__('art.anatomyFrame',anatomyFrame);litFrame=window.__M__('art.litFrame',litFrame);food=window.__M__('art.food',food);prop=window.__M__('art.prop',prop);\n  root.EcoArt = {`));res.end(s);}catch(e){res.writeHead(404).end(String(e));}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const result={source:'01bf803',version:'4.2.31',note:'Read-only injected instrumentation; nested costs overlap; Chromium Linux headless; short runs do not certify long-term large-board performance.',runs:[],errors:[]};
 try{browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 for(const [width,height,initial,turns]of [[40,28,80,4]]){
 const page=await browser.newPage({viewport:{width:1460,height:1030}});page.on('pageerror',e=>result.errors.push(String(e)));
 await page.addInitScript(()=>{window.__COST__={};window.__LONG__=[];window.__M__=(name,fn)=>function(...args){const t=performance.now();try{return fn.apply(this,args)}finally{const c=__COST__[name]||={calls:0,total:0,max:0,over50:0},ms=performance.now()-t;c.calls++;c.total+=ms;c.max=Math.max(c.max,ms);if(ms>50)c.over50++;}};new PerformanceObserver(list=>{for(const e of list.getEntries())__LONG__.push({at:e.startTime,ms:e.duration});}).observe({type:'longtask',buffered:true});for(const k of ['getImageData','putImageData'])CanvasRenderingContext2D.prototype[k]=__M__('canvas.'+k,CanvasRenderingContext2D.prototype[k]);});
 await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
 const start=Date.now();await page.evaluate(c=>{__LIFE_TEST__.prepare(c);__R__.fit();},{seed:'jank-check',randomModel:'table/1',width,height,initial,lineages:'few',mapId:'river'});
 const config=await page.evaluate(()=>{const w=__LIFE_TEST__.snapshot().world;return {config:w.config,initialPopulation:w.organisms.length};});
 for(const mode of ['far','near']){
 await page.evaluate(()=>{__COST__={};__LONG__=[];window.__GAPS__=[];window.__LAST__=null;window.__FRAME_ACTIVE__=true;const frame=t=>{if(!__FRAME_ACTIVE__)return;if(__LAST__!==null)__GAPS__.push(t-__LAST__);__LAST__=t;requestAnimationFrame(frame)};requestAnimationFrame(frame);});
 if(mode==='near')await page.click('#detail-view');
 const target=await page.evaluate(n=>__LIGHT__().turn+n,turns),at=Date.now();await page.click('#start');await page.waitForFunction(t=>__LIGHT__().turn>=t,target,{timeout:180000,polling:150});await page.click('#start');
 const row=await page.evaluate(({mode,elapsedMs})=>{__FRAME_ACTIVE__=false;const a=__GAPS__.sort((x,y)=>x-y);return {mode,elapsedMs,state:__LIGHT__(),cost:__COST__,longTasks:__LONG__,frames:a.length,gapP50:a[Math.floor(a.length*.5)],gapP95:a[Math.floor(a.length*.95)],gapMax:a.at(-1),over50:a.filter(v=>v>50).length,cache:EcoArt.cacheMetrics,anatomy:EcoArt.anatomyMetrics,terrain:__R__.diagnostics.terrainBuildMs};},{mode,elapsedMs:Date.now()-at});
 result.runs.push({width,height,initial,turns,elapsedSincePrepareStartMs:Date.now()-start,...config,...row});fs.writeFileSync(out+'/components.json',JSON.stringify(result,null,2));console.log(JSON.stringify({width,mode,turn:row.state.turn,pop:row.state.population,p95:row.gapP95,max:row.gapMax,drawMax:row.cost.draw?.max,commitMax:row.cost.commit?.max,artMax:row.cost['art.variant']?.max}));
 }
 await page.close();
 }
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(out+'/components.json',JSON.stringify(result,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1});
