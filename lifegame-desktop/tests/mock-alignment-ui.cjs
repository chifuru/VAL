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
  await page.evaluate(()=>__LIFE_TEST__.prepare({seed:'painted-river',width:40,height:28,initial:80,lineages:'few',mapId:'river'}));await page.waitForTimeout(120);
  check(await page.evaluate(()=>EcoArt.loaded&&['ground','props'].every(k=>EcoArt.images[k].complete)),'both new production atlases decode with existing assets');
  check(await page.evaluate(()=>{const im=EcoArt.images.props,c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);const d=g.getImageData(0,0,c.width,c.height).data;let zero=0,solid=0;for(let i=3;i<d.length;i+=4){if(d[i]===0)zero++;if(d[i]>200)solid++;}return zero>1000&&solid>1000;}),'prop sheet has real transparency and painted tissue');
  const biology=await page.evaluate(()=>__LIFE_TEST__.fingerprint());await page.click('#focus-view');await page.waitForTimeout(120);
  check(await page.locator('#focus-view').getAttribute('aria-pressed')==='true'&&!(await page.locator('#setup').isVisible()),'focus mode hides editable setup and can be explicitly toggled');
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().render.mode==='simple'),'fit overview remains symbolic even when its cells exceed detail threshold');
  await page.screenshot({path:path.join(out,'natural-far.png'),fullPage:true});await page.locator('#board').screenshot({path:path.join(out,'natural-far-board.png')});
  await page.click('#detail-view');await page.waitForTimeout(120);
  check(await page.evaluate(()=>{const s=__LIFE_TEST__.snapshot();return s.view.mode==='detail'&&s.view.scale===160&&s.render.mode==='detail';}),'same selected location enters real-cell detail mode');
  await page.screenshot({path:path.join(out,'natural-near.png'),fullPage:true});await page.locator('#board').screenshot({path:path.join(out,'natural-near-board.png')});
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===biology,'focus, new scenery and far/near transitions preserve biology');
  await page.click('#zoom-in');await page.click('#zoom-in');await page.waitForTimeout(80);
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().view.scale>128),'close view can exceed former 128px limit');
  await page.click('#fit');await page.click('#focus-view');await page.waitForTimeout(100);
  check(await page.locator('#setup').isVisible()&&await page.locator('#focus-view').getAttribute('aria-pressed')==='false','leaving focus restores editable world controls');
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===biology,'return from focus and overview preserves biology');
  // Display fixture: selected phase-III animals, real river tiles, no biological stepping.
  await page.evaluate(()=>{
    const w=__LIFE_TEST__.prepare({seed:'shore-display-fixture',width:40,height:28,initial:80,mapId:'river'});
    const land=w.tiles.map((t,p)=>p).filter(p=>p%40>5&&p%40<34&&p>240&&p<800&&w.tiles[p].terrain==='plain'&&!w.tiles[p].blocked&&EcoState.nearby(w,p).some(q=>w.tiles[q].terrain==='shallow')).sort((a,b)=>EcoState.nearby(w,b,3).filter(p=>w.tiles[p].terrain==='rock'||w.tiles[p].cover==='boulder').length-EcoState.nearby(w,a,3).filter(p=>w.tiles[p].terrain==='rock'||w.tiles[p].cover==='boulder').length)[0];
    const cells=[land,...EcoState.nearby(w,land,1)].filter(p=>!w.tiles[p].blocked).slice(0,4);
    w.organisms=['solar','jelly','serpent','cephalopod'].map((id,i)=>EcoState.organism(w,EcoState.D.byId[id],cells[i],'display-'+id,{phase:3,age:40,branch3:i%3,dna:Object.fromEntries(EcoState.DNA.map(k=>[k,.5]))}));
    w.resources=[];w.carcasses=[];w.events=[];w.stats=EcoEngine.summarize(w);__LIFE_TEST__.refresh();__LIFE_TEST__.select(land,w.organisms[0].id);
  });
  const specimen=await page.evaluate(()=>__LIFE_TEST__.fingerprint());await page.click('#focus-view');await page.click('#fit');await page.waitForTimeout(100);await page.screenshot({path:path.join(out,'fixture-far.png'),fullPage:true});
  await page.click('#detail-view');await page.click('#zoom-in');await page.waitForTimeout(120);await page.screenshot({path:path.join(out,'fixture-near.png'),fullPage:true});await page.locator('#board').screenshot({path:path.join(out,'fixture-near-board.png')});
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===specimen,'phase-III display fixture is identical in far and detailed screenshots');
  await page.setViewportSize({width:640,height:1000});await page.waitForTimeout(100);
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'focused view fits narrow viewport');
  check(await page.evaluate(()=>EcoArt.images.adults.complete&&Object.keys(EcoVisualManifest.adults.regions).length===4),'four representative phase-III/IV replacement bodies are loaded');
  check(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=180;const g=c.getContext('2d');return new Set(['solar','jelly','serpent','cephalopod'].flatMap(species=>[3,4].map(phase=>{g.clearRect(0,0,180,180);EcoArt.creature(g,{species,phase,age:40,dna:{appendage:.5,skin:.5},sex:'female'},90,90,55,true);return c.toDataURL();}))).size===8;}),'all eight representative body renders are distinct');
  check(await page.locator('.committed-action').count()>0,'selection prioritizes a committed result instead of invented strategy');
  check(await page.locator('.specimen-hero .strategy-data').evaluate(e=>!e.open),'numeric behaviour parameters are initially collapsed');
  check(await page.evaluate(()=>{const w=__LIFE_TEST__.snapshot().world,before=JSON.stringify(w),c=EcoScenery.paint(w,EcoArt);return c.toDataURL()!==c.chart.toDataURL()&&JSON.stringify(w)===before;}),'cartographic and close-up backgrounds are separate rasters derived without changing world state');
  check(errors.length===0,'no browser exceptions');
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,checks,errors,natural:'painted-river, river map, 40x28, 80 initial main, turn0; same biological fingerprint far/near',fixture:'four explicitly placed phase-III organisms at a real river shore; display-only, not naturally evolved'},null,2)+'\n');console.log(JSON.stringify({ok:true,checks},null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
