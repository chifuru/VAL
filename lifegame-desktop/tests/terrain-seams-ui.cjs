'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),cp=require('child_process'),assert=require('assert/strict');
(async()=>{const out=process.env.LIFEGAME_EVIDENCE||'operations/evidence/terrain-seams-v4.2.27';fs.mkdirSync(out,{recursive:true});const root=path.resolve('src');const old=cp.execFileSync('git',['show','303f997:lifegame-desktop/src/ecology/habitat.js']).toString().replace('root.EcoHabitat =','root.EcoHabitatOld =');
 const server=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://localhost').pathname;if(u==='/old-habitat.js'){res.setHeader('Content-Type','application/javascript');return res.end(old);}const f=path.resolve(root,'.'+u);if(!f.startsWith(root+'/'))return res.writeHead(403).end();res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':'text/html');let s=fs.readFileSync(f);if(f.endsWith('/app.js'))s=Buffer.from(s.toString().replace('const renderer = R.create($("board"));','const renderer = R.create($("board"));window.__SEAM_R__=renderer;'));res.end(s);}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));const url='http://127.0.0.1:'+server.address().port;await page.goto(url+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);await page.addScriptTag({url:url+'/old-habitat.js'});
 const check=(v,n)=>{assert(v,n);checks.push(n);},checks=[];
 const result=await page.evaluate(()=>{
  const w=__LIFE_TEST__.prepare({seed:'status-density',width:40,height:28,initial:100,lineages:'few',mapId:'river'});__LIFE_TEST__.stop();window.__SEAM_WORLD__=w;
  const P=EcoProjection.build(w),rect={x:14,y:10,w:8,h:8},images={},metrics={},checks=[];
  const check=(v,n)=>{if(!v)throw Error(n);checks.push(n);};
  check(EcoArt.loaded&&EcoArt.errors.length===0&&Object.keys(EcoVisualManifest.terrain).length===11,'all eleven original terrain materials decoded');
  const fingerprint=__LIFE_TEST__.fingerprint();
  for(const [name,H]of[['old',EcoHabitatOld],['current',EcoHabitat]]){
   const h=H.create(w,P,EcoArt),t=performance.now(),patch=h.make(rect,128),png=patch.canvas.toDataURL();metrics[name]={firstBuildMs:performance.now()-t};images[name+'-uv.png']=png.split(',')[1];
   const builds=h.metrics.builds;check(h.make(rect,128).canvas===patch.canvas&&h.metrics.builds===builds,'terrain patch cache reused '+name);
   const shifted=h.make({...rect,x:15,y:11},128),a=patch.canvas.getContext('2d').getImageData(256,256,512,512).data,b=shifted.canvas.getContext('2d').getImageData(128,128,512,512).data;let max=0,total=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);max=Math.max(max,d);total+=d;}
   metrics[name].overlap={maxChannelError:max,meanChannelError:total/a.length};// Canvas alpha compositing can round fractional transforms differently after translation.
   check(max<=2&&total/a.length<.001,'world-space overlap differs only by sub-byte mean raster rounding '+name);
   for(let i=0;i<4;i++)h.make({x:2+i*3,y:2,w:2,h:2},24);
   check(h.make(rect,128).canvas.toDataURL()===png,'evicted terrain patch rebuild is deterministic '+name);
  }
  check(images['old-uv.png']!==images['current-uv.png'],'new blend is present before mesh projection');
  for(const [name,terrain,env]of[['grass','plain',3],['frost-rock','rock',4],['deep-water','deep',0]]){
   const copy={...w,tiles:w.tiles.map(t=>({...t,terrain,env,cover:'none'}))},q=EcoProjection.build(copy),h=EcoHabitat.create(copy,q,EcoArt),t=performance.now(),c=h.make({x:8,y:8,w:4,h:4},64).canvas,data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   check(data.every((n,i)=>i%4!==3||n===255),'painted surface remains opaque '+name);metrics[name]={buildMs:performance.now()-t};
  }
  check(w.tiles.every((tile,i)=>P.pick(...P.point(i%40+.5,Math.floor(i/40)+.5))===i),'all 1120 actual cell centres remain selectable');
  check(w.tiles.every((tile,i)=>!P.water(tile)||P.height(i%40+.5,Math.floor(i/40)+.5)===0),'actual water surfaces remain level');
  window.__SEAM_CELL__=w.tiles.findIndex((t,p)=>p%40>14&&p%40<25&&Math.floor(p/40)>10&&Math.floor(p/40)<18&&!t.blocked&&!P.water(t)&&EcoState.nearby(w,p).some(q=>P.water(w.tiles[q])));if(__SEAM_CELL__<0)__SEAM_CELL__=455;
  return {images,fingerprint,metrics,checks};
 });checks.push(...result.checks);for(const[n,b]of Object.entries(result.images))fs.writeFileSync(path.join(out,n),Buffer.from(b,'base64'));
 await page.click('#focus-view');await page.click('#detail-view');
 const surfaces=await page.evaluate(()=>{
  const r=__SEAM_R__,w=__SEAM_WORLD__,empty={...w,organisms:[],resources:[],carcasses:[],searchQ:[]},saved=[EcoArt.prop,EcoArt.propShadow],H=EcoHabitat,images={},timings={};r.focus(__SEAM_CELL__);r.view.selected=null;r.view.selectedEntity=null;r.view.animate=false;
  const board=document.getElementById('board'),bounds=board.getBoundingClientRect();EcoArt.prop=()=>{};EcoArt.propShadow=()=>{};
  try{for(const [name,habitat]of[['old',EcoHabitatOld],['current',H]]){
   const c=document.createElement('canvas');c.style.cssText=`position:fixed;left:-10000px;top:0;width:${bounds.width}px;height:${bounds.height}px`;document.body.append(c);EcoHabitat=habitat;const renderer=EcoRenderer.create(c);Object.assign(renderer.view,structuredClone(r.view));renderer.setWorld(empty);EcoHabitat=H;renderer.draw();const samples=[];for(let i=0;i<8;i++){const t=performance.now();renderer.draw();samples.push(performance.now()-t);}samples.sort((a,b)=>a-b);timings[name]={medianMs:(samples[3]+samples[4])/2,maxMs:samples[7]};images['projected-'+name+'.png']=c.toDataURL().split(',')[1];c.remove();
  }}finally{EcoHabitat=H;[EcoArt.prop,EcoArt.propShadow]=saved;r.setWorld(w);r.draw();}
  return {images,timings};
 });for(const[n,b]of Object.entries(surfaces.images))fs.writeFileSync(path.join(out,n),Buffer.from(b,'base64'));await page.screenshot({path:path.join(out,'near-current.png')});
 const fp=await page.evaluate(()=>__LIFE_TEST__.fingerprint());check(fp===result.fingerprint,'paint diagnostics and camera changes preserve biological fingerprint');
 await page.click('#fit');const far=await page.evaluate(()=>{__LIFE_TEST__.draw();return {drawn:__SEAM_R__.diagnostics.drawn,expected:__SEAM_WORLD__.organisms.length};});check(far.drawn===far.expected,'overview retains every actual organism');
 check(errors.length===0,'no browser errors');fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({version:require('../package.json').version,checks,errors,metrics:result.metrics,drawTimings:surfaces.timings,scope:'one real river world, two render versions, three private uniform surface fixtures; no ecology change or all-map visual approval'},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,metrics:result.metrics,drawTimings:surfaces.timings}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
