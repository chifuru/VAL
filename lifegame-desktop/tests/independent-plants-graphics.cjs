'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve('src'),out=path.resolve(process.env.LIFEGAME_EVIDENCE||'artifacts/independent-plant-graphics'),checks=[],errors=[];
 await fs.mkdir(out,{recursive:true});
 const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.png')?'image/png':file.endsWith('.css')?'text/css':'text/html');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 let browser,passed=false;
 const check=(value,name)=>{assert(value,name);checks.push(name);};
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1460,height:1030}});page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
  check(await page.evaluate(()=>EcoArt.loaded&&Object.keys(EcoVisualManifest.producers).length===3),'three independent static atlases and original references decode');
  const coverage=await page.evaluate(()=>{
   const w=__LIFE_TEST__.prepare({seed:'plant-art-coverage',width:40,height:28,initial:32,lineages:'few',producerModel:'colony/1',largePlantModel:'independent/1'});__LIFE_TEST__.stop();
   const c=document.createElement('canvas');c.width=c.height=180;const g=c.getContext('2d'),forms=[[1,0,0],[2,0,0],[3,0,0],[3,1,0],[3,2,0],...[0,1,2].flatMap(b=>[[4,b,0],[4,b,1]])],hashes=new Set();let frames=0,portraits=true,transparent=true,indices=true,ages=true;
   const grid=document.createElement('canvas');grid.width=1980;grid.height=540;const ng=grid.getContext('2d');ng.fillStyle='#18372f';ng.fillRect(0,0,grid.width,grid.height);
   for(const [row,spec]of EcoState.D.independentPlants.entries()){
    const source=EcoState.organism(w,spec,0,'art-reference-'+spec.id),before=JSON.stringify(source);
    for(const [index,[phase,branch3,branch4]]of forms.entries()){
     const o={...source,phase,branch3,branch4,age:Math.floor(source.birthLife*.35)};
     g.clearRect(0,0,180,180);EcoArt.producer(g,o,90,90,58,0);const pixels=g.getImageData(0,0,180,180).data;
     transparent&&=pixels[3]===0&&pixels.at(-1)===0;hashes.add(c.toDataURL());frames++;indices&&=EcoArt.producerIndex(o)===index;ng.drawImage(c,index*180,row*180);
     const reference=EcoVisualManifest.producers[spec.id].references[index],f=reference.region,im=EcoArt.images[reference.sheet],manual=document.createElement('canvas');manual.width=manual.height=180;const m=manual.getContext('2d'),aspect=f[2]/f[3],size=58*2.6,W=size*Math.min(1,aspect),H=size*Math.min(1,1/aspect);
     m.drawImage(im,...f,90-W/2,90-H/2,W,H);g.clearRect(0,0,180,180);EcoArt.producerPortrait(g,o,90,90,58);portraits&&=c.toDataURL()===manual.toDataURL();
    }
    const ageFrames=[];for(const fraction of [0,.35,.95]){g.clearRect(0,0,180,180);EcoArt.producer(g,{...source,phase:3,branch3:0,age:Math.floor(source.birthLife*fraction)},90,90,58);ageFrames.push(c.toDataURL());}ages&&=new Set(ageFrames).size===3;
    if(JSON.stringify(source)!==before)throw Error('presentation mutated plant input');
   }
   globalThis.__plantArtGrid=grid.toDataURL();return {frames,distinct:hashes.size,portraits,transparent,indices,ages};
  });
  check(coverage.frames===33&&coverage.distinct===33&&coverage.indices,'all33 I II III3 IV6 forms select distinct intended atlas cells');
  check(coverage.portraits,'all33 portraits are pixel-identical to direct adopted-reference crops');
  check(coverage.transparent,'transparent atlases leave scene corners transparent');
  check(coverage.ages,'juvenile adult and elderly appearances stay distinct within the same phase');
  const grid=await page.evaluate(()=>__plantArtGrid);await fs.writeFile(path.join(out,'plant-art-33.png'),Buffer.from(grid.split(',')[1],'base64'));
  const fixture=await page.evaluate(()=>{
   const w=__LIFE_TEST__.prepare({seed:'plant-art-overlap',width:40,height:28,initial:32,lineages:'few',producerModel:'colony/1',largePlantModel:'independent/1'});__LIFE_TEST__.stop();
   const plant=w.organisms.find(o=>o.species==='forestcrown'),main=w.organisms.find(o=>o.slot==='main'),food=w.organisms.find(o=>o.slot==='food'),prey=w.organisms.find(o=>o.slot==='prey');
   for(const o of [main,food,prey])o.cell=plant.cell;w.organisms=[main,plant,food,prey];w.resources=[];w.carcasses=[];w.searchQ=[];w.events=[];w.stats=EcoEngine.summarize(w);__LIFE_TEST__.refresh();__LIFE_TEST__.select(plant.cell,plant.id);
   return {cell:plant.cell,ids:w.organisms.map(o=>o.id),fingerprint:__LIFE_TEST__.fingerprint()};
  });
  const hitIds=()=>page.evaluate(({cell,ids})=>{const b=document.querySelector('#board').getBoundingClientRect();return ids.map(id=>{const p=__LIFE_TEST__.screenForCell(cell,id);return __LIFE_TEST__.hitAt(b.left+p[0],b.top+p[1])?.id;});},fixture);
  await page.click('#fit');await page.waitForTimeout(140);assert.deepEqual(await hitIds(),fixture.ids);checks.push('four colocated main producer food prey bodies each retain far hit access');await page.locator('#board').screenshot({path:path.join(out,'plant-four-layer-far.png')});
  await page.click('#detail-view');await page.waitForTimeout(200);assert.deepEqual(await hitIds(),fixture.ids);checks.push('four colocated bodies each retain near hit access at their visible center');await page.locator('#board').screenshot({path:path.join(out,'plant-four-layer-near.png')});
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===fixture.fingerprint,'near far portraits and hit testing leave the settled biological world unchanged');
  check(errors.length===0,'no browser drawing exceptions');passed=true;
  console.log(JSON.stringify({checks:checks.length,coverage,errors}));
 }finally{await fs.writeFile(path.join(out,'graphics-report.json'),JSON.stringify({passed,checks,errors,scope:'Linux Chromium,33 adopted plant forms; exact original portraits; provisional static alpha atlas; four-layer display fixture only'},null,2)+'\n');if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
