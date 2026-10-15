'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const E=require('../src/composite/creature-engine'),L=require('../src/composite/legacy-engine'),L2=require('../src/composite/legacy-engine-v2'),L3=require('../src/composite/legacy-engine-v3'),D=require('../src/composite/lineage-definitions');
const clone=x=>JSON.parse(JSON.stringify(x));
test('frozen engine4 keeps all 1000 original outcomes and old appearances',()=>{
 const L4=require('../src/composite/legacy-engine-v4'),old=require('./archive/engine-v4.cjs');
 const plain=s=>JSON.parse(JSON.stringify(s,(k,v)=>k==='appearanceRevision'?undefined:v));
 for(let n=1;n<=1000;n++)assert.deepEqual(plain(L4.runAll(n)),old.runAll(n));
 for(const n of [120,600,927,1000])assert.deepEqual(E.appearanceFor(L4.runAll(n)),L4.appearanceFor(L4.runAll(n)));
});
function states(n){let s=E.initial(n),list=[s];for(const line of E.linesFor(n)){s=E.step(s,line);list.push(s);}return list;}
test('1000-row original output and exact food/quarter calibration remain intact',()=>{const s=E.runAll(1000);assert.equal(s.energyQuarters,1801);assert.equal(s.points,100);assert.equal(s.current,1000);assert.deepEqual(s.foods,{number:533,fizz:267,buzz:134,fizzbuzz:66});for(const n of [1,15,120,1000])assert.deepEqual(E.linesFor(n),Array.from({length:n},(_,i)=>{let k=i+1;return k%15===0?'FizzBuzz':k%3===0?'Fizz':k%5===0?'Buzz':String(k);}));});
test('second phase enters at201 and third phase at580 independent of N duration',()=>{for(const n of [600,927,1000]){const a=states(n);assert.equal(a[200].stage,0);assert.equal(a[201].stage,1);assert.equal(a[579].stage,1);assert.equal(a[580].stage,2);assert.deepEqual(a[n].history.map(h=>h.step),[201,580,...(a[n].matured?[a[n].maturedAt]:[])]);}for(const n of [1,15,120])assert.equal(E.runAll(n).stage,0);});
test('awakening requires post-third diet, adaptation and developed organs independently',()=>{
 const a=states(1000),first=a.find(s=>s.matured);assert.ok(first.current>580&&first.current<1000);
 const ready=clone(first);ready.stage=2;ready.matured=false;ready.finalAppearance=null;assert.ok(E.awakeningFor(ready).ready);
 for(const gate of ['food','adaptation','main','support']){const s=clone(ready);
  if(gate==='food')s.awakening.foods.fizzbuzz=0;
  if(gate==='adaptation')s.awakening.adaptation=0;
  const parts=E.PART_DEFINITIONS[s.lineage];
  if(gate==='main')s.partXp[s.lineage+':'+parts[0][0]]=0;
  if(gate==='support')parts.slice(1).forEach(p=>s.partXp[s.lineage+':'+p[0]]=0);
  assert.equal(E.awakeningFor(s).ready,false,gate);
 }
 assert.equal(E.awakeningFor(a[580]).ready,false);assert.equal(E.awakeningFor({...ready,stage:1}).ready,false);
});
test('maturity freezes actual anatomy and color but all remaining rows are consumed',()=>{const a=states(1000),first=a.find(s=>s.matured),final=a[1000];assert.ok(first.current<1000);assert.strictEqual(E.appearanceFor(first),E.appearanceFor(final));assert.deepEqual(first.partXp,final.partXp);assert.deepEqual(first.tissueEnergy,final.tissueEnergy);assert.equal(final.lastMeal.sequence,1000);assert.equal(final.foods.buzz,134);});
test('invalid numbers, wrong row order and feeding beyond N fail without mutating old state',()=>{for(const n of [0,1001,-1,1.5,NaN,Infinity])assert.throws(()=>E.initial(n));const a=E.initial(15),before=clone(a);assert.throws(()=>E.step(a,'Buzz'));assert.deepEqual(a,before);assert.throws(()=>E.step(E.runAll(15),'16'));});
test('latest numeric regulator is overwritten and consumed exactly once by next nutrient',()=>{let s=E.initial(15);s=E.step(s,'1');assert.equal(s.modifier,1);s=E.step(s,'2');assert.equal(s.modifier,-1);s=E.step(s,'Fizz');assert.deepEqual(s.lastMeal,{kind:'fizz',modifier:-1,quarters:3,sequence:3});assert.equal(s.modifier,0);s=E.step(s,'4');s=E.step(s,'Buzz');assert.equal(s.lastMeal.quarters,3);});
test('precomputed environment is wholly determined by N and original FizzBuzz rows',()=>{for(const n of [600,927,1000]){const plan=E.environmentPlanFor(n);assert.equal(plan.rows.length,n);assert.deepEqual(plan,E.environmentPlanFor(n));assert.ok(plan.rows.every(x=>E.ENV.includes(x)));let s=E.initial(n);for(const line of E.linesFor(n)){s=E.step(s,line,'invalid manual override');assert.equal(s.currentEnvironment,plan.rows[s.current-1]);}}assert.notDeepEqual(E.environmentPlanFor(600).rows,E.environmentPlanFor(601).rows.slice(0,600));});
test('all twenty branches are reachable through automatic schedules and no species UI override',()=>{const reachable=new Set(),cross=[];for(let n=580;n<=1000;n++){let s=E.runAll(n);s.history.forEach(h=>reachable.add(h.lineage));if(s.history[0].lineage!==s.history[1].lineage)cross.push(n);}assert.deepEqual([...reachable].sort(),D.LINEAGES.map(l=>l.id).sort());assert.ok(cross.length>30);});
test('lineage remains fixed inside its phase and chosen from actual exposure',()=>{for(const n of [927,1000]){const a=states(n);for(let i=202;i<580;i++)assert.equal(a[i].lineage,a[201].lineage);for(let i=581;i<=n;i++)assert.equal(a[i].lineage,a[580].lineage);}});
test('every acquired organ is inherited, continues development and retains its historical snapshot',()=>{const a=states(1000),t=a[580],end=a[1000];assert.equal(t.heritage[0].parts.length,D.PART_DEFINITIONS[t.heritage[0].lineage].length);for(const part of t.heritage[0].parts){const key=part.lineage+':'+part.id;assert.ok(end.partXp[key]>part.xp);assert.ok(E.appearanceFor(end).inheritedOrgans.some(p=>p.lineage+':'+p.id===key));}assert.deepEqual(t.heritage[0],end.heritage[0]);});
test('all99 organ groups have baseline development with three usable image levels',()=>{assert.equal(D.PART_GROUP_COUNT,99);assert.deepEqual(E.THRESHOLDS,[1,55,160]);assert.deepEqual([0,1,54,55,159,160].map(E.levelFor),[0,1,1,2,2,3]);const a=states(1000);for(const p of E.phenotype(a[250]))assert.ok(p.xp>0&&p.growth>0);assert.ok(E.phenotype(a[350]).some(p=>p.level>=2));assert.ok(E.phenotype(a[850]).some(p=>p.level===3));});
test('eyes grow in size, lens level, count and functional sensing beyond only duplicate eyes',()=>{const a=states(886),birth=E.appearanceFor(a[0]),adult=E.appearanceFor(a[886]);assert.ok(adult.anatomy.eyes.scaleX>birth.anatomy.eyes.scaleX*1.5);assert.ok(adult.anatomy.eyes.level>birth.anatomy.eyes.level);assert.ok(adult.anatomy.eyes.sense.includes('・'));const many=E.appearanceFor({...a[700],lineage:'manyeyes',matured:false});assert.ok(many.anatomy.eyes.count>=6);assert.match(many.sense,/広域電位/);});
test('six DNA traits remain immutable and near numbers produce broad birth anatomy and hue changes',()=>{for(const n of [120,121,927,1000]){let s=E.runAll(n);assert.deepEqual(s.dna,E.dnaFor(n));for(const k of ['body','appendage','senses','skin','aptitude','sensitivity'])assert.ok(s.dna[k]>=0&&s.dna[k]<1);}const a=E.appearanceFor(E.initial(120)),b=E.appearanceFor(E.initial(121));assert.notDeepEqual(a.color,b.color);assert.notDeepEqual(a.anatomy,b.anatomy);assert.notDeepEqual([a.bodyLineage,a.anatomy],[b.bodyLineage,b.anatomy]);});
test('all seven basic parts independently grow and color changes with actual development',()=>{const a=states(1000),born=E.appearanceFor(a[0]),early=E.appearanceFor(a[100]),late=E.appearanceFor(a[500]);for(const k of E.BODY_PARTS){assert.ok(early.anatomy[k].growth>born.anatomy[k].growth,k);assert.ok(late.anatomy[k].growth>early.anatomy[k].growth,k);}assert.notDeepEqual(born.color,late.color);assert.ok(new Set(Object.values(late.anatomy).map(x=>x.growth)).size>=4);});
test('lineages have distinct underlying anatomy, pigment, signature and senses',()=>{const s=states(850)[850],seen=new Set();for(const l of D.LINEAGES){let a=E.appearanceFor({...s,lineage:l.id,matured:false});assert.deepEqual(a.dna,s.dna);assert.equal(a.signature,l.signature);assert.equal(a.bodyFamily,l.bodyFamily);seen.add(JSON.stringify([a.anatomy,a.color,a.signature]));}assert.equal(seen.size,20);});
test('JSON resume and chunked playback preserve deterministic outcomes',()=>{let s=E.initial(927);for(let i=1;i<=927;i++){if(i%31===0)s=clone(s);s=E.step(s,E.fmtFizzBuzz(i));}assert.deepEqual(clone(s),clone(E.runAll(927)));});
test('legacy engine1 saved DNA, geometry and final portrait interpretation remain versioned',()=>{const s=L.runAll(1000,'signal'),saved=clone(s);assert.deepEqual(E.appearanceFor(saved),L.appearanceFor(saved));assert.equal(E.appearanceFor(saved).version,1);assert.throws(()=>E.step(saved,'1'),/旧個体/);});
test('Node and browser UMD use identical current and legacy engines',()=>{const sandbox={};sandbox.globalThis=sandbox;for(const f of ['legacy-lineages.js','legacy-lineages-v3.js','legacy-lineages-v4.js','lineage-definitions.js','legacy-engine.js','legacy-engine-v2.js','legacy-engine-v3.js','legacy-engine-v4.js','creature-engine.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/composite',f),'utf8'),sandbox);assert.deepEqual(clone(sandbox.CreatureEngine.runAll(927)),clone(E.runAll(927)));});

test('fourth phase is a conditional transformation, not third-stage completion or age',()=>{
 const a=states(1000),first=a.find(s=>s.stage===3);assert.ok(first.current<900);assert.equal(a[580].stage,2);
 const before=E.appearanceFor(a[first.current-1]),after=E.appearanceFor(first);assert.ok(after.bodyFrame>=6&&before.bodyFrame<6);assert.notDeepEqual(before.color,after.color);assert.equal(E.PHASES.length,4);
});
test('legacy2 saved non-mature and mature appearances keep exact old definitions',()=>{for(const n of [600,927,1000]){const saved=clone(L2.runAll(n));assert.deepEqual(E.appearanceFor(saved),L2.appearanceFor(saved));assert.equal(E.appearanceFor(saved).version,2);assert.throws(()=>E.step(saved,E.fmtFizzBuzz(saved.current+1)),/旧個体/);}});
test('twelve connected body plans include bell, flora, whale, arthropod and mantle anatomy',()=>{assert.equal(D.CORE_PLANS.length,12);for(const id of ['jelly','kelp','whale','swarm','plasma','cephalopod'])assert.ok(D.LINEAGE_BY_ID[id]);assert.equal(D.LINEAGE_BY_ID.whale.bodyPlan,'whale');assert.equal(D.LINEAGE_BY_ID.kelp.bodyPlan,'botanical');assert.equal(Object.keys(D.ASSET_ALIASES).length,24);});

test('all20 final forms are attainable automatically, and within-stage actual source frames change',()=>{
 const reached=new Set();for(let n=580;n<=1000;n++){const s=E.runAll(n);if(s.matured){assert.ok(s.maturedAt>580&&s.maturedAt<=n);assert.ok(E.awakeningFor(s).ready);reached.add(s.lineage);}}
 assert.deepEqual([...reached].sort(),D.LINEAGES.map(l=>l.id).sort());
 const a=states(1000);for(const phase of [0,1,2])assert.ok(new Set(a.filter(s=>s.stage===phase).map(s=>E.appearanceFor(s).bodyFrame)).size>=2);
});
test('legacy3 retains its original environment, four stages and frozen appearance',()=>{for(const n of [600,900,927,1000]){const state=clone(L3.runAll(n));assert.deepEqual(E.appearanceFor(state),L3.appearanceFor(state));assert.equal(E.appearanceFor(state).version,3);assert.throws(()=>E.step(state,E.fmtFizzBuzz(state.current+1)),/旧個体/);}assert.equal(L3.runAll(927).lineage,'jelly');assert.equal(L3.runAll(1000).lineage,'abyss');assert.equal(E.ENGINE_VERSION,5);});

test('all421 third-phase entrances retain their preceding body architecture while permitting within-plan branching',()=>{
 const reached=new Set();let branches=0;for(let n=580;n<=1000;n++){let s=E.initial(n),before;for(let row=1;row<=n;row++){if(row===580)before=E.appearanceFor(s);s=E.step(s,E.fmtFizzBuzz(row));if(row===580){const after=E.appearanceFor(s);assert.equal(after.bodyPlan,before.bodyPlan,'body architecture teleported N'+n);if(after.lineage!==before.lineage)branches++;}}if(s.matured)reached.add(s.lineage);}
 assert.ok(branches>30,'continuous branching must not erase within-plan variety');assert.deepEqual([...reached].sort(),D.LINEAGES.map(l=>l.id).sort());
});
test('N932 carries its bird source and proportions across579 to580 instead of becoming an arthropod',()=>{
 const a=states(932),before=E.appearanceFor(a[579]),after=E.appearanceFor(a[580]);assert.equal(a[580].evolutionPolicy,'body-continuity-v1');assert.equal(before.lineage,'myth');assert.equal(after.lineage,'myth');assert.equal(after.bodyPlan,'avian');assert.equal(after.bodyFrame,before.bodyFrame);
 for(const key of E.BODY_PARTS)for(const axis of ['scaleX','scaleY'])assert.ok(Math.abs(after.anatomy[key][axis]/before.anatomy[key][axis]-1)<.06,key+' disproportionate entrance');assert.ok(Math.hypot(...after.color.map((v,i)=>v-before.color[i]))<70);assert.ok(a[932].matured);assert.equal(a[580].awakening.steps,0);
});
test('unmarked engine5 states retain their old unrestricted branching and JSON continuation',()=>{
 const old=require('./archive/engine-v5-unrestricted.cjs');for(const n of [600,932,1000]){let current=old.initial(n),historical=old.initial(n);assert.equal(current.evolutionPolicy,undefined);for(let row=1;row<=n;row++){if(row%31===0)current=clone(current);current=E.step(current,E.fmtFizzBuzz(row));historical=old.step(historical,old.fmtFizzBuzz(row));if([579,580,n].includes(row)){assert.deepEqual(clone(current),clone(historical));assert.deepEqual(E.appearanceFor(current),old.appearanceFor(historical));}}if(n===932)assert.equal(current.history[1].lineage,'swarm');}
});

test('revision4 retains its actual ancestor source at every eligible entrance and preserves all branch and awakening calculations',()=>{
 const Previous=require('./archive/engine-v5-continuity.cjs');let branches=0;for(let n=580;n<=1000;n++){let s=E.initial(n),before;for(let row=1;row<=n;row++){if(row===580)before=E.appearanceFor(s);s=E.step(s,E.fmtFizzBuzz(row));if(row===580){const after=E.appearanceFor(s);assert.equal(after.bodyLineage,before.bodyLineage,'source replaced N'+n);assert.equal(after.bodyFrame,before.bodyFrame);for(const id of E.BODY_PARTS)for(const axis of ['scaleX','scaleY'])assert.ok(Math.abs(after.anatomy[id][axis]/before.anatomy[id][axis]-1)<.035,'entrance dimensions '+n+' '+id);assert.ok(Math.hypot(...after.color.map((v,i)=>v-before.color[i]))<10);if(after.lineage!==before.lineage)branches++;}}
 const old=Previous.runAll(n);for(const field of ['lineage','matured','maturedAt','energyQuarters'])assert.deepEqual(s[field],old[field],field+' N'+n);assert.deepEqual(s.dna,old.dna);assert.equal(E.appearanceFor(s).bodyLineage,before.bodyLineage);}
 assert.equal(branches,145);
});
test('specialization grows monotonically on a single inherited body and has twenty restrained distinct directions',()=>{
 for(const n of [847,893,932]){const a=states(n);let previous=0;for(let row=580;row<=n;row++){const current=E.appearanceFor(a[row]);assert.ok(current.specialization.amount>=previous&&current.specialization.amount<=1);previous=current.specialization.amount;assert.equal(current.bodyLineage,a[579].lineage);}}
 const state=states(932)[760],seen=new Set();for(const l of D.LINEAGES){const a=E.appearanceFor({...state,lineage:l.id,matured:false});seen.add(JSON.stringify(a.specialization.traits));for(const factors of Object.values(a.specialization.traits))assert.ok(factors.every(v=>v>=.94&&v<=1.22));}assert.equal(seen.size,20);
});
test('revision3 individuals retain their exact appearance and JSON continuation through branch and awakening',()=>{
 const Previous=require('./archive/engine-v5-continuity.cjs');for(const n of [847,893,932,1000]){let old=Previous.initial(n),s=Previous.initial(n);for(let row=1;row<=n;row++){s=E.step(row%31===0?clone(s):s,E.fmtFizzBuzz(row));old=Previous.step(old,Previous.fmtFizzBuzz(row));if([579,580,700,n].includes(row)){assert.deepEqual(clone(s),clone(old));assert.deepEqual(E.appearanceFor(s),Previous.appearanceFor(old));}}}
});
