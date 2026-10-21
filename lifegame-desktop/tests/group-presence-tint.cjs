'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
  const root=path.resolve('src'),server=http.createServer(async(req,res)=>{
    try{const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(await fs.readFile(file));}
    catch{res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:1500,height:960}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');
    await page.evaluate(()=>EcoArt.ready);
    await page.evaluate(()=>__LIFE_TEST__.prepare({seed:'group-presence-tint',width:40,height:28,initial:80,lineages:'few',landscape:'templates',mapId:'river'}));
    await page.evaluate(()=>__LIFE_TEST__.stop());
    if(!await page.locator('#inspector-key').isVisible())await page.click('#inspector-tab-key');
    const before=await page.evaluate(()=>__LIFE_TEST__.fingerprint());
    await page.check('[data-group="main"] [data-highlight-group-color]');
    await page.evaluate(()=>__LIFE_TEST__.draw());
    const grouped=await page.evaluate(()=>{
      const s=__LIFE_TEST__.snapshot(),color=EcoRenderer.groupHighlightColor('main'),speciesByCell=new Map();
      for(const o of s.world.organisms)if(EcoData.byId[o.species].group==='main'){if(!speciesByCell.has(o.cell))speciesByCell.set(o.cell,new Set());speciesByCell.get(o.cell).add(o.species);}
      const seen=new Set();let valid=0;
      for(const m of s.render.highlightedCells){if(!m.groups.includes('main'))continue;const index=m.groups.indexOf('main');if(m.groupColors[index]!==color)return {valid:-1};valid++;for(const id of speciesByCell.get(m.cell)||[])seen.add(id);}
      return {valid,distinct:seen.size,group:s.view.highlightGroups,individual:s.view.highlights};
    });
    assert(grouped.valid>0&&grouped.distinct>=2&&grouped.group.join(',')==='main'&&grouped.individual.length===0,'different main lineages share one pale class tint');
    if(process.env.LIFEGAME_EVIDENCE)await page.locator('#board').screenshot({path:process.env.LIFEGAME_EVIDENCE});
    const first=page.locator('[data-group="main"] .map-key-item:not([hidden]) [data-highlight]').first();
    const id=await first.getAttribute('data-highlight');await first.check();await page.evaluate(()=>__LIFE_TEST__.draw());
    assert(await page.evaluate(id=>{const s=__LIFE_TEST__.snapshot();return s.view.highlightGroups.includes('main')&&s.view.highlights.join(',')===id&&s.render.highlightedCells.some(m=>m.ids.includes(id)&&m.groups.includes('main'));},id),'individual vivid outline combines with class tint');
    await page.click('#clear-highlights');await page.evaluate(()=>__LIFE_TEST__.draw());
    assert(await page.evaluate(()=>{const s=__LIFE_TEST__.snapshot();return !s.view.highlights.length&&!s.view.highlightGroups.length&&!s.render.highlightedCells.length;}),'clear removes both kinds of presence highlight');
    assert.equal(await page.evaluate(()=>__LIFE_TEST__.fingerprint()),before,'view controls do not alter biology');
    assert.deepEqual(errors,[],'no browser errors');
    console.log(JSON.stringify({passed:true,visibleCells:grouped.valid,distinctMainSpecies:grouped.distinct}));
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
