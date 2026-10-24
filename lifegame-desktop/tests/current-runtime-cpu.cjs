'use strict';
// Read-only diagnosis: one initial or retained late turn, never a long-run replay.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),inspector=require('node:inspector'),crypto=require('node:crypto'),{performance}=require('node:perf_hooks');
const M=require('../src/ecology/observation-model.js');require('../src/ecology/replay-version.js');
const [worldFile,out]=process.argv.slice(2);if(!worldFile||!out)throw Error('Pass current-state world and output.');
const w=JSON.parse(fs.readFileSync(worldFile)),E=M.model(w.config.advantageSettings),input=JSON.stringify(w),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
assert.equal(w.config.currentStateModel,'current-state/1');
const details={},restore=[],counts=a=>a.reduce((m,r)=>(m[r.kind]=(m[r.kind]||0)+1,m),{});
function wrap(owner,key,inspect){const f=owner[key];owner[key]=function(...args){inspect(...args);return f.apply(this,args);};restore.push(()=>owner[key]=f);}
wrap(E.N.CellResources,'acquire',(_w,_ctx,requests,canopies)=>{details.requests={total:requests.length,byKind:counts(requests),canopies:canopies.length,uniqueActors:new Set(requests.map(r=>r.actor)).size,bySource:counts(requests.map(r=>({kind:r.source?.kind||'none'})))};});
let maps=0,returns=0;wrap(E.S,'maps',()=>maps++);wrap(E.S.CellSpace,'deferMaterial',()=>returns++);
const session=new inspector.Session();session.connect();const post=(method,params={})=>new Promise((resolve,reject)=>session.post(method,params,(err,res)=>err?reject(err):resolve(res)));
(async()=>{
 await post('Profiler.enable');await post('Profiler.setSamplingInterval',{interval:1000});await post('Profiler.start');
 const t=performance.now();const next=E.step(w),elapsedMs=performance.now()-t;const {profile}=await post('Profiler.stop');session.disconnect();for(const f of restore)f();
 assert.equal(JSON.stringify(w),input);assert.deepEqual(E.invariants(next),[]);
 const parent=new Map();for(const n of profile.nodes)for(const child of n.children||[])parent.set(child,n.id);
 const nodes=new Map(profile.nodes.map(n=>[n.id,n])),self=new Map(),inclusive=new Map();let total=0;
 for(let i=0;i<profile.samples.length;i++){const id=profile.samples[i],dt=profile.timeDeltas[i]||0;total+=dt;self.set(id,(self.get(id)||0)+dt);for(let at=id;at!==undefined;at=parent.get(at))inclusive.set(at,(inclusive.get(at)||0)+dt);}
 const ranked=map=>[...map].sort((a,b)=>b[1]-a[1]).slice(0,40).map(([id,micros])=>{const f=nodes.get(id).callFrame;return {function:f.functionName||'(anonymous)',url:f.url.replace(path.resolve(__dirname,'..')+'/', ''),line:f.lineNumber+1,ms:micros/1000,percent:micros/total*100};});
 fs.writeFileSync(out,JSON.stringify({scope:'One diagnostic turn with V8 sampling and call counters; sampling adds overhead. Inclusive times overlap. Not comparable as an uninstrumented throughput result.',baseline:'6349562',signature:globalThis.EcoReplayVersion,mode:'retained-current',turn:w.turn,elapsedMs,samplingMs:total/1000,details:{...details,mapCalls:maps,materialReturnCalls:returns},topSelf:ranked(self),topInclusive:ranked(inclusive),inputHash:hash(input),worldHash:hash(JSON.stringify(next)),originalUnchanged:true,invariants:[]},null,2)+'\n');
})().catch(e=>{session.disconnect();console.error(e.stack);process.exitCode=1;});
