"use strict";
const {chromium}=require('playwright'),assert=require('node:assert/strict'),
 fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
(async()=>{
 const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'artifacts/age-ui');await fs.mkdir(out,{recursive:true});
 const server=http.createServer(async(req,res)=>{try{
  const f=path.resolve('src','.'+new URL(req.url,'http://localhost').pathname);
  if(!f.startsWith(path.resolve('src')+path.sep)){res.writeHead(403).end();return;}
  res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':'text/html');res.end(await fs.readFile(f));
 }catch{res.writeHead(404).end();}});
 await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});
 const browser=await chromium.launch({...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1600,height:1100}}),checks=[],errors=[];
 page.on('pageerror',e=>errors.push(String(e)));const check=(v,n)=>{assert(v,n);checks.push(n);};
 try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
  await page.evaluate(()=>__LIFE_TEST__.prepare({seed:'age-ui',width:40,height:28,initial:80,lineages:'few'}));
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.config.ageModel==='life/1'),'new UI worlds use explicit age model');
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.organisms.every(o=>EcoState.ageInfo(o).stage==='juvenile'&&o.HP<=EcoState.phenotype(null,o).maxHP)),'founders start juvenile with bounded HP');
  const baseline=await page.evaluate(()=>__LIFE_TEST__.fingerprint());await page.check('#age-emphasis');await page.click('#detail-view');await page.click('#fit');
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===baseline,'age emphasis and zoom never change biology');
  check(await page.locator('.age-legend').isVisible(),'age glyph legend is permanently visible');
  // Labelled visual fixture: identical phase/DNA, different real age values.
  await page.evaluate(()=>{
   const w=__LIFE_TEST__.prepare({seed:'age-display-fixture',width:40,height:28,initial:4,lineages:'manual',selected:['solar']});
   const cells=w.tiles.map((t,p)=>p).filter(p=>Math.floor(p/40)===1&&!w.tiles[p].blocked).slice(8,11);
   w.organisms=cells.map((cell,i)=>{
    const o=EcoState.organism(w,EcoState.D.byId.solar,cell,'age-fixture-'+i,{phase:3,branch3:0,dna:Object.fromEntries(EcoState.DNA.map(k=>[k,.5]))});
    const a=EcoState.ageInfo(o);o.age=[0,a.matureAt+2,a.elderlyAt+2][i];o.HP=EcoState.phenotype(w,o).maxHP;return o;
   });w.events=[];w.stats=EcoEngine.summarize(w);__LIFE_TEST__.select(cells[0],w.organisms[0].id);
  });
  const portraits=[];
  for(let i=0;i<3;i++){
   await page.evaluate(i=>{const w=__LIFE_TEST__.snapshot().world,o=w.organisms[i];__LIFE_TEST__.select(o.cell,o.id);},i);
   await page.waitForTimeout(60);
   const stage=['juvenile','adult','elderly'][i];
   check(await page.locator('.specimen-hero [data-age-stage]').getAttribute('data-age-stage')===stage,stage+' observer matches age model at same phase III');
   await page.locator('.specimen-hero details.specimen-data').evaluate(e=>e.open=true);
   check((await page.textContent('.specimen-hero')).includes('通常姿勢の攻防'),stage+' shows base, age and effective ability breakdown');
   portraits.push(await page.locator('.specimen-hero canvas.portrait').evaluate(c=>c.toDataURL()));
   await page.locator('.specimen-hero canvas.portrait').screenshot({path:path.join(out,stage+'-phase-III.png')});
  }
  check(new Set(portraits).size===3,'same-phase portraits differ by body proportions or age texture');
  const state=await page.evaluate(()=>__LIFE_TEST__.fingerprint());await page.click('#detail-view');await page.waitForTimeout(80);
  await page.screenshot({path:path.join(out,'near-age-fixture.png'),fullPage:true});await page.click('#fit');
  await page.screenshot({path:path.join(out,'far-age-fixture.png'),fullPage:true});
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===state,'fixture far/near transition preserves all biological state');
  await page.click('#open-guide');await page.click('[data-sheet="birth"]');
  check((await page.textContent('#guide-content')).includes('各相に幼体・成体・老齢'),'in-game sheet explains independent age and evolution axes');await page.click('#close-guide');
  await page.evaluate(()=>{__LIFE_TEST__.prepare({seed:'age-runtime',width:40,height:28,initial:80,lineages:'few'});for(let i=0;i<60;i++)__LIFE_TEST__.step();});
  check(await page.evaluate(()=>EcoEngine.invariants(__LIFE_TEST__.snapshot().world).length===0),'normal age-enabled simulation respects budgets and HP caps after 60 turns');
  await page.setViewportSize({width:640,height:1000});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'age controls do not overflow narrow layout');
  check(errors.length===0,'no browser exceptions');
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,checks,errors,visualFixture:'three solar phase-III individuals, identical DNA, explicitly assigned juvenile/adult/elderly ages; not naturally evolved specimens'},null,2)+'\n');
  console.log(JSON.stringify({ok:true,checks},null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
