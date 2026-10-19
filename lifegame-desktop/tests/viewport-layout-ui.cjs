'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'operations/evidence/viewport-layout-v4.2.20');await fs.mkdir(out,{recursive:true});
 const root=path.resolve('src');const server=http.createServer(async(req,res)=>{try{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':'text/html');let data=await fs.readFile(f);if(f===path.join(root,'app.js'))data=Buffer.from(data.toString().replace('const renderer = R.create($("board"));','const renderer = R.create($("board"));window.__PLANE_R__=renderer;'));res.end(data);}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const checks=[],errors=[];
 const check=(v,name)=>{assert(v,name);checks.push(name);};
 try{
  browser=await chromium.launch({...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1460,height:1030}});page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>{errors.push('Unexpected native dialog: '+d.type());d.dismiss();});
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);




  await page.evaluate(()=>{__LIFE_TEST__.prepare({seed:'viewport-review',width:40,height:28,initial:80,lineages:'few',landscape:'templates',mapId:'river',ageModel:'life/1'});__LIFE_TEST__.stop();for(let i=0;i<3;i++)__LIFE_TEST__.step();});
  await page.click('#focus-view');
  const before=await page.evaluate(()=>__LIFE_TEST__.fingerprint()),layouts=[];
  for(const size of [{width:1920,height:1080},{width:1366,height:768}]){
    await page.setViewportSize(size);await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(200);
    const layout=await page.evaluate(()=>{const ids=['board','current-donut','current-overall','graph-stacked','composition-phases','composition-sex','composition-ages','graph-relations','foodweb-diagram','biomass-pyramid','foodweb-leaders','pyramid-support','map-key'];const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}};const pane=document.querySelector('.workspace>.inspector');return {viewport:[innerWidth,innerHeight],panels:ids.map(id=>({id,...rect(document.getElementById(id))})),inspector:{...rect(pane),client:pane.clientHeight,scroll:pane.scrollHeight},horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,mode:__PLANE_R__.view.mode,draw:__LIFE_TEST__.snapshot().render,expected:__LIFE_TEST__.snapshot().world.organisms.length};});
    check(!layout.horizontalOverflow,'no horizontal overflow '+size.width);
    check(layout.panels.every(r=>r.x>=0&&r.y>=0&&r.right<=size.width+1&&r.bottom<=size.height+1&&r.height>0),'map, three panels and current-summary perspectives fit '+size.width);
    check(layout.inspector.scroll<=layout.inspector.client+1,'default three panels require no inspector scrolling '+size.width);
    check(layout.panels[0].height>=240,'map retains usable height '+size.width);
    check(layout.draw.drawn===layout.expected,'overview retains all organism positions '+size.width);
    layouts.push(layout);await page.screenshot({path:path.join(out,`far-${size.width}.png`)});
  }
  // The resize correction must retain the viewed point rather than reselecting a creature.
  await page.click('#detail-view');await page.waitForTimeout(120);
  const old=await page.evaluate(()=>({x:__PLANE_R__.view.x,y:__PLANE_R__.view.y,w:document.getElementById('board').clientWidth,h:document.getElementById('board').clientHeight}));
  await page.setViewportSize({width:1920,height:1080});await page.waitForTimeout(150);
  const now=await page.evaluate(()=>({x:__PLANE_R__.view.x,y:__PLANE_R__.view.y,w:document.getElementById('board').clientWidth,h:document.getElementById('board').clientHeight}));
  check(Math.abs((now.x-old.x)-(now.w-old.w)/2)<1&&Math.abs((now.y-old.y)-(now.h-old.h)/2)<1,'detail centre preserved across resize');
  await page.check('#plane-separation');await page.uncheck('#plane-separation');await page.check('#simplified');
  check(await page.evaluate(()=>__PLANE_R__.view.simplified),'simplified view remains available near');await page.uncheck('#simplified');
  await page.locator('.map-key-extra>summary').click();
  for(const group of ['basal','prey','P','Q','resource']){check(!await page.locator('#names-'+group).isChecked(),'non-main labels default OFF '+group);await page.check('#names-'+group);await page.uncheck('#names-'+group);}
  check(await page.locator('#resource-key [data-resource]').count()===8,'all resource symbols retained in disclosure');
  await page.locator('.map-key-extra>summary').click();
  await page.locator('.observation-conditions>summary').click();check(await page.locator('#active-mode').isVisible(),'effective observation conditions available');await page.locator('.observation-conditions>summary').click();
  await page.evaluate(()=>{const w=__LIFE_TEST__.snapshot().world,o=w.organisms.find(o=>o.slot==='main');__LIFE_TEST__.select(o.cell,o.id);});check(await page.locator('#inspector-details').isVisible(),'individual detail replaces panels');
  await page.click('#close-species');check(await page.locator('#inspector-graphs').isVisible(),'closing detail restores three panels');
  await page.screenshot({path:path.join(out,'near.png')});
  await page.locator('.graph-analysis>summary').click();check(await page.locator('#information-readout').isVisible(),'information observations retained in expandable analysis');check((await page.locator('.graph-analysis').textContent()).includes('関与個体率'),'measurement limitations remain available');await page.locator('.graph-analysis>summary').click();
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===before,'all presentation changes preserve biological fingerprint');
  await page.click('#focus-view');check(!await page.evaluate(()=>document.body.classList.contains('observatory')),'normal observation layout remains available');await page.click('#focus-view');
  await page.setViewportSize({width:820,height:900});await page.waitForTimeout(150);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'narrow layout scrolls vertically without horizontal overflow');
  check(errors.length===0,'no browser exceptions or native dialogs');
  await fs.writeFile(path.join(out,'ui-report.json'),JSON.stringify({checks,layouts,errors,scope:'Linux Chromium; real 3T river world; layout/view controls only; no 500T or Windows runtime claim'},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,errors}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
