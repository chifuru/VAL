'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');

test('empty terrain work is skipped with exact pixels and terrain bitmap ownership stays bounded',async()=>{
  const root=path.resolve(__dirname,'../src'),baseline='1b248aa',out=path.resolve(process.env.LIFEGAME_EVIDENCE||'artifacts/terrain-zero-work');await fs.mkdir(out,{recursive:true});
  const beforeHabitat=cp.execFileSync('git',['show',baseline+':lifegame-desktop/src/ecology/habitat.js'],{encoding:'utf8'}).replace('root.EcoHabitat =','root.EcoHabitatBaseline ='),
    beforeRenderer=cp.execFileSync('git',['show',baseline+':lifegame-desktop/src/ecology/renderer.js'],{encoding:'utf8'}).replace('root.EcoRenderer = api','root.EcoRendererBaseline = api'),
    index=await fs.readFile(path.join(root,'Index.html'),'utf8'),scripts=[...index.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]),at=scripts.indexOf('ecology/renderer.js');assert(at>=0);
  const fixture='<!doctype html><meta charset="utf-8"><body style="margin:0;background:#07171f">'+scripts.slice(0,at+1).map(src=>'<script src="'+src+'"></script>').join('')+'<script src="/baseline-habitat.js"></script><script src="/baseline-renderer.js"></script>';
  const server=http.createServer(async(req,res)=>{
    if(req.url==='/fixture.html'){res.setHeader('Content-Type','text/html');res.end(fixture);return;}
    if(req.url==='/favicon.ico')return res.writeHead(204).end();
    if(req.url==='/baseline-habitat.js'||req.url==='/baseline-renderer.js'){res.setHeader('Content-Type','application/javascript');res.end(req.url.includes('habitat')?beforeHabitat:beforeRenderer);return;}
    try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.png')?'image/png':'text/html');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let browser,result,passed=false;const errors=[],checks=[];
  try{
    browser=await require('playwright').chromium.launch({headless:true,...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:1400,height:1000}});page.on('pageerror',e=>errors.push(String(e)));
    await page.goto('http://127.0.0.1:'+server.address().port+'/fixture.html');await page.evaluate(()=>EcoArt.ready);
    result=await page.evaluate(async()=>{
      const checks=[],patches=[],projections=[],ownership=[],check=(v,n)=>{if(!v)throw Error(n);checks.push(n);},E=EcoEngine,S=EcoState,
        base=E.create({seed:'i11b/render-readonly',width:40,height:28,initial:4,lineages:'manual',selected:['solar'],enabled:{main:true,plant:false,fungus:false,prey:false,P:false,Q:false}}),currentHabitat=EcoHabitat;
      base.config={...base.config,width:8,height:8,mapFingerprint:'terrain-fixture',mapResolved:{id:'river'}};
      base.tiles=base.tiles.slice(0,64).map(t=>({...t,walls:[],blocked:false,cover:'none'}));base.organisms=[];base.resources=[];base.carcasses=[];base.searchQ=[];base.events=[];
      const worlds=[['land',()=>({terrain:'plain',env:3})],['water',()=>({terrain:'deep',env:0})],['mixed',(x,y)=>({terrain:x<3?'deep':x===3?'shallow':'plain',env:x<4?0:[5,4,1,2,7][Math.floor(y/2)%5]})]].map(([name,tile])=>({name,w:{...base,config:{...base.config,seed:'i11b/'+name},tiles:base.tiles.map((t,i)=>({...t,...tile(i%8,Math.floor(i/8))}))}}));
      const beforeInputs=worlds.map(({w})=>JSON.stringify(w)),sheet=document.createElement('canvas');sheet.width=1280;sheet.height=6*352;const sheetg=sheet.getContext('2d');
      const compare=(a,b)=>{const x=a.getContext('2d').getImageData(0,0,a.width,a.height).data,y=b.getContext('2d').getImageData(0,0,b.width,b.height).data;let different=0,max=0;for(let i=0;i<x.length;i++)if(x[i]!==y[i]){different++;max=Math.max(max,Math.abs(x[i]-y[i]));}return{differentChannels:different,maxChannelError:max};};
      for(const [caseIndex,{name,w}]of worlds.entries()){
        const P=EcoProjection.build(w),rect={x:2,y:2,w:4,h:4},row={name,cold:{},samples:{baseline:[],current:[]},metrics:{}},prepared={};let oldPatch,newPatch;
        for(const [label,H]of[['baseline',EcoHabitatBaseline],['current',currentHabitat]]){
          const h=H.create(w,P,EcoArt),start=performance.now(),patch=h.make(rect,128);prepared[label]=h;row.cold[label]=performance.now()-start;row.metrics[label]={...h.metrics};if(label==='baseline')oldPatch=patch.canvas;else newPatch=patch.canvas;
          const count=h.metrics.builds;check(h.make(rect,128).canvas===patch.canvas&&h.metrics.builds===count,name+' '+label+' cached patch remains reused');
        }
        row.comparison=compare(oldPatch,newPatch);check(row.comparison.differentChannels===0,name+' cold128px patch pixels exactly match baseline');
        check(compare(prepared.baseline.make(rect,64).canvas,prepared.current.make(rect,64).canvas).differentChannels===0,name+' reused mask at a second resolution keeps exact pixels');
        check(row.metrics.current.quiltCalls<12,name+' omits at least one empty material quilt');check(row.metrics.current.skippedLayers+row.metrics.current.skippedOverlays+row.metrics.current.skippedLandPatches>0,name+' records exact-empty work omitted');
        if(name==='water')check(row.metrics.current.skippedLandPatches===1,'all-zero dry mask omits the entire transparent land canvas');
        if(name==='mixed'){const wet=prepared.current.sample(4,3).wet;check(wet>0&&wet<1,'mixed comparison contains a fractional water/land boundary rather than only binary masks');}
        // Alternate order after both immutable texture sets are warm; each sample
        // still builds a fresh mask and patch, not a patch-cache hit.
        for(let repeat=0;repeat<3;repeat++)for(const [label,H]of(repeat%2?[['current',currentHabitat],['baseline',EcoHabitatBaseline]]:[['baseline',EcoHabitatBaseline],['current',currentHabitat]])){
          const h=H.create(w,P,EcoArt),start=performance.now();h.make(rect,128);row.samples[label].push(performance.now()-start);
        }
        for(const label of ['baseline','current']){const samples=[...row.samples[label]].sort((a,b)=>a-b);row.samples[label+'MedianMs']=samples[1];}patches.push(row);
        for(const [mode,scale]of[['far',24],['near',96]]){
          const pictures=[],timing={name,mode,scale};
          for(const [label,H]of[['baseline',EcoHabitatBaseline],['current',currentHabitat]]){
            EcoHabitat=H;const scene=EcoScenery.build(w,P),c=document.createElement('canvas');c.width=640;c.height=320;const g=c.getContext('2d'),cx=320-P.point(4,4)[0]*scale,cy=160-P.point(4,4)[1]*scale;
            g.fillStyle='#07171f';g.fillRect(0,0,640,320);g.translate(cx,cy);g.scale(scale,scale);
            const visible=(p,margin=1)=>p[0]*scale+cx>=-scale*margin&&p[1]*scale+cy>=-scale*margin&&p[0]*scale+cx<=640+scale*margin&&p[1]*scale+cy<=320+scale*margin;
            const start=performance.now();scene.surface(g,mode==='far'?null:visible,mode==='near',scale);timing[label+'Ms']=performance.now()-start;pictures.push(c);
            const y=caseIndex*704+(mode==='near'?352:0);sheetg.drawImage(c,label==='baseline'?0:640,y+25);sheetg.fillStyle='#e8e5cf';sheetg.font='16px sans-serif';sheetg.fillText(name+' '+mode+' '+label,label==='baseline'?10:650,y+20);
          }
          const diff=compare(...pictures);check(diff.differentChannels===0,name+' '+mode+' projected background pixels exactly match baseline');projections.push({...timing,...diff});
        }
      }
      EcoHabitat=currentHabitat;check(worlds.every(({w},i)=>JSON.stringify(w)===beforeInputs[i]),'terrain preparation and near/far projection leave all biological inputs byte-identical');check(EcoArt.errors.length===0,'all retained source artwork decodes');
      const nativeWorker=Worker,nativeBitmap=createImageBitmap,originalClose=ImageBitmap.prototype.close,closeCalls=new WeakMap(),instances=[],pixel=document.createElement('canvas');pixel.width=pixel.height=2;
      ImageBitmap.prototype.close=function(){closeCalls.set(this,(closeCalls.get(this)||0)+1);return originalClose.call(this);};
      class WorkerProbe{
        constructor(){this.posts=[];this.owned=[];this.terminated=false;instances.push(this);}
        postMessage(data,transfer=[]){this.posts.push({data,transfer});if(data.type==='init'){const moved=structuredClone(data,{transfer});this.owned=Object.values(moved.images);}}
        terminate(){this.terminated=true;for(const image of this.owned)image.close();this.owned=[];}
      }
      const pause=()=>new Promise(r=>setTimeout(r,0)),waitInit=async(worker)=>{for(let i=0;i<100&&!worker.posts.some(p=>p.data.type==='init');i++)await pause();return worker.posts.find(p=>p.data.type==='init');};
      try{
        Worker=WorkerProbe;createImageBitmap=async()=>nativeBitmap(pixel);
        for(const [label,R]of[['baseline',EcoRendererBaseline],['current',EcoRenderer]]){
          const c=document.createElement('canvas');c.style.cssText='width:400px;height:260px';document.body.append(c);const r=R.create(c),w=worlds[0].w;r.setWorld(w);r.fit();const first=instances.at(-1),init=await waitInit(first);check(!!init,label+' bitmap probe initialized');
          const sheets=Object.keys(init.data.images),expected=Object.values(EcoArt.manifest.terrain).map(e=>e.sheet).sort();
          if(label==='current')check(JSON.stringify(sheets.slice().sort())===JSON.stringify(expected),'only eleven manifest terrain sheets cross into the worker');else check(sheets.includes('habitat-props'),'baseline reproduces the unnecessary props transfer');
          check(init.transfer.length===sheets.length&&init.transfer.every((b,i)=>b===Object.values(init.data.images)[i]),label+' image bitmaps are passed in the transfer list');check(init.transfer.every(b=>b.width===0&&b.height===0),label+' transfer detaches sender bitmap ownership');
          const oldOverview=await nativeBitmap(pixel),epoch=init.data.epoch,P=EcoProjection.build(w);first.onmessage({data:{type:'overview',epoch,bitmap:oldOverview,bounds:P.bounds,ms:1}});r.draw();
          r.focus(S.index(w,4,4));r.draw();const request=first.posts.find(p=>p.data.type==='render').data,oldNear=await nativeBitmap(pixel);first.onmessage({data:{type:'surface',epoch,key:request.key,bitmap:oldNear,rect:request,metrics:{unit:128},ms:1}});
          r.view.x+=256;r.draw();const secondRequest=first.posts.filter(p=>p.data.type==='render').at(-1).data,nextNear=await nativeBitmap(pixel);first.onmessage({data:{type:'surface',epoch,key:secondRequest.key,bitmap:nextNear,rect:secondRequest,metrics:{unit:128},ms:1}});check(closeCalls.get(oldNear)===1,label+' replaced near bitmap closes once');
          r.setWorld({...w,config:{...w.config,seed:w.config.seed+'/second'}});const second=instances.at(-1);await waitInit(second);
          const overviewClosed=closeCalls.get(oldOverview)||0;ownership.push({label,sheets,overviewClosed,nearClosed:closeCalls.get(nextNear)||0,sourceRgbaBytes:sheets.reduce((sum,key)=>sum+EcoArt.images[key].width*EcoArt.images[key].height*4,0),probeTransferredBytes:sheets.length*2*2*4});
          check(overviewClosed===(label==='baseline'?0:1),label+' world-reset overview close matches the observed old/new ownership boundary');check(closeCalls.get(nextNear)===1,label+' reset closes the latest near bitmap');
          const stale=await nativeBitmap(pixel);first.onmessage({data:{type:'overview',epoch,bitmap:stale,bounds:P.bounds,ms:1}});check(closeCalls.get(stale)===1,label+' stale worker response bitmap closes once');if(!overviewClosed)oldOverview.close();second.terminate();c.remove();
        }
      }finally{for(const worker of instances)worker.terminate();Worker=nativeWorker;createImageBitmap=nativeBitmap;ImageBitmap.prototype.close=originalClose;}
      return {checks,patches,projections,ownership,png:sheet.toDataURL().split(',')[1]};
    });checks.push(...result.checks);assert.deepEqual(errors,[]);checks.push('no browser exceptions');await fs.writeFile(path.join(out,'background-comparison.png'),Buffer.from(result.png,'base64'));delete result.png;passed=true;console.log(JSON.stringify({checks:checks.length,patches:result.patches.map(r=>({name:r.name,cold:r.cold,baselineMedianMs:r.samples.baselineMedianMs,currentMedianMs:r.samples.currentMedianMs,metrics:r.metrics.current})),ownership:result.ownership}));
  }catch(error){errors.push(String(error));throw error;}finally{
    const hashes={};for(const file of ['src/ecology/habitat.js','src/ecology/renderer.js','tests/terrain-zero-work.test.cjs'])hashes[file]=crypto.createHash('sha256').update(await fs.readFile(path.resolve(__dirname,'..',file))).digest('hex');
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify({passed,baseline,...result,checks,errors,sourceHashes:hashes,scope:'Single Linux Chromium process; three fixed8x8 terrain fixtures; exact RGBA patch and near/far projection comparison; real tiny transferable ImageBitmaps with instrumented worker ownership; no500T or ecology model/performance generalization'},null,2)+'\n');await browser?.close();await new Promise(r=>server.close(r));
  }
});
