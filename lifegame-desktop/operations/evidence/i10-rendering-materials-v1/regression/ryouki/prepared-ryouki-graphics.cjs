'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve('src'),out=path.resolve(process.env.LIFEGAME_EVIDENCE||'artifacts/ryouki-graphics'),checks=[],errors=[];await fs.mkdir(out,{recursive:true});
 const server=http.createServer(async(req,res)=>{try{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.png')?'image/png':f.endsWith('.css')?'text/css':'text/html');let body=await fs.readFile(f);if(f.endsWith('/app.js'))body=Buffer.from(body.toString().replace('const renderer = R.create($("board"));','const renderer = R.create($("board"));window.__I10_REGRESSION_RENDERER__=renderer;'));res.end(body);}catch{res.writeHead(404).end();}});
 await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});let browser,passed=false,coverage;
 const check=(value,name)=>{assert(value,name);checks.push(name);};
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1460,height:1030}});page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
  check(await page.evaluate(()=>EcoArt.loaded&&EcoVisualManifest.ryouki?.regions.length===13),'normal11 mutated2 atlas and five exact original sheets decode');
  coverage=await page.evaluate(()=>{
   const w=__LIFE_TEST__.prepare({seed:'ryouki-art-coverage',width:40,height:28,initial:12,lineages:'manual',selected:['ryouki'],ryoukiModel:'ryouki/1',producerModel:'colony/1',largePlantModel:'independent/1'});__LIFE_TEST__.stop();
   const source=w.organisms.find(o=>o.species==='ryouki'),before=JSON.stringify(source),forms=[[1,0,0],[2,0,0],[3,0,0],[3,1,0],[3,2,0],...[0,1,2].flatMap(b=>[[4,b,0],[4,b,1]])],all=[...forms.map(f=>[...f,false]),[2,0,0,true],[4,0,0,true]],hashes=new Set();
   const c=document.createElement('canvas');c.width=c.height=180;const g=c.getContext('2d'),grid=document.createElement('canvas');grid.width=2340;grid.height=180;const ng=grid.getContext('2d');ng.fillStyle='#193631';ng.fillRect(0,0,grid.width,180);let portraits=true,indices=true,transparent=true;
   for(const [index,[phase,branch3,branch4,mutated]]of all.entries()){
    const o={...source,phase,branch3,branch4,age:Math.floor(source.birthLife*.35),facing:0,ryouki:{...source.ryouki,mutated}};
    g.clearRect(0,0,180,180);EcoArt.ryouki(g,o,90,90,58,0);hashes.add(c.toDataURL());ng.drawImage(c,index*180,0);indices&&=EcoArt.ryoukiIndex(o)===index;const pixels=g.getImageData(0,0,180,180).data;transparent&&=pixels[3]===0&&pixels.at(-1)===0;
    const entry=EcoVisualManifest.ryouki,ref=entry.references[index],f=ref.region,manual=document.createElement('canvas');manual.width=manual.height=180;const m=manual.getContext('2d'),aspect=f[2]/f[3],size=58*2.8,W=size*Math.min(1,aspect),H=size*Math.min(1,1/aspect);m.drawImage(EcoArt.images[ref.sheet],...f,90-W/2,90-H/2,W,H);g.clearRect(0,0,180,180);EcoArt.ryoukiPortrait(g,o,90,90,58);portraits&&=manual.toDataURL()===c.toDataURL();
    const [x,y,w,h]=entry.regions[index],a=document.createElement('canvas');a.width=w;a.height=h;const n=a.getContext('2d');n.drawImage(EcoArt.images[entry.sheet],x,y,w,h,0,0,w,h);const data=n.getImageData(0,0,w,h).data;
    for(let p=0;p<w;p++)transparent&&=data[p*4+3]===0&&data[((h-1)*w+p)*4+3]===0;for(let p=0;p<h;p++)transparent&&=data[p*w*4+3]===0&&data[(p*w+w-1)*4+3]===0;
   }
   let mutationClasses=true;for(const [phase,b,c]of forms)mutationClasses&&=EcoArt.ryoukiIndex({...source,phase,branch3:b,branch4:c,ryouki:{...source.ryouki,mutated:true}})===(phase===4?12:11);
   const ages=[];for(const fraction of [0,.35,.95]){g.clearRect(0,0,180,180);EcoArt.ryouki(g,{...source,phase:3,branch3:1,age:Math.floor(source.birthLife*fraction)},90,90,58);ages.push(c.toDataURL());}
   globalThis.__ryoukiArtGrid=grid.toDataURL();return {frames:all.length,distinct:hashes.size,indices,portraits,transparent,mutationClasses,ages:new Set(ages).size,inputUnchanged:JSON.stringify(source)===before};
  });
  check(coverage.frames===13&&coverage.distinct===13&&coverage.indices,'all13 intended normal and mutated source cells render distinctly');
  check(coverage.mutationClasses,'all eleven phase and branch combinations retain phase while selecting the two mutation appearances');
  check(coverage.portraits,'all13 portraits are pixel-identical to the adopted original crops');
  check(coverage.transparent,'all13 complete atlas borders and rendered corners are fully transparent');
  check(coverage.ages===3&&coverage.inputUnchanged,'age display differs without changing phase branch mutation or source input');
  const grid=await page.evaluate(()=>__ryoukiArtGrid);await fs.writeFile(path.join(out,'ryouki-art-13.png'),Buffer.from(grid.split(',')[1],'base64'));
  const fixture=await page.evaluate(()=>{
   const w=__LIFE_TEST__.prepare({seed:'ryouki-art-cohabitation',width:40,height:28,initial:12,lineages:'manual',selected:['ryouki'],ryoukiModel:'ryouki/1',producerModel:'colony/1',largePlantModel:'independent/1'});__LIFE_TEST__.stop();
   const plant=w.organisms.find(o=>o.species==='forestcrown'),cell=plant.cell,actors=w.organisms.filter(o=>o.species==='ryouki').slice(0,3);for(const [i,o]of actors.entries()){o.cell=cell;o.phase=[1,3,4][i];o.age=Math.floor(o.birthLife*.35);o.branch3=i===0?null:i-1;o.branch4=i===2?1:null;o.ryouki.mutated=true;}
   const food=EcoState.organism(w,EcoState.D.byId.grass,cell,'gfx-grass'),prey=EcoState.organism(w,EcoState.D.byId.grassbug,cell,'gfx-prey');actors[2].infection=EcoState.infection(w,'leafparasite',actors[2].id,0);actors[2].infection.q=EcoState.hyper(w,actors[2].infection.id,0);
   w.organisms=[...actors,plant,food,prey];w.resources=[];w.carcasses=[];w.searchQ=[];w.events=[];w.stats=EcoEngine.summarize(w);EcoState.Ryouki.summary(w);__LIFE_TEST__.refresh();__LIFE_TEST__.select(cell,actors[0].id);
   return {cell,bodyIds:w.organisms.map(o=>o.id),attached:[actors[2].infection.id,actors[2].infection.q.id],fingerprint:__LIFE_TEST__.fingerprint()};
  });
  const hits=ids=>page.evaluate(({cell,ids})=>{const b=document.querySelector('#board').getBoundingClientRect();return ids.map(id=>{const p=__LIFE_TEST__.screenForCell(cell,id);return __LIFE_TEST__.hitAt(b.left+p[0],b.top+p[1])?.id;});},{cell:fixture.cell,ids});
  await page.click('#fit');await page.waitForTimeout(160);assert.deepEqual(await hits(fixture.bodyIds),fixture.bodyIds);checks.push('three mutated roommates and producer food prey each retain far hit access');await page.locator('#board').screenshot({path:path.join(out,'ryouki-six-body-far.png')});
  await page.click('#detail-view');await page.waitForTimeout(220);assert.deepEqual(await hits([...fixture.bodyIds,...fixture.attached]),[...fixture.bodyIds,...fixture.attached]);checks.push('six near bodies and attached P Q have separate exact-ID hit access');await page.waitForFunction(()=>window.__I10_REGRESSION_RENDERER__?.prepared===true,null,{timeout:30000});await page.evaluate(()=>__LIFE_TEST__.draw());await fs.writeFile(path.join(out,'near-ready.json'),JSON.stringify(await page.evaluate(()=>__LIFE_TEST__.snapshot().render),null,2)+'\n');await page.locator('#board').screenshot({path:path.join(out,'ryouki-six-body-near.png')});
  const status=await page.evaluate(()=>__LIFE_TEST__.snapshot().render);check(status.cohabitingMain===3&&status.nameLabels.main===3&&status.statusBadgesByGroup.main===3,'all three roommates retain name and status marks');
  for(const id of fixture.bodyIds.slice(0,3)){const p=await page.evaluate(({cell,id})=>{const b=document.querySelector('#board').getBoundingClientRect(),p=__LIFE_TEST__.screenForCell(cell,id);return [b.left+p[0],b.top+p[1]];},{cell:fixture.cell,id});await page.mouse.click(...p);check(await page.evaluate(()=>__LIFE_TEST__.snapshot().selectedId)===id,'real pointer selects roommate '+id);}
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===fixture.fingerprint,'far near portrait pointer and mark display leave the settled world unchanged');
  check(await page.evaluate(()=>{
   const E=EcoEngine,S=EcoState,w=E.create({seed:'ryouki-death-art',width:40,height:28,initial:4,lineages:'manual',selected:['ryouki'],ageModel:'life/1',ryoukiModel:'ryouki/1'});
   w.organisms=[2,4].map((phase,i)=>{const o=S.organism(w,S.D.ryouki,100,'dead-art-'+i,{phase,branch3:phase===4?2:0,branch4:phase===4?1:0,age:30,HP:0});o.ryouki.mutated=true;return o;});
   w.resources=[];w.carcasses=[];w.searchQ=[];w.pending=[];w.events=[];const total=S.totals(w);w.ledger={initialE:total.E,initialM:total.M,solar:0,sinks:0,Mloss:0};
   const ctx=E.context(w);E.prepare(w,ctx);for(const o of w.organisms)ctx.intents.set(o.id,{type:'stop',cell:o.cell,cost:0,path:[]});E.N.settle(w,ctx,E.P.fee);const deaths=[...ctx.events.values()].flat().filter(e=>e.type==='death');
   const c=document.createElement('canvas');c.width=c.height=180;const g=c.getContext('2d');
   return deaths.length===2&&w.carcasses.length===2&&deaths.every(event=>{
    const corpse=w.carcasses.find(a=>a.id==='c:'+event.id+':'+w.turn),expected=event.appearance.phase===4?12:11;
    if(!corpse?.appearance||EcoArt.ryoukiIndex(event.appearance)!==expected||EcoArt.ryoukiIndex(corpse.appearance)!==expected)return false;
    g.clearRect(0,0,180,180);if(!EcoArt.ryouki(g,event.appearance,90,90,58))return false;const eventArt=c.toDataURL();
    g.clearRect(0,0,180,180);if(!EcoArt.ryouki(g,corpse.appearance,90,90,58)||c.toDataURL()!==eventArt)return false;
    g.clearRect(0,0,180,180);return EcoArt.remains(g,corpse,90,90,58,false,w.turn)&&g.getImageData(0,0,180,180).data.some((v,i)=>i%4===3&&v>0);
   });
  }),'actual early and IV death records keep mutated indices in event carcass and remains artwork');
  check(errors.length===0,'no browser drawing exceptions');passed=true;console.log(JSON.stringify({checks:checks.length,coverage,errors}));
 }finally{await fs.writeFile(path.join(out,'graphics-report.json'),JSON.stringify({passed,checks,coverage,errors,scope:'Linux Chromium;13 adopted forms and exact portraits; three mutated Ryouki plus producer/food/prey and attached P/Q display fixture; final all-age/direction matte work remains I10'},null,2)+'\n');if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
