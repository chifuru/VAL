'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'operations/evidence/visual-review-v4.2.19');await fs.mkdir(out,{recursive:true});
 const root=path.resolve('src');const server=http.createServer(async(req,res)=>{try{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':'text/html');let data=await fs.readFile(f);if(f===path.join(root,'app.js'))data=Buffer.from(data.toString().replace('const renderer = R.create($("board"));','const renderer = R.create($("board"));window.__PLANE_R__=renderer;'));res.end(data);}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const checks=[],errors=[];
 const check=(v,name)=>{assert(v,name);checks.push(name);};
 try{
  browser=await chromium.launch({...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1460,height:1030}});page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>{errors.push('Unexpected native dialog: '+d.type());d.dismiss();});
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);




  await page.evaluate(()=>{__LIFE_TEST__.prepare({seed:'information-ui',width:40,height:28,initial:80,lineages:'manual',selected:['solar','jelly'],landscape:'templates',mapId:'river',ageModel:'life/1'});__LIFE_TEST__.stop();for(let i=0;i<3;i++)__LIFE_TEST__.step();});
  await page.click('#focus-view');
  const layouts=[];
  for(const size of [{width:1920,height:1080},{width:1366,height:768}]){
   await page.setViewportSize(size);await page.waitForTimeout(350);
   const layout=await page.evaluate(()=>{const ids=['board','graph-stacked','information-readout'];return {viewport:[innerWidth,innerHeight],body:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],panels:ids.map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return {id,x:r.x,y:r.y,width:r.width,height:r.height}}),inspector:[...document.querySelectorAll('.inspector')].map(e=>({h:e.clientHeight,scroll:e.scrollHeight}))};});layouts.push(layout);
   await page.screenshot({path:path.join(out,`far-${size.width}.png`)});
  }
  await page.setViewportSize({width:1920,height:1080});await page.click('#detail-view');await page.waitForTimeout(350);await page.screenshot({path:path.join(out,'near.png')});
  await fs.writeFile(path.join(out,'layout.json'),JSON.stringify({layouts,errors},null,2));console.log(JSON.stringify({layouts,errors}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
