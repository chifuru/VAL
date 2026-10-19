'use strict';
const DEFAULTS={enabled:true,land:{nutrition:1,capacity:.35,regrowth:1},water:{nutrition:1,capacity:.35,regrowth:1},grace:20,establishment:.1,targetE:8,targetM:.5,schedule:[]};
function settings(input={}){
 const unknown=(o,keys)=>{for(const k of Object.keys(o))if(!keys.includes(k))throw Error('Unknown producer support option: '+k);};
 const number=(v,min,max)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('Invalid producer support number');return v;};
 unknown(input,Object.keys(DEFAULTS));const c=structuredClone(DEFAULTS);if(input.enabled!==undefined){if(typeof input.enabled!=='boolean')throw Error('Invalid enabled flag');c.enabled=input.enabled;}
 for(const region of ['land','water']){if(input[region]!==undefined){unknown(input[region],['nutrition','capacity','regrowth']);Object.assign(c[region],input[region]);}number(c[region].nutrition,0,4);number(c[region].capacity,0,1);number(c[region].regrowth,0,4);}
 for(const key of ['grace','establishment','targetE','targetM'])if(input[key]!==undefined)c[key]=input[key];
 number(c.grace,1,1000);number(c.establishment,0,1);number(c.targetE,0,20);number(c.targetM,0,2);
 if(input.schedule!==undefined)c.schedule=structuredClone(input.schedule);
 if(!Array.isArray(c.schedule)||c.schedule.length>32)throw Error('Invalid producer schedule');
 for(const s of c.schedule){unknown(s,['from','to','land','water']);if(!Number.isSafeInteger(s.from)||!Number.isSafeInteger(s.to)||s.from<1||s.to<s.from)throw Error('Invalid producer interval');for(const r of ['land','water'])if(s[r]!==undefined)number(s[r],0,4);}
 for(let i=0;i<c.schedule.length;i++)for(let j=i+1;j<c.schedule.length;j++)if(c.schedule[i].from<=c.schedule[j].to&&c.schedule[j].from<=c.schedule[i].to)throw Error('Overlapping producer intervals');
 return c;
}
function attach(w,input={}){if(w.turn!==0)throw Error('Producer support settings require initial state');const c=settings(input);if(c.enabled)w.config.producerSupport=c;return w;}
const region=(w,cell)=>['shallow','deep'].includes(w.tiles[cell].terrain)?'water':'land';
function level(w,cell){const c=w.config.producerSupport;if(!c?.enabled)return 1;const r=region(w,cell),s=c.schedule.find(s=>s.from<=w.turn&&w.turn<=s.to);return s?.[r]??c[r].nutrition;}
function factor(w,o,S){return S.spec(o).group==='plant'&&w.config.producerSupport?.enabled?level(w,o.cell):1;}
function begin(w,S){
 const c=w.config.producerSupport;if(!c?.enabled)return;
 const plants=S.D.species.filter(s=>s.group==='plant');
 if(!w.producerSupport){
  const sites=[];
  for(let cell=0;cell<w.tiles.length;cell++){
   const r=region(w,cell);if(w.tiles[cell].blocked||S.r(w,'producer/support-site',0,null,cell)>=c[r].capacity)continue;
   const preferred=r==='water'?['algae','moss','grass']:['grass','moss','algae'];
   const species=preferred.map(id=>plants.find(s=>s.id===id)).find(s=>s&&S.validHabitat(w,s,cell));if(species)sites.push({cell,species:species.id});
  }
  w.producerSupport={version:1,sites,established:{},last:null};w.ledger.producerE=0;w.ledger.producerM=0;
 }
 const state=w.producerSupport,last=state.last={inputE:0,inputM:0,regrownB:0,established:{},births:[],stressed:0};
 function input(o,key,amount){amount=S.round(Math.max(0,amount));o[key]=S.round(o[key]+amount);const ledger=key==='M'?'producerM':'producerE',meter=key==='M'?'inputM':'inputE';w.ledger[ledger]=S.round(w.ledger[ledger]+amount);last[meter]=S.round(last[meter]+amount);}
 const m=S.maps(w);
 for(const site of state.sites){
  const n=level(w,site.cell),light=w.tiles[site.cell].light;if(n<=0||light<=0)continue;
  let o=m.food.get(site.cell);
  if(!o&&S.r(w,'producer/establish',w.turn,site.species,site.cell)<Math.min(1,c.establishment*n)){
   o=S.organism(w,S.D.byId[site.species],site.cell,'env:producer:'+site.species+':'+w.turn+':'+site.cell,{E:0,B:0,M:0,phase:1,age:0});
   o.origin={kind:'environment',turn:w.turn,cell:site.cell};o.producerReserve=1;
   input(o,'E',6);input(o,'B',S.PLANT_BASE);input(o,'M',.2);w.organisms.push(o);m.food.set(site.cell,o);
   state.established[o.species]=(state.established[o.species]||0)+1;last.established[o.species]=(last.established[o.species]||0)+1;last.births.push({id:o.id,species:o.species,cell:o.cell});
  }
  if(!o||S.spec(o).group!=='plant')continue;
  const p=S.phenotype(w,o),fraction=Math.min(1,n),energy=Math.min(1,Math.max(0,light));
  input(o,'E',Math.max(0,Math.min(c.targetE,p.capE)-o.E)*fraction*energy);
  input(o,'M',Math.max(0,Math.min(c.targetM,p.capM)-o.M)*fraction);
  const b=S.round(Math.max(0,Math.min(c[region(w,o.cell)].regrowth*n*energy,p.capB-o.B)));input(o,'B',b);last.regrownB=S.round(last.regrownB+b);
 }
 for(const o of w.organisms)if(S.spec(o).group==='plant'){
  const n=level(w,o.cell)*(w.tiles[o.cell].light>0?1:0);o.producerReserve=S.round(S.clamp((o.producerReserve??1)+(Math.min(1,n)-.5)*2/c.grace,0,1));
  if(o.producerReserve===0){o.HP=S.round(Math.max(0,o.HP-1));last.stressed++;}
 }
}
function finish(w,ctx,S){
 if(!w.producerSupport)return;w.demography??={};
 for(const o of w.producerSupport.last.births){const k=o.species+'|0',a=w.demography[k]??={species:o.species,generation:0,initial:0,born:0,matured:0,reproduced:0,juvenileDeaths:0};a.environmentEstablished=(a.environmentEstablished||0)+1;S.record(ctx,o,'establishment',{origin:'environment'});}
}
module.exports={settings,attach,region,level,factor,begin,finish};
