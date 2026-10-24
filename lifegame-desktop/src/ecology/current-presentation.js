/* Current aggregates → existing display contracts. No biological history or state writes. */
(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(node?require('./current-observations.js'):root.EcoCurrentObservations);if(node)module.exports=api;else root.EcoCurrentPresentation=api;})(globalThis,N=>{
 'use strict';
 const FACTS='current-view-facts/1',copy=x=>structuredClone(x),sum=o=>Object.values(o||{}).reduce((a,n)=>a+n,0),add=(o,k,n)=>{o[k]=(o[k]||0)+n;},
  esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),num=n=>Number.isFinite(n)?Number(n.toFixed(3)):'未記録';
 function collect(w,byId,cellObservation,S){
  const cell=cellObservation(w,byId,copy(w.observation.composition)),mass={};
  for(const o of w.organisms)add(mass,o.species,o.B);
  for(const {p}of S.PrimaryParasite.entries(w))add(mass,p.species,p.B);
  for(const {q}of S.HyperParasite.entries(w))add(mass,q.species,q.B);
  return {definition:FACTS,cell,mass};
 }
 function checkFacts(r){
  const p=r.presentation;if(p===undefined)return;
  const allFinite=x=>Object.values(x||{}).every(n=>typeof n==='number'?Number.isFinite(n)&&n>=0:typeof n==='object'&&n!==null?allFinite(n):true);
  if(!allFinite(p))throw Error('CURRENT_VIEW_FACTS');
  if(p.definition!==FACTS||p.cell?.turn!==r.turn||!p.mass||Object.values(p.mass).some(n=>!Number.isFinite(n)||n<0)||Math.abs(sum(p.mass)-r.pyramid.biomassTotal)>1e-3)throw Error('CURRENT_VIEW_FACTS');
  for(const [id,a]of Object.entries(p.cell.bySpecies||{}))if(a.population!==r.counts[id])throw Error('CURRENT_VIEW_POPULATION');
 }
 function project(raw,previous,byId){
  checkFacts(raw);const recent=[...previous.slice(-49).map(r=>r.raw),raw],counts=raw.counts,mass=raw.presentation?.mass,
   groups=['plant','prey','main','fungus','P','Q'].map(id=>({id,count:sum(Object.fromEntries(Object.entries(counts).filter(([s])=>byId[s]?.group===id)))})),
   group=id=>groups.find(g=>g.id===id).count,edges={},types=new Set(),production={},predation={},scavenging={},roleEnergy=new Map();let produced=0,uptake=0;
  for(const r of recent){for(const a of r.actions)if(a.amount>0){add(edges,[a.from,a.to,a.type].join('|'),a.count);types.add(a.type);}
   for(const n of r.nutrition){if(!(n.energy>0))continue;uptake+=n.energy;
    if(n.type==='light'){produced+=n.energy;add(production,n.species,n.energy);}
    if(n.type==='organism'&&byId[n.source]?.group!=='plant')add(predation,n.species,n.energy);
    if(['soil','carcass'].includes(n.type)&&byId[n.species]?.group==='main')add(scavenging,n.species,n.energy);
    let parts=roleEnergy.get(n.species);if(!parts)roleEnergy.set(n.species,parts=[0,0,0,0,0,0]);
    const s=byId[n.source],i=n.type==='light'?0:s?.group==='plant'?1:s?.group==='prey'?2:s?.group==='main'?(s.diet==='animal'?4:3):5;parts[i]+=n.energy;
   }
  }
  const roleLayers=mass?[0,0,0,0,0]:null;let roleUnknown=0;
  if(mass)for(const [id,B]of Object.entries(mass)){
   const g=byId[id]?.group;if(g==='plant'){roleLayers[0]+=B;continue;}if(g==='prey'){roleLayers[1]+=B;continue;}if(g!=='main')continue;
   const e=roleEnergy.get(id),total=e?sum(e):0;if(total){for(let i=0;i<5;i++)roleLayers[i]+=B*e[i]/total;roleUnknown+=B*e[5]/total;}else roleUnknown+=B;
  }
  const rank=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([id,value])=>({id,name:byId[id]?.name||id,value})),bonds={};
  for(const [key,n]of Object.entries(raw.bonds)){const [from,to]=JSON.parse(key);bonds[from+'|'+to+'|bond']=n;}
  const relations={edges,species:raw.relations.participatingSpecies,types:[...types].sort(),continuous:raw.relations.continuousEdges??0},
   current={definition:'current-ecosystem-view/1',counts,groups,total:sum(counts),biomass:{bySpecies:mass||{},total:raw.pyramid.biomassTotal},bonds,relations,
    summary:{overall:raw.turn===0?'初期配置から、生態系の特徴を観測中':relations.species?`直近${Math.min(50,raw.turn)}Tで${relations.species}系統が作用し、${relations.types.length}種類の関わりを確認`:'実作用の観測を蓄積中'},
    pyramid:{...raw.pyramid,...(roleLayers?{roleLayers,roleUnknown}:{}),production:raw.turn?produced:null,uptake:raw.turn?uptake:null,window:Math.min(50,raw.turn),leaders:{production:rank(production),predation:rank(predation),scavenging:rank(scavenging)},source:'食性別Bは直近50Tの系統別実同化構成。未観測の由来を推定しません。'}};
  const network=new Map(),put=(from,to,type,value)=>{if(!(value>0)||!byId[to]||!byId[from]&&!from.startsWith('@'))return;const k=[from,to,type].join('|'),a=network.get(k);if(a)a.value+=value;else network.set(k,{from,to,type,value});};
  if(raw.turn){for(const n of raw.nutrition){if(n.type==='parasitism')continue;
   if(n.type==='light')put('@light',n.species,'production',n.energy);
   else if(n.type==='organism')put(n.source,n.species,'feeding',n.energy);
   else if(['soil','carcass'].includes(n.type))put('@carcass:'+n.source.replace(/^@/,'').replaceAll(':','-'),n.species,byId[n.species]?.group==='fungus'?'decomposition':'scavenging',n.energy);
   else put('@resource:'+n.source.replace(/^@/,''),n.species,'resource',n.energy);
  }
   for(const a of raw.actions)if(['combat','care','clear','infection','information'].includes(a.type))put(a.from,a.to,a.type,a.type==='combat'?a.amount:a.count);
   for(const [key,n]of Object.entries(bonds)){const [from,to]=key.split('|');put(from,to,'parasitism',n);}
  }
  const relationship={definition:'relationship-network-observed/1',turn:raw.turn,availability:Object.fromEntries(['nutrition','combat','support','parasitism','information'].map(k=>[k,raw.turn?'recorded':'unobserved'])),counts,
   biomass:Object.fromEntries(Object.entries(counts).map(([id,n])=>[id,mass?.[id]??(n===0?0:null)])),edges:[...network.values()],production:Object.fromEntries(raw.nutrition.filter(n=>n.type==='light').map(n=>[n.species,n.energy])),kills:{}};
  return {raw,turn:raw.turn,counts,composition:raw.composition,birthReasons:raw.birthReasons,main:group('main'),food:group('plant')+group('prey')+group('fungus')-sum(Object.fromEntries(Object.entries(counts).filter(([id])=>byId[id]?.kind==='independent'&&byId[id]?.slot==='producer'))),P:group('P'),Q:group('Q'),richness:Object.values(counts).filter(n=>n>0).length,
   persistentInformation:raw.information,persistentInformationFlow:raw.informationFlow,primaryParasite:raw.primary,hyperParasite:raw.hyper,cell:raw.presentation?.cell,relations:edges,current,relationship};
 }
 function facade(native,rows,byId){
  const metadata={...native.snapshot({copy:false}).metadata,version:native.snapshot({copy:false}).metadata.signature},seriesCache=new Map();let exported=-1;
  return {metadata,rows,snapshot:opts=>native.snapshot(opts),exportRows:()=>native.snapshot({copy:false}).rows,
   append:null,csv:native.csv,csvChunks:native.csvChunks,canExpandCapacity:()=>false,expandCapacity:()=>false,
   markExported:(t=rows.length-1)=>{exported=Math.max(exported,t);},get unexported(){return rows.length-1>exported;},
   series(target='main',axis='population'){
    const key=target+'|'+axis;let result=seriesCache.get(key);if(!result){if(seriesCache.size>=8)seriesCache.delete(seriesCache.keys().next().value);seriesCache.set(key,result=[]);}
    for(let i=result.length;i<rows.length;i++){const r=rows[i],values={};for(const [id,count]of Object.entries(r.counts))if(target==='all'||id===target||byId[id]?.group===target){if(axis==='population'){values[id]=count;continue;}
      const data=r.composition[id]?.[axis]||{};let total=0;for(const [k,n]of Object.entries(data)){add(values,k,n);total+=n;}if(count>total)add(values,'nonapplicable',count-total);
     }result.push({turn:r.turn,values,total:sum(values)});
    }return result;
   }};
 }
 function create(config,signature,{species,cellObservation,stateAPI}){
  const rows=[],byId=Object.fromEntries(species.map(s=>[s.id,s])),native=N.create(config,{species,signature,onAppend:r=>rows.push(project(r,rows,byId))}),out=facade(native,rows,byId);
  out.append=w=>{if(w.turn===rows.at(-1)?.turn)return false;const facts=collect(w,byId,cellObservation,stateAPI());native.append({...w,observation:{...w.observation,presentation:facts}});return rows.at(-1);};return out;
 }
 function restore(snapshot){
  const rows=[],byId=Object.fromEntries(snapshot.metadata.species.map(s=>[s.id,s])),native=N.restore(snapshot,{onAppend:r=>rows.push(project(r,rows,byId))}),out=facade(native,rows,byId);
  out.append=()=>{throw Error('CURRENT_OBSERVATION_READ_ONLY');};return out;
 }
 function subjectHTML(w,o,{weights=[],meanings={}}={}){
  const a=o.informationState;if(!a)return '';
  const vector=v=>(v||[]).map((n,i)=>n?`${esc(weights[i]||'軸'+(i+1))}: ${num(n)}`:null).filter(Boolean).join(' / ')||'変化なし',out=a.outgoing,inc=a.incoming;
  return `<details data-current-information-subject="${esc(o.id)}" open><summary>本人の発信・受信と現在の変化</summary><p class="micro">初期値 ${vector(o.birthWeights||a.base)}<br>加算分 a ${vector(a.change)}<br>発信 最終 ${out.lastAt??'なし'}T / ${Object.keys(out.components).length}区分（直近30T）</p>${Object.values(out.components).map(c=>`<p class="micro">${esc(meanings[c.meaning]||c.meaning)} / 実経験 ${c.count}件・${c.distinctTurns}T / 最終 ${c.lastExperienceAt}T</p>`).join('')}<p class="micro">受信 最終 ${inc.lastAt??'なし'}T（10Tで失活）<br>正 ${vector(inc.positive)}<br>負 ${vector(inc.negative)}<br>直近受容 ${a.last?`${a.last.turn}T / ${a.last.received}区分 / 実適用 ${a.last.applied} / 費用 ${num(a.last.costE)} E`:'未実行'}<br>Q痕跡 ${o.qInformation?.active?'有効':''} / 離脱残留 ${o.qInformation?.residual?.length||0}件</p><p class="note">発信と受信は各1集約。学習後は初期値＋aとして保持し、DNAへ書き戻しません。</p></details>`;
 }
 function fieldHTML(w,cell,{weights=[],meanings={}}={}){
  const records=w.informationField.filter(r=>r.cell===cell),vector=v=>(v||[]).map((n,i)=>n?`${esc(weights[i]||'軸'+(i+1))}: ${num(n)}`:null).filter(Boolean).join(' / ')||'作用なし';
  const soil=w.cellState.soil,fresh=soil.fresh.filter(r=>r.cell===cell),organic=w.cellState.organic.filter(r=>r.cell===cell),waiting=soil.waiting.filter(r=>r.cell===cell),stock=rs=>`E ${num(rs.reduce((n,r)=>n+r.E,0))} / M ${num(rs.reduce((n,r)=>n+r.M,0))} / B ${num(rs.reduce((n,r)=>n+r.B,0))}`;
  return `<section data-current-information-field><h3>場所の情報 · ${records.length}集約区分</h3>${records.map(r=>`<p class="micro">${esc(meanings[r.meaning]||r.meaning)} / ${esc({normal:'実経験由来',low:'根拠不足'}[r.evidence]||r.evidence)} / ${esc({all:'全層',species:'同系統',layer:'同じ役割',kin:'親子',parasite:'寄生関係'}[r.scope]||r.scope)}<br>量 ${num(r.amount)} / 期限 ${r.expires}T（残り ${r.expires-w.turn}T）<br>${vector(r.strength)}</p>`).join('')||'<p>有効な情報なし</p>'}<p class="note">情報は栄養ではなく、由来個体の履歴は保持しません。</p><h3>同マスの残骸・土壌在庫</h3><p class="micro">新鮮残骸 ${stock(fresh)}<br>分解済み有機物 ${stock(organic)}<br>還元待ち M ${num(waiting.reduce((n,r)=>n+r.M,0))}</p><p class="note">残骸の量です。死亡個体数や元個体のDNAを示しません。</p></section>`;
 }
 const guideHTML=()=>'<section data-current-information-guide><h2>現在に集約する情報と残骸</h2><p>本人の発信は直近30Tの1集約、受信は10Tの1集約。学習の結果は初期値＋aとして残し、履歴を増やしません。場所の情報は意味・役割・作用ごとの量を持ち、30〜60Tで失活します。Q離脱後の痕跡は30T以内です。読取だけでは期限や量を変更しません。</p><p>残骸は所在マスの有限な新鮮在庫へ入り、10T後に有機物へ還元します。栄養・身体・還元待ちの収支を分け、個体履歴へ戻しません。全確定ターンの集計は観測側で保持し、結果とCSVから参照できます。</p></section>';
 return {FACTS,create,restore,subjectHTML,fieldHTML,guideHTML};
});
