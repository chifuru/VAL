(async function(){
'use strict';
const $=id=>document.getElementById(id),M=EcoMock,E=CreatureEngine;
const map=$('map'),g=map.getContext('2d'),hero=$('portrait'),R=CreatureRenderer.create(hero,VALIS_ASSETS);
const foodColors={fizz:'#8ce1ad',buzz:'#e1b774',fizzbuzz:'#acb4f5'},colors=['#89d2d6','#ebbe8d','#a6c5f4','#bdacf0'];
const stats=[['attack','攻撃',22],['defense','防御',15],['speed','移動',9],['range','射程',5],['harvest','採集',5],['regen','回復',2],['fertility','繁殖性',1.2],['longevity','寿命',150],['efficiency','省エネ',2.2]];
let world=null,selected=1,running=false,timer=null,busy=false,ready=false,sprites=new Map(),selectedBefore=null,lastTime=0;
const images={},atlasImages={};
async function image(file){const im=new Image();await new Promise((yes,no)=>{im.onload=yes;im.onerror=()=>no(Error('素材を読めません: '+file));im.src=file;});return im;}
const selectedCell=()=>world.creatures.find(c=>c.id===selected);
function stop(){running=false;clearTimeout(timer);timer=null;}
function logError(e){$('error').textContent=e.message;stop();busy=false;update();}
async function reset(){stop();busy=true;update();$('ready').textContent='同じDNAから世界を準備しています…';await new Promise(r=>setTimeout(r,20));
 try{world=M.create(Number($('seed').value),$('origin').value==='birth');selected=1;sprites.clear();selectedBefore=null;await refreshSprites();ready=true;$('ready').textContent='FizzBuzz 実素材・成長計算を読込済み';$('error').textContent='';}catch(e){logError(e);}finally{busy=false;update();}}
async function refreshSprites(){
 for(const c of world.creatures){R.draw(Object.freeze(c.bio),{mini:true,still:true});const canvas=document.createElement('canvas');canvas.width=270;canvas.height=195;canvas.getContext('2d').drawImage(hero,0,0,270,195);sprites.set(c.id,canvas);}
 drawPortrait(performance.now(),true);
}
function drawPortrait(t,still=false){if(!world||!ready&&!sprites.size)return;const c=selectedCell();
 const events=c.mealEvent?[{...c.mealEvent,time:c.presentationTime||0}]:[];
 R.draw(Object.freeze(c.bio),{time:t,still,energyEvents:events});
}
function population(){
 const groups=new Map();world.creatures.forEach(c=>{const key=c.bio.lineage||'undifferentiated';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c);});
 $('population').innerHTML=[...groups].map(([id,cells])=>'<button class="family '+(cells.some(c=>c.id===selected)?'selected':'')+'" data-id="'+cells[0].id+'"><b>'+ (E.LINEAGE_BY_ID[id]?.names[1]||'未分化')+'系統</b><span>'+cells.filter(c=>c.hp>0).length+' 個体 / '+id+'</span></button>').join('');
 $('population').querySelectorAll('button').forEach(b=>b.onclick=()=>select(Number(b.dataset.id)));
}
function update(){
 $('play').disabled=$('step').disabled=$('fast').disabled=$('feed').disabled=!ready||busy;
 $('reset').disabled=busy;$('play').textContent=running?'Ⅱ 一時停止':'▶ 観測を開始';
 if(!world)return;const c=selectedCell(),a=M.abilities(c.bio),base=c.baseline;
 $('turn').textContent=String(world.turn).padStart(3,'0');$('specimen-id').textContent='#'+String(c.id).padStart(2,'0');
 $('name').textContent=M.name(c.bio);$('identity').textContent='DNA初期値 '+c.bio.seed+' / 同じDNAの比較個体 #'+(c.id%2?c.id+1:c.id-1);
 $('stage').textContent=E.PHASES[c.bio.stage];$('lineage').textContent=c.bio.lineage||'未分化';$('growth-value').textContent=c.bio.points.toFixed(2)+' P';$('growth').style.width=c.bio.points+'%';
 const labels={body:'体格',appendage:'付属肢',senses:'感覚',skin:'表皮',aptitude:'適性',sensitivity:'感受性'};
 $('dna').innerHTML=Object.entries(labels).map(([key,label])=>'<div class="dna-row"><span>'+label+'</span><i><b style="width:'+c.bio.dna[key]*100+'%"></b></i><strong>'+Math.round(c.bio.dna[key]*100)+'</strong></div>').join('');
 $('energy').textContent='ENERGY '+c.energy.toFixed(0);$('hp').textContent='HP '+c.hp.toFixed(0);$('meals').textContent='観測中の摂取 '+c.meals+'回';
 $('world-stats').textContent='誕生セル '+world.cellBirths+' / 摂取 '+world.ate+' / 生存 '+world.creatures.filter(c=>c.hp>0).length;
 $('abilities').innerHTML=stats.map(([key,label,max])=>'<div class="ability"><span>'+label+'</span><div class="track"><i class="baseline" style="width:'+Math.min(100,base[key]/max*100)+'%"></i><i class="current" style="width:'+Math.min(100,a[key]/max*100)+'%"></i></div><strong>'+a[key].toFixed(key==='longevity'?0:2)+'<small>'+(a[key]-base[key]>=0?'+':'')+(a[key]-base[key]).toFixed(2)+'</small></strong></div>').join('');
 $('trace').innerHTML=c.trace.length?c.trace.map(e=>'<div class="event"><b>T'+e.turn+' · '+{fizz:'Fizz',buzz:'Buzz',fizzbuzz:'FizzBuzz'}[e.kind]+' を摂取</b><small>'+M.LABEL[e.environment]+' / '+e.source+(e.from!==e.to?' / '+E.PHASES[e.to]+'へ進化':' / 器官と能力へ反映')+'</small></div>').join(''):'<p class="empty">まだ観測中の摂取はありません。<br>餌に近づくまで進めるか、比較実験を試してください。</p>';
 population();
}
function select(id){selected=id;selectedBefore=null;update();drawPortrait(performance.now(),true);}
async function advance(count=1){if(busy||!ready)return;busy=true;update();const previous=new Map(world.creatures.map(c=>[c.id,c.meals]));
 try{for(let i=0;i<count;i++){M.step(world);if(i%10===9){await new Promise(r=>setTimeout(r,0));}}
 for(const c of world.creatures)if(c.meals>previous.get(c.id))c.presentationTime=performance.now();
 await refreshSprites();}catch(e){logError(e);}finally{busy=false;update();}}
function schedule(){timer=setTimeout(async()=>{if(!running)return;await advance(1);if(running)schedule();},230);}
function drawMap(t){if(!world)return;const w=map.width,h=map.height,tile=w/world.width;
 g.fillStyle='#10232a';g.fillRect(0,0,w,h);
 const zones=[['tide',0,0],['heat',w/2,0],['signal',0,h/2],['void',w/2,h/2]];
 for(const [env,x,y]of zones){if(images[env]){g.save();g.globalAlpha=.42;g.drawImage(images[env],x,y,w/2,h/2);g.restore();}g.fillStyle='#07121a33';g.fillRect(x,y,w/2,h/2);}
 world.field.forEach((c,i)=>{const x=i%world.width*tile,y=Math.floor(i/world.width)*tile;g.strokeStyle='#acc6d008';g.strokeRect(x,y,tile,tile);g.fillStyle={tide:'#56b8cc09',heat:'#df864b12',signal:'#83a5e218',void:'#8c6ab50b'}[c.env];g.fillRect(x,y,tile,tile);if(c.alive){g.fillStyle='#a7dfb51b';g.fillRect(x+4,y+4,tile-8,tile-8);}});
 g.setLineDash([3,6]);g.lineWidth=1;
 for(const a of world.creatures)for(const b of world.creatures)if(a.id<b.id&&M.same(a,b)){g.strokeStyle=a.id===selected||b.id===selected?'#a6ddc18c':'#a6ddc12e';g.beginPath();g.moveTo((a.x+.5)*tile,(a.y+.5)*tile);g.lineTo((b.x+.5)*tile,(b.y+.5)*tile);g.stroke();}
 g.setLineDash([]);
 for(const f of world.foods){const x=(f.x+.5)*tile,y=(f.y+.5)*tile,atlas=atlasImages[f.kind],config=VALIS_ASSETS.food[{fizz:'life',buzz:'mineral',fizzbuzz:'information'}[f.kind]];
  if(atlas&&config){const r=config.regions[(f.x+f.y)%config.regions.length];g.save();g.globalAlpha=.86;g.drawImage(atlas,...r,x-9,y-9,18,18);g.restore();}else{g.fillStyle=foodColors[f.kind];g.beginPath();g.arc(x,y,3,0,7);g.fill();}}
 for(const c of world.creatures){const x=(c.x+.5)*tile,y=(c.y+.5)*tile,active=c.id===selected,friend=M.same(c,selectedCell());
  if(active||friend){g.strokeStyle=active?'#e8c883':'#99d2b0aa';g.lineWidth=active?1.8:1;g.beginPath();g.ellipse(x,y+12,34,12,0,0,Math.PI*2);g.stroke();}
  const im=sprites.get(c.id);if(im){g.save();g.globalAlpha=c.hp>0?1:.25;const drift=Math.sin(t/1300+c.id)*2;g.drawImage(im,x-66,y-49+drift,132,95);g.restore();}
  g.font='10px sans-serif';g.textAlign='center';g.fillStyle=active?'#f1d697':'#c2d5d6';g.fillText('#'+c.id+(friend&&c.id!==selected?' 仲間':''),x,y+36);
 }
}
map.onclick=event=>{if(!world)return;const r=map.getBoundingClientRect(),x=(event.clientX-r.left)/r.width*world.width,y=(event.clientY-r.top)/r.height*world.height;let nearest=world.creatures.reduce((a,c)=>{const d=Math.hypot(x-c.x-.5,y-c.y-.5);return !a||d<a.d?{c,d}:a;},null);if(nearest&&nearest.d<2)select(nearest.c.id);};
$('reset').onclick=reset;$('step').onclick=()=>{stop();advance(1);};$('fast').onclick=()=>{stop();advance(120);};$('play').onclick=()=>{if(running){stop();update();}else{running=true;update();schedule();}};
$('feed').onclick=async()=>{stop();busy=true;update();try{M.challenge(world,selected,$('food-kind').value,$('env-kind').value);selectedCell().presentationTime=performance.now();await refreshSprites();}catch(e){logError(e);}finally{busy=false;update();}};
window.__ECO_MOCK__={snapshot:()=>JSON.parse(JSON.stringify({world,selected,running,busy,ready})),abilities:()=>M.abilities(selectedCell().bio),advance,select};
try{await R.prepare();await Promise.all(M.ENV.map(async e=>images[e]=await image(VALIS_ASSETS.environments[e].file)));await Promise.all(M.FOOD.map(async f=>atlasImages[f]=await image(VALIS_ASSETS.food[{fizz:'life',buzz:'mineral',fizzbuzz:'information'}[f]].file)));await reset();}catch(e){logError(e);$('ready').textContent='素材の読み込みを確認してください';}
function frame(t){drawMap(t);if(ready&&!busy&&t-lastTime>180){drawPortrait(t,false);lastTime=t;}requestAnimationFrame(frame);}requestAnimationFrame(frame);
})();
