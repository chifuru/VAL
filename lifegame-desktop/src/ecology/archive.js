/* Final results only. Replay is recomputation, never an archive writer. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EcoArchive=api;})(globalThis,function(){
 'use strict';
 const KEY='lifegame.results.v1',LIMIT=100;
 // Known legacy rules compare equal only when the record has no new supply/initial controls.
 const replayAliases={'9e94eea06cc9c1f640fecb88faaf25bc205d3f3e34b57b042a0d7c1160fef0ab':['d14f8a832f9da26d011dc83f15af689369fa6d567511bc520c2773d7caf36c3f','8119156dc6760f78ba8ab02a683390562e262802fd977d85de27115b15c38c48','cbab69c80c0122ff99a6ded0528f10e7c4070652a587aa0468c868678437e7fe'],'d14f8a832f9da26d011dc83f15af689369fa6d567511bc520c2773d7caf36c3f':['8119156dc6760f78ba8ab02a683390562e262802fd977d85de27115b15c38c48','cbab69c80c0122ff99a6ded0528f10e7c4070652a587aa0468c868678437e7fe'],'8119156dc6760f78ba8ab02a683390562e262802fd977d85de27115b15c38c48':['cbab69c80c0122ff99a6ded0528f10e7c4070652a587aa0468c868678437e7fe']};
 function create(storage,engine,signature){
  function list(){
   const raw=storage.getItem(KEY);if(!raw)return [];
   const rows=JSON.parse(raw);if(!Array.isArray(rows))throw Error('観測記録が破損しています。保存を中止しました。');
   if(rows.some(r=>!r||r.schema!==1||typeof r.id!=='string'||typeof r.signature!=='string'||!Number.isSafeInteger(r.turn)||r.turn<0||!r.config||typeof r.config.seed!=='string'||!r.final))throw Error('読み取れない観測記録があります。上書きせず保存を中止しました。');
   return rows;
  }
  function capture(world,reason){return {schema:1,id:engine.fingerprint(world),signature,config:structuredClone(world.config),turn:world.turn,reason,created:new Date().toISOString(),final:{counts:{...world.stats.counts},main:world.stats.main,food:world.stats.food,P:world.stats.P,Q:world.stats.Q}};}
  function save(record,mode='normal'){
   if(mode!=='normal')return false;
   const rows=list();if(rows.some(r=>r.id===record.id&&r.signature===record.signature))return false;
   if(rows.length>=LIMIT)throw Error('観測記録が100件に達しました。不要な記録を削除してから保存を再試行してください。');
   storage.setItem(KEY,JSON.stringify([record,...rows]));return true;
  }
  function remove(id){storage.setItem(KEY,JSON.stringify(list().filter(r=>r.id!==id)));}
  function replay(id){const r=list().find(r=>r.id===id);if(!r)throw Error('観測記録が見つかりません。');if(r.signature!==signature&&(!replayAliases[signature]?.includes(r.signature)||(signature==='9e94eea06cc9c1f640fecb88faaf25bc205d3f3e34b57b042a0d7c1160fef0ab'&&(r.config.producerSupport!==undefined||r.config.initialConditions!==undefined||r.config.initialReport!==undefined))))throw Error('計算版が異なるため同じ結果を再現できません。この記録は再生できません。');if(r.config.landscape==='templates'&&!r.config.mapResolved)throw Error('地形の識別情報がないため再生できません。');return structuredClone(r);}
  return {list,capture,save,remove,replay,limit:LIMIT};
 }
 return {create,KEY};
});
