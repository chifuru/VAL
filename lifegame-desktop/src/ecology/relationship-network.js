/* Bounded species-pair observations and cached 100-turn presentation. No biological reads. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EcoRelationshipNetwork=api;})(globalThis,()=>{
  'use strict';
  const definition='relationship-network-observed/1',viewDefinition='relationship-network/1';
  const types={
    production:{plane:0,name:'光合成',unit:'E',color:'#b5d981'},
    feeding:{plane:0,name:'生体採食',unit:'E',color:'#66d8cc'},
    scavenging:{plane:0,name:'死骸採食',unit:'E',color:'#c5ad88',dash:'5 3'},
    decomposition:{plane:0,name:'分解',unit:'E',color:'#d5b1eb',dash:'2 3'},
    resource:{plane:0,name:'資源利用',unit:'E',color:'#9ec5d4'},
    combat:{plane:1,name:'実損害',unit:'HP',color:'#ef9c76'},
    care:{plane:1,name:'支援',unit:'件',color:'#d6d79c'},
    clear:{plane:1,name:'寄生除去',unit:'件',color:'#c6dfc7',dash:'4 3'},
    parasitism:{plane:2,name:'有効定着',unit:'群体T',color:'#bd9ce7'},
    infection:{plane:2,name:'新規定着',unit:'件',color:'#ad83df',dash:'2 3'},
    information:{plane:2,name:'情報直接適用',unit:'件',color:'#75d5ee',dash:'6 3'},
    mediated:{plane:2,name:'Q媒介情報適用',unit:'件',color:'#cfb0fc',dash:'2 4'},
  };
  const planes=['採食・分解','戦闘・支援','寄生・情報'];
  const categories=['nutrition','combat','support','parasitism','information'];
  const category=type=>types[type]?.plane===0?'nutrition':type==='combat'?'combat':['care','clear'].includes(type)?'support':['parasitism','infection'].includes(type)?'parasitism':'information';
  const own=(a,k)=>Object.prototype.hasOwnProperty.call(a||{},k),number=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
  const enabled=config=>config?.relationshipModel==='network/1';
  function createRow(w,current,relations,{species=[]}={}){
    const catalogue=Object.fromEntries(species.map(s=>[s.id,s])),flow=w.observation?.flowTelemetry,telemetry=flow?.relationship;
    if(telemetry!==undefined&&(telemetry.definition!=='relationship-telemetry/1'||telemetry.turn!==w.turn))throw Error('関係図の観測テレメトリ版・ターンが不正です。');
    const availability={nutrition:Array.isArray(flow?.inputs)?'recorded':'unrecorded',combat:telemetry?'recorded':'unrecorded',support:telemetry?'recorded':'unrecorded',parasitism:'recorded',information:flow?.information?.definition==='information-observed/1'?'recorded':'unrecorded'};
    if(w.turn===0)for(const key of categories)availability[key]='unobserved';
    const edges=new Map(),put=(from,to,type,value=1,extra)=>{
      if(typeof from!=='string'||typeof to!=='string'||!(value>0)||!Number.isFinite(value))return;
      if(!catalogue[to]||!catalogue[from]&&!from.startsWith('@'))return;
      const key=[from,to,type].join('|'),old=edges.get(key);
      if(old){old.value+=value;if(extra?.sources)old.sources=[...new Set([...(old.sources||[]),...extra.sources])].sort();}
      else edges.set(key,{from,to,type,value,...extra});
    };
    if(w.turn>0){
      for(const item of flow?.inputs||[]){
        if(!(item.energy>0)||item.tag==='information')continue;
        if(item.type==='light')put('@light',item.species,'production',item.energy);
        else if(item.type==='carcass')put('@carcass:'+(item.sourceSpecies||'unknown'),item.species,catalogue[item.species]?.group==='fungus'?'decomposition':'scavenging',item.energy);
        else if(item.type==='plant'&&catalogue[item.sourceSpecies])put(item.sourceSpecies,item.species,'feeding',item.energy);
        else if(['resource','soil'].includes(item.type)){
          const kind=item.type==='soil'?'soil':String(item.source||'resource').split(':').at(-1);
          if(kind!=='info')put('@resource:'+kind,item.species,'resource',item.energy);
        }
      }
      for(const [type,field]of [['combat','damage'],['care','care'],['clear','clear']])for(const [key,value]of Object.entries(telemetry?.[field]||{})){const [from,to]=key.split('|');put(from,to,type,value);}
      for(const [key,value]of Object.entries(current.bonds||{})){const [from,to]=key.split('|');put(from,to,'parasitism',value);}
      for(const [key,value]of Object.entries(relations||{})){const [from,to,type]=key.split('|');if(type==='infection')put(from,to,'infection',value);}
      const origins=new Map((w.informationField||[]).map(a=>[a.originId,a]));
      const seen=new Set();
      for(const effect of flow?.information?.effects||[]){
        if(!(effect.deltaAbs>0)||!catalogue[effect.species]||!catalogue[effect.event?.sourceSpecies])continue;
        const origin=origins.get(effect.event.id)||[...origins].filter(([id])=>effect.event.id.startsWith(id+':')).sort((a,b)=>b[0].length-a[0].length)[0]?.[1];
        const held='held:'+effect.event.sourceId,originId=origin?.originId||(effect.event.id.startsWith(held)?held:effect.event.id);
        const key=effect.recipient+'|'+originId;if(seen.has(key))continue;seen.add(key);
        const mediated=!!effect.event.mediated||!!origin?.qEffects?.traces?.length;
        if(mediated){
          // A mediated effect is not credited as an unmodified direct message from its origin.
          if(effect.event.mediated||origin?.qEffects?.traces?.some(t=>t.qId))put('hyperparasite',effect.species,'mediated',1,{sources:[effect.event.sourceSpecies]});
        }else put(effect.event.sourceSpecies,effect.species,'information');
      }
    }
    const counts={...current.counts},biomass=Object.fromEntries(Object.entries(counts).map(([id,count])=>[id,own(current.biomass?.bySpecies,id)?current.biomass.bySpecies[id]:count===0?0:null]));
    const row={definition,turn:w.turn,availability,counts,biomass,edges:[...edges.values()].sort((a,b)=>[a.type,a.from,a.to].join('|').localeCompare([b.type,b.from,b.to].join('|'))),production:{...(flow?.production||{})},kills:{...(telemetry?.kills||{})}};
    if(!validRow(row,w.turn))throw Error('関係図の観測に欠測・不正値があります。');return row;
  }
  function validRow(row,turn){
    if(row?.definition!==definition||row.turn!==turn||!Number.isSafeInteger(turn)||turn<0||!row.counts||!row.biomass||!row.production||!row.kills||!Array.isArray(row.edges)||categories.some(k=>!['recorded','unrecorded','unobserved'].includes(row.availability?.[k])))return false;
    if(Object.keys(row.counts).sort().join('|')!==Object.keys(row.biomass).sort().join('|')||Object.values(row.counts).some(n=>!Number.isSafeInteger(n)||n<0)||Object.values(row.biomass).some(n=>n!==null&&!number(n))||Object.values(row.production).some(n=>!number(n))||Object.values(row.kills).some(n=>!Number.isSafeInteger(n)||n<0))return false;
    const seen=new Set();for(const edge of row.edges){const key=[edge.from,edge.to,edge.type].join('|');if(!types[edge.type]||!number(edge.value)||edge.value===0||(['care','clear','parasitism','infection','information','mediated'].includes(edge.type)&&!Number.isSafeInteger(edge.value))||typeof edge.from!=='string'||typeof edge.to!=='string'||!own(row.counts,edge.to)||(!edge.from.startsWith('@')&&!own(row.counts,edge.from))||seen.has(key)||(edge.sources!==undefined&&(!Array.isArray(edge.sources)||edge.sources.some(s=>typeof s!=='string'))))return false;seen.add(key);}
    return turn>0||row.edges.length===0;
  }
  function validateSnapshot(snapshot){
    const active=enabled(snapshot.metadata?.config),declared=snapshot.definitions?.relationship;
    if(snapshot.metadata?.config?.relationshipModel!==undefined&&!active)throw Error('保存された関係図のモデル版を読み取れません。');
    if(active?(declared!==definition||snapshot.metadata.relationshipDefinition!==definition):(declared!==undefined||snapshot.metadata.relationshipDefinition!==undefined))throw Error('保存された関係図の指標版を読み取れません。');
    for(const row of snapshot.rows)if(active?(!validRow(row.relationship,row.turn)||JSON.stringify(row.relationship.counts)!==JSON.stringify(row.current?.counts)):row.relationship!==undefined)throw Error('保存された関係図観測に欠測・破損があります。');
    if(active?JSON.stringify(snapshot.relationshipIntervals)!==JSON.stringify(intervals(snapshot.rows)):snapshot.relationshipIntervals!==undefined)throw Error('保存された100T関係区間と全ターン原値が一致しません。');
    return true;
  }
  function newBlock(first){return {first,last:first-1,observed:0,coverage:Object.fromEntries(categories.map(k=>[k,0])),edges:new Map(),production:{},kills:{},counts:{},biomass:{},present:new Set(),recorded:false};}
  function leaders(block){
    const values={production:{...block.production},assimilation:{},damage:{},scavenging:{},hosts:{},kills:{}};
    for(const e of block.edges){const target=types[e.type]?.plane===0&&e.type!=='production'?'assimilation':null;if(target)values[target][e.to]=(values[target][e.to]||0)+e.value;if(e.type==='combat')values.damage[e.from]=(values.damage[e.from]||0)+e.value;if(['scavenging','decomposition'].includes(e.type))values.scavenging[e.to]=(values.scavenging[e.to]||0)+e.value;if(e.type==='parasitism')values.hosts[e.to]=(values.hosts[e.to]||0)+e.value;}
    for(const [pair,n]of Object.entries(block.kills)){const id=pair.split('|')[0];values.kills[id]=(values.kills[id]||0)+n;}
    return Object.fromEntries(Object.entries(values).map(([key,data])=>{const entries=Object.entries(data).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])),maximum=entries[0]?.[1];return [key,entries.filter(([,n])=>n===maximum).map(([id,value])=>({id,value}))];}));
  }
  function addRow(block,row){
    block.last=row.turn;block.counts={...row.current?.counts||row.counts};
    const r=row.relationship;
    block.biomass=r?{...r.biomass}:Object.fromEntries(Object.keys(block.counts).map(id=>[id,null]));
    for(const [id,count]of Object.entries(block.counts))if(count>0)block.present.add(id);
    if(row.turn===0)return;
    block.observed++;if(!r)return;block.recorded=true;
    for(const key of categories)if(r.availability[key]==='recorded')block.coverage[key]++;
    for(const e of r.edges){const key=[e.from,e.to,e.type].join('|'),old=block.edges.get(key);if(old){old.value+=e.value;if(e.sources)old.sources=[...new Set([...(old.sources||[]),...e.sources])].sort();}else block.edges.set(key,{...e});if(!e.from.startsWith('@'))block.present.add(e.from);block.present.add(e.to);}
    for(const [id,n]of Object.entries(r.production))block.production[id]=(block.production[id]||0)+n;
    for(const [id,n]of Object.entries(r.kills))block.kills[id]=(block.kills[id]||0)+n;
  }
  function intervals(rows){
    const blocks=new Map();for(const row of rows){const first=row.turn?Math.floor((row.turn-1)/100)*100+1:1;if(!blocks.has(first))blocks.set(first,newBlock(first));addRow(blocks.get(first),row);}
    return {definition:'relationship-intervals/1',intervalTurns:100,intervals:[...blocks.values()].map(b=>({first:b.first,last:b.last,observed:b.observed,coverage:b.coverage,edges:[...b.edges.values()],counts:b.counts,biomass:b.biomass,production:b.production,kills:b.kills}))};
  }
  const caches=new WeakMap();
  function build(history,turn=history.rows.at(-1)?.turn??0){
    const rows=history?.rows||[];if(!Number.isSafeInteger(turn)||turn<0||turn>=rows.length)throw Error('関係図の参照ターンが範囲外です。');
    let cache=caches.get(rows);if(!cache){cache={processed:0,blocks:new Map(),model:null};caches.set(rows,cache);}
    for(let i=cache.processed;i<rows.length;i++){const row=rows[i],first=row.turn?Math.floor((row.turn-1)/100)*100+1:1;if(!cache.blocks.has(first))cache.blocks.set(first,newBlock(first));addRow(cache.blocks.get(first),row);cache.processed++;cache.model=null;}
    if(cache.model?.turn===turn)return cache.model;
    const first500=turn?Math.floor((turn-1)/500)*500+1:1,first100=turn?Math.floor((turn-1)/100)*100+1:1,blocks=[];
    for(let first=first500;first<=first100;first+=100){
      let block=cache.blocks.get(first);
      if(!block||block.last>turn){block=newBlock(first);for(let i=Math.max(0,first===1?0:first);i<=turn&&i<first+100;i++)addRow(block,rows[i]);}
      const edges=[...block.edges.values()].map(e=>({...e,rate:block.coverage[category(e.type)]?e.value/block.coverage[category(e.type)]:null}));
      blocks.push({...block,edges,coverage:{...block.coverage},counts:{...block.counts},biomass:{...block.biomass},present:[...block.present],production:{...block.production},kills:{...block.kills},complete:block.last===first+99,leaders:leaders({...block,edges})});
    }
    const catalogue=history.metadata?.species||[],order=new Map(catalogue.map((s,i)=>[s.id,i])),ids=new Set(blocks.flatMap(b=>b.present));
    const species=[...ids].sort((a,b)=>(order.get(a)??999)-(order.get(b)??999)||a.localeCompare(b));
    const maximum={},maxB=Math.max(0,...blocks.flatMap(b=>Object.values(b.biomass).filter(number)));
    for(const b of blocks)for(const e of b.edges)maximum[e.type]=Math.max(maximum[e.type]||0,e.rate||0);
    const current=blocks.at(-1),past=blocks.slice(0,-1);while(past.length<4)past.push(null);
    const recent=newBlock(Math.max(1,turn-49));
    for(let i=Math.max(0,turn-49);i<=turn;i++)addRow(recent,rows[i]);
    const overview={...recent,edges:[...recent.edges.values()].map(e=>({...e,rate:recent.coverage[category(e.type)]?e.value/recent.coverage[category(e.type)]:null})),present:[...recent.present]};
    overview.leaders=leaders(overview);
    const model={definition:viewDefinition,turn,first:first500,last:first500+499,current,past,overview,species,maximum,maxB,catalogue,missing:!current.recorded&&turn>0,initial:turn===0};
    cache.model=model;return model;
  }
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=value=>value===null?'未記録':value===0?'0':value<.01?'<0.01':Number(value.toFixed(value<10?2:1)).toLocaleString('ja-JP');
  const resourceName=id=>id==='@light'?'光':id.startsWith('@carcass:')?'死骸':({'mineral':'鉱物','droplet':'水分','organic':'有機物','soil':'土壌','seed':'種子','spore':'胞子','egg':'卵'})[id.split(':').at(-1)]||'資源';
  function renderSections(model,{symbols={},colors={},species=model.catalogue||[]}={},includePast=true){
    const catalogue=Object.fromEntries(species.map(s=>[s.id,s])),name=id=>catalogue[id]?.name||resourceName(id),color=id=>colors[id]||'#c7d9d7';
    // One compact canonical layout belongs to the whole displayed500T window.
    // Absent catalogue members reserve no space; extinct participants stay in model.species.
    const allIds=[...model.species],resources=[...new Set([model.current,...model.past.filter(Boolean)].flatMap(b=>b.edges.filter(e=>e.from.startsWith('@')).map(e=>e.from)))].sort();
    const cols=6,rows=Math.max(2,Math.ceil((allIds.length+resources.length)/cols)),width=960,height=52+rows*34,gap=16,planeWidth=(width-gap*2)/3,positions=new Map();
    [...allIds,...resources].forEach((id,slot)=>positions.set(id,{x:30+(slot%cols)*48,y:52+Math.floor(slot/cols)*34}));
    function diagram(block,mini,index){
      if(!block)return '<div class="relationship-past relationship-unobserved" data-network-unobserved><span>未観測</span></div>';
      const title=mini?(block.last===0?'初期構成':`${block.first}–${block.first+99}T`):'現在の関係';
      const paths=[],nodes=[],correspondence=[],labels=[],labelBoxes=[];
      const currentEdges=block.edges.filter(e=>e.rate>0),labelled=new Set();
      for(const type of Object.keys(types))for(const e of currentEdges.filter(e=>e.type===type).sort((a,b)=>b.rate-a.rate||[a.from,a.to].join('|').localeCompare([b.from,b.to].join('|'))).slice(0,mini?0:2))labelled.add(e);
      for(let plane=0;plane<3;plane++){
        const ox=plane*(planeWidth+gap);paths.push(`<rect x="${ox+1}" y="29" width="${planeWidth-2}" height="${height-35}" rx="9" fill="#08252d" fill-opacity=".75" stroke="#42616a" stroke-opacity=".65"/><text x="${ox+14}" y="18" fill="#c7e5e0" font-size="14">${planes[plane]}</text>`);
        for(const e of currentEdges.filter(e=>types[e.type].plane===plane)){
          const a=positions.get(e.from),b=positions.get(e.to);if(!a||!b)continue;
          const style=types[e.type],strength=model.maximum[e.type]>0?e.rate/model.maximum[e.type]:0,line=1+4*Math.sqrt(strength),x1=ox+a.x,y1=a.y-3,x2=ox+b.x,y2=b.y-3;
          let d,lx,ly;if(e.from===e.to){d=`M${x1-8},${y1-4} C${x1-27},${y1-37} ${x1+27},${y1-37} ${x1+8},${y1-4}`;lx=x1;ly=y1-29;}
          else{const dx=x2-x1,dy=y2-y1,norm=Math.hypot(dx,dy),sx=x1+dx/norm*12,sy=y1+dy/norm*12,tx=x2-dx/norm*14,ty=y2-dy/norm*14,bend=Math.min(26,norm*.18)*(e.from<e.to?1:-1),cx=(sx+tx)/2-dy/norm*bend,cy=(sy+ty)/2+dx/norm*bend;d=`M${sx},${sy} Q${cx},${cy} ${tx},${ty}`;lx=(sx+2*cx+tx)/4;ly=(sy+2*cy+ty)/4-3;}
          const value=e.type==='parasitism'?'平均'+fmt(e.rate)+'群':fmt(e.value)+' '+style.unit,description=`${name(e.from)} → ${name(e.to)} / ${style.name} ${value}`;
          paths.push(`<path data-network-edge="${esc(e.type)}" data-from="${esc(e.from)}" data-to="${esc(e.to)}" data-value="${e.value}" d="${d}" fill="none" stroke="${style.color}" stroke-width="${line.toFixed(2)}" opacity=".78"${style.dash?` stroke-dasharray="${style.dash}"`:''} marker-end="url(#relationship-arrow-${index}-${e.type})"><title>${esc(description)}</title></path>`);
          if(labelled.has(e)){
            const labelWidth=Math.max(30,value.length*5.5),candidates=[0,-10,10,-20,20].map(dy=>({x:lx,y:ly+dy,w:labelWidth,h:13}));
            const placed=candidates.find(a=>a.x-a.w/2>ox+5&&a.x+a.w/2<ox+planeWidth-5&&a.y>40&&a.y<height-8&&!labelBoxes.some(b=>Math.abs(a.x-b.x)<(a.w+b.w)/2+4&&Math.abs(a.y-b.y)<14)&&![...positions.values()].some(p=>Math.abs(a.x-(ox+p.x))<a.w/2+11&&a.y>p.y-15&&a.y<p.y+22));
            if(placed){labelBoxes.push(placed);labels.push(`<text x="${placed.x}" y="${placed.y}" text-anchor="middle" fill="${style.color}" font-size="9" paint-order="stroke" stroke="#061b23" stroke-width="3" stroke-linejoin="round">${esc(value)}</text>`);}
          }
        }
        for(const id of [...allIds,...(plane===0?resources:[])]){
          const p=positions.get(id),x=ox+p.x,y=p.y,B=block.biomass[id],count=block.counts[id],present=block.present.includes(id),active=block.edges.some(e=>types[e.type].plane===plane&&(e.from===id||e.to===id)),resource=id.startsWith('@');
          const alive=count>0,fill=color(id),radius=number(B)&&B>0&&model.maxB>0?Math.sqrt(B/model.maxB)*18:0;
          if(!resource&&radius)nodes.push(`<ellipse data-network-base="${esc(id)}" data-biomass="${B}" data-area-scale="${model.maxB}" cx="${x}" cy="${y+7}" rx="${radius}" ry="${radius*.36}" fill="${fill}" opacity="${alive?.22:.08}"/>`);
          const symbol=resource?symbols[id==='@light'?'solar':id.startsWith('@carcass:')?'organic':id.split(':').at(-1)]||symbols.mineral:symbols[id];
          if(!symbol)throw Error('盤面記号が未接続です: '+id);
          nodes.push(`<g data-network-node="${esc(id)}" data-plane="${plane}" opacity="${resource||active?1:alive?.65:.25}"><title>${esc(name(id)+(resource?'':` / ${count??'未記録'}記録 / B ${fmt(B??null)}${!alive&&present?' / 区間末に消失':''}`))}</title><path d="${esc(symbol)}" transform="translate(${x},${y-3}) scale(8)" fill="none" stroke="${fill}" stroke-width=".17" stroke-linecap="round" stroke-linejoin="round"/>${!mini?`<text x="${x}" y="${y+14}" fill="${fill}" text-anchor="middle" font-size="8.5">${esc(name(id).slice(0,5))}${!alive&&!resource&&present?'†':''}</text>`:''}</g>`);
          if(plane<2&&!resource)correspondence.push(`<path d="M${x+10},${y-3} H${x+planeWidth+gap-10}" fill="none" stroke="#88a8b0" stroke-width=".5" stroke-dasharray="1 5" opacity=".14"/>`);
        }
      }
      const defs=Object.entries(types).map(([type,s])=>`<marker id="relationship-arrow-${index}-${type}" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 1 L6 4 L0 7" fill="none" stroke="${s.color}" stroke-width="1.3"/></marker>`).join('');
      const unrecorded=categories.some(k=>block.coverage[k]<block.observed);
      const roleLabels={production:'生産の中心',assimilation:'採食量',damage:'実損害',scavenging:'死骸利用',hosts:'有効寄生先',kills:'討ち取り'};
      const roleText=!mini?Object.entries(block.leaders||{}).filter(([,items])=>items.length).map(([key,items])=>`<span title="${esc(items.map(a=>name(a.id)+' '+fmt(a.value)).join(' / '))}">${roleLabels[key]}：${esc(items.slice(0,2).map(a=>name(a.id)).join('・'))}${items.length>2?' 他'+(items.length-2)+'系統':''}${items.length>1?'（同率）':''}</span>`).join(''):'';
      return `<section class="${mini?'relationship-past':'relationship-main'}" data-network-first="${block.first}" data-network-last="${block.last}"><h5>${esc(title)}${unrecorded?' · 未記録を含む':''}</h5><svg class="relationship-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title+' '+planes.join('、'))}"><defs>${defs}</defs>${correspondence.join('')}${paths.join('')}${nodes.join('')}${labels.join('')}</svg>${roleText?`<p class="relationship-role-leaders" data-network-leaders>${roleText}</p>`:''}${block.observed===0?'<p class="relationship-empty">初期構成のみ。成立作用は未観測</p>':!block.recorded?'<p class="relationship-empty">この記録には関係面の原値がありません</p>':!currentEdges.length?'<p class="relationship-empty">現在、成立した関係なし</p>':''}</section>`;
    }
    return {
      current:diagram(model.current,false,'current'),
      past:includePast?model.past.map((b,i)=>diagram(b,true,'past'+i)).join(''):null,
      // Completed intervals remain stable until the layout or shared visual scale changes.
      pastKey:JSON.stringify([allIds,resources,model.maximum,model.maxB,model.past.map(b=>b&&[b.first,b.last])]),
    };
  }
  function render(model,{symbols={},colors={},species=model.catalogue||[]}={}){
    const block=model.overview||model.current,catalogue=Object.fromEntries(species.map(s=>[s.id,s]));
    const name=id=>catalogue[id]?.name||resourceName(id),fill=id=>colors[id]||'#bed4d0';
    const cards=planes.map((plane,planeIndex)=>{
      const edges=block.edges.filter(e=>types[e.type].plane===planeIndex&&e.rate>0).sort((a,b)=>b.rate-a.rate||a.from.localeCompare(b.from));
      const featured=[],taken=new Set();
      for(const type of Object.keys(types).filter(type=>types[type].plane===planeIndex)){
        const e=edges.find(edge=>edge.type===type);if(e&&featured.length<5){featured.push(e);taken.add(e);}
      }
      for(const e of edges)if(featured.length<5&&!taken.has(e)){featured.push(e);taken.add(e);}
      const sources=[...new Set(featured.map(e=>e.from))],targets=[...new Set(featured.map(e=>e.to))],height=featured.length?Math.max(92,48+Math.max(sources.length,targets.length)*28):24,position=(ids,id)=>45+ids.indexOf(id)*28;
      const maxByType=Object.fromEntries(Object.keys(types).map(type=>[type,Math.max(0,...featured.filter(e=>e.type===type).map(e=>e.rate||0))]));
      const marker=Object.entries(types).filter(([,v])=>v.plane===planeIndex).map(([type,v])=>`<marker id="relation-${planeIndex}-${type}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 1 L7 4 L0 7" fill="none" stroke="${v.color}" stroke-width="1.5"/></marker>`).join('');
      const lines=featured.map((e,i)=>{const style=types[e.type],a=position(sources,e.from),b=position(targets,e.to),bend=(i%3-1)*8,thickness=(1.4+2.8*Math.sqrt((e.rate||0)/(maxByType[e.type]||1))).toFixed(2);
        return `<path data-network-edge="${esc(e.type)}" data-from="${esc(e.from)}" data-to="${esc(e.to)}" d="M91 ${a} Q155 ${(a+b)/2+bend} 219 ${b}" fill="none" stroke="${style.color}" stroke-width="${thickness}" opacity=".85"${style.dash?` stroke-dasharray="${style.dash}"`:''} marker-end="url(#relation-${planeIndex}-${e.type})"><title>${esc(name(e.from)+' → '+name(e.to)+' / '+style.name+' '+fmt(e.value)+' '+style.unit+'（直近の合計）')}</title></path>`;
      }).join('');
      const nodes=(ids,x,side)=>ids.map(id=>{const y=position(ids,id),resource=id.startsWith('@'),symbol=resource?symbols[id==='@light'?'solar':id.startsWith('@carcass:')?'organic':id.split(':').at(-1)]||symbols.mineral:symbols[id],leader=Object.values(block.leaders||{}).some(items=>items.some(a=>a.id===id));
        return `<g data-network-node="${esc(id)}" data-network-side="${side}"><title>${esc(name(id)+(resource?'':` / 現在 ${block.counts[id]||0} / B ${fmt(block.biomass[id]??null)}${block.counts[id]===0?' / 現在は消失':''}`))}</title>${leader?`<circle cx="${x}" cy="${y}" r="12" fill="none" stroke="#f1d486" stroke-width="1.3"/>`:''}<circle cx="${x}" cy="${y}" r="9" fill="#08252d" stroke="${fill(id)}" stroke-width="1.2"/><path d="${esc(symbol||symbols.mineral||'M-1 0 H1')}" transform="translate(${x},${y}) scale(6)" fill="none" stroke="${fill(id)}" stroke-width=".18"/><text x="${x}" y="${y+19}" text-anchor="middle" fill="${fill(id)}" font-size="9">${esc(name(id).slice(0,6))}</text></g>`;
      }).join('');
      const note=edges.length>featured.length?`<span class="relationship-more">ほか ${edges.length-featured.length} 関係</span>`:!edges.length?'<span class="relationship-more">成立関係なし</span>':'';
      return `<section class="relationship-card" data-relationship-plane="${planeIndex}"><header><b>${planes[planeIndex]}</b>${note}</header><svg class="relationship-svg" viewBox="0 0 310 ${height}" role="img" aria-label="${planes[planeIndex]}の現在の関係"><defs>${marker}</defs>${featured.length?`<text x="47" y="20" text-anchor="middle" fill="#7eaaa7" font-size="10">作用元</text><text x="263" y="20" text-anchor="middle" fill="#7eaaa7" font-size="10">受け手</text>`:''}${lines}${nodes(sources,47,'source')}${nodes(targets,263,'target')}</svg></section>`;
    }).join('');
    const status=block.observed===0?'初期構成のみ。成立作用は未観測':!block.recorded?'この記録には関係の原値がありません':categories.some(k=>block.coverage[k]<block.observed)?'未記録を含む。欠測は成立なしとして数えません':'';
    return `<div class="relationship-network" data-relationship-network="${viewDefinition}"><div class="relationship-cards">${cards}</div>${status?`<p class="relationship-empty">${status}</p>`:''}<p class="relationship-legend">直近50Tの関係。→ 作用の向き　線色＝作用の種類　太さ＝同作用内の強さ　金の輪＝目立つ系統。記号・線に触れると詳細を表示。</p></div>`;
  }
  return {definition,viewDefinition,types,enabled,createRow,validRow,validateSnapshot,intervals,build,render,renderSections};
});
