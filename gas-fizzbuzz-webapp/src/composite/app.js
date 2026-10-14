(function(){
'use strict';
const E=window.CreatureEngine,D=window.LineageDefinitions,bridge=window.valis;
const $=id=>document.getElementById(id),clone=v=>JSON.parse(JSON.stringify(v));
const R=window.CreatureRenderer.create($('creature'),window.VALIS_ASSETS),media=window.matchMedia('(prefers-reduced-motion: reduce)');
const foodLabels={fizz:'Fizz・生命',buzz:'Buzz・鉱物',fizzbuzz:'FizzBuzz・情報',number:'数字・調節'};
const bodyLabels={torso:'胴体',head:'頭部',eyes:'眼',tail:'尾',fin:'ひれ',limb:'付属肢',shell:'表皮・甲殻'};
const dnaLabels={body:'体格',appendage:'付属肢',senses:'感覚',skin:'表皮',aptitude:'適性',sensitivity:'感受性'};
let state=E.initial(1000),runStatus='ready',environment='signal',activeRun=null,records=[],phaseSnapshots=[],selectedRecordId=null;
let ready=false,busy=false,timer=null,logLines=[],energyEvents=[],queue=Promise.resolve(),lastSaveError=null,historyBlocked=false,renderPartsKey='';
const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches||$('reduced').checked;
function notice(message){$('notice').textContent=message||'';$('notice').hidden=!message;}
function parseSeed(value){const text=String(value).trim(),n=Number(text);if(!text||!Number.isSafeInteger(n)||n<1||n>1000)throw Error('1〜1000の整数を入力してください。');return n;}
function lineageFor(s){return D.LINEAGE_BY_ID[s.lineage];}
function nameFor(s){const l=lineageFor(s);return s.matured&&l?l.finalName:l?l.names[s.stage]:'ミナモルフ';}
function selectedRecord(){return records.find(r=>r.runId===selectedRecordId)||null;}
function viewState(){return selectedRecord()?.state||state;}
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
 const container=$('records');container.replaceChildren();$('record-count').textContent=String(records.length);
 if(!records.length){const p=document.createElement('p');p.className='empty';p.textContent='まだ個体の記録がありません。育成を開始すると出生した個体が登録されます。';container.append(p);return;}
 for(const record of records){
  const button=document.createElement('button');button.className='record'+(record.runId===selectedRecordId?' selected':'');button.dataset.runId=record.runId;
  button.append(makeImage(record.portrait,nameFor(record.state)));const name=document.createElement('strong');name.textContent=nameFor(record.state);button.append(name);
  const detail=document.createElement('small');detail.textContent='N='+record.seed+' · '+record.processed+'行 / '+({growing:'育成中',paused:'停止中',stopped:'途中停止',complete:record.state.matured?'成熟':'途中の姿'}[record.status]);button.append(detail);
  button.addEventListener('click',()=>selectRecord(record.runId));container.append(button);
 }
}
function drawDNA(s){
 const container=$('dna');container.replaceChildren();
 for(const [key,label] of Object.entries(dnaLabels)){const row=document.createElement('div');row.className='dna-row';const name=document.createElement('span');name.textContent=label;const progress=document.createElement('progress');progress.max=1;progress.value=s.dna[key];progress.setAttribute('aria-label',label);const value=document.createElement('span');value.textContent=(s.dna[key]*100).toFixed(0);row.append(name,progress,value);container.append(row);}
}
function drawParts(s){
 const a=E.appearanceFor(s),key=JSON.stringify([s.seed,s.current,s.lineage]);if(key===renderPartsKey)return;renderPartsKey=key;const container=$('parts');container.replaceChildren();
 function add(label,level,growth,part){const row=document.createElement('div');row.className='part';const picture=R.organPortrait(part);picture.setAttribute('aria-hidden','true');const info=document.createElement('div'),title=document.createElement('div');title.className='part-label';const text=document.createElement('span');text.textContent=label;const lv=document.createElement('span');lv.textContent='Lv.'+level;title.append(text,lv);const meter=document.createElement('progress');meter.max=1;meter.value=growth;meter.setAttribute('aria-label',label+'の発達');info.append(title,meter);row.append(picture,info);container.append(row);}
 for(const [id,label] of Object.entries(bodyLabels)){const n=a.anatomy[id];add(label,n.level,n.growth,{lineage:'common',id:id==='eyes'?'eye':id==='shell'?'torso':id,level:Math.min(3,Math.ceil(n.level*.75))});}
 const merged=new Map();for(const part of [...a.inheritedOrgans,...a.organs]){const key=part.lineage+':'+part.id,old=merged.get(key);if(!old||part.xp>old.xp)merged.set(key,part);}
 if(merged.size){const title=document.createElement('div');title.className='parts-divider';title.textContent='系統器官・継承器官';container.append(title);}
 for(const part of merged.values())add(part.label,part.level,part.growth,part);
}
function drawPhases(){
 const record=selectedRecord(),snapshots=record?record.snapshots:[...phaseSnapshots,currentSnapshot()],s=viewState(),container=$('phase-cards');container.replaceChildren();
 for(let phase=0;phase<4;phase++){
  const card=document.createElement('div');card.className='phase-card'+(phase===s.stage?' current':'');const title=document.createElement('h3');title.textContent=phase<3?E.PHASES[phase]:'第四相候補';card.append(title);const shot=snapshots.find(x=>x.stage===phase);
  if(shot){card.append(makeImage(shot.portrait,nameFor(shot.state)));const p=document.createElement('p');p.textContent=nameFor(shot.state)+' · '+shot.processed+'行';card.append(p);}
  else{const blank=document.createElement('div');blank.className='unreached';blank.textContent=phase===3?'?':'—';card.append(blank);const p=document.createElement('p');p.textContent=phase===3?'未解放':'未到達';card.append(p);}container.append(card);
 }
}
function updateUI(phases=false){
 const s=viewState(),past=selectedRecord(),lineage=lineageFor(s);$('phase').textContent=E.PHASES[s.stage];$('creature-name').textContent=nameFor(s);$('lineage').textContent='系統：'+(lineage?lineage.group:'未分化');$('run-id').textContent=past?'個体ID：'+past.runId:activeRun?'個体ID：'+activeRun.runId:'出生前の遺伝子プレビュー';
 $('progress-text').textContent=s.current+' / '+s.seed+'行';$('growth').value=s.points;$('growth-text').textContent=s.points.toFixed(2)+' P';const status=past?past.status:runStatus;
 $('result').textContent=status==='complete'?(s.matured?'成熟しました。全1000行のエネルギーから生まれた最終形態です。':'全'+s.seed+'行を摂取しました。未成熟の途中の姿として記録しています。'):status==='ready'?'まだ生まれていません。数値から初期遺伝子が決まります。':status==='paused'?'一時停止中。再開すると続きのエネルギーを摂取します。':status==='stopped'?'途中停止した個体の記録です。':'エネルギーを摂取して成長しています。';
 $('session-status').textContent=busy?'保存中':({ready:'出生前',growing:'観測中',paused:'一時停止',complete:'育成結果',stopped:'途中停止'}[runStatus]);
 $('past-banner').hidden=!past;$('creature').hidden=!!past;$('saved-portrait').hidden=!past;if(past)$('saved-portrait').src=past.portrait;
 $('start').disabled=!ready||busy||runStatus==='growing'||runStatus==='paused'||historyBlocked||!!past;$('seed').disabled=busy||runStatus==='growing'||runStatus==='paused'||!!past;
 $('pause').disabled=busy||!['growing','paused'].includes(runStatus)||!!past;$('pause').textContent=runStatus==='paused'?'再開':'一時停止';$('skip').disabled=busy||!['growing','paused'].includes(runStatus)||!!past;
 $('reset').disabled=busy||!!past;$('random').disabled=busy||!!past;$('speed').disabled=!!past;$('reduced').disabled=!!past;
 for(const button of document.querySelectorAll('[data-env]')){button.setAttribute('aria-pressed',String(button.dataset.env===environment));button.disabled=!!past||busy;}
 drawDNA(s);drawParts(s);
 for(const kind of Object.keys(foodLabels)){const tile=document.querySelector('[data-food="'+kind+'"]');tile.querySelector('b').textContent=s.foods[kind];tile.classList.toggle('eaten',s.lastMeal?.kind===kind);}
 $('meal').textContent=s.lastMeal?'直近の摂取：'+foodLabels[s.lastMeal.kind]+'（'+s.current+'行目）':'摂取前';$('regulation').textContent='数字の調節：促進 '+s.regulation.promote+' / 抑制 '+s.regulation.inhibit;
 $('line-count').textContent=logLines.length+'行';$('log').textContent=logLines.join('\n');if(!past&&!reduced())$('log').scrollTop=$('log').scrollHeight;
 if(phases)drawPhases();if(!past)R.draw(state,{still:true});
}
function cancelTimer(){clearTimeout(timer);timer=null;}
function schedule(){cancelTimer();if(runStatus==='growing'){if(reduced())skip().catch(handleFailure);else timer=setTimeout(()=>{tick().catch(handleFailure);},Number($('speed').value));}}
function handleFailure(error){cancelTimer();if(runStatus==='growing')runStatus='paused';notice(error.message);updateUI(true);}
function advance(){
 const previous=state,line=E.fmtFizzBuzz(state.current+1);state=E.step(previous,line,environment);logLines.push(line);
 if(state.stage!==previous.stage)phaseSnapshots.push({stage:previous.stage,processed:previous.current,state:clone(previous),portrait:R.portrait(previous)});
 energyEvents.push({kind:state.lastMeal.kind,time:performance.now()});energyEvents=energyEvents.slice(-12);return state.stage!==previous.stage;
}
async function tick(){
 if(runStatus!=='growing')return;const phaseChanged=advance();if(state.current===state.seed){runStatus='complete';await persist();updateUI(true);return;}
 if(phaseChanged||state.current%25===0)await persist();updateUI(phaseChanged||state.current%25===0);schedule();
}
async function skip(){cancelTimer();if(!['growing','paused'].includes(runStatus))return;busy=true;updateUI();try{while(state.current<state.seed)advance();runStatus='complete';energyEvents=[];await persist();updateUI(true);}finally{busy=false;updateUI();}}
async function pause(){if(busy)return;cancelTimer();if(runStatus==='growing'){runStatus='paused';await persist();updateUI(true);}else if(runStatus==='paused'){runStatus='growing';await persist();updateUI();if(reduced())await skip();else schedule();}}
async function stopActive(){cancelTimer();await queue.catch(()=>{});if(activeRun&&['growing','paused'].includes(runStatus)){runStatus='stopped';await persist();}}
async function reset(value=$('seed').value){const n=parseSeed(value);await stopActive();$('seed').value=String(n);state=E.initial(n);activeRun=null;phaseSnapshots=[];logLines=[];energyEvents=[];runStatus='ready';selectedRecordId=null;renderPartsKey='';notice('');updateUI(true);}
async function run(value=$('seed').value,options={}){
 const n=parseSeed(value);if(!ready||busy||historyBlocked)throw Error('起動準備または履歴の保存状態を確認してください。');
 if(options.env){if(!E.ENV.includes(options.env))throw Error('環境が不正です');environment=options.env;}if(options.reduced!==undefined)$('reduced').checked=!!options.reduced;
 await reset(n);busy=true;runStatus='growing';const createdAt=new Date().toISOString();activeRun={schemaVersion:1,runId:crypto.randomUUID(),createdAt,updatedAt:createdAt,status:'growing',seed:n,processed:0,engineVersion:E.ENGINE_VERSION,assetVersion:R.assetVersion,state:null,snapshots:[],portrait:''};updateUI(true);
 try{await persist();}catch(error){activeRun=null;runStatus='ready';throw error;}finally{busy=false;updateUI();}if(reduced())await skip();else schedule();
}
function setEnvironment(env){if(!E.ENV.includes(env)||selectedRecordId||busy)return;environment=env;updateUI();}
function selectRecord(id){if(!records.some(r=>r.runId===id))throw Error('個体記録がありません');selectedRecordId=id;renderPartsKey='';renderRecords();updateUI(true);}
function backToLive(){selectedRecordId=null;renderPartsKey='';renderRecords();updateUI(true);}
async function shutdown(){busy=true;cancelTimer();updateUI();try{await stopActive();if(activeRun)await persist();await queue;if(lastSaveError)throw lastSaveError;await bridge.closeReady();}catch(error){busy=false;notice('終了前の保存に失敗しました。'+error.message);updateUI(true);}}
function action(fn){return ()=>Promise.resolve().then(fn).catch(handleFailure);}
$('start').addEventListener('click',action(()=>run()));$('pause').addEventListener('click',action(pause));$('skip').addEventListener('click',action(skip));$('reset').addEventListener('click',action(()=>reset()));$('random').addEventListener('click',action(()=>reset(1+crypto.getRandomValues(new Uint32Array(1))[0]%1000)));
$('seed').addEventListener('change',action(()=>{if(runStatus==='ready')return reset();}));$('speed').addEventListener('change',()=>schedule());$('back-live').addEventListener('click',backToLive);
for(const button of document.querySelectorAll('[data-env]'))button.addEventListener('click',()=>setEnvironment(button.dataset.env));
const finishOnReduce=action(()=>{if(reduced()&&runStatus==='growing')return skip();});media.addEventListener('change',finishOnReduce);$('reduced').addEventListener('change',finishOnReduce);
for(const [kind,label] of Object.entries(foodLabels)){const tile=document.createElement('div');tile.className='food '+kind;tile.dataset.food=kind;const orb=document.createElement('span');orb.className='orb';orb.textContent='◈';const name=document.createElement('strong');name.textContent=label;const count=document.createElement('b');count.textContent='0';tile.append(orb,name,count);$('foods').append(tile);}
let lastFrame=0;function animate(time){if(ready&&runStatus==='growing'&&!busy&&reduced())finishOnReduce();if(ready&&!selectedRecordId&&!reduced()&&time-lastFrame>=40){R.draw(state,{time,still:false,energyEvents});lastFrame=time;}requestAnimationFrame(animate);}
async function init(){
 if(!bridge)throw Error('VALIS.exeから起動してください。デスクトップの個体記録機能に接続できません。');
 await R.prepare();await reloadRecords();bridge.onPrepareClose(shutdown);ready=true;updateUI(true);requestAnimationFrame(animate);
 if(bridge.testMode)window.__VALIS_TEST__={snapshot:()=>clone({state,runStatus,activeRun,selectedRecordId,records,log:logLines.join('\n'),ready,environment}),run,skip,pause,reset,setEnvironment,selectRecord,backToLive,reloadRecords,persist,renderHash:()=>R.portrait(viewState()),renderedKeys:()=>R.renderedKeys(),renderState:s=>{R.draw(s,{still:true});return $('creature').toDataURL();},missingAssets:()=>R.missingAssets()};
}
init().catch(error=>{notice(error.message);$('session-status').textContent='起動できません';});
})();
