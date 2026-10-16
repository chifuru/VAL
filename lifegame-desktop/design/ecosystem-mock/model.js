(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./vendor/ecological-engine'));else root.EcoMock=factory(root.CreatureEngine);})(globalThis,function(E){
'use strict';
const ENV=['tide','heat','signal','void'],FOOD=['fizz','buzz','fizzbuzz'];
const LABEL={tide:'深海',heat:'熱圏',signal:'情報域',void:'虚空',fizz:'生命',buzz:'鉱物',fizzbuzz:'情報'};
function rand(w){let x=w.rng;x^=x<<13;x^=x>>>17;x^=x<<5;w.rng=x>>>0;return w.rng/4294967296;}
function name(s){const l=E.LINEAGE_BY_ID[s.lineage];return l?(s.matured?l.finalName:l.names[s.stage]):'未分化のミナモルフ';}
function same(a,b){return Boolean(a.bio.lineage&&a.bio.lineage===b.bio.lineage);}
function abilities(s){
 const d=s.dna,a=E.appearanceFor(s),g=s.points/100,n=a.anatomy;
 const v=(key)=>n[key]?.growth||0;
 const organs=E.phenotype(s),o=organs.length?organs.reduce((sum,p)=>sum+p.level/3*p.growth,0)/organs.length:0;
 return {attack:+((2+d.body*4+d.appendage*2)*(1+.9*g+.5*v('limb')+.3*o)).toFixed(2),defense:+((1+d.skin*5)*(1+v('shell')+.3*o)).toFixed(2),speed:+((1+d.appendage*3)*(1+.8*v('fin')+.2*o)).toFixed(2),range:+(1+d.senses*2+.5*v('eyes')+.2*o).toFixed(2),harvest:+(1+d.aptitude*2+.6*g+.2*o).toFixed(2),regen:+(.2+d.skin*.5+.5*v('shell')+.2*o).toFixed(2),fertility:+(.3+d.aptitude*.5+.1*v('fin')+.1*o).toFixed(2),longevity:+(60+d.body*40+30*v('shell')+10*o).toFixed(2),efficiency:+((1+d.aptitude*.6)*(1+.15*g+.1*o)).toFixed(2)};
}
function create(seed=932,birth=false){
 seed=Number(seed);E.dnaFor(seed);
 const w={seed,turn:0,rng:seed*7919+17,width:24,height:14,field:[],foods:[],creatures:[],logs:[],birth,ate:0,cellBirths:0,history:[]};
 for(let y=0;y<w.height;y++)for(let x=0;x<w.width;x++)w.field.push({alive:rand(w)<.32,age:0,env:ENV[(x<w.width/2?0:1)+(y<w.height/2?0:2)],baseEnv:ENV[(x<w.width/2?0:1)+(y<w.height/2?0:2)]});
 const seeds=[seed,seed,927,927,900,900,1000,1000],positions=[[5,4],[18,3],[7,9],[19,10],[9,3],[17,8],[4,9],[20,5]];
 seeds.forEach((n,i)=>{let bio=E.initial(n);if(!birth)for(let k=0;k<560;k++)bio=k<bio.seed?E.step(bio,E.fmtFizzBuzz(k+1)):E.ecologicalStep(bio,E.kindFor(E.fmtFizzBuzz(k+1)),bio.environmentPlan.rows[k%bio.environmentPlan.rows.length]);w.creatures.push({id:i+1,bio,initial:JSON.parse(JSON.stringify(bio)),x:positions[i][0],y:positions[i][1],energy:80,hp:100,meals:0,trace:[],baseline:abilities(bio),mealEvent:null,lastEvolution:null});});
 for(let i=0;i<w.field.length;i++)if(w.field[i].alive)w.foods.push({x:i%w.width,y:Math.floor(i/w.width),kind:FOOD[i%3],ttl:35,source:'初期セル'});
 return w;
}
function cellular(w){
 const old=w.field;w.field=old.map((cell,i)=>{
  const x=i%w.width,y=Math.floor(i/w.width);let n=0;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if((dx||dy)&&xx>=0&&yy>=0&&xx<w.width&&yy<w.height&&old[yy*w.width+xx].alive)n++;}
  const alive=cell.alive?(n===2||n===3):n===3;
  const env=cell.override?.until>=w.turn?cell.override.env:n>=5?'heat':alive&&cell.age>=3?'signal':n===0?'void':cell.baseEnv;
  if(alive&&!cell.alive){w.cellBirths++;const kind=n===3?(env==='signal'?'fizzbuzz':'fizz'):'fizz';spawn(w,x,y,kind,'B3セル誕生');}
  if(!alive&&cell.alive&&rand(w)<.55)spawn(w,x,y,'buzz','セル消滅・鉱物化');
  if(alive&&cell.age>2&&(i+w.turn)%7===0)spawn(w,x,y,'fizzbuzz','安定セル・情報化');
  return {...cell,env,neighbors:n,alive,age:alive?cell.age+1:0};
 });
 w.foods=w.foods.filter(f=>--f.ttl>0);
}
function spawn(w,x,y,kind,source){if(!w.foods.some(f=>f.x===x&&f.y===y&&f.kind===kind))w.foods.push({x,y,kind,source,ttl:35});}
function consume(w,c,food){
 const old=c.bio,env=w.field[c.y*w.width+c.x].env;
 c.bio=E.ecologicalStep(old,food.kind,env);c.meals++;w.ate++;
 c.energy=Math.min(100,c.energy+8*abilities(c.bio).harvest);c.hp=Math.min(100,c.hp+abilities(c.bio).regen);
 c.mealEvent={kind:food.kind,count:c.bio.foods[food.kind],sequence:c.bio.current,time:0,duration:{fizz:900,buzz:1100,fizzbuzz:1400}[food.kind]};
 const line={turn:w.turn,id:c.id,kind:food.kind,environment:env,source:food.source,from:old.stage,to:c.bio.stage,lineage:c.bio.lineage};
 c.trace.unshift(line);c.trace=c.trace.slice(0,30);w.logs.unshift(line);w.logs=w.logs.slice(0,40);
 if(c.bio.stage!==old.stage)c.lastEvolution={turn:w.turn,from:old.stage,to:c.bio.stage};
 // Rendering reflects the experienced patch; it does not choose the patch for the organism.
 const weights=ENV.map(e=>e===env?1:0);c.bio.environmentPlan={...c.bio.environmentPlan,weights:[weights,weights]};
}
function step(w){
 w.turn++;cellular(w);
 const occupied=new Set(w.creatures.filter(c=>c.hp>0).map(c=>c.y*w.width+c.x));
 for(const c of w.creatures){
  if(c.hp<=0)continue;
  const ability=abilities(c.bio);c.energy=Math.max(0,c.energy-.35/ability.efficiency);if(!c.energy)c.hp=Math.max(0,c.hp-1);
  let food=w.foods.reduce((best,f)=>{const distance=Math.hypot(f.x-c.x,f.y-c.y);return !best||distance<best.distance?{f,distance}:best;},null);
  if(food){const moves=Math.max(1,Math.floor(ability.speed/2));for(let i=0;i<moves;i++){let x=c.x,y=c.y;if(x!==food.f.x)x+=Math.sign(food.f.x-x);else if(y!==food.f.y)y+=Math.sign(food.f.y-y);if(occupied.has(y*w.width+x)&&!(x===c.x&&y===c.y))break;occupied.delete(c.y*w.width+c.x);c.x=x;c.y=y;occupied.add(y*w.width+x);}
    if(c.x===food.f.x&&c.y===food.f.y){consume(w,c,food.f);w.foods.splice(w.foods.indexOf(food.f),1);}
  }
 }
 w.history.push(w.creatures.map(c=>({id:c.id,alive:c.hp>0,lineage:c.bio.lineage,meals:c.meals})));if(w.history.length>200)w.history.shift();
 return w;
}
function challenge(w,id,kind,env){const c=w.creatures.find(c=>c.id===id);w.field[c.y*w.width+c.x].override={env,until:w.turn+1};w.foods=w.foods.filter(f=>f.x!==c.x||f.y!==c.y);spawn(w,c.x,c.y,kind,'比較実験による餌セル');step(w);}
return {create,step,abilities,same,name,consume,challenge,LABEL,ENV,FOOD};
});
