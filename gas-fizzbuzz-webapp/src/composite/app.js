(function(){
'use strict';
var E=window.CreatureEngine, C=window.ASSET_CONFIG;
// Stage-4 provisional assets: add only missing legacy organ sprite entries.
if(window.CompositeDraftOrgans)window.CompositeDraftOrgans.install(C);
var $=id=>document.getElementById(id);
var canvas=$('creatureCanvas'),ctx=canvas.getContext('2d');
var mediaReduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var cache=new Map(),loaded=false,stars=[],ticker=null,rafHandle=null,preview=null,activeLineage='valis';
var specimen=E.initial(480),seed=480,lines=E.linesFor(seed),playing=false,paused=false,complete=false,index=0,busy=false,requestToken=0;
var environment='signal',autoClimate=null,tempo=50,showFlicker=true,phaseSnapshots=[];
var palettes={valis:['#96e3ff','#efd6ff','#ffcf79'],antimeme:['#86cfff','#b6a6df','#e4edfa']};
var anchors={head:[255,353],eye:[247,390],mouth:[280,421],dorsal:[493,280],shoulder:[405,355],flank:[484,460],chest:[442,439],forelimb:[419,504],hindlimb:[558,509],tailBase:[692,425],tailTip:[796,415],outerOrbit:[793,210]};
var dims={
 receiverCrown:[178,135],observingEye:[118,103],revelationMembrane:[278,245],lightKernel:[143,145],detachedNode:[180,160],signalTail:[231,145],
 absenceMask:[151,112],unseenEye:[129,109],erasureCrown:[207,167],memoryFilament:[190,150],brokenTail:[173,125]
};
var backLayer=new Set(['revelationMembrane','memoryFilament','erasureCrown','signalTail','brokenTail','detachedNode']);
// Provisional 12-lineage SVG organs. These are NOT high-fidelity extracted mock pixels.
Object.assign(dims,{
 abyssHeritage:[340,215],mythHeritage:[290,225],recursiveHeritage:[225,220],
 sailHeritage:[290,230],gravityHeritage:[260,225],crystalHeritage:[235,215],
 manyeyesHeritage:[195,155],abyssshellHeritage:[255,215],
 parallelHeritage:[290,225],memoryHeritage:[225,190],
 serpentHeritage:[270,225],solarHeritage:[275,235]
});
var phaseNames=E.PHASES;
var names=Object.fromEntries(E.LINEAGES.map(l=>[l.id,l.names]));
var finalNames=Object.fromEntries(E.LINEAGES.map(l=>[l.id,l.finalName]));
var lineageById=E.LINEAGE_BY_ID;
function svgGlyph(lineage){return lineageById[lineage]?lineageById[lineage].mark:'◌';}
function srcFor(rel){return (C.sources&&C.sources[rel])||rel;}
function ensureImage(rel){
 rel=srcFor(rel);
 if(!cache.has(rel)){
  var im=new Image();var promise=new Promise(resolve=>{im.onload=()=>resolve(im);im.onerror=()=>resolve(null);});
  im.src=rel;cache.set(rel,{im,promise});
 }
 return cache.get(rel).promise;
}
async function preload(){
 var paths=Object.values(C.core);
 Object.values(C.partImages).forEach(arr=>arr.forEach(rel=>paths.push(rel)));
 Object.values(C.lineageImages||{}).forEach(arr=>arr.forEach(rel=>paths.push(rel)));
 paths=paths.concat(C.references.map(r=>r.file));
 await Promise.all(paths.map(ensureImage));loaded=true;updateUI();scheduleFrame();
}
function img(rel){var c=cache.get(srcFor(rel));return c&&c.im.complete&&c.im.naturalWidth?c.im:null;}
function reset(n){
 requestToken++;busy=false;stop();seed=n;specimen=E.initial(seed);lines=E.linesFor(seed);index=0;complete=false;playing=false;paused=false;
 phaseSnapshots=[specimen,null,null];$('fizzbuzzLog').value='';preview=null;
 updateUI();scheduleFrame();
}
function stop(){if(ticker){clearInterval(ticker);ticker=null;}playing=false;paused=false;}
function selectEnvironment(env,keepAuto){if(!keepAuto)autoClimate=null;environment=env;document.querySelectorAll('[data-env]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.env===env)));
 $('environmentName').textContent={signal:'電磁波',void:'虚空',heat:'熱波',tide:'潮流'}[env];}
function appendLine(line){
 const el=$('fizzbuzzLog');
 el.value+=(el.value?'\n':'')+line;
 if(index%4===0)el.scrollTop=el.scrollHeight;
}
function advance(line){
   var previous=specimen;
   if(autoClimate)selectEnvironment(E.plannedEnvironment(previous,autoClimate),true);
   specimen=E.step(previous,line,environment);
   if(specimen.stage!==previous.stage)phaseSnapshots[previous.stage]=previous;
   phaseSnapshots[specimen.stage]=specimen;
 }
function feedOne(){
 if(index>=lines.length){finish();return;}
 var line=lines[index];advance(line);index++;
 appendLine(line);
 if(index>=lines.length)finish();
 updateUI();
}
function startPlayback(rows){
  lines=rows;busy=false;playing=true;paused=false;complete=false;
  $('notice').textContent=autoClimate?'系統環境プリセット：環境刺激の比率を自動調整します。進化先の選択そのものは従来の環境履歴判定です。':'受信したFizzBuzz原文をそのまま再生します。環境の履歴は次に食べる餌に適用されます。';
  ticker=setInterval(()=>{if(!paused)feedOne();},tempo);
  updateUI();
}
function validateLines(rows,n){
  if(!Array.isArray(rows)||rows.length!==n||rows.some(x=>typeof x!=='string'))
    return false;
  // The server is the only output authority in GAS. Detect transport/API mismatch
  // instead of silently synthesizing a different set of rows.
  var expected=E.linesFor(n);
  return rows.every((x,i)=>x===expected[i]);
}
function run(){
 var n=Number($('seedInput').value);
 if(!Number.isSafeInteger(n)||n<1||n>1000){$('notice').textContent='Nは1〜1000の整数にしてください。';return;}
 reset(n);
 busy=true;var token=++requestToken;
 if(window.google&&google.script&&google.script.run){
   $('notice').textContent='GASサーバーからFizzBuzz原文を取得中…';
   updateUI();
   google.script.run
     .withSuccessHandler(function(rows){
       if(token!==requestToken)return;
       if(!validateLines(rows,n)){
         busy=false;$('notice').textContent='サーバー応答の形式が一致しません。再生は開始できません。';updateUI();return;
       }
       startPlayback(rows);
     })
     .withFailureHandler(function(err){
       if(token!==requestToken)return;
       busy=false;$('notice').textContent='GAS通信失敗: '+((err&&err.message)||'不明なエラー');updateUI();
     })
     .calculateFizzBuzz(n);
 }else{
   // Explicit local preview mode; no false assertion that GAS was contacted.
   startPlayback(E.linesFor(n));
   $('notice').textContent='ローカルプレビュー：GASサーバーには接続していません。'+(autoClimate?' 選択系統の環境比率で育成中。':'');
 }
}

function finish(){stop();complete=true;$('notice').textContent='完走：'+seed+'行。進化履歴と継承器官を記録しました。';updateUI();render();}
function skip(){if(!playing && !paused && !complete)return;
 if(complete)return;
 if(ticker){clearInterval(ticker);ticker=null;}
 while(index<lines.length){advance(lines[index]);index++;}
 $('fizzbuzzLog').value=lines.join('\n');finish();
}
function showGuide(id){if(!lineageById[id])return;activeLineage=id;preview=id;
 document.querySelectorAll('[data-guide]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.guide===id)));
 updateUI();scheduleFrame();}
function showLive(){preview=null;
 document.querySelectorAll('[data-guide]').forEach(b=>b.setAttribute('aria-pressed','false'));
 updateUI();scheduleFrame();}
function demoFor(id,tier){
 var n=480,st=E.runAll(n,id==='valis'?'signal':id==='antimeme'?'void':'tide');
 st.lineage=id;st.stage=2;st.matured=true;
 st.partXp={...st.partXp};
 E.PART_DEFINITIONS[id].forEach(def=>{st.partXp[id+':'+def[0]]=[0,1,7,18][tier];});
 return st;
}
function selected(){return preview?demoFor(preview,Number($('levelPicker').value)):specimen;}
function mainLineage(s){return s.lineage||(preview||activeLineage);}
function activeParts(s){
 const id=mainLineage(s);return preview?E.phenotype(s,id):E.phenotype(s);
}
function font(str,x,y,size,color,align){ctx.fillStyle=color||'#b8d9ff';ctx.textAlign=align||'left';ctx.font='600 '+size+'px system-ui';ctx.fillText(str,x,y);ctx.textAlign='left';}
function layerImage(image,x,y,w,h,alpha,angle){
 if(!image)return;
 ctx.save();ctx.globalAlpha=alpha==null?1:alpha;
 ctx.translate(x,y);ctx.rotate(angle||0);ctx.drawImage(image,-w/2,-h/2,w,h);
 ctx.restore();
}
function stageCore(s){return s.dna.bodyVariant===0?'marin':'astral';}
function sceneBackground(s,t){
 ctx.clearRect(0,0,1024,680);
 const grad=ctx.createRadialGradient(540,300,25,510,310,730);
 if(mainLineage(s)==='valis'){grad.addColorStop(0,'#151935');grad.addColorStop(.52,'#08152b');grad.addColorStop(1,'#050c1b');}
 else {grad.addColorStop(0,'#181529');grad.addColorStop(.52,'#091323');grad.addColorStop(1,'#070a15');}
 ctx.fillStyle=grad;ctx.fillRect(0,0,1024,680);
 ctx.strokeStyle='rgba(91,137,195,.09)';ctx.lineWidth=1;
 for(let x=0;x<1024;x+=45){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,680);ctx.stroke();}
 for(let y=0;y<680;y+=45){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1024,y);ctx.stroke();}
 stars.forEach((s,i)=>{var a=.3+.36*Math.sin(t/900+i*1.3);ctx.fillStyle='rgba(154,209,252,'+a.toFixed(2)+')';ctx.fillRect(s.x,s.y,s.r,s.r);});
 const spot=ctx.createRadialGradient(505,500,40,505,500,410);
 spot.addColorStop(0,'rgba(38,83,152,.15)');spot.addColorStop(1,'rgba(1,10,22,0)');ctx.fillStyle=spot;ctx.fillRect(0,0,1024,680);
 ctx.fillStyle='rgba(6,14,27,.65)';ctx.beginPath();ctx.ellipse(510,574,310,26,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='rgba(98,162,223,.14)';ctx.beginPath();ctx.moveTo(40,585);ctx.lineTo(989,585);ctx.stroke();
}
function scheduleFrame(){
  if(!loaded)return;
  if(rafHandle!==null)return;
  if(mediaReduced||!showFlicker){render(0);return;}
  rafHandle=requestAnimationFrame(function tick(t){
    rafHandle=null;render(t);
    if(!mediaReduced&&showFlicker)rafHandle=requestAnimationFrame(tick);
  });
}
function paintSpecimen(s,t,reduced,mini){
 var lineage=mainLineage(s),tiers=E.phenotype(s,lineage),
   heartbeat=reduced?0:Math.sin(t/1150)*2.4;
 if(!mini)sceneBackground(s,t);
 if(lineage==='valis'){
   ctx.strokeStyle='rgba(153,184,253,.14)';ctx.lineWidth=2;
   ctx.beginPath();ctx.ellipse(740,268,205,85,-.42,0,Math.PI*2);ctx.stroke();
 }
 var drawPart=(part,scaleFactor=1,dim=.96)=>{
    if(!part.level)return;
    var key=part.lineage+':'+part.id,assets=C.partImages[key];
    if(!assets)return;
    var image=img(assets[part.level-1]);if(!image)return;
    var pos=anchors[part.anchor]||[500,400];
    var size=dims[part.id]||[160,120];
    var sf=(.80+.13*part.level)*scaleFactor;
    var move=(!reduced&&(part.anchor==='outerOrbit'||part.anchor==='tailTip'))?Math.sin(t/900+part.level)*7:0;
    var angle=(part.anchor==='dorsal'?-0.25:part.anchor==='flank'?.15:0)+
      (!reduced&&part.anchor==='outerOrbit'?Math.sin(t/1450)*.11:0);
    ctx.save();
    if(part.id==='absenceMask'||part.id==='unseenEye'||part.id==='observingEye'||part.id==='receiverCrown')
      ctx.globalCompositeOperation='screen';
    layerImage(image,pos[0]+move,pos[1]-heartbeat,size[0]*sf,size[1]*sf,dim,angle);
    ctx.restore();
 };
 const rear=tiers.filter(p=>backLayer.has(p.id)),front=tiers.filter(p=>!backLayer.has(p.id));
 rear.forEach(p=>drawPart(p));
 // 12 heritage-lineage portraits are independently extracted illustration layers.
 // Their true anatomy-part atlas is a later step; never mislabel them as LV sprites.
 var lineageLayers=C.lineageImages&&C.lineageImages[lineage];
 var portrait=lineageLayers&&s.stage>0?img(lineageLayers[Math.min(1,s.stage-1)]):null;
 // Transitional lineage paintings already contain the ancestral head/eye/tail.
 // Never superimpose a second full juvenile body on this complete morphology.
 if(portrait){
   ctx.save();ctx.filter='drop-shadow(0 0 22px rgba(133,203,255,.22))';
   layerImage(portrait,513,372+heartbeat,775,465,.98,0);ctx.restore();
 }else{
   // Phase I and the two truly modular lineages retain the stable common core.
   const core=img(C.core[stageCore(s)]);
   if(core){ctx.save();ctx.filter='drop-shadow(0 0 23px rgba(129,210,255,.12))';
     layerImage(core,520,404+heartbeat,780*s.dna.torsoRatio,432*s.dna.headRatio,1,0);ctx.restore();}
 }
 if(s.heritage) s.heritage.forEach((entry,i)=>{
   entry.parts.slice(0,3).forEach(p=>drawPart(p,.60-i*.08,.52));
 });
 front.forEach(p=>drawPart(p));
 // Tiny alive motions use small light sweeps, not anatomy replacement.
 if(!reduced){
   const a=Math.max(0,.5+.5*Math.sin(t/450));
   ctx.fillStyle='rgba(170,227,255,'+(.14*a).toFixed(2)+')';
   ctx.beginPath();ctx.arc(245,389,12+a*4,0,Math.PI*2);ctx.fill();
 }
 if(!mini){
   font(s.dna.seed+' / '+(s.lineage?(names[lineage]||[])[s.stage]||lineage:'ミナモルフ'),26,37,20,'#cde3fc');
   font(s.lineage?(portrait?(C.draftOrganLineages&&C.draftOrganLineages.includes(lineage)?'MOCK PORTRAIT + DRAFT Lv ORGAN · ':'MOCK PORTRAIT · '):'LAYER COMPOSITE · ')+lineage.toUpperCase():'UNCOMMITTED / ORIGIN',26,61,12,'#7296bd');
   if(preview) font('図鑑サンプル · 実際の育成個体ではありません',985,640,17,'#d9c9ff','right');
 }
}
function render(t=0){
 if(!loaded)return;
 var s=selected();paintSpecimen(s,t,mediaReduced||!showFlicker,false);
}

function updateUI(){
 const s=selected(),lineage=mainLineage(s),part=activeParts(s),isDemo=Boolean(preview);
 $('subjectName').textContent=s.lineage?names[lineage][s.stage]:'ミナモルフ';
 $('subjectMark').textContent=svgGlyph(lineage);
 $('phaseName').textContent=phaseNames[s.stage];
 $('lineageName').textContent=s.lineage?(lineageById[lineage]||{}).group:'未分化';
 $('creatureId').textContent='#'+String(seed).padStart(4,'0');
 $('pointsLabel').textContent=s.points.toFixed(2)+' / 100 P';
 $('pointBar').style.width=s.points+'%';
 $('runCount').textContent=index+' / '+seed;
 $('foodTotal').textContent=Object.values(s.foods).reduce((a,b)=>a+b,0);
 $('specimenMode').textContent=isDemo?'図鑑見本':'LIVE · '+(complete?'完走':playing?'育成中':'待機');
 $('maturityStatus').textContent=s.matured?'完全成熟・外見固定':(s.stage===0?'未分化':'発達中');
 $('coreLabel').textContent=s.dna.bodyVariant?'星原型':'深海原型';
 $('mainNote').textContent=isDemo?(lineage==='valis'||lineage==='antimeme'?'図鑑見本：Lvごとの透過パーツを合成しています。':'図鑑見本：旧12系統はモック由来の暫定肖像＋1器官×3Lvの草案SVGです。原本由来の完成透過パーツではありません。'):
    '初期DNAの顔・眼・胴・尾は維持。環境と餌で増えたパーツ画像を重ねます。';
 $('partList').replaceChildren();
 part.forEach(function(p){
  const node=document.createElement('div');node.className='part-item';
  const b=document.createElement('div');b.className='part-line';
  const name=document.createElement('strong');name.textContent=p.label;
  const level=document.createElement('span');level.textContent='Lv.'+p.level;
  b.append(name,level);
  const slot=document.createElement('div');slot.className='part-sub';slot.textContent=p.anchor+' · '+p.xp+' XP';
  const meter=document.createElement('div');meter.className='part-meter';
  const fill=document.createElement('i');fill.style.width=(p.level===3?100:p.level===2?66:p.level===1?33:3)+'%';meter.appendChild(fill);
  node.append(b,slot,meter);$('partList').appendChild(node);
 });
 $('heritageLabel').textContent=s.heritage&&s.heritage.length?s.heritage.map(x=>x.parts.map(p=>p.label).join('・')||((lineageById[x.lineage]||{}).group||'旧形態')).join(' → '):'不変コアを維持';
 $('finalName').textContent=finalNames[lineage]+' ／ 第四相候補（未実装）';
 $('runButton').disabled=busy||playing&&!complete;
 $('pauseButton').disabled=!playing;
 $('pauseButton').textContent=paused?'再開':'一時停止';
 $('skipButton').disabled=!playing;
 renderHistory(s);
 scheduleFrame();
}
function phaseModel(stage,s,lineage){
  if(preview){
    if(stage===0)return E.initial(seed);
    const demo=demoFor(lineage,Math.max(1,Math.min(3,Number($('levelPicker').value)-(2-stage))));
    demo.stage=stage;demo.heritage=stage===1?[]:demo.heritage;
    return demo;
  }
  return phaseSnapshots[stage]||(stage===s.stage?s:null);
}
function drawPhasePortrait(target,stage,lineage,state){
 const g=target.getContext('2d'),w=target.width,h=target.height;
 g.clearRect(0,0,w,h);
 if(stage===3){
  g.fillStyle='#0b1a2e';g.fillRect(0,0,w,h);
  g.fillStyle='#6b81a4';g.font='40px Georgia';g.textAlign='center';g.fillText('?',w/2,h*.55);return;
 }
 const model=phaseModel(stage,state,lineage);
 if(!model){g.fillStyle='#0b1a2e';g.fillRect(0,0,w,h);return;}
 // Use the exact main portrait compositor and part levels at the *historical*
 // stage, rather than borrowing present-day part XP or a cropped full mock.
 const old=ctx;ctx=g;
 g.save();g.scale(w/1024,h/680);
 try{paintSpecimen(model,0,true,true);}finally{g.restore();ctx=old;}
}

function renderHistory(s){
 const root=$('evolutionHistory');root.replaceChildren();
 [0,1,2,3].forEach(i=>{
  const entry=s.history.find(x=>x.stage===i);
  const lineage=i===0?null:entry?entry.lineage:(i<=s.stage?mainLineage(s):null);
  const name=i===3?finalNames[mainLineage(s)]:(names[lineage||mainLineage(s)]||[])[i]||'未到達';
  const node=document.createElement('div');node.className='phase-card'+(i===s.stage?' current':'');
  const head=document.createElement('div');head.className='phase-head';head.textContent=i===3?'第四相候補':phaseNames[i];
  const art=document.createElement('canvas');art.className='phase-portrait';art.width=300;art.height=170;
  art.setAttribute('aria-label',i===3?'未解放の進化候補':name+'の合成画像');
  const text=document.createElement('div');text.className='phase-name';text.textContent=name;
  const desc=document.createElement('p');desc.textContent=i===3?'未解放':i>s.stage?'未到達':i===s.stage?'現在の形態':'継承済み';
  node.append(head,art,text,desc);root.appendChild(node);
  if(loaded)drawPhasePortrait(art,i,lineage,s);
 });
}

function setup(){
 for(let i=0;i<100;i++)stars.push({x:(i*139+39)%1024,y:(i*97+11)%680,r:i%13===0?3:1});
 const n=480;seed=n;lines=E.linesFor(n);specimen=E.initial(n);phaseSnapshots=[specimen,null,null];
 $('seedInput').value=n;
 document.querySelectorAll('[data-env]').forEach(b=>b.addEventListener('click',()=>selectEnvironment(b.dataset.env)));
 document.querySelectorAll('[data-guide]').forEach(b=>b.addEventListener('click',()=>showGuide(b.dataset.guide)));
 $('showLiveBtn').addEventListener('click',showLive);
 $('growSelectedGuideBtn').addEventListener('click',function(){
   if(!preview)return;autoClimate=preview;run();
 });
 $('levelPicker').addEventListener('input',()=>{if(preview){updateUI();render();}});
 $('runButton').addEventListener('click',function(){autoClimate=null;run();});
 $('pauseButton').addEventListener('click',()=>{paused=!paused;updateUI();});
 $('skipButton').addEventListener('click',skip);
 $('resetButton').addEventListener('click',()=>reset(Math.floor(Number($('seedInput').value)||480)));
 $('randomButton').addEventListener('click',()=>reset(1+Math.floor(Math.random()*1000)));
 $('copyButton').addEventListener('click',()=>navigator.clipboard&&navigator.clipboard.writeText($('fizzbuzzLog').value));
 $('motionToggle').addEventListener('change',e=>{showFlicker=e.target.checked;
    if(rafHandle!==null){cancelAnimationFrame(rafHandle);rafHandle=null;}scheduleFrame();});
 $('speedSelect').addEventListener('change',e=>{tempo=Number(e.target.value);if(ticker){clearInterval(ticker);ticker=setInterval(()=>{if(!paused)feedOne()},tempo);}});
 $('coreReference').textContent='9 CORE ART REFERENCES · preserved / 14 lineages';
 // Each lineage has an actual selectable codex entry. Two use fully modular Lv
 // sprites; the other twelve use alpha-matted source illustrations until authored.
 var guides=$('guideSwitch');
 E.LINEAGES.forEach(function(l){
   if(guides.querySelector('[data-guide="'+l.id+'"]'))return;
   var b=document.createElement('button');b.className='guide-option';
   b.dataset.guide=l.id;b.textContent=l.mark+' '+l.group;
   b.addEventListener('click',()=>showGuide(l.id));guides.appendChild(b);
 });
 C.references.forEach(function(r){
  var figure=document.createElement('figure');figure.className='reference';
  var image=document.createElement('img');image.src=srcFor(r.file);image.alt=r.label;
  var cap=document.createElement('figcaption');cap.textContent=r.label;
  figure.append(image,cap);$('references').appendChild(figure);
 });
 selectEnvironment('signal');showGuide('valis');preload();
}
setup();
})();
