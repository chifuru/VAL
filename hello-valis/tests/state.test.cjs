const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const listeners=new Map();
const ctx=new Proxy({}, {get:()=>()=>{}});
function element(id){return {style:{setProperty(){}},classList:{toggle(){}},dataset:{},textContent:'',
 replaceChildren(){},setAttribute(k,v){this[k]=v;},addEventListener(k,fn){listeners.set(id+':'+k,fn);},
 getContext(){return ctx;},getBoundingClientRect(){return {x:300,y:250,left:300,bottom:400,width:600,height:150};}};}
const elements=new Map();
const document={hidden:false,body:element('body'),getElementById(id){if(!elements.has(id))elements.set(id,element(id));return elements.get(id);},createElement(){return element('span');},addEventListener(k,fn){listeners.set('document:'+k,fn);}};
let requests=0,cancels=0;
const context={document,innerWidth:1200,innerHeight:800,devicePixelRatio:1,matchMedia:()=>({matches:false,addEventListener(){}}),requestAnimationFrame(){return ++requests;},cancelAnimationFrame(){cancels++;},addEventListener(){}};
vm.createContext(context);
const html=fs.readFileSync(path.join(__dirname,'../src/Index.html'),'utf8');
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
const run=s=>vm.runInContext(s,context);
assert.equal(run('state.particles.length'),36);
run('stimulate(100,200)');assert.ok(run('state.energy>0 && state.pending!==null'));
run('advance(2.9)');assert.equal(run('state.echoes'),0);
run('stimulate(110,210); advance(2.9)');assert.equal(run('state.echoes'),0);
run('advance(.11)');assert.equal(run('state.echoes'),1);
run('advance(8)');assert.equal(run('state.echoes'),1);
run('for(let i=0;i<1000;i++)stimulate(200,300)');
assert.ok(run('state.particles.length<=100 && state.signals.length<=24'));
listeners.get('pause:click')();const frozen=run('state.time');run('frame(500)');assert.equal(run('state.time'),frozen);assert.equal(run('raf'),0);
listeners.get('reset:click')();assert.equal(run('state.particles.length'),36);assert.equal(run('state.energy'),0);assert.equal(run('state.pending'),null);
listeners.get('pause:click')();
assert.equal(run("[0,19,37,55,73,91].map(t=>{state.time=t;setPhase();return state.phase}).join(',')"),'0,1,2,3,4,0');
document.hidden=true;listeners.get('document:visibilitychange')();assert.equal(run('raf'),0);
document.hidden=false;run('state.reduced=true;schedule();stimulate(100,100)');assert.equal(run('raf'),0);assert.equal(run('state.pending'),null);
assert.ok(requests>0&&cancels>0);
console.log('PASS: state simulation — delayed single echo, rescheduling, object caps, pause, reset, phase cycle, hidden tab, reduced motion.');
console.log('DOM/Canvas are stubs. This does not verify browser rendering or GAS.');
