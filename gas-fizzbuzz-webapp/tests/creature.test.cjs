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
    const e={id,value:'',textContent:'',disabled:false,hidden:id==='final-card',style:{},width:256,height:256,scrollTop:0,scrollHeight:100,attrs:{},handlers:{},scrollIntoView(){this.scrolled=true;},focus(){this.focused=true;},
      addEventListener(type,handler){this.handlers[type]=handler;},
      setAttribute(k,v){this.attrs[k]=v;},
      getContext(){
        let color='',stroke='',linewidth=1;
        const record=(op,args=[])=>pixels.push({id,op,args,color:typeof color==='string'?color:'gradient',stroke});
        const gradient=()=>({addColorStop(){}});
        return {
          fillRect(...a){record('fillRect',a);},clearRect(){},
          beginPath(){record('beginPath');},moveTo(...a){record('moveTo',a);},
          lineTo(...a){record('lineTo',a);},bezierCurveTo(...a){record('bezierCurveTo',a);},
          quadraticCurveTo(...a){record('quadraticCurveTo',a);},
          closePath(){record('closePath');},ellipse(...a){record('ellipse',a);},
          arc(...a){record('arc',a);},fill(){record('fill');},stroke(){record('stroke');},
          save(){record('save');},restore(){record('restore');},
          translate(...a){record('translate',a);},scale(...a){record('scale',a);},
          createRadialGradient:gradient,createLinearGradient:gradient,
          set fillStyle(v){color=v;},set strokeStyle(v){stroke=v;},
          set lineWidth(v){linewidth=v;},get lineWidth(){return linewidth;},
          set lineCap(v){},set lineJoin(v){},set imageSmoothingEnabled(v){}
        };
      }
    };
    nodes.set(id,e);
  }
  ['fizzbuzz-form','limit','run-button','pause-button','skip-button','speed','result','error','status',
   'current-line','stage-name','food-total','next-stage','growth-form','growth-bar','growth-progress',
   'fizz-count','buzz-count','special-count','number-count','creature',
   'final-card','final-creature','final-seed','final-species','final-status','final-summary',
   'final-stage','final-points','final-color','final-color-code','final-foods','final-lineage',
   'app-shell','mode-chip','retry-button','log-button','result-rank','result-header-state'].forEach(element);
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


test('arcade result screen replaces nursery layout after the last line',()=>{
  const h=harness({limit:30});
  assert.equal(h.get('app-shell').attrs['data-mode'],undefined);
  h.fire('fizzbuzz-form','submit');
  assert.equal(h.get('app-shell').attrs['data-mode'],'nursery');
  assert.equal(h.get('final-card').hidden,true);
  while(h.next()){}
  assert.equal(h.get('final-card').hidden,false);
  assert.equal(h.get('app-shell').attrs['data-mode'],'result');
  assert.equal(h.get('app-shell').attrs['data-log-open'],'false');
  assert.match(h.get('result-rank').textContent,/STAGE 2 REACHED/);
  assert.equal(h.get('result-header-state').textContent,'RUN COMPLETE');
  assert.equal(h.get('result').value,fizzBuzz(30).join('\n'));
});

test('full evolution has distinct game-clear heading without changing output',()=>{
  const h=harness({limit:400,reducedMotion:true});
  h.fire('fizzbuzz-form','submit');
  assert.equal(h.get('result-header-state').textContent,'EVOLUTION COMPLETE');
  assert.match(h.get('result-rank').textContent,/FULL EVOLUTION/);
  assert.equal(h.get('final-card').attrs['data-mature'],'true');
  assert.equal(h.get('result').value,fizzBuzz(400).join('\n'));
});

test('arcade result log can be toggled without mutating the FizzBuzz log',()=>{
  const h=harness({limit:15,reducedMotion:true});
  h.fire('fizzbuzz-form','submit');
  const value=h.get('result').value;
  assert.equal(h.get('app-shell').attrs['data-log-open'],'false');
  h.fire('log-button','click');
  assert.equal(h.get('app-shell').attrs['data-log-open'],'true');
  assert.equal(h.get('log-button').attrs['aria-pressed'],'true');
  assert.equal(h.get('result').value,value);
  h.fire('log-button','click');
  assert.equal(h.get('app-shell').attrs['data-log-open'],'false');
  assert.equal(h.get('result').value,value);
});

test('retry leaves the arcade game-clear view, clears old data and focuses input',()=>{
  const h=harness({limit:100,reducedMotion:true});
  h.fire('fizzbuzz-form','submit');
  assert.equal(h.get('app-shell').attrs['data-mode'],'result');
  h.fire('retry-button','click');
  assert.equal(h.get('app-shell').attrs['data-mode'],'nursery');
  assert.equal(h.get('final-card').hidden,true);
  assert.equal(h.get('result').value,'');
  assert.equal(h.get('limit').focused,true);
  h.get('limit').value='5';
  h.fire('fizzbuzz-form','submit');
  assert.equal(h.get('final-seed').textContent,'個体 #5');
  assert.equal(h.get('result').value,fizzBuzz(5).join('\n'));
});

test('skip and low-motion runs reach the same arcade mode, stage and status',()=>{
  const skipped=harness({limit:150});
  skipped.fire('fizzbuzz-form','submit');
  skipped.fire('skip-button','click');
  const reduced=harness({limit:150,reducedMotion:true});
  reduced.fire('fizzbuzz-form','submit');
  assert.equal(skipped.get('app-shell').attrs['data-mode'],'result');
  assert.equal(reduced.get('app-shell').attrs['data-mode'],'result');
  for(const id of ['result-rank','result-header-state','final-species','final-points','final-foods'])
    assert.equal(skipped.get(id).textContent,reduced.get(id).textContent);
  assert.equal(skipped.get('result').value,reduced.get('result').value);
});

test('game UI keeps result text in textarea and uses separated dedicated result scene',()=>{
  assert.match(html,/data-mode="nursery"/);
  assert.match(html,/id="result-rank"/);
  assert.match(html,/id="retry-button"/);
  assert.match(html,/id="log-button"/);
  assert.match(html,/data-log-open="true"/);
  assert.ok(html.includes('.shell[data-mode="result"] .room-panel'));
});


test('nearby seeds yield conspicuously distinct initial morphology across a sample',()=>{
  const q=harness().logic;
  const a=q.initialCreature(123),b=q.initialCreature(124);
  const keys=['body','appendage','senses','skin','aptitude','sensitivity'];
  const differences=keys.filter(key=>Math.abs(a.dna[key]-b.dna[key])>.15);
  assert.ok(differences.length>=2,'two nearby N seeds must no longer share nearly every DNA axis');
  assert.equal(a.appearance.volume,1);
  assert.equal(b.appearance.volume,1);
  assert.equal(a.stage,0);assert.equal(b.stage,0);
});

test('all three families exist within each stage, rather than only variant labels',()=>{
  const q=harness().logic;
  const observed=[new Set(),new Set(),new Set()];
  for(let n=1;n<=120;n++){
    const c=q.tally(fizzBuzz(Math.max(n,90)),n);
    const earlier=q.tally(fizzBuzz(Math.max(n,35)),n);
    observed[0].add(c.branches[0]);
    observed[1].add(earlier.branches[1]);
    observed[2].add(c.branches[2]);
  }
  observed.forEach((set,stage)=>assert.equal(set.size,3,'all branches should occur at stage '+stage));
});

test('stage entry fixes that branch; it never oscillates while feeding that stage',()=>{
  const q=harness().logic;
  let c=q.initialCreature(400),lastStage=0,lastBranch=c.branches[0];
  for(const line of fizzBuzz(400)){
    c=q.stepGrowth(c,line);
    if(c.stage===lastStage)assert.equal(c.branches[lastStage],lastBranch);
    else {
      assert.equal(c.stage,lastStage+1);
      lastStage=c.stage;lastBranch=c.branches[lastStage];
      assert.ok(lastBranch>=0&&lastBranch<=2);
    }
  }
  assert.deepEqual(Array.from(c.branches).every(x=>Number.isInteger(x)),true);
  assert.equal(c.matured,true);
});

test('every stage develops four visible substages without adding a fourth evolution',()=>{
  const q=harness().logic;
  for(const [stage,points] of [[0,[0,2.5,5,7.5]],[1,[10,16.25,22.5,28.75]],[2,[35,51.25,67.5,83.75]]]){
    const tiers=points.map(n=>q.growthFor(n,stage).tier);
    assert.deepEqual(Array.from(tiers),[0,1,2,3]);
  }
  assert.equal(q.stageFor(100),2);
});

test('progress and morphology within one stage create different pixel portraits',()=>{
  const h=harness().logic;
  const original=h.initialCreature(91);
  let mid=original,end=original;
  for(let i=0;i<9;i++){end=h.stepGrowth(end,'Fizz');if(i===3)mid=end;}
  assert.equal(mid.stage,0);assert.equal(end.stage,0);
  assert.ok(end.appearance.growthTier>mid.appearance.growthTier);
  assert.ok(end.appearance.volume>mid.appearance.volume);
  assert.equal(end.appearance.family,mid.appearance.family);
});

test('result includes full concrete fish-land-space lineage and clear growth phase',()=>{
  const h=harness({limit:400,reducedMotion:true});
  h.fire('fizzbuzz-form','submit');
  const c=h.logic.tally(fizzBuzz(400),400);
  assert.equal(h.get('final-lineage').textContent.split(' → ').length,c.stage+1);
  assert.match(h.get('final-lineage').textContent,/進化の系譜/);
  assert.match(h.get('growth-form').textContent,/成長形態 4 \/ 4/);
  assert.equal(h.get('final-species').textContent,c.appearance.mark+' '+c.appearance.species);
  assert.equal(h.get('result').value,fizzBuzz(400).join('\n'));
});

test('nutrition histories and DNA choose different shape lineages deterministically',()=>{
  const q=harness().logic;
  const seed=271;
  const q1=q.tally(fizzBuzz(80),seed),q2=q.tally(fizzBuzz(80),seed);
  assert.deepEqual(JSON.parse(JSON.stringify(q1.branches)),JSON.parse(JSON.stringify(q2.branches)));
  assert.equal(q1.appearance.species,q2.appearance.species);
  assert.deepEqual(JSON.parse(JSON.stringify(q1.appearance)),JSON.parse(JSON.stringify(q2.appearance)));
});


test('editing input N previews a genetically different newborn before the run starts',()=>{
  const h=harness({limit:10});
  const prior=h.get('growth-form').textContent;
  h.get('limit').value='124';h.fire('limit','input');
  assert.match(h.get('growth-form').textContent,/個体 #124/);
  assert.equal(h.get('result').value,'');
  assert.equal(h.get('final-card').hidden,true);
  assert.notEqual(h.get('growth-form').textContent,prior);
  h.fire('fizzbuzz-form','submit');
  assert.equal(h.get('result').value,'1');
});

test('growth HUD explicitly labels morphology tier and current family',()=>{
  const h=harness({limit:5,reducedMotion:true});
  h.fire('fizzbuzz-form','submit');
  assert.match(h.get('growth-form').textContent,/個体 #5/);
  assert.match(h.get('growth-form').textContent,/成長形態 [1-4] \/ 4/);
  assert.match(h.get('growth-form').textContent,/(深淵触手|神鳥|再帰知性)/);
});


test('initial screen previews the DNA for the default numeric input',()=>{
  const h=harness({limit:17});
  assert.match(h.get('growth-form').textContent,/個体 #17/);
  assert.equal(h.get('result').value,'');
  assert.equal(h.get('final-card').hidden,true);
});


test('exactly three illustrated pilot lineages expose stable emblems and nine stage names',()=>{
  const q=harness().logic;
  assert.equal(q.pilotLineages.length,3);
  const marks=q.pilotLineages.map(x=>x.mark);
  assert.deepEqual(Array.from(marks),['〰','🜂','λ']);
  q.pilotLineages.forEach(lineage=>{
    assert.equal(lineage.names.length,3);
    assert.ok(lineage.names.every(x=>typeof x==='string'&&x.length>0));
  });
});

test('all three pilot lineages can occur for initial DNA seeds',()=>{
  const q=harness().logic,found=new Set();
  for(let n=1;n<=240;n++)found.add(q.initialCreature(n).appearance.lineage);
  assert.deepEqual([...found].sort(),['abyss','myth','recursive']);
});

test('organ specialization is reproducible, locked, and gains strength with growth',()=>{
  const q=harness().logic;
  let c=q.initialCreature(530);
  const born={...c.specialization};
  const start=c.appearance.organ.levels[born.primary];
  for(const line of fizzBuzz(80))c=q.stepGrowth(c,line);
  assert.deepEqual(JSON.parse(JSON.stringify(c.specialization)),born);
  assert.ok(c.appearance.organ.levels[born.primary]>start);
  assert.ok(Object.keys(c.appearance.organ.levels).length===8);
  assert.deepEqual(Object.keys(c.dna).sort(),['body','appendage','senses','skin','aptitude','sensitivity'].sort());
});

test('every new stage locks a specific organic lineage, with visible final lineage',()=>{
  const q=harness().logic;
  let c=q.initialCreature(430),last=c.lineages[0],stage=0;
  for(const line of fizzBuzz(430)){
    c=q.stepGrowth(c,line);
    if(c.stage===stage)assert.equal(c.lineages[stage],last);
    else {stage=c.stage;last=c.lineages[stage];}
  }
  assert.equal(c.stage,2);
  assert.ok(c.lineages.every(i=>Number.isInteger(i)&&i>=0&&i<3));
  assert.equal(c.appearance.species,q.pilotLineages[c.lineages[2]].names[2]);
});

test('organic Canvas actually uses bezier curves, gradients, wings and tentacle variants',()=>{
  const q=harness().logic,h=harness();
  const original=q.initialCreature(224).appearance;
  const variants=[];
  for(const lineage of q.pilotLineages){
    for(let stage=0;stage<3;stage++){
      const a=Object.assign({},original,{lineage:lineage.id,stage:stage,growthTier:2});
      const begin=h.pixels.length;
      assert.equal(q.renderSmooth(h.get('creature').getContext(),a,420,false),true);
      const operations=h.pixels.slice(begin);
      assert.ok(operations.some(op=>op.op==='bezierCurveTo'));
      assert.ok(operations.some(op=>op.op==='fill'));
      assert.ok(operations.some(op=>op.op==='stroke'));
      assert.ok(operations.length>35);
      variants.push(operations.filter(op=>op.op==='bezierCurveTo'||op.op==='ellipse').map(op=>op.op+':'+op.args.join(',')).join('|'));
    }
  }
  assert.equal(new Set(variants).size,9,'three lineages in three stages need distinct path geometry');
});

test('portrait UI includes lineage symbol and organ strengths without changing the result text',()=>{
  const h=harness({limit:400,reducedMotion:true});
  h.fire('fizzbuzz-form','submit');
  const c=h.logic.tally(fizzBuzz(400),400);
  assert.ok(h.get('final-species').textContent.startsWith(c.appearance.mark));
  assert.match(h.get('final-lineage').textContent,/主特化：/);
  assert.match(h.get('final-lineage').textContent,/副特化：/);
  assert.match(h.get('growth-form').textContent,/特化/);
  assert.equal(h.get('result').value,fizzBuzz(400).join('\n'));
  assert.equal(h.get('app-shell').attrs['data-mode'],'result');
});
