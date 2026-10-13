'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../src/Index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(script, 'Index.html must contain its GAS-compatible inline script');
const source = script[1];

function fizzBuzz(n) {
  return Array.from({length:n}, (_,i) => {
    const k=i+1;
    return k%15===0?'FizzBuzz':k%3===0?'Fizz':k%5===0?'Buzz':String(k);
  });
}
function harness(options={}) {
  const nodes=new Map(), pixels=[];
  function element(id) {
    const e={id,value:'',textContent:'',disabled:false,hidden:id==='final-card',style:{},width:256,height:256,scrollTop:0,scrollHeight:100,attrs:{},handlers:{},scrollIntoView(){this.scrolled=true;},
      addEventListener(type,handler){this.handlers[type]=handler;},
      setAttribute(k,v){this.attrs[k]=v;},
      getContext(){let color='';return {fillRect(...a){pixels.push({id,args:a,color});},clearRect(){},set fillStyle(x){color=x;},set imageSmoothingEnabled(x){}};}
    };
    nodes.set(id,e);
  }
  ['fizzbuzz-form','limit','run-button','pause-button','skip-button','speed','result','error','status',
   'current-line','stage-name','food-total','next-stage','growth-bar','growth-progress',
   'fizz-count','buzz-count','special-count','number-count','creature',
   'final-card','final-creature','final-seed','final-species','final-status','final-summary',
   'final-stage','final-points','final-color','final-color-code','final-foods'].forEach(element);
  nodes.get('limit').value=String(options.limit||15);
  nodes.get('speed').value='480';
  let timerId=0,now=50,raf=null,calls=0;
  const timers=new Map();
  const runner={
    withSuccessHandler(cb){this.success=cb;return this;},
    withFailureHandler(cb){this.failure=cb;return this;},
    calculateFizzBuzz(limit) {
      calls++;
      if(options.fail)this.failure(new Error('計算エラー'));
      else if(options.malformed)this.success(['Fizz']);
      else this.success(fizzBuzz(limit));
    }
  };
  const win={
    requestAnimationFrame(cb){raf=cb;},
    matchMedia(){return {matches:!!options.reducedMotion};}
  };
  vm.runInNewContext(source,{
    window:win,document:{getElementById(id){return nodes.get(id);}},
    google:{script:{run:runner}},performance:{now(){return ++now;}},
    setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id;},
    clearTimeout(id){timers.delete(id);}
  },{filename:'Index.inline.js'});
  const h={
    logic:win.FizzBuzzCreatureLogic,pixels,calls:()=>calls,pending:()=>timers.size,
    get(id){return nodes.get(id);},
    fire(id,event){nodes.get(id).handlers[event]({preventDefault(){}});},
    next(){const item=timers.entries().next();if(item.done)return false;timers.delete(item.value[0]);item.value[1].fn();return true;},
    frame(){assert.ok(raf);raf(200);}
  };
  return h;
}

test('four foods are exclusive and numeric food has mathematical effect',()=>{
  const q=harness().logic;
  assert.equal(q.classify('Fizz'),'fizz');
  assert.equal(q.classify('Buzz'),'buzz');
  assert.equal(q.classify('FizzBuzz'),'fizzbuzz');
  assert.equal(q.classify('1'),'number');
  assert.equal(q.classify('11'),'number');
  assert.equal(q.classify('abc'),null);
  assert.equal(q.modifierFor(1),1);
  assert.equal(q.modifierFor(2),-1);
  assert.equal(q.modifierFor(7),1);
  assert.equal(q.modifierFor(11),-1);
  assert.equal(q.modifierFor(15),0);
});

test('seed uses entire N and deterministically yields six valid DNA traits',()=>{
  const q=harness().logic, a=q.dnaFor(123), b=q.dnaFor(123), c=q.dnaFor(124);
  assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));
  assert.notDeepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(c)));
  assert.deepEqual(Object.keys(a).sort(),['body','appendage','senses','skin','aptitude','sensitivity'].sort());
  for(const v of Object.values(a))assert.ok(v>=0&&v<1);
  assert.throws(()=>q.dnaFor(0),/入力数値/);
});

test('initial fish is neutral, has volume one and no accumulated food',()=>{
  const c=harness().logic.initialCreature(123);
  assert.equal(c.stage,0);
  assert.equal(c.appearance.stage,0);
  assert.equal(c.appearance.volume,1);
  assert.equal(c.appearance.color,'#9cceb6');
  assert.equal(c.foods.total,0);
  assert.equal(c.foods.number,0);
});

test('regulator applies to the next nutrient once, then resets',()=>{
  const q=harness().logic;
  const a=q.stepGrowth(q.initialCreature(15),'1');
  const b=q.stepGrowth(a,'Fizz');
  const c=q.stepGrowth(b,'Buzz');
  const d=q.stepGrowth(q.stepGrowth(c,'2'),'FizzBuzz');
  assert.equal(a.points,0);assert.equal(a.modifier,1);
  assert.equal(b.points,1.25);assert.equal(b.modifier,0);
  assert.equal(c.points,2.25);assert.equal(d.points,3);
  assert.equal(d.foods.number,2);
  assert.equal(d.foods.total,3);
  assert.equal(d.foods.boost,1);assert.equal(d.foods.brake,1);
  assert.equal(d.foods.fizzbuzz,1);
  assert.equal(d.dna,a.dna);
});

test('the most recent numeric regulator replaces earlier unconsumed regulator',()=>{
  const q=harness().logic;
  const a=q.stepGrowth(q.stepGrowth(q.initialCreature(20),'1'),'2');
  assert.equal(a.modifier,-1);
  assert.equal(q.stepGrowth(a,'Fizz').points,.75);
});

test('stage thresholds are three stages; maturity is not a fourth stage',()=>{
  const q=harness().logic;
  for(const [p,x] of [[0,0],[9.99,0],[10,1],[34.99,1],[35,2],[99.9,2],[100,2],[999,2]])
    assert.equal(q.stageFor(p),x);
});

test('color follows nutrition balance and body volume follows nonnegative growth',()=>{
  const q=harness().logic;
  const a=q.initialCreature(100);
  const b=q.stepGrowth(a,'Fizz');
  const c=q.stepGrowth(b,'Buzz');
  assert.equal(b.appearance.color,'#61ceff');
  assert.notEqual(c.appearance.color,b.appearance.color);
  assert.ok(b.appearance.volume>a.appearance.volume);
  assert.ok(c.appearance.volume>b.appearance.volume);
});

test('short input ends at fish; input N and playback yield reproducible final result',()=>{
  const q=harness().logic;
  const a=q.tally(fizzBuzz(15),15);
  assert.equal(a.stage,0);
  assert.equal(a.foods.fizz,4);
  assert.equal(a.foods.buzz,2);
  assert.equal(a.foods.fizzbuzz,1);
  assert.equal(a.foods.number,8);
  assert.equal(a.foods.total,7);
  assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(q.tally(fizzBuzz(15),15))));
});

test('mature appearance freezes while nutrient and number counters continue',()=>{
  const q=harness().logic;
  let c=q.initialCreature(1000),snapshot=null,matureAt=0;
  fizzBuzz(1000).forEach((line,i)=>{
    const prev=c;c=q.stepGrowth(c,line);
    if(!prev.matured&&c.matured){snapshot=JSON.stringify(c.appearance);matureAt=i+1;}
  });
  assert.ok(matureAt>35&&matureAt<1000);
  assert.equal(c.matured,true);assert.equal(c.stage,2);assert.equal(c.points,100);
  assert.equal(JSON.stringify(c.appearance),snapshot);
  assert.equal(c.foods.fizz+c.foods.buzz+c.foods.fizzbuzz+c.foods.number,1000);
});

test('auto replay preserves unchanged FizzBuzz text, counters and short-stage result',()=>{
  const h=harness();h.fire('fizzbuzz-form','submit');
  assert.equal(h.calls(),1);assert.equal(h.get('result').value,'1');
  assert.equal(h.get('run-button').disabled,true);
  for(let i=0;i<4;i++)assert.equal(h.next(),true);
  assert.equal(h.get('result').value,'1\n2\nFizz\n4\nBuzz');
  assert.equal(h.get('number-count').textContent,'3');
  while(h.next()){}
  assert.equal(h.get('result').value,fizzBuzz(15).join('\n'));
  assert.match(h.get('stage-name').textContent,/STAGE 1 魚/);
  assert.equal(h.get('special-count').textContent,'1');
  assert.equal(h.get('number-count').textContent,'8');
  assert.equal(h.pending(),0);
  assert.equal(h.get('run-button').disabled,false);
  assert.equal(h.get('final-card').hidden,false);
  assert.match(h.get('final-status').textContent,/進化途中/);
  assert.equal(h.get('final-seed').textContent,'個体 #15');
  assert.equal(h.get('final-foods').textContent,'4 / 2 / 1 / 8');
  assert.ok(h.pixels.some(p=>p.id==='final-creature'));
});

test('pause/resume/skip preserves complete text and final creature state',()=>{
  const h=harness({limit:120});h.fire('fizzbuzz-form','submit');
  h.next();h.fire('pause-button','click');
  assert.equal(h.pending(),0);assert.equal(h.get('result').value,'1\n2');
  h.fire('pause-button','click');h.next();
  assert.equal(h.get('result').value,'1\n2\nFizz');
  h.fire('skip-button','click');
  const expected=h.logic.tally(fizzBuzz(120),120);
  assert.equal(h.get('result').value,fizzBuzz(120).join('\n'));
  assert.equal(h.get('stage-name').textContent.includes(expected.appearance.species),true);
  assert.equal(h.get('number-count').textContent,String(expected.foods.number));
  assert.equal(h.pending(),0);
});

test('maturity never stops replay before all N lines',()=>{
  const h=harness({limit:400});h.fire('fizzbuzz-form','submit');
  while(h.next()){}
  assert.match(h.get('stage-name').textContent,/完全成熟/);
  assert.equal(h.get('result').value,fizzBuzz(400).join('\n'));
  assert.equal(h.get('result').value.split('\n').length,400);
  assert.equal(h.get('number-count').textContent,String(h.logic.tally(fizzBuzz(400),400).foods.number));
});

test('reduced motion produces same final appearance and complete output',()=>{
  const n=240;
  const h=harness({limit:n,reducedMotion:true});h.fire('fizzbuzz-form','submit');
  const a=h.logic.tally(fizzBuzz(n),n);
  assert.equal(h.pending(),0);assert.equal(h.get('result').value,fizzBuzz(n).join('\n'));
  assert.ok(h.get('stage-name').textContent.includes(a.appearance.species));
});

test('invalid inputs and GAS errors never manufacture output',()=>{
  const h=harness();h.get('limit').value='0';h.fire('fizzbuzz-form','submit');
  assert.equal(h.calls(),0);assert.match(h.get('error').textContent,/整数/);
  const m=harness({malformed:true});m.fire('fizzbuzz-form','submit');
  assert.equal(m.get('result').value,'');assert.match(m.get('error').textContent,/応答形式/);
  const e=harness({fail:true});e.fire('fizzbuzz-form','submit');
  assert.equal(e.get('result').value,'');assert.match(e.get('error').textContent,/計算エラー/);
});

test('new calculation clears the previous result and uses the new seed',()=>{
  const h=harness();h.fire('fizzbuzz-form','submit');h.fire('skip-button','click');
  h.get('limit').value='2';h.fire('fizzbuzz-form','submit');
  h.next();
  assert.equal(h.get('result').value,'1\n2');
  assert.equal(h.get('number-count').textContent,'2');
  assert.match(h.get('stage-name').textContent,/STAGE 1 魚/);
});

test('canvas frame renders for DNA-based fish without browser APIs beyond Canvas',()=>{
  const h=harness();h.frame();
  assert.ok(h.pixels.length>20);
});


test('final panel remains hidden during replay and appears after the last line',()=>{
  const h=harness({limit:30});
  assert.equal(h.get('final-card').hidden,true);
  h.fire('fizzbuzz-form','submit');
  assert.equal(h.get('final-card').hidden,true);
  while(h.next()){}
  assert.equal(h.get('final-card').hidden,false);
  assert.equal(h.get('final-seed').textContent,'個体 #30');
  assert.match(h.get('final-stage').textContent,/陸生動物/);
  assert.ok(h.get('final-species').textContent.length>0);
});

test('matured individual has static completed portrait and full 400-line result',()=>{
  const h=harness({limit:400});
  h.fire('fizzbuzz-form','submit');
  while(h.next()){}
  assert.match(h.get('final-status').textContent,/完全成熟/);
  assert.equal(h.get('final-points').textContent,'100.00 / 100 P');
  assert.equal(h.get('result').value,fizzBuzz(400).join('\n'));
  assert.ok(h.pixels.filter(p=>p.id==='final-creature').length>40);
});

test('skip and reduced motion present the identical terminal portrait data',()=>{
  const n=150;
  const skipped=harness({limit:n});
  skipped.fire('fizzbuzz-form','submit');
  skipped.fire('skip-button','click');
  const reduced=harness({limit:n,reducedMotion:true});
  reduced.fire('fizzbuzz-form','submit');
  for(const id of ['final-seed','final-species','final-status','final-stage','final-points','final-color-code','final-foods'])
    assert.equal(skipped.get(id).textContent,reduced.get(id).textContent,id);
  assert.equal(skipped.get('result').value,reduced.get('result').value);
});

test('new calculation resets final-panel visibility before the next playback ends',()=>{
  const h=harness();
  h.fire('fizzbuzz-form','submit');
  h.fire('skip-button','click');
  assert.equal(h.get('final-card').hidden,false);
  h.get('limit').value='3';
  h.fire('fizzbuzz-form','submit');
  assert.equal(h.get('final-card').hidden,true);
  while(h.next()){}
  assert.equal(h.get('final-card').hidden,false);
  assert.equal(h.get('final-seed').textContent,'個体 #3');
});

test('fish, land creature and alien use distinct deterministic pixel silhouettes',()=>{
  const pixels=[];
  for(const n of [5,30,100]){
    const h=harness({limit:n,reducedMotion:true});
    h.fire('fizzbuzz-form','submit');
    const pic=h.pixels.filter(p=>p.id==='final-creature').map(p=>p.args.slice(0,2).join(':')+':'+p.color).join(',');
    assert.ok(pic.length>0);
    pixels.push(pic);
  }
  assert.notEqual(pixels[0],pixels[1]);
  assert.notEqual(pixels[1],pixels[2]);
});
