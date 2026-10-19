'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'artifacts/death-motion');await fs.mkdir(out,{recursive:true});
 const root=path.resolve('src');const server=http.createServer(async(req,res)=>{try{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':'text/html');let data=await fs.readFile(f);if(f===path.join(root,'app.js'))data=Buffer.from(data.toString().replace('const renderer = R.create($("board"));','const renderer = R.create($("board"));window.__PLANE_R__=renderer;'));res.end(data);}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const checks=[],errors=[];
 const check=(v,name)=>{assert(v,name);checks.push(name);};
 try{
  browser=await chromium.launch({...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1460,height:1030}});page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>{errors.push('Unexpected native dialog: '+d.type());d.dismiss();});
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);




  const f=await page.evaluate(()=>{
    const w=__LIFE_TEST__.prepare({seed:'motion-facts',width:40,height:28,initial:80,lineages:'few'}),S=EcoState,actor=w.organisms.find(o=>o.slot==='main'),cell=actor.cell;
    actor.species='solar';actor.phase=3;actor.branch3=0;actor.branch4=null;actor.sex='male';actor.age=100;actor.birthLife=300;
    const target=S.organism(w,S.D.byId.crystal,cell+1,'motion-target',{phase:3,age:100,E:60,HP:100,dna:{...actor.dna}});w.organisms=[actor,target];w.resources=[];w.searchQ=[];w.turn=20;
    const appearance={species:'solar',phase:4,branch3:2,branch4:1,sex:'female',role:null,age:280,birthLife:300,dna:{...actor.dna},facing:0};
    const a={id:'c:dead:fixture:20',species:'solar',slot:'main',cell,q:3,E:3,M:1,G:1,created:20,expires:32,infection:null,payloadExpires:null};
    w.carcasses=[a];w.events=[{id:'dead:fixture',type:'death',cell,appearance}];w.stats=EcoEngine.summarize(w);window.__MOTION_WORLD__=w;window.__MOTION_ACTOR__=actor;__LIFE_TEST__.stop();__PLANE_R__.setWorld(w,true);__LIFE_TEST__.select(cell,actor.id);__LIFE_TEST__.refresh();return {cell,id:actor.id,dead:a.id,target:target.id,targetCell:target.cell};
  });await page.click('#detail-view');
  check(await page.evaluate(id=>__PLANE_R__.deathAppearance(id).age===280&&__PLANE_R__.deathAppearance(id).phase===4,f.dead),'renderer stores exact death event appearance');
  check((await page.locator('#selection').textContent()).includes('死亡時: IV相'),'common sidebar describes measured death appearance');
  const raw=await page.evaluate(()=>{
    const A=EcoArt,images={},c=document.createElement('canvas');c.width=900;c.height=380;const g=c.getContext('2d');g.fillStyle='#0b252e';g.fillRect(0,0,c.width,c.height);g.fillStyle='#d3e7df';g.font='18px sans-serif';g.fillText('死亡時の姿：同じIV相・枝C2 / 雄 幼・成・老 → 雌 幼・成・老',10,25);const hashes=[];
    for(let i=0;i<6;i++){const sex=i<3?'male':'female',stage=i%3,appearance={species:'solar',phase:4,branch3:2,branch4:1,sex,age:[0,100,280][stage],birthLife:300,dna:{appendage:.5}},a={species:'solar',slot:'main',q:3,created:0,expires:12,appearance},part=document.createElement('canvas');part.width=part.height=140;const before=JSON.stringify(a);A.remains(part.getContext('2d'),a,70,70,38,false,0);if(before!==JSON.stringify(a))throw Error('snapshot input mutated');hashes.push(part.toDataURL());g.drawImage(part,i*150,50);g.font='12px sans-serif';g.fillText((sex==='male'?'雄':'雌')+' '+['幼体','成体','老齢'][stage],i*150+20,215);}
    if(new Set(hashes).size!==6)throw Error('death states not distinct');images['death-states.png']=c.toDataURL().split(',')[1];return images;
  });for(const[n,b]of Object.entries(raw))await fs.writeFile(path.join(out,n),Buffer.from(b,'base64'));check(true,'six death sex/age states stay distinct with identical phase and branch');
  const fingerprint=await page.evaluate(()=>__LIFE_TEST__.fingerprint()),kinds=[];
  const cases=[
    ['attack',{type:'attack',actualDamage:0,mitigated:0},false,false],
    ['hit',{type:'attack',actualDamage:3,mitigated:2},true,true],
    ['defend',{type:'defend'},false,false],
    ['graze',{type:'feed',sourceType:'plant',tag:'plant'},false,false],
    ['predate',{type:'feed',sourceType:'plant',tag:'animal'},false,false],
    ['fungal',{type:'feed',sourceType:'plant',tag:'fungal'},false,false],
    ['scavenge',{type:'feed',sourceType:'carcass',tag:'animal'},false,false],
    ['absorb',{type:'feed',sourceType:'resource',source:'r:'+f.cell+':info',tag:'info'},false,false],
    ['clear',{type:'clear'},false,false],['growth',{type:'growth'},false,false],['birth',{type:'birth'},false,false],['infection',{type:'infection'},false,false],['care',{type:'care'},false,false]
  ];
  for(const [kind,event,hit,block]of cases){
    await page.evaluate(({f,event})=>{const w=__MOTION_WORLD__;w.events=[{id:f.id,cell:f.cell,source:f.dead,to:f.cell,target:['attack','care'].includes(event.type)?f.target:undefined,...event,to:['attack','care'].includes(event.type)?f.targetCell:f.cell}];__PLANE_R__.setWorld(w,true);__PLANE_R__.view.animate=true;__PLANE_R__.view.duration=1000000;__LIFE_TEST__.draw();},{f,event});
    const d=await page.evaluate(()=>__LIFE_TEST__.snapshot().render);
    check(!!d.motionKinds[kind],'specific motion '+kind);check(!!d.motionKinds.hit===hit&&!!d.motionKinds.block===block,'impact and block require measured results '+kind);kinds.push(kind);
    if(kind==='scavenge')check(d.selectedMotionEndpoints.target===f.dead,'scavenging connects actual dead-host ID');
    if(['hit','graze','scavenge','defend'].includes(kind))await page.locator('#board').screenshot({path:path.join(out,kind+'.png')});
  }
  await page.uncheck('#motion');await page.evaluate(()=>__LIFE_TEST__.draw());check(await page.evaluate(()=>Object.keys(__LIFE_TEST__.snapshot().render.motionKinds).length===0),'motion OFF suppresses all action effects');await page.check('#motion');
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===fingerprint,'drawing and event presentation preserve biological fingerprint');
  await page.evaluate(()=>{const w=__MOTION_WORLD__;w.events=[];__PLANE_R__.setWorld(w);});check(await page.evaluate(id=>!!__PLANE_R__.deathAppearance(id),f.dead),'death appearance persists after transient event disappears');
  await page.evaluate(()=>{const w=__MOTION_WORLD__;w.carcasses=[];__PLANE_R__.setWorld(w);});check(await page.evaluate(id=>!__PLANE_R__.deathAppearance(id),f.dead),'dead display cache prunes consumed remains');
  await page.evaluate(()=>{const w=__MOTION_WORLD__;w.carcasses=[{id:'c:unknown:20',species:'solar',slot:'main',cell:__MOTION_ACTOR__.cell,q:3,E:1,M:0,G:0,created:20,expires:32}];__PLANE_R__.setWorld(w);__LIFE_TEST__.refresh();});check((await page.locator('#selection').textContent()).includes('死亡時の姿は未取得'),'unknown old remains explicitly fall back without inventing age/phase');
  check(errors.length===0,'no browser errors');await fs.writeFile(path.join(out,'report.json'),JSON.stringify({checks,errors,kinds,scope:'Linux Chromium fixed event fixtures; actual fact emission checked separately against previous model'},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,errors}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
