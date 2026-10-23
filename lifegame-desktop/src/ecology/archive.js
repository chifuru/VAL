/* Final results and aggregate turn observations; no per-turn world snapshots. */
(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(()=>node?require('./observations.js'):root.EcoObservations);if(node)module.exports=api;else root.EcoArchive=api;})(globalThis,function(observationsAPI){
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
 const hyperBuildSignature="32595746fbb53881d5bcda4c42a98f062540cf73d91c85125d5b7dd73df600b1";
 const informationBuildSignature="cc602920ce515db5502edec9d74233a0f397735ff5707ea7ae71fa81eb5fc50d";
 const generationBuildSignature='2789e4711fd87f4824e11ff10762fde9a26880fa322db3a1bfbeb808b094d85d';
 const relationshipBuildSignature='a7cac02a9d7382b478919b40c44823ce0d6bb0325b3e551adb1236908c92774d';
 const balanceBuildSignature='95b7405d3e4513acabf2194ed0ed1b9eb79c9ffd566bcc9e0b5f1edc3ca1b889';
 const foodwebBuildSignature='ada68bb8fff06b5e6125b11e952e2c7be43e31967cee7c364ea8449739018a97';
 const consumerGroupBuildSignature='e664191a35beadfb8ee18df8ec8a009028beb3ba246d4ba02f430b48ec39c4a4';
 const parasiteCohortBuildSignature='2af7c823b84f49e5353eb567c1703b33072f6fca18f86f530a64d6ef451c3625';
 const parasiteFanoutBuildSignature='6e441483b2bd025ca772931640e3f3edfdfb3ed6a44609d7dadb61f567dcf941';
 const matchedConsumerGroupBuildSignature='9d1336a947b3e7357e4902957cedafbd7b7281c5c2dd85843e40d64cb0035dcd';
 const previousConsumerGroupBuildSignature='6db4142a9987079b6e0a4f6f1f06623fe9b1dd5096763ce2682993aefbb3316c';
 const fungalColonyBuildSignature='90daa5c38dfbc78aa12c79176ff54d5e70f6e90590ff4d2dbcaf2ef5647b56e4';
 const localSurvivalBuildSignature='c78400a515eba25515dd699c1f3f5ba6cc2004c5dc4b992fbf3e4c2d1c6082d9';
 const socialRenewalBuildSignature='cc56e6db8b6c3f3cd327b73a687a2fc053db036825d5b14d95d714d2112c5984';
 const moderateGrassBuildSignature='765d6ec931e82c8aee9099a66ba4a7b9a9c3f24bb3bd122bdf612624fc2ebab5';
 const primaryEggBuildSignature='349210f099401ba560b23589c31eb7070dfd30f2eb3bda765146f3492b3b27fe';
 const waterEggSpreadBuildSignature='37ea035eae30eeb8b191c11b5498b721b5e37bf7aca8e9f8607402d8afc5cdb1';
 const waterFounderBuildSignature='b09086493b04bf56a7b587e433713c2f8d4c0f06522e59207207185eebb9cfb2';
 const cellFoundationBuildSignature='aac01593711800f3988c78e524093a147eae6761c7d823332a022680673aa855';
 const cellMovementBuildSignature='8455652928b1f8880df6bf2ab8d9aa3b877d0d8ae51180375b18aca843141051';
 const cellResourceBuildSignature='8f8f7b0226be2bff8b602278767081fcf50ea164ba5f132f5dd4b256bd043748';
 const cellLifeBuildSignature="1811e7439d528f52e8ba5c4b5867f56fb052fe6574117c25bcd551574caabc4a";
 const cellCirculationBuildSignature="61f501ffbc3f0556fe3ffbb5b187060bdc884dc2e6fd311edd1809d303d39147";
 const cellInteractionBuildSignature="629092e3e77cecfd834077933180d83dc3d28cafd70810d4075bbfc349da7c73";
 function canonicalSignature(s,config){
  // New cell worlds must never acquire a legacy replay alias.
  if(config.cellModel!==undefined)return s;
  if(s===cellInteractionBuildSignature)s=cellCirculationBuildSignature;
  if(s===cellCirculationBuildSignature)s=cellLifeBuildSignature;
  if(s===cellLifeBuildSignature)s=cellResourceBuildSignature;
  if(s===cellResourceBuildSignature)s=cellMovementBuildSignature;
  if(s===cellMovementBuildSignature)s=cellFoundationBuildSignature;
  if(s===cellFoundationBuildSignature)s=waterFounderBuildSignature;
  if(s===waterFounderBuildSignature&&config.primaryParasiteSettings?.version!=='primary-parameters/2')s=waterEggSpreadBuildSignature;
  if(s===waterEggSpreadBuildSignature&&config.primaryEggSettings?.version!=='primary-egg-parameters/2')s=primaryEggBuildSignature;
  if(s===primaryEggBuildSignature&&config.primaryEggModel===undefined&&config.primaryEggSettings===undefined)s=moderateGrassBuildSignature;
  // The new grassbug profile applies only to new version-4 worlds.
  if(s===moderateGrassBuildSignature&&config.consumerGroupSettings?.version!=='consumer-group-parameters/4')s=socialRenewalBuildSignature;
  if(s===socialRenewalBuildSignature&&config.socialRenewalModel===undefined)s=parasiteFanoutBuildSignature;
  if(s===parasiteFanoutBuildSignature&&config.parasiteDispersalModel===undefined)s=parasiteCohortBuildSignature;
  if(s===parasiteCohortBuildSignature&&config.parasiteCohortModel===undefined)s=consumerGroupBuildSignature;
  if(s===consumerGroupBuildSignature&&config.consumerModel==='group/1'&&config.consumerGroupSettings?.version!=='consumer-group-parameters/3')s=matchedConsumerGroupBuildSignature;
  if(s===consumerGroupBuildSignature&&config.consumerModel===undefined&&config.consumerGroupSettings===undefined)s=matchedConsumerGroupBuildSignature;
  if(s===matchedConsumerGroupBuildSignature&&config.consumerModel==='group/1'&&config.consumerGroupSettings?.version==='consumer-group-parameters/1')s=previousConsumerGroupBuildSignature;
  if(s===matchedConsumerGroupBuildSignature&&config.consumerModel===undefined&&config.consumerGroupSettings===undefined)s=previousConsumerGroupBuildSignature;
  if(s===previousConsumerGroupBuildSignature&&config.consumerModel===undefined&&config.consumerGroupSettings===undefined)s=fungalColonyBuildSignature;
  if(s===fungalColonyBuildSignature&&config.balanceModel!=='survival/4')s=localSurvivalBuildSignature;
  if(s===localSurvivalBuildSignature&&config.balanceModel!=='survival/3')s=foodwebBuildSignature;
  if(s===foodwebBuildSignature&&config.balanceModel!=='survival/2')s=balanceBuildSignature;
  if(s===balanceBuildSignature&&config.balanceModel===undefined)s=relationshipBuildSignature;
  if(s===relationshipBuildSignature&&config.relationshipModel===undefined)s=generationBuildSignature;
  if(s===generationBuildSignature&&config.generationModel===undefined&&config.generationSettings===undefined&&config.generationResolved===undefined)s=informationBuildSignature;
  if(s===informationBuildSignature&&config.informationModel===undefined&&config.informationSettings===undefined)s=hyperBuildSignature;
  if(s===hyperBuildSignature&&config.hyperParasiteModel===undefined&&config.hyperParasiteSettings===undefined)s=primaryBuildSignature;
  if(s===primaryBuildSignature&&config.primaryParasiteModel===undefined&&config.primaryParasiteSettings===undefined)s=ryoukiBuildSignature;
  if(s===ryoukiBuildSignature&&config.ryoukiModel===undefined&&config.ryoukiSettings===undefined)s=independentBuildSignature;
  if(s===independentBuildSignature&&config.largePlantModel===undefined&&config.largePlantSettings===undefined)s=colonyBuildSignature;
  return s===colonyBuildSignature&&config.producerModel===undefined&&config.producerSettings===undefined
   ? "8d7f6fbd94128cebf77ab6032098e09a432bc13d8cb2552222b0546971e84745" : equivalentReplaySignatures[s]||s;
 }
 const terminalDefinition='ecosystem-terminal-state/1',sampleLimit=4;
 const modelKeys=['consumerModel','balanceModel','relationshipModel','generationModel','producerModel','largePlantModel','ryoukiModel','primaryParasiteModel','hyperParasiteModel','parasiteCohortModel','parasiteDispersalModel','primaryEggModel','informationModel','socialRenewalModel','cellModel'];
 const sampleKeys=['organisms','colonies','independentPlants','ryouki','primaryParasites','hyperParasites','informationField','informationSubjects'];
 const pick=(o,keys)=>Object.fromEntries(keys.filter(k=>o?.[k]!==undefined).map(k=>[k,structuredClone(o[k])]));
 function same(a,b){if(Object.is(a,b))return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(k=>Object.hasOwn(b,k)&&same(a[k],b[k]));}
 function finiteData(value,seen=new Set(),depth=0){
  if(typeof value==='number'){if(!Number.isFinite(value))throw Error('保存記録に非有限値があります。');return;}
  if(['bigint','function','symbol'].includes(typeof value))throw Error('保存記録に読み取れない値があります。');
  if(!value||typeof value!=='object')return;
  if(depth>128||seen.has(value))throw Error('保存記録に循環または過大な階層があります。');seen.add(value);
  if(Array.isArray(value)&&Array.from({length:value.length},(_,i)=>!Object.hasOwn(value,i)||value[i]===undefined).some(Boolean))throw Error('保存記録の配列に欠測があります。');
  for(const v of Object.values(value))finiteData(v,seen,depth+1);seen.delete(value);
 }
 const nonnegative=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0,integer=n=>Number.isSafeInteger(n)&&n>=0;
 function terminalState(world,row,S){
  const organisms=world.organisms,primary=S.PrimaryParasite?.enabled(world)?S.PrimaryParasite.entries(world):[],hyper=S.HyperParasite?.enabled(world)?S.HyperParasite.entries(world):[],
    information=S.PersistentInformation?.enabled(world)?S.PersistentInformation.entries(world):[],basic=o=>pick(o,['id','species','slot','cell','phase','branch3','branch4','age','bornAt','birthLife','sex','role','generation','parents','B','E','M','G','HP']),
    samples=(rows,build)=>{const ordered=rows.slice().sort((a,b)=>{const x=String(a.subject?.id??a.p?.id??a.q?.id??a.id),y=String(b.subject?.id??b.p?.id??b.q?.id??b.id);return x<y?-1:x>y?1:0;});return {total:rows.length,retained:Math.min(sampleLimit,rows.length),truncated:rows.length>sampleLimit,items:ordered.slice(0,sampleLimit).map(build)};},
    aggregate=(rows,keys)=>({records:rows.length,...Object.fromEntries(keys.map(k=>[k,rows.every(r=>nonnegative(r[k]))?rows.reduce((n,r)=>n+r[k],0):null]))});
  return {definition:terminalDefinition,turn:world.turn,sampleLimit,models:pick(world.config,modelKeys),counts:structuredClone(row.counts),groups:structuredClone(row.current.groups),
    totals:{E:world.stats.totals.E,M:world.stats.totals.M,biomassB:row.current.biomass.total},
    nutrition:{resources:aggregate(world.resources,['q','E','M','G']),byResource:Object.fromEntries([...new Set(world.resources.map(r=>r.kind))].sort().map(k=>[k,aggregate(world.resources.filter(r=>r.kind===k),['q','E','M','G'])])),carcasses:aggregate(world.carcasses,['q','E','M','G'])},
    summaries:pick(row,['consumerGroups','fungalColony','producerColony','independentPlants','ryouki','primaryParasite','primaryParasiteFlow','hyperParasite','hyperParasiteFlow','persistentInformation','persistentInformationFlow']),
    examples:{...(world.config.consumerModel==='group/1'?{consumerGroups:samples(organisms.filter(o=>S.ConsumerGroup.is(o)),o=>({...basic(o),state:structuredClone(o.consumerGroup)}))}:{}),...(world.config.balanceModel==='survival/4'?{fungalColonies:samples(organisms.filter(o=>S.FungalColony.is(o)),o=>({...basic(o),state:structuredClone(o.colony)}))}:{}),organisms:samples(organisms,basic),colonies:samples(organisms.filter(o=>S.Colony?.is(o)),o=>({...basic(o),state:structuredClone(o.colony)})),
      independentPlants:samples(organisms.filter(o=>S.LargePlant?.is(o)),o=>({...basic(o),state:structuredClone(o.plant)})),ryouki:samples(organisms.filter(o=>S.Ryouki?.is(o)),o=>({...basic(o),state:structuredClone(o.ryouki)})),
      primaryParasites:samples(primary,e=>({...basic(e.p),cell:e.cell,hostId:e.host?.id??null,carrierId:e.carrier?.id??null,location:e.kind,hostResistance:structuredClone(e.host?.primaryResistance??null),...pick(e.p,['stage','counter','matureAt']),state:structuredClone(e.p.primary),...pick(e.p,['hyperResistance','informationState'])})),
      hyperParasites:samples(hyper,e=>({...basic(e.q),cell:e.cell,pId:e.p?.id??null,hostId:e.host?.id??null,carrierId:e.carrier?.id??null,location:e.location,pResistance:structuredClone(e.p?.hyperResistance??null),...pick(e.q,['maturity']),state:structuredClone(e.q.hyper),...pick(e.q,['informationState'])})),
      informationField:samples(world.informationField||[],r=>structuredClone(r)),informationSubjects:samples(information,e=>({id:e.subject.id,species:e.subject.species,cell:e.cell,kind:e.kind,hostId:e.host?.id??null,roles:structuredClone(e.roles),state:structuredClone(e.subject.informationState),...pick(e.subject,['hyperTraces','primaryResistance'])}))}};
 }
 function validateTerminal(record){
  const s=record.final?.state,last=record.observation.rows.at(-1),error=()=>{throw Error('最終状態要約の定義・欠測・計数が不正です。');};
  if(s?.definition!==terminalDefinition||s.turn!==record.turn||s.sampleLimit!==sampleLimit||!same(s.models,pick(record.config,modelKeys))||!same(s.counts,last.counts)||!same(s.groups,last.current.groups)||!same(s.summaries,pick(last,['consumerGroups','fungalColony','producerColony','independentPlants','ryouki','primaryParasite','primaryParasiteFlow','hyperParasite','hyperParasiteFlow','persistentInformation','persistentInformationFlow']))||!s.totals||!nonnegative(s.totals.E)||!nonnegative(s.totals.M)||!nonnegative(s.totals.biomassB)||s.totals.E!==record.final.stats?.totals?.E||s.totals.M!==record.final.stats?.totals?.M||s.totals.biomassB!==last.current.biomass.total)error();
  if(!s.nutrition?.resources||!s.nutrition?.carcasses||!s.nutrition.byResource)error();
  for(const aggregate of [s.nutrition.resources,s.nutrition.carcasses,...Object.values(s.nutrition.byResource)])if(!integer(aggregate.records)||['q','E','M','G'].some(k=>aggregate[k]!==null&&!nonnegative(aggregate[k])))error();
  for(const key of [...sampleKeys,...(record.config.balanceModel==='survival/4'?['fungalColonies']:[])]){const a=s.examples?.[key];if(!a||!integer(a.total)||!integer(a.retained)||a.retained!==Math.min(sampleLimit,a.total)||a.truncated!==(a.total>sampleLimit)||!Array.isArray(a.items)||a.items.length!==a.retained||new Set(a.items.map(o=>o.id)).size!==a.retained)error();for(const o of a.items){if(typeof o.id!=='string'||!o.id||!Number.isInteger(o.cell)||o.cell<0||o.cell>=record.config.width*record.config.height)error();if(key!=='informationField'&&(typeof o.species!=='string'||!record.observation.metadata.species.some(s=>s.id===o.species)))error();}}
  for(const [key,version]of [...(record.config.balanceModel==='survival/4'?[['fungalColonies','fungal-colony-state/1']]:[]),['colonies','colony-state/1'],['independentPlants','independent-plant-state/1'],['ryouki','ryouki-state/1'],['primaryParasites','primary-state/1'],['hyperParasites','hyper-state/1'],['informationSubjects','persistent-information-state/1']])for(const o of s.examples[key].items)if(o.state?.version!==version)error();
  for(const key of ['organisms','colonies','independentPlants','ryouki',...(record.config.balanceModel==='survival/4'?['fungalColonies']:[])])for(const o of s.examples[key].items)if(!integer(o.age)||!Number.isInteger(o.phase)||o.phase<1||o.phase>4||['B','E','M','G','HP'].some(k=>!nonnegative(o[k])))error();
  for(const key of ['primaryParasites','hyperParasites'])for(const o of s.examples[key].items)if(!integer(o.age)||!nonnegative(o.birthLife)||!nonnegative(o.B)||!nonnegative(o.E)||!Number.isInteger(o.phase)||o.phase<1||o.phase>(key==='primaryParasites'?3:4)||!Array.isArray(o.state.parents)||!o.state.last)error();
  for(const key of ['colonies','independentPlants',...(record.config.balanceModel==='survival/4'?['fungalColonies']:[])])for(const o of s.examples[key].items)if(['baseB','capacityB','activity'].some(k=>!nonnegative(o.state[k]))||o.state.activity>1||!o.state.origin||!integer(o.state.establishedAt)||!o.state.last||!o.state.cumulative)error();
  if(record.config.consumerModel==='group/1'){
    const a=s.examples.consumerGroups,g=last.consumerGroups;
    if(!a||!integer(a.total)||a.total!==Object.values(g.species).reduce((n,v)=>n+v.groups,0)||a.retained!==Math.min(sampleLimit,a.total)||a.items.length!==a.retained)error();
    for(const o of a.items)if(o.state?.version!=='consumer-group-state/1'||!Array.isArray(o.state.cohorts)||!o.state.cohorts.every(c=>integer(c.age)&&integer(c.n)&&c.n>0&&[1,2].includes(c.phase)))error();
  }else if(s.examples.consumerGroups!==undefined)error();
  if(record.config.balanceModel==='survival/4'){
    const fungi=s.examples.fungalColonies;
    if(fungi.total!==last.counts.fungus)error();
    for(const o of fungi.items)if(o.state.baseB!==1||o.B<o.state.baseB||o.B-o.state.baseB>o.state.capacityB+1e-6||!integer(o.state.starvationRun)||o.state.establishedAt>record.turn||o.state.last.turn!==record.turn||Object.values(o.state.last).some(n=>!nonnegative(n))||Object.values(o.state.cumulative).some(n=>!nonnegative(n)))error();
  }
  for(const o of s.examples.ryouki.items)if(typeof o.state.mutated!=='boolean'||!integer(o.state.highRun)||!integer(o.state.lowRun)||!Array.isArray(o.state.window)||o.state.window.length>32||!Array.isArray(o.state.recentCells)||o.state.recentCells.length>64)error();
  for(const o of s.examples.primaryParasites.items)if(!o.state.adaptation?.hosts||!o.state.adaptation.routes||!o.state.adaptation.stages||!o.state.hostPreference||!['A','B','C'].includes(o.state.form)||o.state.formVersion!=='primary-form/1')error();
  for(const o of s.examples.hyperParasites.items)if(!['egg','larva','preparation','adult'].includes(o.state.state)||!o.state.genes?.hosts||!o.state.genes.routes||!o.state.genes.stages||!o.state.genes.investment||!o.state.preference||!nonnegative(o.state.development)||!nonnegative(o.state.experience))error();
 if(record.config.parasiteCohortModel==='cohort/1'){
  for(const o of s.examples.primaryParasites.items)if(o.state.cohort?.version!=='parasite-cohort/1'||!integer(o.state.cohort.members)||o.state.cohort.members<1||o.state.cohort.members>3||!integer(o.state.cohort.passages))error();
  for(const o of s.examples.hyperParasites.items)if(o.state.cohort?.version!=='parasite-cohort/1'||!integer(o.state.cohort.members)||o.state.cohort.members<1||o.state.cohort.members>3)error();
 }
  for(const o of s.examples.primaryParasites.items)if(o.hostResistance!==null&&o.hostResistance?.version!=='primary-resistance/1'||o.hyperResistance!==undefined&&o.hyperResistance.version!=='hyper-resistance/1')error();
  for(const o of s.examples.hyperParasites.items)if(o.pResistance!==null&&o.pResistance?.version!=='hyper-resistance/1')error();
  const vector=values=>Array.isArray(values)&&values.length<=9&&values.every(v=>Number.isInteger(v.axis)&&v.axis>=0&&v.axis<9&&Number.isFinite(v.value));
  for(const o of s.examples.informationField.items)if(typeof o.originId!=='string'||typeof o.sourceId!=='string'||!nonnegative(o.amount)||!integer(o.generatedAt)||!integer(o.expires)||o.generatedAt>record.turn||o.expires<=record.turn||!Array.isArray(o.sourceRoles)||!Array.isArray(o.contents)||!o.contents.length||o.contents.length>2||['E','B','M'].some(k=>Object.hasOwn(o,k))||o.contents.some(c=>!vector(c.originalValues)||!vector(c.values)||!integer(c.experienceAt)||c.experienceAt>o.generatedAt||!nonnegative(c.halfLife)||!['normal','low','confirmed-harm'].includes(c.evidence)||!['all','layer'].includes(c.scope)||!Array.isArray(c.roles))||!o.generation?.evaluation||!['normal','low'].includes(o.generation.kind)||['pN','pL','u'].some(k=>!nonnegative(o.generation[k])||o.generation[k]>1))error();
  for(const o of s.examples.informationSubjects.items)if(!Array.isArray(o.roles)||!Array.isArray(o.state.experience)||o.state.experience.length>16||!Array.isArray(o.state.learned)||o.state.learned.length>64||!Array.isArray(o.state.learnedPreferences)||o.state.learnedPreferences.length!==9||!o.state.progress)error();
  if(s.examples.organisms.total!==(record.config.consumerModel==='group/1'?record.final.stats.agents:record.final.stats.population)||s.examples.primaryParasites.total!==(last.primaryParasite?.count??0)||s.examples.hyperParasites.total!==(last.hyperParasite?.count??0)||s.examples.informationField.total!==(last.persistentInformation?.field.records??0)||s.examples.informationSubjects.total!==(last.persistentInformation?.subjects??0))error();
 }
 function validateFullRecord(record,engine){
  if(!record||![1,2,3].includes(record.schema)||typeof record.id!=='string'||typeof record.signature!=='string'||!integer(record.turn)||typeof record.config?.seed!=='string'||!record.final)throw Error('保存本文の形式が不正です。');
  if(record.config.consumerModel!==undefined&&record.config.consumerModel!=='group/1')throw Error('一次消費者集団の版が不正です。');
  if(record.config.consumerModel==='group/1'&&(!record.config.consumerGroupSettings||!same(engine.S.ConsumerGroup.settings(record.config.consumerGroupSettings),record.config.consumerGroupSettings)))throw Error('一次消費者集団の実効設定が不正です。');
  if(record.config.consumerModel!=='group/1'&&(record.config.consumerGroupSettings!==undefined||record.final.consumerGroups!==undefined))throw Error('一次消費者集団の計算版が一致しません。');
  if(record.config.balanceModel!==undefined&&!['survival/1','survival/2','survival/3','survival/4'].includes(record.config.balanceModel))throw Error('生存調整の観測方式を読み取れません。');
  if(record.config.balanceModel==='survival/4'&&(!record.config.fungalColonySettings||!same(engine.S.FungalColony.settings(record.config.fungalColonySettings),record.config.fungalColonySettings)))throw Error('菌膜群落の実効設定が不正です。');
  if(record.config.balanceModel!=='survival/4'&&(record.config.fungalColonySettings!==undefined||record.final?.state?.examples?.fungalColonies!==undefined))throw Error('菌膜群落の計算版が一致しません。');
  const generation=record?.config?.generationModel!==undefined||record?.config?.generationSettings!==undefined||record?.config?.generationResolved!==undefined;
  if(record?.schema!==3){if(generation)throw Error('多様生成の保存形式・状態版を読み取れません。');return record;}
  finiteData(record);
  if(!record||record.config?.generationModel!=='diverse/1'||record.config.generationSettings?.version!=='diverse-generation-parameters/1'||record.config.generationResolved?.version!=='diverse-generation-resolved/1'||typeof record.id!=='string'||!record.id.startsWith('record:')||typeof record.signature!=='string'||!record.signature||!integer(record.turn)||!/^[0-9a-f]{64}$/.test(record.finalFingerprint)||record.hasObservations!==true||typeof record.created!=='string'||!Number.isFinite(Date.parse(record.created))||!(record.originRecordId===null||typeof record.originRecordId==='string'))throw Error('新しい保存本文の形式・生成定義が不正です。');
  const S=engine.S;if(!S.WorldGeneration?.validateResolved)throw Error('多様生成の保存条件を検証できません。');S.WorldGeneration.validateResolved(record.config);
  const normalized=S.validate(record.config);for(const key of ['producerSettings','largePlantSettings','ryoukiSettings','primaryParasiteSettings','hyperParasiteSettings','informationSettings'])if(!same(normalized[key],record.config[key]))throw Error('保存された全実効条件に欠測があります。');
  const o=record.observation;if(o?.metadata?.version!==record.signature||!same(o.metadata.config,record.config)||!Array.isArray(o.rows)||o.rows.length!==record.turn+1)throw Error('保存された全期間記録の条件・署名・時点が一致しません。');
  const definitions=['current','trophic','nutrition','consumerGroups','fungalColony','producerColony','independentPlants','ryouki','primaryParasite','primaryParasiteFlow','hyperParasite','hyperParasiteFlow','persistentInformation','persistentInformationFlow','combat','information','relationship'];
  if(Object.keys(o.definitions||{}).some(k=>!definitions.includes(k)))throw Error('保存された観測に未知の定義があります。');
  const O=observationsAPI();if(!O?.restore)throw Error('保存された観測の検証APIを読み取れません。');O.restore(o,{validateOnly:true});
  const ids=o.metadata.species?.map(s=>s.id);if(!ids?.length||new Set(ids).size!==ids.length)throw Error('保存された系統定義に欠測があります。');
  for(const row of o.rows){if(ids.some(id=>!integer(row.counts?.[id]))||!integer(row.births)||!integer(row.deaths)||!integer(row.main)||!integer(row.food)||!integer(row.P)||!integer(row.Q)||!same(row.counts,row.current.counts))throw Error('全ターン原値の計数に欠測・不整合があります。');}
  const last=o.rows.at(-1);if(!same(record.final?.counts,last.counts)||!same(record.final.current,last.current)||record.final.P!==last.P||record.final.Q!==last.Q||!record.final.stats||!record.final.ledger||!record.final.tallies||!record.final.demography)throw Error('最終集計と全ターン原値が一致しません。');
  for(const key of ['consumerGroups','fungalColony','independentPlants','ryouki','primaryParasite','primaryParasiteFlow','hyperParasite','hyperParasiteFlow','persistentInformation','persistentInformationFlow'])if(!same(record.final[key],last[key]))throw Error('最終状態の観測が一致しません。');
  validateTerminal(record);return record;
 }
 function headerFor(record){
  if(record.schema!==3){const header=structuredClone({...record,observation:undefined});delete header.observation;return header;}
  return {...pick(record,['schema','id','signature','turn','reason','created','finalFingerprint','originRecordId','replayMatch','hasObservations']),config:pick(record.config,['seed','modeResolved','mapResolved','generationSettings',...modelKeys]),generation:{profile:record.config.generationResolved.profile,selectedAttempt:record.config.generationResolved.selectedAttempt},final:pick(record.final,['counts','main','food','P','Q'])};
 }
 function create(storage,engine,signature){
  function list(){
   const raw=storage.getItem(KEY);if(!raw)return [];
   const rows=JSON.parse(raw);if(!Array.isArray(rows))throw Error('観測記録が破損しています。保存を中止しました。');
   if(rows.some(r=>!r||![1,2,3].includes(r.schema)||typeof r.id!=='string'||typeof r.signature!=='string'||!Number.isSafeInteger(r.turn)||r.turn<0||!r.config||typeof r.config.seed!=='string'||!r.final))throw Error('読み取れない観測記録があります。上書きせず保存を中止しました。');
   return rows;
  }
  const validateRecord=record=>validateFullRecord(record,engine);
  function validateLoadedRecord(record){
    validateRecord(record);
    if(record.schema===2){finiteData(record);const o=record.observation;if(!o||o.rows?.length!==record.turn+1||o.metadata?.version!==record.signature||!same(o.metadata.config,record.config))throw Error('保存された全期間記録が破損しています。上書きしません。');observationsAPI().restore(o,{validateOnly:true});}
    return record;
  }
  function capture(world,reason,observation,originRecordId=null){
    if(world.config.cellModel!==undefined)throw Error('CELL_MODEL_INCOMPLETE: マス再編は基盤段階のため図鑑への結果保存はまだできません。');
    if(world.config.balanceModel!==undefined&&!['survival/1','survival/2','survival/3','survival/4'].includes(world.config.balanceModel))throw Error('生存調整の観測方式を読み取れません。');
    const relationModel=world.config.relationshipModel;
    if(relationModel!==undefined&&relationModel!=='network/1')throw Error('関係図の観測方式を読み取れません。');
    if(relationModel==='network/1'){if(!observation)throw Error('関係図の保存には全期間観測が必要です。');observationsAPI().restore(observation,{validateOnly:true});}
    const generation=world.config.generationModel!==undefined||world.config.generationSettings!==undefined||world.config.generationResolved!==undefined;
    if(generation&&!observation)throw Error('多様生成の保存には全ターン観測が必要です。');
    if(generation)finiteData(world);
    const fingerprint=engine.fingerprint(world),record={schema:1,id:fingerprint,signature,config:structuredClone(world.config),turn:world.turn,reason,created:new Date().toISOString(),final:{counts:{...world.stats.counts},main:world.stats.main,food:world.stats.food,P:world.stats.P,Q:world.stats.Q}};
    if(observation){
      const fungalModel=world.config.balanceModel==='survival/4',fungalDefinition=observation.definitions?.fungalColony;
      if(fungalModel?fungalDefinition!=='fungal-colony-observed/1':fungalDefinition!==undefined)throw Error('菌膜群落の観測・計算版が一致しません。');
      if(fungalModel)observationsAPI().restore(observation,{validateOnly:true});
      const informationModel=world.config.informationModel==='persistent/1',informationDefinition=observation.definitions?.persistentInformation,informationFlow=observation.definitions?.persistentInformationFlow;
      if((informationDefinition!==undefined&&informationDefinition!=="persistent-information-observed/1")||(informationFlow!==undefined&&informationFlow!=="persistent-information-flow/1")||
        informationModel!==(informationDefinition!==undefined)||informationModel!==(informationFlow!==undefined)||
        (informationModel&&(!Array.isArray(observation.rows)||observation.rows.some(r=>r.persistentInformation?.definition!==informationDefinition||r.persistentInformation.turn!==r.turn||r.persistentInformationFlow?.definition!==informationFlow||r.persistentInformationFlow.turn!==r.turn||r.information!==undefined))))throw Error("持続情報の全期間観測・定義版が揃っていないため保存できません。");
      const hyperModel=world.config.hyperParasiteModel==='hyper/1',hyperDefinition=observation.definitions?.hyperParasite,hyperFlow=observation.definitions?.hyperParasiteFlow;
      if((hyperDefinition!==undefined&&hyperDefinition!=="hyper-parasite-observed/1")||(hyperFlow!==undefined&&hyperFlow!=="hyper-parasite-flow/1")||
        hyperModel!==(hyperDefinition!==undefined)||hyperModel!==(hyperFlow!==undefined)||
        (hyperModel&&(!Array.isArray(observation.rows)||observation.rows.some(r=>r.hyperParasite?.definition!==hyperDefinition||r.hyperParasite.turn!==r.turn||r.hyperParasiteFlow?.definition!==hyperFlow||r.hyperParasiteFlow.turn!==r.turn))))throw Error("高次寄生の全期間観測・定義版が揃っていないため保存できません。");
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
      if(world.config.consumerModel==='group/1')record.final.consumerGroups=structuredClone(observation.rows.at(-1).consumerGroups);
      if(fungalModel)record.final.fungalColony=structuredClone(observation.rows.at(-1).fungalColony);
      if(plantModel)record.final.independentPlants=structuredClone(observation.rows.at(-1).independentPlants);
      if(ryoukiModel)record.final.ryouki=structuredClone(observation.rows.at(-1).ryouki);
      if(primaryModel){record.final.primaryParasite=structuredClone(observation.rows.at(-1).primaryParasite);record.final.primaryParasiteFlow=structuredClone(observation.rows.at(-1).primaryParasiteFlow);}
      if(hyperModel){record.final.hyperParasite=structuredClone(observation.rows.at(-1).hyperParasite);record.final.hyperParasiteFlow=structuredClone(observation.rows.at(-1).hyperParasiteFlow);}
      if(informationModel){record.final.persistentInformation=structuredClone(observation.rows.at(-1).persistentInformation);record.final.persistentInformationFlow=structuredClone(observation.rows.at(-1).persistentInformationFlow);}
      const current=observation.rows.at(-1).current;record.final.counts={...current.counts};record.final.P=current.groups.find(g=>g.id==='P')?.count||0;record.final.Q=current.groups.find(g=>g.id==='Q')?.count||0;
      Object.assign(record.final,{stats:structuredClone(world.stats),ledger:structuredClone(world.ledger),tallies:structuredClone(world.tallies),demography:structuredClone(world.demography),current:structuredClone(observation.rows.at(-1).current)});
    }
    if(generation){record.schema=3;record.final.state=terminalState(world,observation.rows.at(-1),engine.S);validateRecord(record);}
    return record;
  }
  function save(record,mode='normal'){
   if(!['normal','replay-new'].includes(mode)||record.originRecordId&&mode!=='replay-new')return false;
   if(mode==='replay-new'&&(!record.originRecordId||![2,3].includes(record.schema)))throw Error('新規保存する再生元がありません。');
   validateRecord(record);
   const rows=list();if(rows.some(r=>r.id===record.id&&r.signature===record.signature))return false;
   if(rows.length>=LIMIT)throw Error('観測記録が100件に達しました。不要な記録を削除してから保存を再試行してください。');
   storage.setItem(KEY,JSON.stringify([record,...rows]));return true;
  }
  function remove(id){storage.setItem(KEY,JSON.stringify(list().filter(r=>r.id!==id)));}
  function replay(id){return replayRecord(list().find(r=>r.id===id));}
  function replayRecord(r){if(!r)throw Error('観測記録が見つかりません。');validateLoadedRecord(r);const targetSignature=canonicalSignature(signature,r.config),sourceSignature=canonicalSignature(r.signature,r.config);if(sourceSignature!==targetSignature&&(!replayAliases[targetSignature]?.includes(sourceSignature)||
    (!["256f304140d755becefb723937fff7c85f927ea839b26af28f11bb34834f7303", "8fca29559d94f405a0022c5f86d8d15c400204ddae3f71a40a7a261b5bd2552a"].includes(sourceSignature)&&(r.config.founderCounts!==undefined||r.config.founderReport!==undefined))||
    (["fd86e3845849b8fb1432d48e6608098b5028ecf97ac7337956415c7b34ef8091", "256f304140d755becefb723937fff7c85f927ea839b26af28f11bb34834f7303", "8fca29559d94f405a0022c5f86d8d15c400204ddae3f71a40a7a261b5bd2552a", "9e94eea06cc9c1f640fecb88faaf25bc205d3f3e34b57b042a0d7c1160fef0ab"].includes(targetSignature)&&!["256f304140d755becefb723937fff7c85f927ea839b26af28f11bb34834f7303", "8fca29559d94f405a0022c5f86d8d15c400204ddae3f71a40a7a261b5bd2552a", "9e94eea06cc9c1f640fecb88faaf25bc205d3f3e34b57b042a0d7c1160fef0ab"].includes(sourceSignature)&&(r.config.producerSupport!==undefined||r.config.initialConditions!==undefined||r.config.initialReport!==undefined))))throw Error('計算版が異なるため同じ結果を再現できません。この記録は再生できません。');if(r.config.landscape==='templates'&&!r.config.mapResolved)throw Error('地形の識別情報がないため再生できません。');return structuredClone(r);}
  return {list,capture,save,remove,replay,replayRecord,validateFullRecord:validateLoadedRecord,get(id){const record=list().find(r=>r.id===id);if(record)validateLoadedRecord(record);return structuredClone(record);},limit:LIMIT};
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
   async function ready(){
     const db=await open(),next=await requestValue(db.transaction('headers').objectStore('headers').getAll());
     create({getItem:()=>JSON.stringify([...next,...legacy.list()])},engine,signature).list();
     for(const header of next)if(header.schema===3){finiteData(header);if(header.config?.generationModel!=='diverse/1'||header.config.generationSettings?.version!=='diverse-generation-parameters/1'||header.config.generationResolved!==undefined||header.final?.state!==undefined||header.observation!==undefined||!Object.values(header.final?.counts||{}).every(integer)||typeof header.generation?.profile!=='string'||!integer(header.generation?.selectedAttempt))throw Error('保存された一覧の形式が不正です。');}
     headers=next;loaded=true;
   }
   let readyPromise=ready();readyPromise.catch(()=>{});
   const api={capture:legacy.capture,limit:LIMIT,get ready(){return readyPromise;},retry(){readyPromise=ready();readyPromise.catch(()=>{});return readyPromise;},
     list(){if(!loaded)throw Error('図鑑を読み込み中です。');return cached.list().sort((a,b)=>b.created.localeCompare(a.created)||a.id.localeCompare(b.id));},
     replay:id=>cached.replay(id),replayRecord:legacy.replayRecord,validateFullRecord:legacy.validateFullRecord,
     async get(id){await api.ready;let record=legacy.get(id);if(!record){const db=await open();record=await requestValue(db.transaction('records').objectStore('records').get(id));}if(!record)throw Error('観測記録が見つかりません。');if(record.id!==id)throw Error('保存本文のIDが一致しません。');legacy.validateFullRecord(record);if(record.schema===3){const header=headers.find(h=>h.id===id);if(header&&!same(header,headerFor(record)))throw Error('保存本文と一覧の条件・署名・最終結果が一致しません。');}if(record.schema===2&&(!record.observation||record.observation.rows?.length!==record.turn+1||record.observation.metadata?.version!==record.signature||JSON.stringify(record.observation.metadata.config)!==JSON.stringify(record.config)))throw Error('保存された全期間記録が破損しています。上書きしません。');return record;},
     async save(record,mode='normal'){
       await api.ready;
       if(!['normal','replay-new'].includes(mode)||record.originRecordId&&mode!=='replay-new')return false;
       if(mode==='replay-new'&&(!record.originRecordId||![2,3].includes(record.schema)))throw Error('新規保存する再生元がありません。');
       if(![2,3].includes(record.schema)||!record.observation||record.finalFingerprint?.length!==64)throw Error('保存する全期間記録を読み取れません。');
       legacy.validateFullRecord(record);
       const oldCount=legacy.list().length,db=await open(),header=headerFor(record);
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
