"use strict";
(async()=>{
 await EcoArt.ready;const $=id=>document.getElementById(id),D=window.FOUNDATION_DATA,S=EcoState;
 const board=EcoRenderer.create($('board')),detail=EcoRenderer.create($('detail'));let current,selected,zoomed=false;
 function draw(){board.draw();detail.draw();}
 function choose(cell){
  selected=cell;board.view.selected=cell;detail.view.selected=cell;detail.setWorld(current.world);detail.fit();const [x,y]=S.xy(current.world,cell);detail.view.scale=64;detail.view.x=$('detail').getBoundingClientRect().width/2-(x+.5)*64;detail.view.y=120-(y+.5)*64;
  const organisms=current.world.organisms.filter(o=>o.cell===cell),o=organisms.find(o=>o.slot==='main')||organisms[0],t=current.world.tiles[cell];
  $('name').textContent=o?S.spec(o).name:'生物のいない地点';
  const g=$('portrait').getContext('2d');g.clearRect(0,0,420,260);if(o){if(o.slot==='main')EcoRenderer.creature(g,o,210,130,62,true);else EcoArt.food(g,o,210,130,62,t.env);}
  $('details').innerHTML=`座標 (${x}, ${y}) / ${S.D.environments[t.env].name}<br>地形 ${({plain:"平地",shallow:"浅瀬",deep:"深水",rock:"岩場",mud:"泥地"})[t.terrain]} / 遮蔽物 ${({none:"なし",boulder:"大岩",log:"倒木",bush:"草むら"})[t.cover]}<br>`+organisms.map(a=>`${a.slot==='main'?'主':'餌'}：${S.spec(a).name} 第${a.phase}相 / ${a.sex==='female'?'雌':a.sex==='male'?'雄':'雌雄なし'}<br>年齢${a.age} / 世代${a.generation} / E ${a.E.toFixed(1)}<br>${a.role?`階級：${({queen:'女王',worker:'働き個体',male:'雄'})[a.role]}${a.sperm?` / 貯精残数 ${a.sperm.uses}`:''}<br>`:''}${a.infection?`<span class="dot"></span> ${S.D.byId[a.infection.species].name} / ${({first:"第一宿主",middle:"中間宿主",extra:"追加中間",terminal:"終宿主"})[a.infection.stage]}${a.infection.q?` + <span class="ring"></span> 高次${a.infection.q.phase}相`:''}<br>`:''}`).join('')+current.world.resources.filter(a=>a.cell===cell).map(a=>`資源：${S.FOOD[a.kind].name||a.kind} / 量${a.q}<br>`).join('')+current.world.carcasses.filter(a=>a.cell===cell).map(a=>`死骸：${S.D.byId[a.species].name} / E ${a.E.toFixed(1)}${a.infection?' / 感染性あり':''}<br>`).join('');
  draw();
 }
 function show(key){current=D.cases[key];const w=current.world,r=current.report;board.setWorld(w);board.fit();zoomed=false;
  $('turn').textContent='TURN '+w.turn;$('caption').textContent=`初期値 ${w.config.seed} / ${w.config.width}×${w.config.height} / 主${w.stats.main}体・餌${w.stats.food}体 / 主初期${w.config.initial}体`;
  $('metrics').innerHTML=[[r.richness.main+'/20',w.turn?'主生物の存続系統':'主生物の初期配置'],[r.richness.food+'/6','生産者・餌の存続系統'],[w.stats.P,'寄生コロニー / 感染宿主'+Math.round(w.stats.P/w.organisms.length*100)+'%'],[w.stats.Q,'高次寄生 / 初期 '+(r.rows.find(a=>a.id==='hyperparasite')?.initial??w.stats.Q)]].map(([a,b])=>`<article class="panel metric"><strong>${a}</strong><p>${b}</p></article>`).join('');
  $('species').innerHTML=r.rows.map(a=>`<tr><td>${a.name}</td><td>${a.initial}</td><td class="${a.final?'alive':'zero'}">${a.final}</td><td>${a.births}</td><td>${a.firstAbsent===null?'—':a.firstAbsent===0?'未配置':a.firstAbsent+'ターン'}</td></tr>`).join('');
  $('limits').textContent=D.note;
  const food=new Set(w.organisms.filter(a=>a.slot==='food').map(a=>a.cell));
  const candidates=w.organisms.filter(a=>a.slot==='main'&&food.has(a.cell));
  const score=a=>{const [x,y]=S.xy(w,a.cell);return Math.hypot(x-w.config.width/2,y-w.config.height/2)-(a.phase>=3?5:0)-(new Set(S.nearby(w,a.cell,2,true).map(p=>w.tiles[p].env)).size>1?12:0);};candidates.sort((a,b)=>score(a)-score(b));
  const queen=key==='colony'?w.organisms.find(a=>a.species==='swarm'&&a.role==='queen'):null;
  const pick=queen||candidates.find(a=>a.infection?.q)||candidates.find(a=>a.infection)||candidates[0]||w.organisms[0];choose(pick?.cell||0);
 }
 for(const [key,c] of Object.entries(D.cases)){const o=document.createElement('option');o.value=key;o.textContent=c.label;$('case').append(o);}
 $('case').onchange=e=>show(e.target.value);$('fit').onclick=()=>{zoomed=false;board.fit();draw();};$('zoom').onclick=()=>{zoomed=true;const [x,y]=S.xy(current.world,selected);board.view.scale=48;const b=$('board').getBoundingClientRect();board.view.x=b.width/2-(x+.5)*48;board.view.y=b.height/2-(y+.5)*48;board.view.x=Math.min(0,Math.max(b.width-current.world.config.width*48,board.view.x));board.view.y=Math.min(0,Math.max(b.height-current.world.config.height*48,board.view.y));draw();};$('resources').onchange=e=>{board.view.resources=e.target.checked;detail.view.resources=e.target.checked;draw();};$('board').onclick=e=>{const cell=board.cellAt(e.clientX,e.clientY);if(cell!==null)choose(cell);};window.addEventListener('resize',()=>{if(!zoomed)board.fit();choose(selected);});
 show(Object.keys(D.cases)[0]);window.__FOUNDATION_PREVIEW__={ready:true,signature:async()=>{const bytes=new TextEncoder().encode(JSON.stringify(D));return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(x=>x.toString(16).padStart(2,"0")).join("");},selected:()=>selected,world:()=>current.world,board,detail};
})().catch(console.error);
