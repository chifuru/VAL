'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{chromium}=require('playwright');
(async()=>{
 const root=path.resolve('src'),out=path.resolve(process.env.LIFEGAME_EVIDENCE||'operations/evidence/i10-rendering-materials-v1/materials'),checks=[],errors=[];
 await fs.mkdir(out,{recursive:true});const check=(v,n)=>{assert(v,n);checks.push(n);},sha=b=>crypto.createHash('sha256').update(b).digest('hex');
 const registry=JSON.parse(await fs.readFile('design/parasite-runtime-v1/registry.json','utf8'));
 for(const source of registry.sources){const original=await fs.readFile(source.file),copy=await fs.readFile(source.runtimeCopy);check(sha(original)===source.sha256&&original.equals(copy)&&sha(copy)===source.copySha256,'retained approved original and runtime reference are byte-identical '+source.file);}
 for(const record of [...registry.edits,...registry.derived])check(sha(await fs.readFile(record.file))===record.sha256,'retained edit/atlas hash matches '+record.file);
 const reproduction=JSON.parse(await fs.readFile('operations/evidence/i10-rendering-materials-v1/materials/reproduction.json','utf8'));
 check(reproduction.passed&&reproduction.files.length===6&&(await Promise.all(reproduction.files.map(async r=>sha(await fs.readFile(r.file))===r.sha256))).every(Boolean),'independent static-pack reproduction hashes match current retained outputs');
 const q=registry.derived.find(a=>a.species==='hyperparasite');check(q.extraction[3].edit.endsWith('/hyperparasite-adult.png')&&q.extraction[3].originalReference.sheet==='hyperparasite-adult-reference-v1'&&registry.excluded.some(s=>s.includes('hyperparasite-four.png panel IV')),'Q IV uses only the adopted06 single-reference edit and excludes both obsolete IVs');
 const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
 await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});let browser,passed=false,coverage;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1460,height:1030}});page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
  const baseline=await fs.readFile('operations/evidence/i10-rendering-materials-v1/materials/before-art.js','utf8');await page.evaluate(source=>(0,eval)(source.replace('root.EcoArt =','root.EcoArtBefore =')),baseline);await page.evaluate(()=>EcoArtBefore.ready);
  const result=await page.evaluate(()=>{
   const checks=[],images={},check=(v,n)=>{if(!v)throw Error(n);checks.push(n);},A=EcoArt,S=EcoState;
   check(A.loaded&&['tideparasite','leafparasite','hyperparasite'].every(id=>A.images[A.manifest.parasites[id].sheet]),'all three adopted static parasite atlases decode');
   const canvas=document.createElement('canvas');canvas.width=canvas.height=220;const g=canvas.getContext('2d');
   const draw=(p,art=A,portrait=false)=>{g.clearRect(0,0,220,220);check((portrait?art.parasitePortrait:art.parasite)(g,p,110,105,78),'nonempty material route '+p.species+'/'+p.phase);return canvas.toDataURL();};
   const grid=document.createElement('canvas');grid.width=1980;grid.height=730;const gg=grid.getContext('2d');gg.fillStyle='#112831';gg.fillRect(0,0,1980,730);
   const all=[],distinct=new Set();let count=0;
   for(const [row,species]of ['tideparasite','leafparasite'].entries())for(const [formIndex,form]of ['A','B','C'].entries())for(let phase=1;phase<=3;phase++){
    const p={species,phase,age:40,birthLife:120,stage:'first',counter:0,primary:{version:'primary-state/1',formVersion:'primary-form/1',form}},index=formIndex*3+phase-1;
    check(A.parasiteIndex(p)===index&&A.parasiteMaterial(p).panel===form+'-'+['I','II','III'][phase-1],'saved P form and own phase select '+species+'/'+form+'/'+phase);
    const before=JSON.stringify(p),body=draw(p);distinct.add(body);all.push(p);count++;gg.drawImage(canvas,index*220,row*240);gg.fillStyle='#d6e6e9';gg.font='14px sans-serif';gg.fillText(species+' '+form+'-'+phase,index*220+9,row*240+226);
    check(draw({...p,stage:'terminal',counter:80,hostId:'other'})===body,'host lifecycle and identity cannot change own P material '+species+'/'+form+'/'+phase);check(JSON.stringify(p)===before,'P render input is immutable '+species+'/'+form+'/'+phase);
   }
   for(let phase=1;phase<=4;phase++){
    const p={species:'hyperparasite',phase,age:20,birthLife:80,maturity:12,hyper:{version:'hyper-state/1',state:phase===4?'adult':'larva'}};
    check(A.parasiteIndex(p)===phase-1,'Q keeps its own four-phase material '+phase);const before=JSON.stringify(p),body=draw(p);distinct.add(body);all.push(p);count++;gg.drawImage(canvas,(phase-1)*440+110,480);gg.fillStyle='#e4caec';gg.fillText('Q '+phase,(phase-1)*440+9,716);check(JSON.stringify(p)===before,'Q render input is immutable '+phase);
   }
   check(count===22&&distinct.size===22,'all22 adopted bodies remain distinct');images['parasite-material-22.png']=grid.toDataURL().split(',')[1];
   for(const p of all){
    const m=A.parasiteMaterial(p),c=document.createElement('canvas');c.width=c.height=384;const x=c.getContext('2d');x.drawImage(A.images[m.entry.sheet],...m.region,0,0,384,384);const alpha=x.getImageData(0,0,384,384).data;
    let clear=true,occupied=0;for(let y=0;y<384;y++)for(let xx=0;xx<384;xx++){const a=alpha[(y*384+xx)*4+3];if(a>30)occupied++;if((y<8||y>=376||xx<8||xx>=376)&&a)clear=false;}
    check(clear&&occupied>1000,'complete isolated transparent atlas padding '+p.species+'/'+m.panel);
    const reference=m.entry.references[m.index],f=reference.region,expected=document.createElement('canvas');expected.width=expected.height=220;const ex=expected.getContext('2d'),aspect=f[2]/f[3],size=78*2.6,W=size*Math.min(1,aspect),H=size*Math.min(1,1/aspect);ex.drawImage(A.images[reference.sheet],...f,110-W/2,105-H/2,W,H);check(draw(p,A,true)===expected.toDataURL(),'portrait is exact adopted source crop '+p.species+'/'+m.panel);
   }
   for(const species of ['tideparasite','leafparasite','hyperparasite'])for(let phase=1;phase<=4;phase++){
    const p={species,phase,stage:phase===1?'first':phase===3?'terminal':'middle',counter:9};check(A.parasiteMaterial(p)===null&&draw(p)===draw(p,EcoArtBefore),'flagless historical body pixels remain exact '+species+'/'+phase);
   }
   const p=all[0],q=all.at(-1);check(draw({...p,age:40})!==draw({...p,age:110}),'P ageing uses its own record without host maturity');
   check(new Set([0,20,70].map(age=>draw({...q,age}))).size===3,'Q juvenile adult elderly remain separate from own fourth phase');
   check(draw(q)!==draw({...q,phase:3}),'new IV autonomous Q is no longer the provisional III body');
   check(draw({...q,facing:0})!==draw({...q,facing:1}),'recorded facing can mirror existing anatomy without inventing another pose');
   const metrics={...A.parasiteMetrics};for(const p of all)draw(p);check(A.parasiteMetrics.builds===metrics.builds&&A.parasiteMetrics.hits>=metrics.hits+22,'repeat body frames reuse bounded sprite caches');
   const old=CanvasRenderingContext2D.prototype.getImageData;let reads=0;CanvasRenderingContext2D.prototype.getImageData=function(...a){reads++;return old.apply(this,a);};try{for(const p of all)draw({...p,age:p.birthLife-1});}finally{CanvasRenderingContext2D.prototype.getImageData=old;}
   check(reads===0,'new transparent bodies perform no runtime pixel scan or largest-component cleanup even on first elderly use');
   return{checks,images,coverage:{forms:count,distinct:distinct.size,legacyBodyComparisons:12,runtimePixelReads:reads,cacheBytes:A.cacheMetrics.bytes.parasites}};
  });
  checks.push(...result.checks);coverage=result.coverage;for(const [name,data]of Object.entries(result.images))await fs.writeFile(path.join(out,name),Buffer.from(data,'base64'));
  check(errors.length===0,'no Chromium exceptions');passed=true;console.log(JSON.stringify({passed,checks:checks.length,coverage,errors}));
 }catch(e){errors.push(String(e));throw e;}finally{await fs.writeFile(path.join(out,'materials-report.json'),JSON.stringify({passed,checks,errors,coverage,scope:'Linux Chromium/static pack; adopted P18+Q4; exact legacy body and adopted portraits; fixture-based material selection, no final visual approval, 500T survival or full-device performance claim'},null,2)+'\n');if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
