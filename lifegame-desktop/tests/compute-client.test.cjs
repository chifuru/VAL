'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function fixture(){
 let now=0,id=0,changes=0,errors=[],created=0;const timers=new Map(),workers=[];
 const context={performance:{now:()=>now},setTimeout:(fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id;},clearTimeout:k=>timers.delete(k)};
 context.globalThis=context;vm.runInNewContext(fs.readFileSync(require.resolve('../src/ecology/compute-client.js'),'utf8'),context);
 const client=context.EcoCompute.create({onChange:()=>changes++,onError:e=>errors.push(e),workerFactory:()=>{created++;const w={sent:[],terminate(){this.dead=true;},postMessage(m){this.sent.push(m);}};workers.push(w);return w;}});
 const advance=ms=>{now+=ms;for(const [key,t]of [...timers])if(t.at<=now){timers.delete(key);t.fn();}};
 return {client,errors,workers,advance,get created(){return created;},get changes(){return changes;}};
}
function patch(turn,stopReason=null){return {lists:{},soil:[],events:[],meta:{turn,stopReason}};}
function packet(turn,stopReason=null){return {type:'turn',turn,patches:[patch(turn),patch(turn),patch(turn,stopReason)]};}
function session(world={turn:0},limit=500){
 const f=fixture();f.client.init(world,'a',limit);const worker=f.workers[0],epoch=worker.sent[0].epoch;
 const send=data=>worker.onmessage({data:{epoch,...data}});send({type:'ready'});
 return {...f,client:f.client,worker,epoch,send,fixture:f};
}
function stream(send,turn,stopReason=null){
 for(let phase=0;phase<3;phase++)send({type:'phase',turn,phase,patch:patch(turn,phase===2?stopReason:null)});
 send({type:'turn',turn,patches:null});
}
test('preparation has one total sixty-second deadline, terminates failures and supports retry',()=>{
 const f=fixture();f.client.init({turn:0},'a',500);const w=f.workers[0],epoch=w.sent[0].epoch;
 f.advance(40000);w.onmessage({data:{type:'ready',epoch}});
 f.advance(19000);w.onmessage({data:{epoch,...packet(1)}});
 f.advance(1001);assert.equal(f.errors.length,1);assert.equal(w.dead,true);assert.equal(f.client.initialized,false);assert.equal(f.client.length,0);
 f.client.init({turn:0},'a',500);assert.equal(f.created,2);
});
test('bounded buffering, stale generation rejection and a persistent map-cache Worker',()=>{
 const f=fixture();f.client.init({turn:0},'a',500);const w=f.workers[0],first=w.sent[0].epoch;
 w.onmessage({data:{type:'ready',epoch:first}});
 assert.equal(w.sent.at(-1).count,3);
 for(let t=1;t<=3;t++)w.onmessage({data:{epoch:first,...packet(t)}});
 w.onmessage({data:{type:'idle',epoch:first}});f.client.fill(99);assert.equal(w.sent.at(-1).count,3);
 for(let t=4;t<=6;t++)w.onmessage({data:{epoch:first,...packet(t)}});
 w.onmessage({data:{type:'idle',epoch:first}});const sent=w.sent.length;f.client.fill(99);assert.equal(w.sent.length,sent);assert.equal(f.client.length,6);
 const reserved=f.client.take();assert.equal(reserved.turn,1);f.client.fill(99);assert.equal(w.sent.length,sent,'in-flight displayed turn counts toward the six-turn bound');
 f.client.restore(reserved);assert.equal(f.client.length,6);assert.equal(f.client.take().turn,1,'operating the map rewinds the same prepared turn');f.client.acknowledge();
 const oldHandler=w.onmessage;f.client.close();assert.equal(f.client.initialized,false);
 f.client.init({turn:0},'b',500);assert.equal(f.created,1,'reuse worker for immutable geometry caches');
 oldHandler({data:{type:'turn',epoch:first,turn:7}});assert.equal(f.client.length,0);
 w.onmessage({data:{type:'turn',epoch:first,turn:8}});assert.equal(f.client.length,0);
});

test('runtime timeout identifies the next-turn calculation rather than startup',()=>{
 const f=fixture();f.client.init({turn:0},'a',500);const w=f.workers[0],epoch=w.sent[0].epoch;
 w.onmessage({data:{type:'ready',epoch}});
 for(let t=1;t<=3;t++)w.onmessage({data:{epoch,...packet(t)}});w.onmessage({data:{type:'idle',epoch}});
 f.client.fill(1);f.advance(60001);
 assert.equal(f.errors.length,1);assert.match(f.errors[0],/次のターン/);assert.match(f.errors[0],/確定状態を保持/);
 assert.equal(f.client.initialized,false);
});

test('legacy packets and streamed phases reserve exactly one continuous future turn',()=>{
 for(const mode of ['legacy','stream']){
  const f=session({turn:40});
  for(let turn=41;turn<=43;turn++){
   if(mode==='legacy')f.send(packet(turn));else stream(f.send,turn);
  }
  f.send({type:'idle'});assert.deepEqual(f.errors,[]);assert.equal(f.client.length,3);
  for(let turn=41;turn<=43;turn++){
   const result=f.client.take();assert.equal(result.turn,turn);assert.equal(result.patches.length,3);
   assert(result.patches.every(p=>p.meta.turn===turn));f.client.acknowledge();
  }
  assert.equal(f.client.take(),null);f.client.close();
 }
});

test('current-epoch malformed turns, mixed packets and missing or repeated phases fail closed',async t=>{
 const cases={
  'skipped turn':send=>send(packet(2)),
  'fractional turn':send=>send(packet(1.5)),
  'duplicate turn':send=>{send(packet(1));send(packet(1));},
  'unrequested turn':send=>{for(let n=1;n<=4;n++)send(packet(n));},
  'missing legacy patches':send=>send({type:'turn',turn:1}),
  'short legacy packet':send=>send({...packet(1),patches:[patch(1),patch(1)]}),
  'oversized legacy packet':send=>send({...packet(1),patches:[patch(1),patch(1),patch(1),patch(1)]}),
  'legacy patch from another turn':send=>send({...packet(1),patches:[patch(1),patch(2),patch(1)]}),
  'missing stream phases':send=>send({type:'turn',turn:1,patches:null}),
  'incomplete stream phases':send=>{send({type:'phase',turn:1,phase:0,patch:patch(1)});send({type:'turn',turn:1,patches:null});},
  'duplicate phase':send=>{for(let n=0;n<2;n++)send({type:'phase',turn:1,phase:0,patch:patch(1)});},
  'reverse phase order':send=>send({type:'phase',turn:1,phase:1,patch:patch(1)}),
  'skipped phase':send=>{send({type:'phase',turn:1,phase:0,patch:patch(1)});send({type:'phase',turn:1,phase:2,patch:patch(1)});},
  'out of range phase':send=>send({type:'phase',turn:1,phase:3,patch:patch(1)}),
  'fractional phase':send=>send({type:'phase',turn:1,phase:.5,patch:patch(1)}),
  'phase from another turn':send=>send({type:'phase',turn:2,phase:0,patch:patch(2)}),
  'phase metadata from another turn':send=>send({type:'phase',turn:1,phase:0,patch:patch(2)}),
  'missing phase patch':send=>send({type:'phase',turn:1,phase:0}),
  'mixed stream and legacy packet':send=>{send({type:'phase',turn:1,phase:0,patch:patch(1)});send(packet(1));},
  'unrecognized stop reason':send=>send(packet(1,'not-a-world-stop')),
  'turn after a stopped batch before idle':send=>{send(packet(1,'main-extinct'));send(packet(2));},
  'repeated ready':send=>send({type:'ready'}),
 };
 for(const [name,act]of Object.entries(cases))await t.test(name,()=>{
  const f=session();act(f.send);assert.equal(f.errors.length,1);assert.equal(f.worker.dead,true);
  assert.equal(f.client.initialized,false);assert.equal(f.client.length,0);assert.equal(f.client.busy,false);
  f.advance(60001);assert.equal(f.errors.length,1,'failed sessions leave no watchdog running');
 });
});

test('idle only completes a whole requested batch or a recognized world stop',async t=>{
 for(const [name,act]of Object.entries({
  'empty batch':send=>{},
  'missing requested turns':send=>send(packet(1)),
  'unfinished phase':send=>send({type:'phase',turn:1,phase:0,patch:patch(1)}),
 }))await t.test(name,()=>{const f=session();act(f.send);f.send({type:'idle'});assert.equal(f.errors.length,1);});
 const early=fixture();early.client.init({turn:0},'a',500);early.workers[0].onmessage({data:{type:'idle',epoch:early.workers[0].sent[0].epoch}});assert.equal(early.errors.length,1);
 for(const reason of ['main-extinct','checkpoint'])for(const mode of ['legacy','stream']){
  const f=session();if(mode==='legacy')f.send(packet(1,reason));else stream(f.send,1,reason);
  f.send({type:'idle'});assert.deepEqual(f.errors,[]);assert.equal(f.client.busy,false);assert.equal(f.client.length,1);
  const sent=f.worker.sent.length;f.client.fill(1);assert.equal(f.worker.sent.length,sent+1,'world stops end a batch but do not prevent explicit replay continuation');
  if(mode==='legacy')f.send(packet(2,reason));else stream(f.send,2,reason);
  f.send({type:'idle'});assert.deepEqual(f.errors,[]);f.client.close();
 }
 const f=session();for(let n=1;n<=3;n++)f.send(packet(n));f.send({type:'idle'});f.send({type:'idle'});assert.equal(f.errors.length,1);
});

test('requested end, invalid fill counts and reservations keep the six-turn boundary',()=>{
 const limited=session({turn:499},500);assert.equal(limited.worker.sent.at(-1).count,1);
 limited.send(packet(500,'checkpoint'));limited.send({type:'idle'});assert.deepEqual(limited.errors,[]);
 const sent=limited.worker.sent.length;limited.client.fill(6);assert.equal(limited.worker.sent.length,sent);limited.client.close();
 const f=session();for(let n=1;n<=3;n++)f.send(packet(n));f.send({type:'idle'});
 const first=f.client.take();assert.throws(()=>f.client.take(),/TURN_ALREADY_RESERVED/);
 assert.throws(()=>f.client.restore({...first}),/TURN_RESERVATION_MISMATCH/);
 for(const count of [0,-1,.5,NaN,Infinity])f.client.fill(count);
 assert.equal(f.worker.sent.length,2,'invalid caller counts do not reach the Worker');
 f.client.fill(99);assert.equal(f.worker.sent.at(-1).count,3);
 for(let n=4;n<=6;n++)f.send(packet(n));f.send({type:'idle'});
 f.client.restore(first);assert.equal(f.client.length,6);assert.throws(()=>f.client.restore(first),/TURN_RESERVATION_MISMATCH/);
 assert.equal(f.client.take(),first);f.client.acknowledge();assert.throws(()=>f.client.acknowledge(),/TURN_NOT_RESERVED/);
 const second=f.client.take();f.client.fill(99);assert.equal(f.worker.sent.at(-1).count,1);
 f.send(packet(7));f.send({type:'idle'});assert.equal(f.client.length,5);f.client.restore(second);assert.equal(f.client.length,6);
 assert.deepEqual(f.errors,[]);f.client.close();assert.throws(()=>f.client.restore(null),/TURN_RESERVATION_MISMATCH/);
});

test('close ignores late notifications, clears reservations and reinitializes from the committed world',()=>{
 const committed={turn:40},f=session(committed),oldHandler=f.worker.onmessage,oldError=f.worker.onerror;
 for(let n=41;n<=43;n++)f.send(packet(n));f.send({type:'idle'});const partial=f.client.take();
 f.client.close();const changes=f.fixture.changes,sent=f.worker.sent.length;
 for(const data of [{type:'ready'},{type:'phase',turn:44,phase:0,patch:patch(44)},packet(44),{type:'idle'},{type:'error',message:'late'}])f.send(data);
 oldError({preventDefault(){throw Error('stale error handler ran');}});f.client.fill(6);f.advance(60001);
 assert.equal(f.worker.sent.length,sent);assert.equal(f.fixture.changes,changes);assert.deepEqual(f.errors,[]);assert.equal(f.client.length,0);
 assert.throws(()=>f.client.restore(partial),/TURN_RESERVATION_MISMATCH/);assert.throws(()=>f.client.acknowledge(),/TURN_NOT_RESERVED/);
 f.client.init(committed,'b',500);assert.equal(f.fixture.created,1);assert.equal(f.worker.sent.at(-1).world,committed);
 const epoch=f.worker.sent.at(-1).epoch;
 oldHandler({data:{epoch,...packet(41)}});assert.equal(f.client.length,0,'old closures cannot use the new epoch');
 f.worker.onmessage({data:{type:'ready',epoch}});
 f.worker.onmessage({data:{epoch,...packet(41)}});assert.equal(f.client.take().turn,41,'restart begins after the committed turn, not the discarded future');
 f.client.acknowledge();f.client.close();
 const checkpoint=session({turn:500,stopReason:'checkpoint'},1000);stream(checkpoint.send,501);stream(checkpoint.send,502);stream(checkpoint.send,503);checkpoint.send({type:'idle'});
 assert.deepEqual(checkpoint.errors,[]);assert.equal(checkpoint.client.take().turn,501);checkpoint.client.acknowledge();checkpoint.client.close();
});

test('final-only sessions accept one complete patch per turn and reinit safely into streamed mode',()=>{
 const f=fixture();f.client.init({turn:0},'a',500,{finalOnly:true});const w=f.workers[0],init=w.sent[0],send=d=>w.onmessage({data:{epoch:init.epoch,...d}});
 assert.equal(init.finalOnly,true);assert.equal(init.stream,false);send({type:'ready'});
 for(let t=1;t<=3;t++)send({type:'turn',turn:t,patches:[patch(t)]});send({type:'idle'});assert.equal(f.client.length,3);assert.deepEqual(f.errors,[]);
 const oldHandler=w.onmessage;f.client.close();f.client.init({turn:3},'a',500);const next=w.sent.at(-1);assert.equal(next.finalOnly,false);assert.equal(next.stream,true);
 oldHandler({data:{epoch:init.epoch,type:'turn',turn:4,patches:[patch(4)]}});assert.equal(f.client.length,0);f.client.close();
});
test('final-only and staged response validation rejects sparse or mismatched patches without throwing',()=>{
 for(const [finalOnly,data]of [[true,{type:'turn',turn:1,patches:new Array(1)}],[false,{type:'turn',turn:1,patches:new Array(3)}],[true,{type:'turn',turn:1,patches:[patch(1),patch(1),patch(1)]}],[true,{type:'phase',turn:1,phase:0,patch:patch(1)}],[true,{type:'turn',turn:1,patches:[patch(2)]}]]){
  const f=fixture();f.client.init({turn:0},'a',500,{finalOnly});const w=f.workers[0],epoch=w.sent[0].epoch;w.onmessage({data:{type:'ready',epoch}});
  assert.doesNotThrow(()=>w.onmessage({data:{epoch,...data}}));assert.equal(f.errors.length,1);assert.equal(f.client.initialized,false);assert.equal(w.dead,true);f.advance(60001);assert.equal(f.errors.length,1);
 }
});
