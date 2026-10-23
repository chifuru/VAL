'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{execFileSync}=require('node:child_process'),crypto=require('node:crypto');
const baseline='e8f36ad',out=path.resolve(process.env.LIFEGAME_EVIDENCE||'operations/evidence/graph-stack-work-v1'),benchmarkOnly=process.argv.includes('--benchmark-only');
function functions(source){
 const start=source.indexOf('  function stackShape(data){'),end=source.indexOf('  function renderCurrentSummary(',start);
 assert(start>=0&&end>start);return source.slice(start,end);
}
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const previous=execFileSync('git',['show',baseline+':lifegame-desktop/src/app.js'],{encoding:'utf8'}),current=await fs.readFile('src/app.js','utf8');
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const result=await page.evaluate(({before,after,benchmarkOnly})=>{
   const checks=[],comparisons=[];
   function check(condition,label){if(!condition)throw Error(label);checks.push(label);}
   const load=(source,getLength)=>new Function('getLength','const stackPaintCache=new WeakMap(),relationPaintCache=new WeakMap(),graphObservation=()=>({rows:{length:getLength()}});'+source+';return paintStack;')(getLength);
   const colors=(key,index)=>['#80c9c0','#7ba9db','#a698d9','#e0bc76','#e4acc5','#526773'][index%6];
   const row=(turn,values)=>({turn,values,total:Object.values(values).reduce((a,b)=>a+b,0)});
   const fixtures=[
    {name:'empty',data:[],width:320,height:120,scale:1},
    {name:'single and explicit maximum',data:[row(0,{female:7,male:4,none:0})],maximum:20,width:320,height:120,scale:1},
    {name:'zeros and absent values',data:[row(0,{a:0}),row(1,{b:5}),row(2,{a:1,b:0})],width:280,height:42,scale:2},
    {name:'fractions and large totals',data:[row(0,{a:.1,b:1e12,c:.3}),row(1,{a:.2,b:1,c:1e-8}),row(2,{a:1e-12,b:3,c:1e12})],width:427,height:137,scale:1.25},
    {name:'full history with new keys',data:Array.from({length:1501},(_,t)=>row(t,Object.fromEntries(Array.from({length:t<500?9:14},(_,i)=>['s'+i,(t*(i+3)%137)+(i%3?.25:0)])))),width:720,height:180,scale:2}
   ];
   let dpr=Object.getOwnPropertyDescriptor(window,'devicePixelRatio');
   function canvas(width,height,record=false){
    const c=document.createElement('canvas');c.getBoundingClientRect=()=>({width,height});const g=c.getContext('2d'),commands=[];
    if(record){const proxy=new Proxy(g,{get(target,k){const v=target[k];return typeof v==='function'?(...args)=>{commands.push([k,...args]);return v.apply(target,args);}:v;},set(target,k,v){commands.push(['set',k,v]);target[k]=v;return true;}});c.getContext=()=>proxy;}
    return {c,g,commands};
   }
   for(const f of benchmarkOnly?[]:fixtures){
    Object.defineProperty(window,'devicePixelRatio',{configurable:true,value:f.scale});
    const a=canvas(f.width,f.height,true),b=canvas(f.width,f.height,true),data=f.data,pa=load(before,()=>data.length),pb=load(after,()=>data.length);
    for(const phase of ['first','repeat','append','shorten','switch']){
     let use=data;
     if(phase==='append')data.push(row(data.length,{s0:9,new:13}));
     if(phase==='shorten')data.splice(Math.floor(data.length/2));
     if(phase==='switch')use=[row(0,{replacement:31})];
     a.commands.length=b.commands.length=0;
     const p1=phase==='switch'?load(before,()=>use.length):pa,p2=phase==='switch'?load(after,()=>use.length):pb;
     p1(a.c,use,colors,f.maximum);p2(b.c,use,colors,f.maximum);
     check(JSON.stringify(a.commands)===JSON.stringify(b.commands),f.name+': identical Canvas commands '+phase);
     const ap=a.g.getImageData(0,0,a.c.width,a.c.height).data,bp=b.g.getImageData(0,0,b.c.width,b.c.height).data;
     check(ap.length===bp.length&&ap.every((v,i)=>v===bp[i])&&a.c.getAttribute('aria-label')===b.c.getAttribute('aria-label'),f.name+': identical pixels and scale label '+phase);
    }
    comparisons.push({fixture:f.name,phases:5});
    // The fixture mutations above are intentional; separate frozen input below verifies read-only behavior.
   }
   const frozen=Object.freeze([Object.freeze(row(0,Object.freeze({a:3,b:4}))),Object.freeze(row(1,Object.freeze({a:2,b:5})))]);
   const frozenBefore=JSON.stringify(frozen);load(after,()=>2)(canvas(320,120).c,frozen,colors);check(JSON.stringify(frozen)===frozenBefore,'frozen input is not changed');
   Object.defineProperty(window,'devicePixelRatio',dpr);
   const T=20001,K=20;let turnReads=0;
   const long=Array.from({length:T},(_,t)=>({get turn(){turnReads++;return t;},values:Object.fromEntries(Array.from({length:K},(_,k)=>['k'+k,(t*(k+1))%71])),total:1500}));
   const pa=load(before,()=>T),pb=load(after,()=>T),ca=canvas(400,100),cb=canvas(400,100);
   turnReads=0;pa(ca.c,long,colors);const beforeReads=turnReads;
   turnReads=0;pb(cb.c,long,colors);const afterReads=turnReads;
   check(beforeReads===T*K*2&&afterReads===T,'long history: horizontal coordinate reads reduced from 2×series×turns to turns');
   // Time ordinary records; getter instrumentation above is only for read counts.
   const plain=long.map((r,t)=>({turn:t,values:r.values,total:r.total}));
   pa(ca.c,plain,colors);pb(cb.c,plain,colors);
   const samples={before:[],after:[]};
   for(let n=0;n<5;n++)for(const kind of n%2?['after','before']:['before','after']){
    const start=performance.now();(kind==='before'?pa:pb)(kind==='before'?ca.c:cb.c,plain,colors);(kind==='before'?ca.g:cb.g).getImageData(0,0,1,1);samples[kind].push(performance.now()-start);
   }
   const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
   return {checks,comparisons,long:{rows:T,series:K,beforeTurnReads:beforeReads,afterTurnReads:afterReads},timing:{milliseconds:samples,medianBefore:median(samples.before),medianAfter:median(samples.after),scope:'Synthetic full-point Canvas paint only, five alternating samples after warmup; includes readback. Not biological turn speed.'}};
  },{before:functions(previous),after:functions(current),benchmarkOnly});
  assert.equal(errors.length,0);result.checks.push('no uncaught browser exceptions');
  const report={ok:true,baseline,benchmarkOnly,source_sha256:crypto.createHash('sha256').update(current).digest('hex'),...result,errors};
  await fs.writeFile(path.join(out,benchmarkOnly?'timing.json':'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({ok:true,checks:result.checks.length,long:result.long,timing:result.timing}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
