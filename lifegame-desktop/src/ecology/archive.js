/* Final results and aggregate turn observations; no per-turn world snapshots. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EcoArchive=api;})(globalThis,function(){
 'use strict';
 const KEY='lifegame.results.v1',LIMIT=100;
 // Legacy aliases are gated by the features absent from their source version.
 const replayAliases={"8fca29559d94f405a0022c5f86d8d15c400204ddae3f71a40a7a261b5bd2552a":["9e94eea06cc9c1f640fecb88faaf25bc205d3f3e34b57b042a0d7c1160fef0ab","d14f8a832f9da26d011dc83f15af689369fa6d567511bc520c2773d7caf36c3f","8119156dc6760f78ba8ab02a683390562e262802fd977d85de27115b15c38c48","cbab69c80c0122ff99a6ded0528f10e7c4070652a587aa0468c868678437e7fe"],"9e94eea06cc9c1f640fecb88faaf25bc205d3f3e34b57b042a0d7c1160fef0ab":["d14f8a832f9da26d011dc83f15af689369fa6d567511bc520c2773d7caf36c3f","8119156dc6760f78ba8ab02a683390562e262802fd977d85de27115b15c38c48","cbab69c80c0122ff99a6ded0528f10e7c4070652a587aa0468c868678437e7fe"],"d14f8a832f9da26d011dc83f15af689369fa6d567511bc520c2773d7caf36c3f":["8119156dc6760f78ba8ab02a683390562e262802fd977d85de27115b15c38c48","cbab69c80c0122ff99a6ded0528f10e7c4070652a587aa0468c868678437e7fe"],"8119156dc6760f78ba8ab02a683390562e262802fd977d85de27115b15c38c48":["cbab69c80c0122ff99a6ded0528f10e7c4070652a587aa0468c868678437e7fe"],"256f304140d755becefb723937fff7c85f927ea839b26af28f11bb34834f7303":["8fca29559d94f405a0022c5f86d8d15c400204ddae3f71a40a7a261b5bd2552a","9e94eea06cc9c1f640fecb88faaf25bc205d3f3e34b57b042a0d7c1160fef0ab","d14f8a832f9da26d011dc83f15af689369fa6d567511bc520c2773d7caf36c3f","8119156dc6760f78ba8ab02a683390562e262802fd977d85de27115b15c38c48","cbab69c80c0122ff99a6ded0528f10e7c4070652a587aa0468c868678437e7fe"],"fd86e3845849b8fb1432d48e6608098b5028ecf97ac7337956415c7b34ef8091":["256f304140d755becefb723937fff7c85f927ea839b26af28f11bb34834f7303","8fca29559d94f405a0022c5f86d8d15c400204ddae3f71a40a7a261b5bd2552a","9e94eea06cc9c1f640fecb88faaf25bc205d3f3e34b57b042a0d7c1160fef0ab","d14f8a832f9da26d011dc83f15af689369fa6d567511bc520c2773d7caf36c3f","8119156dc6760f78ba8ab02a683390562e262802fd977d85de27115b15c38c48","cbab69c80c0122ff99a6ded0528f10e7c4070652a587aa0468c868678437e7fe"],"8d7f6fbd94128cebf77ab6032098e09a432bc13d8cb2552222b0546971e84745":["521df4a778be285f5d45548c265e3f4364744e9a10037bddf40beb34e5c65217"]};
 // I01 changes only index reuse; exact source parity gates this equivalence.
 const equivalentReplaySignatures={"e98dd757d22ff53efe5e48637fc2761b692e668e7d70f31421662913e0010712":"8d7f6fbd94128cebf77ab6032098e09a432bc13d8cb2552222b0546971e84745"};
 // New colony rules retain the previous engine only when the recorded world
 // has neither of the colony options. A legacy signature cannot claim new rules.
 const colonyBuildSignature="29d8a966b7f9dcf86b26c5f40bd11967633dc9d8c52971720e584e8f0f7e23d5";
 // I03 preserves both old paths only when the recorded world has no new plant options.
 const independentBuildSignature="8b9c50044add0f60ae755bad650ae037500ede82cec32503b850a6d7ae8d798c";
 // Only flagless records may use the pre-Ryouki biological path.
 const ryoukiBuildSignature="952b362eb16d6822343c6e739f37e6057fed6eef9067cb7c684bc3e224169efb";
 const primaryBuildSignature="0789b6828052dfc261fd4d7ebe290deedb1f8375506e7bb19e9073a8ee12aba8";
 function canonicalSignature(s,config){
  if(s===primaryBuildSignature&&config.primaryParasiteModel===undefined&&config.primaryParasiteSettings===undefined)s=ryoukiBuildSignature;
  if(s===ryoukiBuildSignature&&config.ryoukiModel===undefined&&config.ryoukiSettings===undefined)s=independentBuildSignature;
  if(s===independentBuildSignature&&config.largePlantModel===undefined&&config.largePlantSettings===undefined)s=colonyBuildSignature;
  return s===colonyBuildSignature&&config.producerModel===undefined&&config.producerSettings===undefined
   ? "8d7f6fbd94128cebf77ab6032098e09a432bc13d8cb2552222b0546971e84745" : equivalentReplaySignatures[s]||s;
 }
 function create(storage,engine,signature){
  function list(){
   const raw=storage.getItem(KEY);if(!raw)return [];
   const rows=JSON.parse(raw);if(!Array.isArray(rows))throw Error('観測記録が破損しています。保存を中止しました。');
   if(rows.some(r=>!r||![1,2].includes(r.schema)||typeof r.id!=='string'||typeof r.signature!=='string'||!Number.isSafeInteger(r.turn)||r.turn<0||!r.config||typeof r.config.seed!=='string'||!r.final))throw Error('読み取れない観測記録があります。上書きせず保存を中止しました。');
   return rows;
  }
  function capture(world,reason,observation,originRecordId=null){
    const fingerprint=engine.fingerprint(world),record={schema:1,id:fingerprint,signature,config:structuredClone(world.config),turn:world.turn,reason,created:new Date().toISOString(),final:{counts:{...world.stats.counts},main:world.stats.main,food:world.stats.food,P:world.stats.P,Q:world.stats.Q}};
    if(observation){
      const primaryModel=world.config.primaryParasiteModel==='primary/1',primaryDefinition=observation.definitions?.primaryParasite,primaryFlow=observation.definitions?.primaryParasiteFlow;
      if((primaryDefinition!==undefined&&primaryDefinition!=="primary-parasite-observed/1")||(primaryFlow!==undefined&&primaryFlow!=="primary-parasite-flow/1")||
        primaryModel!==(primaryDefinition!==undefined)||primaryModel!==(primaryFlow!==undefined)||
        (primaryModel&&(!Array.isArray(observation.rows)||observation.rows.some(r=>r.primaryParasite?.definition!==primaryDefinition||r.primaryParasite.turn!==r.turn||r.primaryParasiteFlow?.definition!==primaryFlow||r.primaryParasiteFlow.turn!==r.turn))))throw Error("一次寄生の全期間観測・定義版が揃っていないため保存できません。");
      const ryoukiDefinition=observation.definitions?.ryouki,ryoukiModel=world.config.ryoukiModel==='ryouki/1';
      if((ryoukiDefinition!==undefined&&ryoukiDefinition!=="ryouki-observed/1")||ryoukiModel!==(ryoukiDefinition!==undefined)||
        (ryoukiModel&&(!Array.isArray(observation.rows)||observation.rows.some(r=>r.ryouki?.definition!==ryoukiDefinition||r.ryouki.turn!==r.turn))))throw Error("量機の全期間観測・定義版が揃っていないため保存できません。");
      const plantDefinition=observation.definitions?.independentPlants,plantModel=world.config.largePlantModel==='independent/1';
      if((plantDefinition!==undefined&&plantDefinition!=="independent-plant-observed/1")||plantModel!==(plantDefinition!==undefined)||
        (plantModel&&(!Array.isArray(observation.rows)||observation.rows.some(r=>r.independentPlants?.definition!==plantDefinition||r.independentPlants.turn!==r.turn))))throw Error("独立植物の全期間観測・定義版が揃っていないため保存できません。");
      const colonyDefinition=observation.definitions?.producerColony,colonyModel=world.config.producerModel==='colony/1';
      if((colonyDefinition!==undefined&&colonyDefinition!=="producer-colony-observed/1")||colonyModel!==(colonyDefinition!==undefined)||
        (colonyModel&&(!Array.isArray(observation.rows)||observation.rows.some(r=>r.producerColony?.definition!==colonyDefinition||r.producerColony.turn!==r.turn))))throw Error("群落の全期間観測・定義版が揃っていないため保存できません。");
      if(observation.schema!=="observation-snapshot/1"||observation.definitions?.current!=="ecosystem-current/1"||observation.definitions?.trophic!=="trophic-observed/1"||observation.definitions?.nutrition!=="nutrition-observed/1"||(observation.definitions.information!==undefined&&observation.definitions.information!=="information-observed/1")||(observation.definitions.combat!==undefined&&observation.definitions.combat!=="combat-observed/1")||observation.metadata?.version!==signature||JSON.stringify(observation.metadata?.config)!==JSON.stringify(world.config)||!Array.isArray(observation.rows)||observation.rows.length!==world.turn+1||observation.rows.some((r,i)=>r.turn!==i))throw Error("全期間観測が揃っていないため保存できません。");
      record.schema=2;record.id='record:'+globalThis.crypto.randomUUID();record.finalFingerprint=fingerprint;record.originRecordId=originRecordId;record.observation=structuredClone(observation);record.hasObservations=true;
      if(plantModel)record.final.independentPlants=structuredClone(observation.rows.at(-1).independentPlants);
      if(ryoukiModel)record.final.ryouki=structuredClone(observation.rows.at(-1).ryouki);
      if(primaryModel){record.final.primaryParasite=structuredClone(observation.rows.at(-1).primaryParasite);record.final.primaryParasiteFlow=structuredClone(observation.rows.at(-1).primaryParasiteFlow);}
      const current=observation.rows.at(-1).current;record.final.counts={...current.counts};record.final.P=current.groups.find(g=>g.id==='P')?.count||0;record.final.Q=current.groups.find(g=>g.id==='Q')?.count||0;
      Object.assign(record.final,{stats:structuredClone(world.stats),ledger:structuredClone(world.ledger),tallies:structuredClone(world.tallies),demography:structuredClone(world.demography),current:structuredClone(observation.rows.at(-1).current)});
    }
    return record;
  }
  function save(record,mode='normal'){
   if(!['normal','replay-new'].includes(mode)||record.originRecordId&&mode!=='replay-new')return false;
   if(mode==='replay-new'&&(!record.originRecordId||record.schema!==2))throw Error('新規保存する再生元がありません。');
   const rows=list();if(rows.some(r=>r.id===record.id&&r.signature===record.signature))return false;
   if(rows.length>=LIMIT)throw Error('観測記録が100件に達しました。不要な記録を削除してから保存を再試行してください。');
   storage.setItem(KEY,JSON.stringify([record,...rows]));return true;
  }
  function remove(id){storage.setItem(KEY,JSON.stringify(list().filter(r=>r.id!==id)));}
  function replay(id){const r=list().find(r=>r.id===id);if(!r)throw Error('観測記録が見つかりません。');const targetSignature=canonicalSignature(signature,r.config),sourceSignature=canonicalSignature(r.signature,r.config);if(sourceSignature!==targetSignature&&(!replayAliases[targetSignature]?.includes(sourceSignature)||
    (!["256f304140d755becefb723937fff7c85f927ea839b26af28f11bb34834f7303", "8fca29559d94f405a0022c5f86d8d15c400204ddae3f71a40a7a261b5bd2552a"].includes(sourceSignature)&&(r.config.founderCounts!==undefined||r.config.founderReport!==undefined))||
    (["fd86e3845849b8fb1432d48e6608098b5028ecf97ac7337956415c7b34ef8091", "256f304140d755becefb723937fff7c85f927ea839b26af28f11bb34834f7303", "8fca29559d94f405a0022c5f86d8d15c400204ddae3f71a40a7a261b5bd2552a", "9e94eea06cc9c1f640fecb88faaf25bc205d3f3e34b57b042a0d7c1160fef0ab"].includes(targetSignature)&&!["256f304140d755becefb723937fff7c85f927ea839b26af28f11bb34834f7303", "8fca29559d94f405a0022c5f86d8d15c400204ddae3f71a40a7a261b5bd2552a", "9e94eea06cc9c1f640fecb88faaf25bc205d3f3e34b57b042a0d7c1160fef0ab"].includes(sourceSignature)&&(r.config.producerSupport!==undefined||r.config.initialConditions!==undefined||r.config.initialReport!==undefined))))throw Error('計算版が異なるため同じ結果を再現できません。この記録は再生できません。');if(r.config.landscape==='templates'&&!r.config.mapResolved)throw Error('地形の識別情報がないため再生できません。');return structuredClone(r);}
  return {list,capture,save,remove,replay,get:id=>structuredClone(list().find(r=>r.id===id)),limit:LIMIT};
 }
 function persistent(storage,engine,signature,{indexedDB=globalThis.indexedDB,name='lifegame.results.v2'}={}){
   const legacy=create(storage,engine,signature);let headers=[],loaded=false,opening=null;
   const cached=create({getItem:()=>JSON.stringify([...headers,...legacy.list()]),setItem:()=>{throw Error('読取専用の一覧です。');}},engine,signature);
   function open(){if(opening)return opening;opening=new Promise((resolve,reject)=>{
     if(!indexedDB)return reject(Error('この環境では大容量の図鑑保存を利用できません。結果JSONを書き出してください。'));
     const request=indexedDB.open(name,1);let expired=false;
     const timer=setTimeout(()=>{expired=true;reject(Error('図鑑を開けませんでした。他のウィンドウを閉じて再試行してください。'));},10000);
     request.onupgradeneeded=()=>{for(const key of ['records','headers'])if(!request.result.objectStoreNames.contains(key))request.result.createObjectStore(key,{keyPath:'id'});};
     request.onerror=()=>{clearTimeout(timer);reject(request.error);};request.onsuccess=()=>{clearTimeout(timer);if(expired){request.result.close();return;}const db=request.result;db.onversionchange=()=>{db.close();opening=null;};resolve(db);};
   }).catch(e=>{opening=null;throw e;});return opening;}
   const requestValue=request=>new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
   async function ready(){const db=await open();headers=await requestValue(db.transaction('headers').objectStore('headers').getAll());loaded=true;cached.list();}
   let readyPromise=ready();readyPromise.catch(()=>{});
   const api={capture:legacy.capture,limit:LIMIT,get ready(){return readyPromise;},retry(){readyPromise=ready();readyPromise.catch(()=>{});return readyPromise;},
     list(){if(!loaded)throw Error('図鑑を読み込み中です。');return cached.list().sort((a,b)=>b.created.localeCompare(a.created)||a.id.localeCompare(b.id));},
     replay:id=>cached.replay(id),
     async get(id){await api.ready;let record=legacy.get(id);if(!record){const db=await open();record=await requestValue(db.transaction('records').objectStore('records').get(id));}if(!record)throw Error('観測記録が見つかりません。');if(record.schema===2&&(!record.observation||record.observation.rows?.length!==record.turn+1||record.observation.metadata?.version!==record.signature||JSON.stringify(record.observation.metadata.config)!==JSON.stringify(record.config)))throw Error('保存された全期間記録が破損しています。上書きしません。');return record;},
     async save(record,mode='normal'){
       await api.ready;
       if(!['normal','replay-new'].includes(mode)||record.originRecordId&&mode!=='replay-new')return false;
       if(mode==='replay-new'&&(!record.originRecordId||record.schema!==2))throw Error('新規保存する再生元がありません。');
       if(record.schema!==2||!record.observation||record.finalFingerprint?.length!==64)throw Error('保存する全期間記録を読み取れません。');
       const oldCount=legacy.list().length,db=await open(),header=structuredClone({...record,observation:undefined});delete header.observation;
       const saved=await new Promise((resolve,reject)=>{const tx=db.transaction(['headers','records'],'readwrite'),hs=tx.objectStore('headers');let duplicate=false,limit=false,failure=null;
         const existing=hs.get(record.id);existing.onsuccess=()=>{try{if(existing.result){duplicate=true;return;}const count=hs.count();count.onsuccess=()=>{try{if(count.result+oldCount>=LIMIT){limit=true;tx.abort();return;}hs.put(header);tx.objectStore('records').put(record);}catch(e){failure=e;tx.abort();}};}catch(e){failure=e;tx.abort();}};
         tx.oncomplete=()=>resolve(!duplicate);tx.onabort=()=>reject(Error(limit?'観測記録が100件に達しました。不要な記録を削除してから再試行してください。':(failure||tx.error)?.name==='QuotaExceededError'?'保存容量が不足しています。結果JSONを書き出すか、不要な記録を削除して再試行してください。':'図鑑に保存できませんでした。記録を保護し、同じ結果を再試行できます。'));tx.onerror=()=>{};
       });
       if(saved)headers=[header,...headers];return saved;
     },
     async remove(id){await api.ready;if(legacy.list().some(r=>r.id===id)){legacy.remove(id);return;}const db=await open();await new Promise((resolve,reject)=>{const tx=db.transaction(['headers','records'],'readwrite');tx.objectStore('headers').delete(id);tx.objectStore('records').delete(id);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});headers=headers.filter(r=>r.id!==id);}
   };return api;
 }
 return {create,persistent,KEY};
});
