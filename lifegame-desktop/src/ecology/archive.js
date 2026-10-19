/* Final results and aggregate turn observations; no per-turn world snapshots. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EcoArchive=api;})(globalThis,function(){
 'use strict';
 const KEY='lifegame.results.v1',LIMIT=100;
 // Legacy aliases are gated by the features absent from their source version.
 const replayAliases={'8fca29559d94f405a0022c5f86d8d15c400204ddae3f71a40a7a261b5bd2552a':["9e94eea06cc9c1f640fecb88faaf25bc205d3f3e34b57b042a0d7c1160fef0ab", "d14f8a832f9da26d011dc83f15af689369fa6d567511bc520c2773d7caf36c3f", "8119156dc6760f78ba8ab02a683390562e262802fd977d85de27115b15c38c48", "cbab69c80c0122ff99a6ded0528f10e7c4070652a587aa0468c868678437e7fe"],'9e94eea06cc9c1f640fecb88faaf25bc205d3f3e34b57b042a0d7c1160fef0ab':['d14f8a832f9da26d011dc83f15af689369fa6d567511bc520c2773d7caf36c3f','8119156dc6760f78ba8ab02a683390562e262802fd977d85de27115b15c38c48','cbab69c80c0122ff99a6ded0528f10e7c4070652a587aa0468c868678437e7fe'],'d14f8a832f9da26d011dc83f15af689369fa6d567511bc520c2773d7caf36c3f':['8119156dc6760f78ba8ab02a683390562e262802fd977d85de27115b15c38c48','cbab69c80c0122ff99a6ded0528f10e7c4070652a587aa0468c868678437e7fe'],'8119156dc6760f78ba8ab02a683390562e262802fd977d85de27115b15c38c48':['cbab69c80c0122ff99a6ded0528f10e7c4070652a587aa0468c868678437e7fe']};
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
      if(observation.schema!=="observation-snapshot/1"||observation.definitions?.current!=="ecosystem-current/1"||observation.definitions?.trophic!=="trophic-observed/1"||observation.definitions?.nutrition!=="nutrition-observed/1"||observation.metadata?.version!==signature||JSON.stringify(observation.metadata?.config)!==JSON.stringify(world.config)||!Array.isArray(observation.rows)||observation.rows.length!==world.turn+1||observation.rows.some((r,i)=>r.turn!==i))throw Error("全期間観測が揃っていないため保存できません。");
      record.schema=2;record.id='record:'+globalThis.crypto.randomUUID();record.finalFingerprint=fingerprint;record.originRecordId=originRecordId;record.observation=structuredClone(observation);record.hasObservations=true;
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
  function replay(id){const r=list().find(r=>r.id===id);if(!r)throw Error('観測記録が見つかりません。');if(r.signature!==signature&&(!replayAliases[signature]?.includes(r.signature)||(r.config.founderCounts!==undefined||r.config.founderReport!==undefined)||(['9e94eea06cc9c1f640fecb88faaf25bc205d3f3e34b57b042a0d7c1160fef0ab','8fca29559d94f405a0022c5f86d8d15c400204ddae3f71a40a7a261b5bd2552a'].includes(signature)&&r.signature!=='9e94eea06cc9c1f640fecb88faaf25bc205d3f3e34b57b042a0d7c1160fef0ab'&&(r.config.producerSupport!==undefined||r.config.initialConditions!==undefined||r.config.initialReport!==undefined))))throw Error('計算版が異なるため同じ結果を再現できません。この記録は再生できません。');if(r.config.landscape==='templates'&&!r.config.mapResolved)throw Error('地形の識別情報がないため再生できません。');return structuredClone(r);}
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
       const oldCount=legacy.list().length,db=await open(),header=structuredClone(record);delete header.observation;
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
