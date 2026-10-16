"use strict";
(async()=>{
 const $=id=>document.getElementById(id),D=window.SurvivalTrialData,S=EcoState,left=EcoRenderer.create($("left-board")),right=EcoRenderer.create($("right-board"));
 await EcoArt.ready;if(!EcoArt.loaded)throw Error("試作画像の読込失敗");$("loading").hidden=true;
 let current="standard",focused=false;
 function draw(){if(!focused)left.draw();right.draw();}
 function show(){
  const set=D.cases[current],a=D.worlds[set.left],b=D.worlds[set.right],reports=set.reports.map(id=>D.reports[id]);
  left.setWorld(a);right.setWorld(b);if(!focused)left.fit();right.fit();left.view.resources=right.view.resources=true;
  $("left-title").textContent=set.leftLabel;$("right-title").textContent="感染経路を広げた試作";
  for(const [side,w] of [["left",a],["right",b]])$(side+"-caption").textContent=`主 ${w.stats.main}体 / 餌 ${w.stats.food}体 / P ${w.stats.P}コロニー / Q ${w.stats.Q}コロニー · 初期値 ${w.config.seed}`;
  $("scores").innerHTML=reports.map(r=>`<article class="panel score-card"><h2>${r.label}</h2><strong>${r.richness.main}<small style="font-size:14px"> / 20系統</small></strong><p>餌 ${r.richness.food}/6系統 · 寄生 ${r.richness.P}/2系統 · Q ${r.snapshots.at(-1).Q}</p><span class="mini-count">主 ${r.snapshots.at(-1).main}体 / 初期餌 ${r.snapshots[0].food}体</span></article>`).join("");
  const host=b.organisms.find(o=>o.infection?.q)||b.organisms.find(o=>o.infection?.stage==="terminal")||b.organisms.find(o=>o.infection);
  if(host){const p=host.infection,q=p.q;right.view.selected=host.cell;const g=$("colony").getContext("2d");g.clearRect(0,0,400,280);EcoArt.food(g,{species:p.species},200,130,85,b.tiles[host.cell].env);if(q)EcoArt.food(g,{species:"hyperparasite"},285,190,30,b.tiles[host.cell].env);
   $("host").innerHTML=`<div class="host-card"><b>${S.D.byId[p.species].name} · 雌雄なしコロニー</b><br>宿主：${S.spec(host).name} / (${S.xy(b,host.cell).join(", ")})<br>段階：${{first:"第一宿主",middle:"中間宿主",extra:"追加中間",terminal:"終宿主"}[p.stage]} / 成熟 ${p.counter}<br>PのE ${p.E}${q?`<br>高次Q：第${q.phase}相 / E ${q.E}`:"<br>この宿主内にQなし"}</div>`;
  }
  const t=b.trialTransmission||{};$("routes").innerHTML=[["反復接触",t.contact],["うち終宿主から",t.terminalContact],["感染性死骸の摂取",t.carcass],["従来の植物摂取",t.legacy]].map(([name,n])=>`<div class="route-value"><span>${name}</span><b>${(n||0).toLocaleString()}件</b></div>`).join("");
  const fraction=Math.round(b.stats.P/b.organisms.length*100);$("verdict").textContent=`試作の成果と限界：300ターンで主${D.reports[set.right].richness.main}/20系統・餌${D.reports[set.right].richness.food}/6系統が存続。P感染宿主は約${fraction}%。感染前段階も維持できましたが、感染の広がりが強く、岩苔・水游虫・少数系統の安定性や高次Qの拡散は本採用前の調整対象です。300ターンの観測で長期均衡は証明していません。`;
  $("species-head").innerHTML='<tr><th>系統</th>'+reports.map(r=>'<th>'+r.label+'</th>').join('')+'</tr>';
  $("species-body").innerHTML=reports[0].rows.map((r,i)=>'<tr><td>'+r.name+'</td>'+reports.map(s=>{const row=s.rows[i],n=row.final;return `<td class="${n?"alive":row.initial?"zero":"na"}">${row.initial} → ${n}${!row.initial&&!n?"（未配置）":""}</td>`}).join('')+'</tr>').join('');draw();
 }
 $("case-select").onchange=e=>{current=e.target.value;show();};$("focus").onclick=()=>{focused=!focused;$("trial-grid").classList.toggle("focused",focused);$("focus").textContent=focused?"比較表示へ戻る":"感染コロニーを大きく観察";requestAnimationFrame(show);};
 window.addEventListener("resize",()=>{if(!focused)left.fit();right.fit();draw();});show();window.__SURVIVAL_PREVIEW__={ready:true,draw,case:()=>current,inputSignature:()=>EcoHash.sha256(JSON.stringify(D.worlds))};
})().catch(e=>{document.getElementById("loading").textContent=e.message;console.error(e);});
