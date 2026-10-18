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
test('preparation has one total sixty-second deadline, terminates failures and supports retry',()=>{
 const f=fixture();f.client.init({turn:0},'a',500);const w=f.workers[0],epoch=w.sent[0].epoch;
 f.advance(40000);w.onmessage({data:{type:'ready',epoch}});
 f.advance(19000);w.onmessage({data:{type:'turn',epoch,turn:1}});
 f.advance(1001);assert.equal(f.errors.length,1);assert.equal(w.dead,true);assert.equal(f.client.initialized,false);assert.equal(f.client.length,0);
 f.client.init({turn:0},'a',500);assert.equal(f.created,2);
});
test('bounded buffering, stale generation rejection and a persistent map-cache Worker',()=>{
 const f=fixture();f.client.init({turn:0},'a',500);const w=f.workers[0],first=w.sent[0].epoch;
 w.onmessage({data:{type:'ready',epoch:first}});
 assert.equal(w.sent.at(-1).count,3);
 for(let t=1;t<=3;t++)w.onmessage({data:{type:'turn',epoch:first,turn:t}});
 w.onmessage({data:{type:'idle',epoch:first}});f.client.fill(99);assert.equal(w.sent.at(-1).count,3);
 for(let t=4;t<=6;t++)w.onmessage({data:{type:'turn',epoch:first,turn:t}});
 w.onmessage({data:{type:'idle',epoch:first}});const sent=w.sent.length;f.client.fill(99);assert.equal(w.sent.length,sent);assert.equal(f.client.length,6);
 const reserved=f.client.take();assert.equal(reserved.turn,1);f.client.fill(99);assert.equal(w.sent.length,sent,'in-flight displayed turn counts toward the six-turn bound');
 f.client.restore(reserved);assert.equal(f.client.length,6);assert.equal(f.client.take().turn,1,'operating the map rewinds the same prepared turn');f.client.acknowledge();
 const oldHandler=w.onmessage;f.client.close();assert.equal(f.client.initialized,false);
 f.client.init({turn:0},'b',500);assert.equal(f.created,1,'reuse worker for immutable geometry caches');
 oldHandler({data:{type:'turn',epoch:first,turn:7}});assert.equal(f.client.length,0);
 w.onmessage({data:{type:'turn',epoch:first,turn:8}});assert.equal(f.client.length,0);
});
