'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'artifacts/observation-controls');await fs.mkdir(out,{recursive:true});
 const root=path.resolve('src');const server=http.createServer(async(req,res)=>{try{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':'text/html');let data=await fs.readFile(f);if(f===path.join(root,'app.js'))data=Buffer.from(data.toString().replace('const renderer = R.create($("board"));','const renderer = R.create($("board"));window.__PLANE_R__=renderer;'));res.end(data);}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const checks=[],errors=[];
 const check=(v,name)=>{assert(v,name);checks.push(name);};
 try{
  browser=await chromium.launch({...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1460,height:1030}});page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>{errors.push('Unexpected native dialog: '+d.type());d.dismiss();});
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);



  const fixture=await page.evaluate(()=>{
    const w=__LIFE_TEST__.prepare({seed:'controls-review',width:40,height:28,initial:80,lineages:'few',landscape:'templates',mapId:'river'}),S=EcoState;
    const cell=w.organisms.find(o=>o.slot==='main').cell;
    w.organisms=w.organisms.filter(o=>o.cell!==cell);
    const add=(species,id)=>{const o=S.organism(w,S.D.byId[species],cell,id,{phase:2,age:40,E:60,HP:100,dna:Object.fromEntries(S.DNA.map(k=>[k,.5]))});w.organisms.push(o);return o;};
    window.__CONTROL_WORLD__=w;const m=add('solar','controls-main'),p=add('grass','controls-plant'),prey=add('grassbug','controls-prey');
    m.infection=S.infection(w,'leafparasite',m.id);m.infection.q=S.hyper(w,m.infection.id);
    if(w.resources.length)w.resources[0].cell=cell;w.stats=EcoEngine.summarize(w);w.events=[];__LIFE_TEST__.stop();__PLANE_R__.setWorld(w);__LIFE_TEST__.select(cell,m.id);__LIFE_TEST__.refresh();return {cell,main:m.id,plant:p.id,prey:prey.id,P:m.infection.id,Q:m.infection.q.id};
  });
  const fingerprint=await page.evaluate(()=>__LIFE_TEST__.fingerprint());
  for(const group of ['basal','prey','P','Q','resource'])check(!await page.locator('#names-'+group).isChecked(),'name default OFF '+group);
  await page.click('#detail-view');
  await page.evaluate(()=>{__PLANE_R__.view.scale=150;__PLANE_R__.focus(__LIFE_TEST__.snapshot().view.selected,__LIFE_TEST__.snapshot().selectedId);__LIFE_TEST__.draw();});
  await page.click('#close-species');await page.evaluate(()=>__LIFE_TEST__.draw());
  const initial=await page.evaluate(()=>__LIFE_TEST__.snapshot().render);
  check(initial.drawn>0 && initial.nameLabels.main>0,'main bodies and main names remain visible');
  check(['basal','prey','P','Q','resource'].every(k=>initial.nameLabels[k]===0),'nonmain names initially hidden');
  for(const group of ['basal','prey','P','Q','resource']){
    await page.check('#names-'+group);await page.evaluate(()=>__LIFE_TEST__.draw());
    const diag=await page.evaluate(()=>__LIFE_TEST__.snapshot().render);
    check(diag.nameLabels[group]>0,'name group enabled '+group);
    check(diag.drawn===initial.drawn,'name toggle preserves bodies '+group);
    await page.uncheck('#names-'+group);
  }
  await page.check('#names-prey');await page.uncheck('#status-marks');await page.evaluate(()=>__LIFE_TEST__.draw());
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().render.nameLabels.prey>0&&__LIFE_TEST__.snapshot().render.statusBadges===0),'status marks can be hidden independently of names');
  await page.check('#status-marks');await page.uncheck('#names-prey');await page.evaluate(()=>__LIFE_TEST__.draw());
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().render.nameLabels.prey===0&&__LIFE_TEST__.snapshot().render.statusBadges>0),'names can be hidden independently of status marks');
  for(const [key,id]of [['basal',fixture.plant],['prey',fixture.prey],['P',fixture.P],['Q',fixture.Q]]){
    await page.evaluate(({cell,id})=>{__LIFE_TEST__.select(cell,id);__LIFE_TEST__.draw();},{cell:fixture.cell,id});
    check(await page.evaluate(k=>__LIFE_TEST__.snapshot().render.nameLabels[k]>0,key),'selected name exception '+key);
  }
  await page.click('#close-species');
  for(const id of ['solar','grass','leafparasite','hyperparasite'])await page.check('[data-highlight="'+id+'"]');
  await page.evaluate(()=>__LIFE_TEST__.draw());
  const highlight=await page.evaluate(cell=>__LIFE_TEST__.snapshot().render.highlightedCells.find(x=>x.cell===cell),fixture.cell);
  check(highlight.ids.length===4&&new Set(highlight.colors).size===4,'four co-located lineages have separate fixed outlines');
  check(await page.evaluate(()=>EcoData.species.every(s=>document.querySelector('[data-species="'+s.id+'"]').style.getPropertyValue('--presence-color')===EcoRenderer.highlightColor(s.id))),'legend and map share lineage color');
  await page.click('#clear-highlights');
  for(const id of ['hyperparasite','leafparasite','grass','solar'])await page.check('[data-highlight="'+id+'"]');
  await page.evaluate(()=>__LIFE_TEST__.draw());
  check(JSON.stringify(highlight)===JSON.stringify(await page.evaluate(cell=>__LIFE_TEST__.snapshot().render.highlightedCells.find(x=>x.cell===cell),fixture.cell)),'highlight colors and outline order independent of checking order');
  await page.click('#fit');await page.evaluate(()=>__LIFE_TEST__.draw());
  check(await page.evaluate(cell=>{const m=__LIFE_TEST__.snapshot().render.highlightedCells.find(x=>x.cell===cell);return m.ids.length===4&&m.mode==='split-perimeter';},fixture.cell),'overview separates co-located colors along the perimeter');
  await page.locator('#board').screenshot({path:path.join(out,'far-highlights.png')});
  await page.evaluate(f=>__PLANE_R__.focus(f.cell,f.main),fixture);
  await page.locator('[data-describe="solar"]').click();
  check(await page.locator('#species-info').isVisible(),'lineage explanation is visible');
  check(await page.locator('#species-info').evaluate(e=>e.tagName==='SECTION'&&!!e.closest('.inspector')&&getComputedStyle(e).position==='static'),'lineage explanation uses shared sidebar, no floating dialog');
  check(await page.locator('#selection').isHidden(),'lineage and individual views do not overlap');
  await page.screenshot({path:path.join(out,'lineage-sidebar.png')});
  await page.locator('[data-describe="solar"]').click();
  check(await page.locator('#species-info').isHidden(),'same lineage toggles explanation off');
  check(await page.locator('[data-highlight="solar"]').isChecked(),'closing detail preserves independent highlights');
  await page.evaluate(f=>__LIFE_TEST__.select(f.cell,f.main),fixture);
  check(await page.locator('#selection').isVisible()&&await page.locator('#species-info').isHidden(),'board individual uses same sidebar');
  await page.click('#close-species');
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().selectedId===null),'close detail clears individual selection');
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===fingerprint,'all display actions preserve biological fingerprint');
  // Keep a focused lineage node alive in DOM, hide it safely when extinct, then restore.
  
  
  await page.locator('[data-describe="grassbug"]').focus();
  await page.evaluate(()=>{
    const w=window.__CONTROL_WORLD__;w.savedPrey=w.organisms.filter(o=>o.species==='grassbug');w.organisms=w.organisms.filter(o=>o.species!=='grassbug');w.stats=EcoEngine.summarize(w);__LIFE_TEST__.refresh();
  });
  check(await page.locator('[data-species="grassbug"]').isHidden(),'zero population hides current presence row');
  check(await page.locator('#clear-highlights').evaluate(e=>e===document.activeElement),'extinction moves focus to stable clear control');
  check((await page.locator('#presence-note').textContent()).includes('0'),'extinction is announced');
  await page.locator('[data-describe="solar"]').click();
  await page.evaluate(()=>{const w=window.__CONTROL_WORLD__;w.organisms.push(...w.savedPrey);delete w.savedPrey;w.stats=EcoEngine.summarize(w);__LIFE_TEST__.refresh();});
  check(await page.locator('[data-species="grassbug"]').isVisible(),'returning lineage restores same presence row');
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===fingerprint,'fixture restoration returns exact fingerprint');
  await page.evaluate(()=>{__PLANE_R__.view.scale=150;__LIFE_TEST__.draw();});
  for(const group of ['basal','prey','P','Q','resource'])await page.check('#names-'+group);
  await page.locator('#board').screenshot({path:path.join(out,'near-names-and-highlights.png')});
  await page.click('#change-world');check(await page.locator('#species-info').isHidden(),'setup return clears old lineage explanation');
  await page.click('#cancel-settings');
  await page.evaluate(()=>__LIFE_TEST__.prepare({seed:'new-controls-review',width:40,height:28,initial:80,lineages:'few'}));
  check(await page.evaluate(()=>!__LIFE_TEST__.snapshot().view.highlights.length),'new world clears prior presence selections');
  check(await page.locator('#species-info').isHidden(),'new world has no stale lineage explanation');
  await page.setViewportSize({width:820,height:900});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'display settings fit narrow viewport');
  await page.screenshot({path:path.join(out,'narrow-controls.png')});
  check(errors.length===0,'no browser errors or native dialogs');
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify({checks,errors,highlight,scope:'Linux Chromium, fixed shared-cell fixture, display only; no long biology or native Windows'},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,errors}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
