'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'operations/evidence/unified-summary-v4.2.21');await fs.mkdir(out,{recursive:true});
 const root=path.resolve('src');const server=http.createServer(async(req,res)=>{try{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':'text/html');let data=await fs.readFile(f);if(f===path.join(root,'app.js'))data=Buffer.from(data.toString().replace('const renderer = R.create($("board"));','const renderer = R.create($("board"));window.__PLANE_R__=renderer;'));if(f===path.join(root,'ecology/renderer.js'))data=Buffer.from(data.toString().replace('    return {\n      view,','    return {\n      __terrainAudit(){const b=canvas.getBoundingClientRect(),d=devicePixelRatio||1,ref=document.createElement("canvas"),actual=document.createElement("canvas");ref.width=actual.width=Math.round(b.width*d);ref.height=actual.height=Math.round(b.height*d);const n=ref.getContext("2d");n.scale(d,d);n.translate(view.x,view.y);n.scale(view.scale,view.scale);const visible=(p,margin=1)=>p[0]*view.scale+view.x>=-view.scale*margin&&p[1]*view.scale+view.y>=-view.scale*margin&&p[0]*view.scale+view.x<=b.width+view.scale*margin&&p[1]*view.scale+view.y<=b.height+view.scale*margin;scene.surface(n,visible,true,view.scale);actual.getContext("2d").drawImage(nearCache,0,0);const a=n.getImageData(0,0,ref.width,ref.height).data,c=actual.getContext("2d").getImageData(0,0,ref.width,ref.height).data;let sum=0,max=0,over16=0;for(let i=0;i<a.length;i++){const x=Math.abs(a[i]-c[i]);sum+=x;max=Math.max(max,x);if(x>16)over16++;}return {mean:sum/a.length,max,over16:over16/a.length,pixels:ref.width*ref.height};},\n      view,'));res.end(data);}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const checks=[],errors=[];
 const check=(v,name)=>{assert(v,name);checks.push(name);};
 try{
  browser=await chromium.launch({...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1460,height:1030}});page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>{errors.push('Unexpected native dialog: '+d.type());d.dismiss();});
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);




  await page.evaluate(()=>{__LIFE_TEST__.prepare({seed:'viewport-review',width:40,height:28,initial:80,lineages:'few',landscape:'templates',mapId:'river',ageModel:'life/1'});__LIFE_TEST__.stop();for(let i=0;i<3;i++)__LIFE_TEST__.step();});
  await page.click('#focus-view');
  check(await page.locator('#current-summary #current-donut, #current-summary .current-reading, #current-summary #foodweb-diagram, #current-summary #biomass-pyramid').count()===4,'all four current perspectives belong to one summary');
  check(await page.locator('#inspector-graphs .graph-grid>article').count()===3,'right side has exactly three period panels');
  check(await page.locator('#inspector-graphs #foodweb-diagram,#inspector-graphs #biomass-pyramid').count()===0,'no current-only diagram remains in the period panels');
  const currentHTML=await page.locator('#current-summary').innerHTML();
  await page.locator('.graph-analysis').evaluate(e=>e.open=true);await page.locator('#graph-turn').fill('0');await page.locator('#graph-turn').dispatchEvent('input');await page.locator('#graph-species').selectOption('all');
  check(await page.locator('#current-summary').innerHTML()===currentHTML,'past reference and graph target cannot rewind current summary');
  await page.click('#graph-latest');await page.locator('#graph-species').selectOption('main');await page.locator('.graph-analysis').evaluate(e=>e.open=false);
  const before=await page.evaluate(()=>__LIFE_TEST__.fingerprint()),layouts=[];
  for(const size of [{width:1920,height:1080},{width:1366,height:768}]){
    await page.setViewportSize(size);await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(200);
    const layout=await page.evaluate(()=>{const ids=['board','current-donut','current-overall','graph-stacked','composition-phases','composition-sex','composition-ages','graph-relations','foodweb-diagram','biomass-pyramid','foodweb-leaders','pyramid-support','map-key'];const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}};const pane=document.querySelector('.workspace>.inspector');return {viewport:[innerWidth,innerHeight],panels:ids.map(id=>({id,...rect(document.getElementById(id))})),inspector:{...rect(pane),client:pane.clientHeight,scroll:pane.scrollHeight},horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,mode:__PLANE_R__.view.mode,draw:__LIFE_TEST__.snapshot().render,expected:__LIFE_TEST__.snapshot().world.organisms.length};});
    await fs.writeFile(path.join(out,`layout-${size.width}.json`),JSON.stringify(layout,null,2));
    await page.screenshot({path:path.join(out,`layout-${size.width}.png`)});
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
  check(await page.locator('#plane-separation').isHidden()&&!await page.locator('#plane-separation').isChecked(),'withdrawn plane separation is unavailable and off');await page.check('#simplified');
  check(await page.evaluate(()=>__PLANE_R__.view.simplified),'simplified view remains available near');await page.uncheck('#simplified');
  await page.locator('.map-key-extra>summary').click();
  for(const group of ['basal','prey','P','Q','resource']){check(!await page.locator('#names-'+group).isChecked(),'non-main labels default OFF '+group);await page.check('#names-'+group);await page.uncheck('#names-'+group);}
  check(await page.locator('#resource-key [data-resource]').count()===8,'all resource symbols retained in disclosure');
  await page.locator('.map-key-extra>summary').click();
  await page.locator('.observation-conditions>summary').click();check(await page.locator('#active-mode').isVisible(),'effective observation conditions available');await page.locator('.observation-conditions>summary').click();
  await page.evaluate(()=>{const w=__LIFE_TEST__.snapshot().world,o=w.organisms.find(o=>o.slot==='main');__LIFE_TEST__.select(o.cell,o.id);});check(await page.locator('#inspector-details').isVisible(),'individual detail has its own pane');
  check(await page.locator('#inspector-graphs').isVisible(),'selecting an individual retains all timelines');
  check(await page.evaluate(()=>document.getElementById('current-donut').getBoundingClientRect().width>=175),'current-composition donut is enlarged');
  const split=await page.evaluate(()=>{const g=document.getElementById('inspector-graphs').getBoundingClientRect(),d=document.getElementById('inspector-details').getBoundingClientRect(),b=document.getElementById('board').getBoundingClientRect();return {separate:g.right<=d.left,right:b.right<=g.left,graphHeight:g.height,detailHeight:d.height};});
  check(split.separate&&split.right&&split.graphHeight>300&&split.detailHeight>300,'graph and creature have separate full-height right-side columns');
  await page.waitForFunction(()=>!__LIFE_TEST__.snapshot().render.terrainPending,{},{timeout:20000,polling:150});
  const terrain=await page.evaluate(()=>__PLANE_R__.__terrainAudit());
  check(terrain.mean<1&&terrain.over16<.01,'worker terrain matches the same full-resolution main-thread painting');
  await fs.writeFile(path.join(out,'terrain-comparison.json'),JSON.stringify(terrain,null,2));
  await page.screenshot({path:path.join(out,'selected-separate.png')});
  await page.click('#close-species');check(await page.locator('#inspector-graphs').isVisible(),'closing detail restores three panels');
  await page.screenshot({path:path.join(out,'near.png')});
  await page.locator('.graph-analysis>summary').click();check(await page.locator('#information-readout').isVisible(),'information observations retained in expandable analysis');check((await page.locator('.graph-analysis').textContent()).includes('関与個体率'),'measurement limitations remain available');await page.locator('.graph-analysis>summary').click();
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===before,'all presentation changes preserve biological fingerprint');
  await page.evaluate(()=>{const w=__LIFE_TEST__.snapshot().world,o=w.organisms.find(o=>o.slot==='main');__LIFE_TEST__.select(o.cell,o.id);__LIFE_TEST__.step();});
  check(await page.locator('#inspector-details').isVisible()&&Number(await page.locator('#current-summary').getAttribute('data-turn'))===await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn),'current summary updates alongside individual detail and timelines');await page.click('#close-species');
  await page.evaluate(()=>__LIFE_TEST__.finish());const record=(await page.evaluate(()=>__LIFE_TEST__.records())).find(r=>r.schema===2);
  await page.evaluate(()=>{__LIFE_TEST__.prepare({seed:'another-current-world',width:40,height:28,initial:40,lineages:'few',landscape:'templates',mapId:'river'});__LIFE_TEST__.stop();});
  const liveSummary=await page.locator('#current-summary').innerHTML();
  await page.click('#open-results');await page.locator(`[data-analyze="${record.id}"]`).click();await page.waitForSelector('#results-analysis:not([hidden])');
  check(await page.locator('#results-graph-host #current-summary #foodweb-diagram').count()===1,'archive analysis contains the complete unified summary');
  check(await page.locator('#current-summary').getAttribute('data-turn')===String(record.turn),'archive summary uses the saved final turn');
  const download=page.waitForEvent('download');await page.click('#export-record');await(await download).saveAs(path.join(out,'saved-result.json'));const saved=JSON.parse(await fs.readFile(path.join(out,'saved-result.json'),'utf8'));
  check((await page.locator('#current-overall').textContent())===saved.observation.rows.at(-1).current.summary.overall,'archive interpretation matches saved final original values');
  await page.click('#close-results');check(await page.locator('.observation-overview #current-summary').count()===1&&await page.locator('#inspector-graphs .graph-grid>article').count()===3,'closing archive restores current summary and three period panels');
  check(await page.locator('#current-summary').getAttribute('data-turn')==='0'&&await page.locator('#current-summary').innerHTML()===liveSummary,'archive close restores the different live world without mixing its data');
  await page.click('#focus-view');check(!await page.evaluate(()=>document.body.classList.contains('observatory')),'normal observation layout remains available');
  check(await page.evaluate(()=>document.getElementById('current-summary').getBoundingClientRect().bottom<=document.getElementById('board').getBoundingClientRect().top),'summary stays above map in normal layout');await page.click('#focus-view');
  await page.setViewportSize({width:820,height:900});await page.waitForTimeout(150);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'narrow layout scrolls vertically without horizontal overflow');
  check(await page.evaluate(()=>document.querySelector('.workspace>.inspector').getBoundingClientRect().top>=document.getElementById('map-key').getBoundingClientRect().bottom),'narrow fallback stacks timelines below the map without overlap');
  await page.setViewportSize({width:1366,height:768});
  check(await page.evaluate(()=>{const a=document.querySelector('#foodweb-diagram [data-relation="plant|prey"]');return a.getTotalLength()>=40;}),'relationship arrows have visible length between their boxes');
  await page.route('**/ecology/compute-worker.js',async route=>{const body=await fs.readFile(path.join(root,'ecology/compute-worker.js'),'utf8');await route.fulfill({contentType:'application/javascript',body:"const realPost=globalThis.postMessage.bind(globalThis);globalThis.postMessage=d=>d.type==='idle'?setTimeout(()=>realPost(d),2500):d.type==='turn'?setTimeout(()=>realPost(d),d.turn>=4?3000:400):realPost(d);\n"+body});});
  await page.evaluate(()=>{const w=__LIFE_TEST__.prepare({seed:'clarity-worker',width:40,height:28,initial:40,lineages:'few',mapId:'river'}),a=w.organisms.find(o=>o.slot==='main');__LIFE_TEST__.select(a.cell,a.id);});
  check(await page.locator('#detail-hold').textContent()==='観測を再開 ▶','stopped detail explicitly offers resume');
  await page.click('#detail-hold');
  await page.waitForFunction(()=>document.getElementById('status').textContent==='観測の準備中');
  await page.waitForTimeout(100);
  check(await page.locator('#status').textContent()==='観測の準備中','animation frames do not overwrite preparation status');
  await page.waitForFunction(()=>__LIFE_TEST__.snapshot().pending?.phase===1,{},{timeout:20000});
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().compute.busy),'first prepared turn displays before batch idle');
  check(await page.locator('#detail-hold').textContent()==='一時停止して観察','running detail explicitly offers pause');
  await page.click('#detail-hold');const turn=await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn);
  await page.waitForTimeout(1300);
  check(await page.evaluate(t=>!__LIFE_TEST__.snapshot().running&&__LIFE_TEST__.snapshot().world.turn===t,turn),'explicit detail pause holds the committed turn');
  check(await page.locator('#detail-hold').textContent()==='観測を再開 ▶','pause changes its label to resume');
  await page.click('#detail-hold');await page.waitForFunction(t=>__LIFE_TEST__.snapshot().world.turn>t,turn,{timeout:20000});
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().running),'same button resumes playback');
  await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('計算待ち'),{},{timeout:20000});
  await page.waitForTimeout(100);
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().running&&document.getElementById('status').textContent.startsWith('計算待ち')),'delayed turn remains running and visible as compute wait across frames');
  const waitingTurn=await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn);
  await page.waitForFunction(t=>__LIFE_TEST__.snapshot().world.turn>t,waitingTurn,{timeout:20000});
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().running),'compute wait resumes automatically when delayed turn arrives');
  await page.evaluate(()=>__LIFE_TEST__.stop());
  check(errors.length===0,'no browser exceptions or native dialogs');
  await fs.writeFile(path.join(out,'ui-report.json'),JSON.stringify({checks,layouts,errors,scope:'Linux Chromium; separate panes, current/archive summary, explicit pause/resume and real Worker with delayed idle; no 500T or Windows runtime claim'},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,errors}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
