(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../vendor/creature-engine'));else root.EcoMock=factory(root.CreatureEngine);})(globalThis,function(E){
'use strict';
const ENV=['tide','heat','signal','void'],FOOD=['fizz','buzz','fizzbuzz','number'];
const LABEL={tide:'水域',heat:'熱域',signal:'情報域',void:'静域',fizz:'生命',buzz:'鉱物',fizzbuzz:'情報',number:'数値'};
const STAGES=['幼体','若体','成体','進化体'],BRANCH={vital:'生命適応',armored:'鉱物適応',aware:'情報適応'};
const TRAITS=['body','appendage','senses','skin','aptitude','sensitivity'];
const RULES=Object.freeze({growth:[8,24,40],recovery:5,matingEnergy:50,matingCost:14,matingCooldown:18,matingDistance:1});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),normalize=n=>((Math.trunc(n)-1)%1000+1000)%1000+1;
function hash(n){n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return (n^(n>>>16))>>>0;}
function rand(w){w.rng=hash(w.rng+0x9e3779b9);return w.rng/4294967296;}
function lineageFor(seed){return E.LINEAGES[(normalize(seed)-1)%20].id;}
function same(a,b){return Boolean(a&&b&&a.lineage===b.lineage);}
function stageFor(growth,branch){return branch?3:growth>=24?2:growth>=8?1:0;}
function appearanceKey(c){return [c.seed,c.lineage,JSON.stringify(c.dna),c.stage,c.branch||'-'].join(':');}
function name(c){const l=E.LINEAGE_BY_ID[c.lineage];return (c.stage===3?l.finalName:l.names[c.stage])+(c.branch?' / '+BRANCH[c.branch]:'');}
function abilities(c){const d=c.dna,s=1+c.stage*.23,b=c.branch;
 return {attack:+((2+4*d.body+2*d.appendage)*s).toFixed(2),defense:+((1+5*d.skin)*s*(b==='armored'?1.3:1)).toFixed(2),speed:+((1+3*d.appendage)*s).toFixed(2),range:+(1+d.senses*2).toFixed(2),harvest:+((1+2*d.aptitude)*(1+c.stage*.12)).toFixed(2),regen:+((.15+.4*d.skin)*(b==='vital'?1.5:1)).toFixed(2),fertility:+(.3+.5*d.aptitude+c.stage*.08).toFixed(2),longevity:Math.round(130+d.body*90),efficiency:+((1+.6*d.aptitude)*(b==='aware'?1.25:1)).toFixed(2)};
}
function individual(w,seed,x,y,options={}){
 seed=normalize(seed);const growth=options.growth||0,branch=options.branch||null;
 const dna={...E.dnaFor(seed),...options.dna};Object.assign(dna,{seed,bodyVariant:Math.floor(dna.body*12),headRatio:.88+dna.senses*.24,eyeSpacing:4+Math.round(dna.senses*5),torsoRatio:.82+dna.body*.36,tailRatio:.75+dna.appendage*.5,hue:Math.floor(dna.skin*360)});
 const c={id:w.nextId++,seed,lineage:options.lineage||lineageFor(seed),dna,sex:options.sex||(rand(w)<.5?'M':'F'),x,y,generation:options.generation||1,parents:options.parents||[],age:options.age||0,growth,stage:stageFor(growth,branch),branch,energy:options.energy??72,hp:100,cooldown:0,modifier:0,foods:Object.fromEntries(FOOD.map(k=>[k,0])),exposure:Object.fromEntries(ENV.map(k=>[k,0])),meals:0,trace:[],alive:true,deathReason:null};
 c.baseline=abilities(c);return c;
}
function event(w,c,type,text,extra={}){const e={turn:w.turn,id:c?.id||null,type,text,...extra};w.events.unshift(e);w.events.length=Math.min(100,w.events.length);if(['birth','evolution','death'].includes(type)){w.chronicle.unshift(e);w.chronicle.length=Math.min(100,w.chronicle.length);}if(c){c.trace.unshift(e);c.trace.length=Math.min(24,c.trace.length);}return e;}
function neighbors(w,x,y){const cells=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&x+dx>=0&&x+dx<w.width&&y+dy>=0&&y+dy<w.height)cells.push({x:x+dx,y:y+dy});return cells;}
function foodKind(w,env){const weights={tide:[6,2,1,6],heat:[2,6,1,6],signal:[3,2,5,5],void:[2,2,2,9]}[env];let p=rand(w)*weights.reduce((a,b)=>a+b,0);return FOOD[weights.findIndex(v=>(p-=v)<0)];}
function create(seed=932,options={}){
 if(!Number.isSafeInteger(Number(seed))||Number(seed)<1||Number(seed)>999999)throw Error('世界の初期値は1〜999999です');
 const width=options.width||24,height=options.height||16;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<4||height<4||width>64||height>64)throw Error('盤面は4〜64マスです');
 const w={seed:Number(seed),rng:hash(Number(seed)),width,height,turn:0,nextId:1,field:[],creatures:[],events:[],chronicle:[],births:0,deaths:0,ate:0,intake:Object.fromEntries(FOOD.map(k=>[k,0])),history:[],initial:options.initial??40,birthMode:!!options.birth};
 const centers=Array.from({length:8},(_,i)=>({x:rand(w)*width,y:rand(w)*height,env:ENV[i%4]}));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const center=centers.reduce((best,p)=>Math.hypot(x-p.x,y-p.y)<Math.hypot(x-best.x,y-best.y)?p:best,centers[0]),env=center.env,kind=foodKind(w,env),max=3+Math.floor(rand(w)*4);
  w.field.push({env,baseEnv:env,phase:rand(w)*Math.PI*2,kind,amount:max,max,cooldown:0,value:1+Math.floor(rand(w)*997)});
 }
 const occupied=new Set();
 for(let i=0;i<Math.min(w.initial,width*height);i++){
  const pair=Math.floor(i/2),cols=Math.max(1,Math.floor(width/4));let x=Math.min(width-1,1+(pair%cols)*4+i%2),y=Math.min(height-1,1+Math.floor(pair/cols)*4);
  if(occupied.has(y*width+x)){const index=w.field.findIndex((_,j)=>!occupied.has(j));x=index%width;y=Math.floor(index/width);}
  occupied.add(y*width+x);const n=normalize(w.seed+pair+(i%2)*20);
  w.creatures.push(individual(w,n,x,y,{growth:w.birthMode?0:24,age:w.birthMode?0:24,sex:i%2?'F':'M'}));
 }
 record(w);return w;
}
function chooseBranch(c){
 const exposures=Math.max(1,Object.values(c.exposure).reduce((a,b)=>a+b,0));
 const choices=[['vital',c.foods.fizz+c.exposure.tide/exposures*4],['armored',c.foods.buzz+c.exposure.heat/exposures*4],['aware',c.foods.fizzbuzz+(c.exposure.signal+c.exposure.void)/exposures*4]];
 return choices.reduce((a,b)=>b[1]>a[1]?b:a)[0];
}
function evolve(w,c){const before=c.stage;if(!c.branch&&c.growth>=40&&c.meals>=8&&Object.values(c.exposure).some(v=>v>=6))c.branch=chooseBranch(c);c.stage=stageFor(c.growth,c.branch);if(c.stage!==before)event(w,c,'evolution',STAGES[before]+' → '+STAGES[c.stage]+(c.branch?' / '+BRANCH[c.branch]:''));}
function consume(w,c,food,env,source='マス資源'){
 if(!c.alive||!FOOD.includes(food.kind)||!ENV.includes(env))throw Error('不正な摂取対象');
 c.foods[food.kind]++;c.meals++;w.ate++;w.intake[food.kind]++;
 if(food.kind==='number'){
  let n=Number(food.value);if(!Number.isSafeInteger(n)||n<1||n%3===0||n%5===0)n=1;
  c.modifier=E.modifierFor(n);event(w,c,'meal','数値 '+n+' / 次の成長を'+(c.modifier>0?'促進':'抑制'),{kind:food.kind,environment:env,source,value:n});
 }else{
  const a=abilities(c);c.energy=Math.min(100,c.energy+5*a.harvest);c.growth+=Math.max(.25,1+c.modifier*.25);c.modifier=0;
  event(w,c,'meal',LABEL[food.kind]+'を摂取 / '+LABEL[env],{kind:food.kind,environment:env,source});
 }
 evolve(w,c);return c;
}
function updateField(w){w.field.forEach((t,i)=>{
 if(t.override?.until>=w.turn)t.env=t.override.env;
 else{const drift=Math.sin(w.turn/18+t.phase);t.env=drift>.94?ENV[(ENV.indexOf(t.baseEnv)+1)%4]:t.baseEnv;}
 if(t.cooldown>0&&--t.cooldown===0){t.amount=t.max;t.kind=foodKind(w,t.env);t.value=1+hash(w.seed+i+w.turn)%997;}
 });}
function death(w,c,reason){c.alive=false;c.hp=0;c.deathReason=reason;w.deaths++;event(w,c,'death',LABEL[w.field[c.y*w.width+c.x].env]+'で死亡 / '+reason);}
function compatible(a,b){return a!==b&&a.alive&&b.alive&&same(a,b)&&a.sex!==b.sex&&a.stage>=2&&b.stage>=2&&a.energy>=50&&b.energy>=50&&a.cooldown===0&&b.cooldown===0&&Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))<=1;}
function reproduce(w,a,b,occupied){
 if(!compatible(a,b))return null;
 const spaces=neighbors(w,a.x,a.y).filter(p=>Math.max(Math.abs(p.x-b.x),Math.abs(p.y-b.y))<=1&&!occupied.has(p.y*w.width+p.x));if(!spaces.length)return null;
 const p=spaces[Math.floor(rand(w)*spaces.length)],dna=Object.fromEntries(TRAITS.map(k=>[k,rand(w)<.5?a.dna[k]:b.dna[k]]));
 const family=E.LINEAGES.findIndex(l=>l.id===a.lineage),seed=family+1+20*(hash(a.seed*1009+b.seed*9176+w.nextId+w.seed)%50),child=individual(w,seed,p.x,p.y,{dna,lineage:a.lineage,generation:Math.max(a.generation,b.generation)+1,parents:[a.id,b.id],energy:28});
 a.energy-=14;b.energy-=14;a.cooldown=Math.ceil(18/abilities(a).fertility);b.cooldown=Math.ceil(18/abilities(b).fertility);w.creatures.push(child);occupied.add(p.y*w.width+p.x);w.births++;
 const text='#'+a.id+' × #'+b.id+' → #'+child.id+' 誕生';event(w,child,'birth',text);event(w,a,'parent',text);event(w,b,'parent',text);return child;
}
function step(w){
 w.turn++;updateField(w);
 const actors=w.creatures.filter(c=>c.alive),occupied=new Set(actors.map(c=>c.y*w.width+c.x));
 for(const c of actors){
  const a=abilities(c),tile=w.field[c.y*w.width+c.x];c.age++;c.cooldown=Math.max(0,c.cooldown-1);c.exposure[tile.env]++;
  c.energy=Math.max(0,c.energy-1.2/a.efficiency);
  const niche=E.LINEAGE_BY_ID[c.lineage].niche[ENV.indexOf(tile.env)];c.hp=Math.min(100,c.hp+(niche>=.25?a.regen:-.7/(1+a.defense/8)));
  if(tile.amount>0){consume(w,c,tile,tile.env);if(--tile.amount===0)tile.cooldown=5;}
  evolve(w,c);
  if(c.energy<=0)c.hp-=8;
  if(c.age>abilities(c).longevity||c.hp<=0){death(w,c,c.age>abilities(c).longevity?'寿命':c.energy<=0?'飢餓':'環境不適合');occupied.delete(c.y*w.width+c.x);continue;}
 }
 // Empty cells and individuals share one occupancy map. Moving preserves identity.
 for(const c of actors.filter(c=>c.alive)){
  if(c.stage>=2&&c.energy>=50&&actors.some(b=>compatible(c,b)))continue;
  const here=w.field[c.y*w.width+c.x];if(here.amount>0&&c.energy>45&&rand(w)>.2)continue;
  for(let move=0;move<Math.max(1,Math.floor(abilities(c).speed/2));move++){
   let best=null,bestScore=-Infinity;
   for(const p of neighbors(w,c.x,c.y)){if(occupied.has(p.y*w.width+p.x))continue;const tile=w.field[p.y*w.width+p.x];const score=(tile.amount>0?2:0)+(tile.kind!=='number'?1:0)+E.LINEAGE_BY_ID[c.lineage].niche[ENV.indexOf(tile.env)]+rand(w)*.5;
    if(score>bestScore){best=p;bestScore=score;}}
   if(best){occupied.delete(c.y*w.width+c.x);c.x=best.x;c.y=best.y;occupied.add(c.y*w.width+c.x);}else break;
  }
 }
 for(const a of actors.filter(c=>c.alive)){const b=actors.find(c=>compatible(a,c));if(b)reproduce(w,a,b,occupied);}
 record(w);return w;
}
function record(w){const counts=E.LINEAGES.map(l=>({lineage:l.id,count:w.creatures.filter(c=>c.alive&&c.lineage===l.id).length}));w.history.push({turn:w.turn,population:counts.reduce((a,c)=>a+c.count,0),counts,births:w.births,deaths:w.deaths});if(w.history.length>301)w.history.shift();}
function challenge(w,id,kind,env,value=7){const c=w.creatures.find(c=>c.id===id);if(!c?.alive)throw Error('生存個体を選択してください');if(!ENV.includes(env)||!FOOD.includes(kind))throw Error('入力を選択してください');const tile=w.field[c.y*w.width+c.x];tile.env=env;tile.override={env,until:w.turn+5};c.exposure[env]++;consume(w,c,{kind,value},env,'比較実験・直接投与');return c;}
return {ENV,FOOD,LABEL,STAGES,BRANCH,RULES,create,step,individual,abilities,same,name,lineageFor,appearanceKey,neighbors,compatible,reproduce,consume,challenge,evolve};
});
