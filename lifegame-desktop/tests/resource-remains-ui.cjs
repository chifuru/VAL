'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'artifacts/resource-remains');await fs.mkdir(out,{recursive:true});
 const root=path.resolve('src');const server=http.createServer(async(req,res)=>{try{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':'text/html');let data=await fs.readFile(f);if(f===path.join(root,'app.js'))data=Buffer.from(data.toString().replace('const renderer = R.create($("board"));','const renderer = R.create($("board"));window.__PLANE_R__=renderer;'));res.end(data);}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const checks=[],errors=[];
 const check=(v,name)=>{assert(v,name);checks.push(name);};
 try{
  browser=await chromium.launch({...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1460,height:1030}});page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>{errors.push('Unexpected native dialog: '+d.type());d.dismiss();});
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);




  await page.evaluate(source=>(0,eval)(source.replace('root.EcoArt = {','root.EcoArtBefore = {')),await fs.readFile('operations/evidence/resource-remains-v4.2.10/before-art.js','utf8'));await page.evaluate(()=>EcoArtBefore.ready);
  const resources=await page.evaluate(()=>{
    const A=EcoArt,old=EcoArtBefore,kinds=['seed','spore','egg','organic','mineral','droplet','factor','info'],checks=[],images={},check=(v,n)=>{if(!v)throw Error(n);checks.push(n);};
    function image(a,env,turn){const c=document.createElement('canvas');c.width=c.height=100;const before=JSON.stringify(a);A.resource(c.getContext('2d'),a,50,50,22,env,turn);check(before===JSON.stringify(a),'resource input unchanged');return c;}
    const sheet=document.createElement('canvas');sheet.width=1000;sheet.height=850;const g=sheet.getContext('2d');g.fillStyle='#0b252e';g.fillRect(0,0,1000,850);g.fillStyle='#cde5dd';g.font='18px sans-serif';g.fillText('資源8種 × 8環境（量3）／情報は滞留・浮遊するエネルギー',12,25);
    let row=0;for(const kind of kinds){const environments=new Set();for(let env=0;env<8;env++){const variants=[];for(const q of [1,3,6]){const a={kind,q,created:0,event:kind==='info'?{time:0}:null},c=image(a,env,0);variants.push(c.toDataURL());if(q===3){environments.add(c.toDataURL());g.drawImage(c,env*120,40+row*100);g.fillStyle='#d0e4d9';g.font='10px sans-serif';g.fillText(EcoState.FOOD[kind].name+' / '+EcoData.environments[env].name,env*120+5,132+row*100);}}check(new Set(variants).size===3,'quantity distinct '+kind+'/'+env);}check(environments.size===8,'environment distinct '+kind);row++;}
    images['resources-environments.png']=sheet.toDataURL().split(',')[1];const a={kind:'info',q:3,created:0,event:{time:0}},ages=[0,4,5,9,10,14,15,19,20],states=ages.map(t=>image(a,0,t).toDataURL());check(states[0]===states[1]&&states[2]===states[3]&&states[4]===states[5]&&states[6]===states[7],'freshness is constant inside each5T interval');check(new Set([states[0],states[2],states[4],states[6],states[8]]).size===5,'information has four freshness bands then expiration');const empty=image(a,0,20).getContext('2d').getImageData(0,0,100,100).data;check(!empty.some(v=>v),'information has no visible energy at20T');
    for(const sp of EcoData.main){const o={species:sp.id,phase:3,sex:'female',age:100,birthLife:300,branch3:0,branch4:0,dna:{appendage:.5}},c=[];for(const api of [old,A]){const canvas=document.createElement('canvas');canvas.width=canvas.height=100;api.creature(canvas.getContext('2d'),o,50,50,30);c.push(canvas.toDataURL());}check(c[0]===c[1],'main art unchanged '+sp.id);}
    return {checks,images,resourceStates:192};
  });checks.push(...resources.checks);for(const[n,b64]of Object.entries(resources.images))await fs.writeFile(path.join(out,n),Buffer.from(b64,'base64'));
  const f=await page.evaluate(()=>{
    const w=__LIFE_TEST__.prepare({seed:'dead-pq-review',width:40,height:28,initial:80,lineages:'few'}),S=EcoState,cell=w.organisms.find(o=>o.slot==='main').cell;
    w.turn=20;w.events=[];w.carcasses=['food','prey','main'].map((slot,i)=>{const a={id:'c:fixture:'+i,species:['grass','grassbug','solar'][i],slot,cell,q:3,E:3,M:1,G:1,created:19,expires:31,payloadExpires:24};a.infection=S.infection(w,'leafparasite',a.id);a.infection.q=S.hyper(w,a.infection.id);return a;});
    window.__REM_WORLD__=w;__LIFE_TEST__.stop();__PLANE_R__.setWorld(w);__LIFE_TEST__.select(cell,w.carcasses[2].id);__LIFE_TEST__.refresh();return {cell,ids:w.carcasses.map(a=>({body:a.id,P:a.infection.id,Q:a.infection.q.id}))};
  });const fingerprint=await page.evaluate(()=>__LIFE_TEST__.fingerprint());
  await page.click('#detail-view');
  for(const separated of [false,true]){
    await page.locator('#plane-separation').setChecked(separated);await page.evaluate(()=>__LIFE_TEST__.draw());
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().render.carcassParasites===6),'all three dead hosts show P/Q '+separated);
    for(const a of f.ids)for(const key of ['body','P','Q']){
      const loc=await page.evaluate(({cell,id})=>{const r=__PLANE_R__,p=r.screen(cell,id),box=document.querySelector('#board').getBoundingClientRect();return {point:p,hit:r.hitAt(box.x+p[0],box.y+p[1])};},{cell:f.cell,id:a[key]});
      check(loc.hit?.id===a[key],'separate dead-host hit '+key+'/'+a.body+'/'+separated+' '+JSON.stringify(loc));
    }
    await page.locator('#board').screenshot({path:path.join(out,separated?'near-dead-separated.png':'near-dead-normal.png')});
  }
  await page.evaluate(f=>__LIFE_TEST__.select(f.cell,f.ids[0].P),f);
  check((await page.locator('#selection').textContent()).includes('感染性死骸・地表'),'dead P uses common sidebar and describes infection window');
  await page.click('#follow-individual');check(await page.evaluate(()=>!!__LIFE_TEST__.snapshot().followId),'dead P can be followed without switching identity');
  await page.click('#fit');await page.evaluate(()=>__LIFE_TEST__.draw());check(await page.evaluate(()=>__LIFE_TEST__.snapshot().render.carcassParasites===6),'overview preserves dead P/Q markers');
  await page.locator('#board').screenshot({path:path.join(out,'far-dead.png')});
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===fingerprint,'all display operations preserve world fingerprint');
  await page.evaluate(()=>{const w=__REM_WORLD__;w.turn=24;__PLANE_R__.setWorld(w);__LIFE_TEST__.refresh();__LIFE_TEST__.draw();});
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().render.carcassParasites===0),'infection markers expire at exact payload deadline');
  check(!await page.locator('[data-observe="'+f.ids[0].P+'"]').count(),'expired P cannot be newly selected through dead-host buttons');
  check((await page.locator('#selection').textContent()).includes('消失'),'expired tracked identity is reported, not replaced');
  check(errors.length===0,'no browser errors or native dialogs');await fs.writeFile(path.join(out,'report.json'),JSON.stringify({checks,errors,resourceStates:resources.resourceStates,scope:'Linux Chromium fixed fixtures; no biology changes, long run or native Windows'},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,errors}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
