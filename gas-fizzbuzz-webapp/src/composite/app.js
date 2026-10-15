(function(){
'use strict';
const E=window.CreatureEngine,D=window.LineageDefinitions,bridge=window.valis;
const $=id=>document.getElementById(id),clone=v=>JSON.parse(JSON.stringify(v));
const R=window.CreatureRenderer.create($('creature'),window.VALIS_ASSETS),media=window.matchMedia('(prefers-reduced-motion: reduce)');
const foodLabels={fizz:'Fizz・生命',buzz:'Buzz・鉱物',fizzbuzz:'FizzBuzz・情報',number:'数字・調節'};
const bodyLabels={torso:'胴体',head:'頭部',eyes:'眼',tail:'尾',fin:'ひれ',limb:'付属肢',shell:'表皮・甲殻'};
const dnaLabels={body:'体格',appendage:'付属肢',senses:'感覚',skin:'表皮',aptitude:'適性',sensitivity:'感受性'};
let state=E.initial(1000),runStatus='ready',activeRun=null,records=[],phaseSnapshots=[],selectedRecordId=null;
let preview=null,preparedSeed=null,archiveOpen=false,inputToken=0,inputTimer=null,ready=false,busy=false,timer=null,logLines=[],energyEvents=[],queue=Promise.resolve(),lastSaveError=null,historyBlocked=false,renderPartsKey='';
const reduced=()=>media.matches;
function notice(message){$('notice').textContent=message||'';$('notice').hidden=!message;}
function parseSeed(value){const text=String(value).trim(),n=Number(text);if(!text||!Number.isSafeInteger(n)||n<1||n>1000)throw Error('1〜1000の整数を入力してください。');return n;}
function lineageFor(s){return D.LINEAGE_BY_ID[s.lineage];}
function nameFor(s){const l=lineageFor(s);return s.matured&&l?l.finalName:l?l.names[s.stage]:'ミナモルフ';}
function selectedRecord(){return records.find(r=>r.runId===selectedRecordId)||null;}
function viewState(){return selectedRecord()?.state||preview||state;}
function makeImage(url,alt){const im=document.createElement('img');im.src=url;im.alt=alt;return im;}
function currentSnapshot(){return {stage:state.stage,processed:state.current,state:clone(state),portrait:R.portrait(state)};}
function recordSnapshot(){return {...activeRun,updatedAt:new Date().toISOString(),status:runStatus==='ready'?'stopped':runStatus,processed:state.current,state:clone(state),snapshots:[...clone(phaseSnapshots),currentSnapshot()],portrait:R.portrait(state)};}
function persist(){
 if(!activeRun)return queue;const record=recordSnapshot();
 const task=queue.catch(()=>{}).then(()=>bridge.saveSpecimen(record)).then(()=>{
  lastSaveError=null;const old=records.findIndex(r=>r.runId===record.runId);if(old>=0)records[old]=record;else records.push(record);
  records.sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt));renderRecords();return record;
 }).catch(error=>{lastSaveError=error;notice('個体記録を保存できません。'+error.message);throw error;});queue=task;return task;
}
async function reloadRecords(){const result=await bridge.listSpecimens();records=result.records;historyBlocked=!!result.warning;if(result.warning)notice(result.warning);renderRecords();return result;}
function renderRecords(){
 const container=$('records');container.replaceChildren();const finished=records.filter(r=>r.status==='complete');$('record-count').textContent=String(finished.length);
 if(!finished.length){const p=document.createElement('p');p.className='empty';p.textContent='まだ個体の記録がありません。育成を終えた個体の最終結果がここに残ります。';container.append(p);return;}
 for(const record of finished){
  const button=document.createElement('button');button.className='record'+(record.runId===selectedRecordId?' selected':'');button.dataset.runId=record.runId;
  button.append(makeImage(record.portrait,nameFor(record.state)));const name=document.createElement('strong');name.textContent=nameFor(record.state);button.append(name);
  const detail=document.createElement('small');detail.textContent='N='+record.seed+' · '+record.processed+'行 / '+({growing:'育成中',paused:'停止中',stopped:'途中停止',complete:record.state.matured?'覚醒':'到達した姿'}[record.status]);button.append(detail);
  button.addEventListener('click',()=>selectRecord(record.runId));container.append(button);
 }
}
function drawDNA(s){
 const container=$('dna');container.replaceChildren();
 for(const [key,label] of Object.entries(dnaLabels)){const row=document.createElement('div');row.className='dna-row';const name=document.createElement('span');name.textContent=label;const progress=document.createElement('progress');progress.max=1;progress.value=s.dna[key];progress.setAttribute('aria-label',label);const value=document.createElement('span');value.textContent=(s.dna[key]*100).toFixed(0);row.append(name,progress,value);container.append(row);}
}
function drawParts(s){
 const a=E.appearanceFor(s),key=JSON.stringify([s.seed,s.current,s.lineage]);if(key===renderPartsKey)return;renderPartsKey=key;const container=$('parts');container.replaceChildren();
 function add(label,level,growth,part){const row=document.createElement('div');row.className='part';const picture=R.organPortrait(a.version===5?{lineage:'eco-'+a.bodyLineage,id:'body',level:a.bodyFrame+1,bodyPart:part.bodyPart||part.anchor||'torso',crop:part.crop||({eye:[.1,.24,.3,.36],head:[0,0,.42,.6],mouth:[0,.3,.4,.5],dorsal:[.25,0,.65,.5],tailTip:[.65,.2,.35,.8],outerOrbit:[.1,0,.8,.9]}[part.anchor]||[.15,.2,.7,.7])}:part);picture.setAttribute('aria-hidden','true');const info=document.createElement('div'),title=document.createElement('div');title.className='part-label';const text=document.createElement('span');text.textContent=label;const lv=document.createElement('span');lv.textContent='Lv.'+level;title.append(text,lv);const meter=document.createElement('progress');meter.max=1;meter.value=growth;meter.setAttribute('aria-label',label+'の発達');info.append(title,meter);row.append(picture,info);container.append(row);}
 for(const [id,label] of Object.entries(bodyLabels)){const n=a.anatomy[id],core=a.bodyPlan&&id!=='eyes',body=['head','torso','tail','shell'].includes(id);
  const crops={head:[0,.12,.35,.65],torso:[.20,.15,.58,.72],tail:[.60,.22,.4,.75],shell:[.20,.15,.58,.72]};
  add(label+(id==='eyes'?' · '+(n.sense||'光'):''),n.level,n.growth,{lineage:core?(a.version>=4?'bio-':'core-')+a.bodyPlan:a.bodyFamily?'body-'+a.bodyFamily:'common',id:core?(body?'body':id):id==='eyes'?'eye':id==='shell'?'torso':id,level:core?Math.min(a.version>=4?4:3,s.stage+1):Math.min(3,Math.ceil(n.level*.75)),bodyPart:id,crop:core&&body?crops[id]:null});}
 const merged=new Map();for(const part of [...a.inheritedOrgans,...a.organs]){const key=part.lineage+':'+part.id,old=merged.get(key);if(!old||part.xp>old.xp)merged.set(key,part);}
 if(merged.size){const title=document.createElement('div');title.className='parts-divider';title.textContent='系統器官・継承器官';container.append(title);}
 for(const part of merged.values())add(part.label+(a.version===5?(part.lineage!==s.lineage?' · 継承形質':''):(part.count>1?' ×'+part.count:''))+(part.sense?' · '+part.sense:''),part.level,part.growth,part);
}
function drawPhases(){
 const record=selectedRecord(),snapshots=record?[record.snapshots[record.snapshots.length-1]]:(!preparedSeed&&!activeRun)?[]:[...phaseSnapshots,currentSnapshot()],s=viewState(),container=$('phase-cards');container.replaceChildren();
 for(let phase=0;phase<4;phase++){
  const card=document.createElement('div');card.className='phase-card'+(phase===s.stage?' current':'');const title=document.createElement('h3');title.textContent=E.PHASES[phase];card.append(title);const shot=snapshots.find(x=>x?.stage===phase);
  if(shot){card.append(makeImage(shot.portrait,nameFor(shot.state)));const p=document.createElement('p');p.textContent=nameFor(shot.state)+' · '+shot.processed+'行';card.append(p);}
  else{const blank=document.createElement('div');blank.className='unreached';blank.textContent=phase===3?'?':'—';card.append(blank);const p=document.createElement('p');p.textContent=record?'最終結果のみ':phase===3?'条件を満たすと覚醒':'未到達';card.append(p);}container.append(card);
 }
}
function updateUI(phases=false){
 const s=viewState(),past=selectedRecord(),lineage=lineageFor(s);$('phase').textContent=E.PHASES[s.stage];$('creature-name').textContent=nameFor(s);$('lineage').textContent='系統：'+(lineage?lineage.mark+' '+lineage.group:'未分化');$('signature').textContent=E.appearanceFor(s).signature||'出生時の遺伝形態';$('sense').textContent='感覚：'+(E.appearanceFor(s).sense||'光');$('run-id').textContent=preview?'出生前の遺伝子プレビュー':past?'個体ID：'+past.runId:activeRun?'個体ID：'+activeRun.runId:'出生前の遺伝子プレビュー';
 const a=E.appearanceFor(s),maturity=Math.min(100,Math.round(s.points));
 $('progress-text').textContent='摂取 '+s.current+' / '+s.seed+'回';$('growth').value=maturity;$('growth-text').textContent='成長度 '+maturity+'%';
 const status=past?past.status:runStatus;
 $('result').textContent=status==='complete'?(s.matured?(s.engineVersion>=3?'育成終了 · 第四段階の最終形態に到達':'育成終了 · 旧版の成熟結果'):'育成終了 · '+E.PHASES[s.stage]+'（最終形態は未到達）'):status==='ready'?(preparedSeed?'読み込み完了。スタートで育成を始めます。':'数値を読み込んで、生物を観測してください。'):status==='paused'?'一時停止中 · 再開すると摂取を続けます。':status==='stopped'?'途中停止 · この個体は図鑑へ掲載されません。':'育成中 · エネルギーを摂取しています。';
 if(s.engineVersion===5&&s.stage===2){const c=E.awakeningFor(s);$('result').textContent+=' 覚醒への適応：器官 '+Math.round(c.organ*100)+'%・餌 '+Math.round(c.feeding*100)+'%・環境 '+Math.min(100,Math.round(c.adaptation/c.adaptationRequired*100))+'%';}
 $('session-status').textContent=busy?'保存中':past?'図鑑の最終結果':({ready:preparedSeed?'開始待ち':'未読み込み',growing:'育成中',paused:'一時停止',complete:'育成終了',stopped:'途中停止'}[runStatus]);
 $('past-banner').hidden=!past;$('creature').hidden=!!past||(!preparedSeed&&!activeRun);$('empty-observation').hidden=!!past||!!preparedSeed||!!activeRun;$('saved-portrait').hidden=!past;if(past)$('saved-portrait').src=past.portrait;
 $('back-live').hidden=!archiveOpen&&!past;$('nav-live').setAttribute('aria-selected',String(!archiveOpen));$('nav-archive').setAttribute('aria-selected',String(archiveOpen));$('parts-panel').hidden=archiveOpen;$('archive-panel').hidden=!archiveOpen;
 $('seed').disabled=busy||archiveOpen;
 let matches=false;try{matches=parseSeed($('seed').value)===preparedSeed;}catch{}
 $('load').disabled=!ready||busy||archiveOpen;
 $('start').disabled=!ready||busy||historyBlocked||archiveOpen||!matches||runStatus!=='ready';
 $('input-status').textContent=matches?(runStatus==='ready'?'読み込み済み · N='+preparedSeed:'現在の個体 · N='+state.seed):preparedSeed?'数値を変更したら、もう一度読み込んでください。':'入力 → 読み込み → スタート';
 $('pause').disabled=busy||!['growing','paused'].includes(runStatus)||archiveOpen;$('pause').textContent=runStatus==='paused'?'再開':'一時停止';$('skip').disabled=busy||!['growing','paused'].includes(runStatus)||archiveOpen;
 $('speed').disabled=!!past;
 const plan=s.environmentPlan;const displayedEnvironment=s.currentEnvironment||plan?.rows[0]||'signal';
 const envLabels={tide:'深海',heat:'熱圏',signal:'情報域',void:'虚空'},weights=plan?.weights[s.stage===0?0:1]||[0,0,1,0];
 for(const [i,key]of ['tide','heat','signal','void'].entries()){const tile=document.querySelector('[data-environment="'+key+'"]');tile.classList.toggle('active',key===displayedEnvironment);tile.querySelector('b').textContent=Math.round(weights[i]*100)+'%';}
 $('environment-note').textContent='この段階の環境配分 · '+(s.current?'現在：'+envLabels[displayedEnvironment]:'読み込み時に環境の推移を決定');
 drawDNA(s);drawParts(s);
 for(const kind of Object.keys(foodLabels)){const tile=document.querySelector('[data-food="'+kind+'"]');tile.querySelector('b').textContent=s.foods[kind];tile.classList.toggle('eaten',s.lastMeal?.kind===kind);}
 $('meal').textContent=s.lastMeal?'直近の摂取：'+foodLabels[s.lastMeal.kind]+'（'+s.current+'行目）':'摂取前';$('regulation').textContent='数字の調節：促進 '+s.regulation.promote+' / 抑制 '+s.regulation.inhibit;
 const displayedLines=past?E.linesFor(s.seed).slice(0,s.current):preview?[]:logLines;
 $('line-count').textContent=displayedLines.length+'行';$('log').textContent=displayedLines.join('\n');
 $('current-row').textContent=displayedLines.length?displayedLines.length+'行目':'出力待ち';$('current-value').textContent=displayedLines.at(-1)||'—';$('current-output').dataset.kind=s.lastMeal?.kind||'';
 if(!past)$('log').scrollTop=$('log').scrollHeight;
 if(phases)drawPhases();if(!past){const still=!!preview||runStatus==='ready'||reduced();R.draw(preview||state,{still,time:performance.now(),energyEvents:still?[]:energyEvents});}
}
function cancelTimer(){clearTimeout(timer);timer=null;}
function schedule(){cancelTimer();if(runStatus==='growing'){timer=setTimeout(()=>{tick().catch(handleFailure);},Number($('speed').value));}}
function handleFailure(error){cancelTimer();if(runStatus==='growing')runStatus='paused';notice(error.message);updateUI(true);}
function advance(){
 const previous=state,line=E.fmtFizzBuzz(state.current+1);state=E.step(previous,line);logLines.push(line);
 if(state.stage!==previous.stage)phaseSnapshots.push({stage:previous.stage,processed:previous.current,state:clone(previous),portrait:R.portrait(previous)});
 energyEvents=[{kind:state.lastMeal.kind,sequence:state.current,value:line,time:performance.now(),duration:Math.min(1100,Number($('speed').value)*.82)}];return state.stage!==previous.stage;
}
async function tick(){
 if(runStatus!=='growing'||preview)return;const generation=activeRun?.runId;const phaseChanged=advance();if(state.current===state.seed){runStatus='complete';await persist();updateUI(true);return;}
 if(phaseChanged||state.current%25===0)await persist();if(generation!==activeRun?.runId||preview)return;updateUI(phaseChanged||state.current%25===0);schedule();
}
async function skip(){cancelTimer();if(!['growing','paused'].includes(runStatus))return;busy=true;updateUI();try{while(state.current<state.seed)advance();runStatus='complete';energyEvents=[];await persist();updateUI(true);}finally{busy=false;updateUI();}}
async function pause(){if(busy)return;cancelTimer();if(runStatus==='growing'){runStatus='paused';await persist();updateUI(true);}else if(runStatus==='paused'){runStatus='growing';await persist();updateUI();schedule();}}
async function stopActive(){cancelTimer();await queue.catch(()=>{});if(activeRun&&lastSaveError)await persist();if(activeRun&&['growing','paused'].includes(runStatus)){runStatus='stopped';await persist();}}
async function reset(value=$('seed').value,token){const n=parseSeed(value);await stopActive();if(token!==undefined&&token!==inputToken)return false;$('seed').value=String(n);preview=null;state=E.initial(n);preparedSeed=n;activeRun=null;phaseSnapshots=[];logLines=[];energyEvents=[];runStatus='ready';selectedRecordId=null;renderPartsKey='';notice('');updateUI(true);}
async function load(value=$('seed').value){
 const n=parseSeed(value);if(!ready||busy)throw Error('準備が完了するまでお待ちください。');const token=inputToken;busy=true;updateUI();
 try{return await reset(n,token);}finally{busy=false;updateUI(true);}
}
async function startLoaded(options={}){
 if(!ready||busy||historyBlocked||runStatus!=='ready'||parseSeed($('seed').value)!==preparedSeed)throw Error('数値を読み込んでからスタートしてください。');

 busy=true;runStatus='growing';const createdAt=new Date().toISOString();activeRun={schemaVersion:1,runId:crypto.randomUUID(),createdAt,updatedAt:createdAt,status:'growing',seed:state.seed,processed:0,engineVersion:E.ENGINE_VERSION,assetVersion:R.assetVersion,state:null,snapshots:[],portrait:''};updateUI(true);
 try{await persist();}catch(error){activeRun=null;runStatus='ready';throw error;}finally{busy=false;updateUI();}if(options.instant&&bridge.testMode)await skip();else schedule();
}
async function run(value=$('seed').value,options={}){await load(value);return startLoaded(options);}

function selectRecord(id){if(!records.some(r=>r.runId===id&&r.status==='complete'))throw Error('個体記録がありません');selectedRecordId=id;archiveOpen=true;renderPartsKey='';renderRecords();updateUI(true);}
function backToLive(){selectedRecordId=null;archiveOpen=false;renderPartsKey='';renderRecords();updateUI(true);}
async function shutdown(){++inputToken;clearTimeout(inputTimer);busy=true;cancelTimer();updateUI();try{await stopActive();if(activeRun)await persist();await queue;if(lastSaveError)throw lastSaveError;await bridge.closeReady();}catch(error){busy=false;notice('終了前の保存に失敗しました。'+error.message);updateUI(true);}}
function action(fn){return ()=>Promise.resolve().then(fn).catch(handleFailure);}
function inputChanged(){++inputToken;notice('');updateUI();}
$('seed').addEventListener('input',inputChanged);
window.addEventListener('resize',()=>{$('log').scrollTop=$('log').scrollHeight;});
$('load').addEventListener('click',action(()=>load()));$('start').addEventListener('click',action(()=>startLoaded()));
$('pause').addEventListener('click',action(pause));$('skip').addEventListener('click',action(skip));
$('speed').addEventListener('change',()=>schedule());$('back-live').addEventListener('click',backToLive);$('nav-live').addEventListener('click',backToLive);
$('nav-archive').addEventListener('click',()=>{archiveOpen=true;updateUI(true);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&archiveOpen)backToLive();});
media.addEventListener('change',()=>updateUI());
for(const [kind,label] of Object.entries(foodLabels)){const tile=document.createElement('div');tile.className='food '+kind;tile.dataset.food=kind;const orb=document.createElement('span');orb.className='orb';orb.textContent={fizz:'Fizz',buzz:'Buzz',fizzbuzz:'FizzBuzz',number:'1,2,4…'}[kind];const name=document.createElement('strong');name.textContent=label.split('・').pop();tile.title=label;const count=document.createElement('b');count.textContent='0';tile.append(orb,name,count);$('foods').append(tile);}
let lastFrame=0,lastReduced=reduced();function animate(time){if(ready&&lastReduced!==reduced()){lastReduced=reduced();updateUI();}if(ready&&!selectedRecordId&&!preview&&runStatus!=='ready'&&!reduced()&&time-lastFrame>=40){R.draw(preview||state,{time,still:!!preview||runStatus==='ready',energyEvents:preview||runStatus==='ready'?[]:energyEvents});lastFrame=time;}requestAnimationFrame(animate);}
async function init(){
 if(!bridge)throw Error('VALIS.exeから起動してください。デスクトップの個体記録機能に接続できません。');
 await R.prepare();await reloadRecords();bridge.onPrepareClose(shutdown);ready=true;updateUI(true);requestAnimationFrame(animate);
 if(bridge.testMode)window.__VALIS_TEST__={snapshot:()=>clone({state,preview,preparedSeed,archiveOpen,busy,runStatus,activeRun,selectedRecordId,records,log:logLines.join('\n'),ready,environment:state.currentEnvironment||state.environmentPlan?.rows[0]}),run,load,startLoaded,skip,pause,reset,selectRecord,backToLive,reloadRecords,persist,renderHash:()=>R.portrait(viewState()),renderedKeys:()=>R.renderedKeys(),renderedSources:()=>R.renderedSources(),attachments:()=>R.attachments(),motion:()=>R.motion(),feeding:()=>R.feeding(),drawFrame:(s,o)=>R.draw(s,o),renderFrame:(s,o)=>{R.draw(s,o);return $('creature').toDataURL();},renderState:s=>{R.draw(s,{still:true});return $('creature').toDataURL();},missingAssets:()=>R.missingAssets()};
}
init().catch(error=>{notice(error.message);$('session-status').textContent='起動できません';});
})();
