'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
const root=path.resolve('src'),out=path.resolve(process.env.LIFEGAME_EVIDENCE||'artifacts/dedicated-variants-v4.2.2'),errors=[],checks=[];await fs.mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{try{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.png')?'image/png':f.endsWith('.css')?'text/css':'text/html');res.end(await fs.readFile(f));}catch{res.writeHead(404).end();}});
await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});let browser;
try{
browser=await chromium.launch({...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1460,height:1030}});page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
const report=await page.evaluate(()=>{
const A=EcoArt,S=EcoState,M=A.manifest,checks=[],results=[],images={};if(!A.loaded)throw Error('Assets failed '+A.errors);checks.push('all production images decode');
if(S.D.main.length!==21||Object.keys(M.branches).length!==21)throw Error('Missing dedicated family');checks.push('all 21 main families have dedicated branch selectors');
const W=154,H=176;
for(let page=0;page<3;page++){
 const families=S.D.main.slice(page*7,page*7+7),canvas=document.createElement('canvas');canvas.width=W*9;canvas.height=64+H*families.length;const g=canvas.getContext('2d');g.fillStyle='#071c24';g.fillRect(0,0,canvas.width,canvas.height);g.fillStyle='#cce5df';g.font='18px sans-serif';g.fillText('LIFE LAB 4.2.2 / 系統固有の分岐 '+(page+1)+'/3',14,25);g.font='12px sans-serif';g.fillText('III相：採食・機動・戦闘 → IV相：効率・蓄積・探索・適応・攻勢・防衛 / 成体・雄を固定',14,49);
 for(let row=0;row<families.length;row++){
  const s=families[row],branch=M.branches[s.id],count=s.phases.length===3?3:9,hashes=new Set();if(branch.regions.length!==count)throw Error('Wrong branch count '+s.id);
  for(let j=0;j<9;j++){
   const x=j*W,y=64+row*H;g.fillStyle=row%2?'#122c34':'#0b242b';g.fillRect(x+2,y+2,W-4,H-4);g.fillStyle='#cae4df';g.font='11px sans-serif';g.fillText(s.name,x+7,y+18);if(j>=count){g.fillText('第三相で完結',x+7,y+88);continue;}
   const phase=j<3?3:4,b3=j<3?j:Math.floor((j-3)/2),b4=j<3?0:(j-3)%2,o={species:s.id,phase,branch3:b3,branch4:b4,sex:'male',role:s.id==='swarm'?'male':null,age:100,birthLife:300,dna:{appendage:.5},facing:0};const before=JSON.stringify(o),c=document.createElement('canvas');c.width=c.height=150;const ctx=c.getContext('2d');if(!A.creature(ctx,o,75,75,45))throw Error('Render missing '+s.id);const p=ctx.getImageData(0,0,150,150).data;let alpha=0;for(let k=3;k<p.length;k+=4)if(p[k]>32)alpha++;if(alpha<80)throw Error('Empty '+s.id+'/'+j);hashes.add(c.toDataURL());if(before!==JSON.stringify(o))throw Error('Input mutated');g.drawImage(c,x+2,y+20,150,150);g.fillStyle='#a2bfc5';g.fillText(phase+'相 '+(b3+1)+(phase===4?'-'+(b4+1):''),x+7,y+H-8);
  }
  if(hashes.size!==count)throw Error('Duplicate rendered branches '+s.id);results.push({id:s.id,frames:count,distinct:hashes.size});
 }
 images['branches-'+(page+1)+'.png']=canvas.toDataURL().split(',')[1];
}
checks.push('all 183 branch variants render nonempty and are pixel-distinct within each family');checks.push('early-maturing lineage has three phaseIII branches and no phaseIV');checks.push('all branch render inputs remain unchanged');
const fallback=[];for(const phase of [3,4]){const c=document.createElement('canvas');c.width=c.height=150;A.creature(c.getContext('2d'),{species:'precocial',phase,branch3:1,sex:'male',age:100,birthLife:300,dna:{appendage:.5}},75,75,45);fallback.push(c.toDataURL());}if(fallback[0]!==fallback[1])throw Error('Invalid early phase input did not clamp to III');checks.push('out-of-range early phase display input safely falls back to III without adding a phase');return{results,checks,images};
});
for(const [f,b] of Object.entries(report.images))await fs.writeFile(path.join(out,f),Buffer.from(b,'base64'));checks.push(...report.checks);
if(process.env.LIFEGAME_ART_BASELINE){const baseline=await fs.readFile(process.env.LIFEGAME_ART_BASELINE,'utf8');await page.evaluate(code=>{(0,eval)(code.replace('root.EcoArt = {','root.EcoArtBaseline = {'));},baseline);await page.evaluate(()=>EcoArtBaseline.ready);const same=await page.evaluate(()=>{let cases=0;for(const s of EcoState.D.main)for(const phase of [1,2]){const images=[];for(const a of [EcoArtBaseline,EcoArt]){const c=document.createElement('canvas');c.width=c.height=150;a.creature(c.getContext('2d'),{species:s.id,phase,sex:'male',age:100,birthLife:300,dna:{appendage:.5},facing:0},75,75,45);images.push(c.toDataURL());}if(images[0]!==images[1])throw Error('Base phase changed '+s.id+'/'+phase);cases++;}return cases;});assert.equal(same,42);checks.push('all 42 phaseI/II renders match the pre-change drawing code pixel-for-pixel');}

await page.evaluate(()=>__LIFE_TEST__.prepare({seed:'dedicated-scene',width:40,height:28,initial:80,lineages:'few',mapId:'river'}));await page.evaluate(()=>__LIFE_TEST__.stop());const fingerprint=await page.evaluate(()=>__LIFE_TEST__.fingerprint());await page.click('#fit');await page.evaluate(()=>__LIFE_TEST__.draw());await page.locator('#board').screenshot({path:path.join(out,'far.png')});await page.click('#detail-view');await page.check('#plane-separation');await page.evaluate(()=>__LIFE_TEST__.draw());await page.locator('#board').screenshot({path:path.join(out,'near-separated.png')});assert.equal(await page.evaluate(()=>__LIFE_TEST__.fingerprint()),fingerprint);checks.push('far/detail/separated display preserves biological fingerprint');assert.equal(errors.length,0);checks.push('no browser exceptions');await fs.writeFile(path.join(out,'report.json'),JSON.stringify({checks,errors,families:report.results,scope:'Linux Chromium; explicit branch display fixtures; pixel distinction is not visual approval'},null,2)+'\n');console.log(JSON.stringify({checks,errors,frames:report.results.reduce((a,s)=>a+s.frames,0)}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
