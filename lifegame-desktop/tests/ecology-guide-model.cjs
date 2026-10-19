'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),M=require('../src/ecology/observation-model.js'),Maps=require('../src/ecology/map-templates.js'),Data=require('../src/ecology/map-data.js'),H=require('../src/ecology/hash.js');
const out='operations/evidence/ecology-guide-v4.2.17',routes=[];
for(const map of Data.maps)for(const def of Object.values(map.sizes))for(const seed of ['guide/one','guide/two']){
 const E=M.model(),c={width:def.width,height:def.height,mapId:map.id,terrainSeed:seed},w={config:c,tiles:Maps.resolve(c,E.S.D,H).tiles};
 for(const route of def.routes)for(let i=1;i<route.cells.length;i++){assert(E.S.oneStep(w,route.cells[i-1],route.cells[i]));if(route.kind==='land')assert.notEqual(w.tiles[route.cells[i]].terrain,'deep');}
 routes.push({map:map.id,width:def.width,height:def.height,seed,routes:def.routes.length});
}
const profiles=[];
for(const favored of [false,true]){
 const E=M.model({hyperparasite:favored}),w=E.create({seed:'guide-boundary',width:16,height:12,initial:24,lineages:'few',ageModel:'life/1',ecologyRevision:'observation/4.1'}),o=w.organisms.find(o=>o.slot==='main'&&o.species!=='swarm');
 Object.assign(o,{phase:1,birthLife:1000,age:200,HP:100,E:100,M:10,birthReady:0});assert(E.R.eligible(w,o,E.context(w)),'mature phase I can breed');Object.assign(o,{phase:4,age:0});assert(!E.R.eligible(w,o,E.context(w)),'juvenile phase IV cannot breed');
 const p={stage:'terminal',matureAt:10};for(const [turn,expected]of [[10,false],[11,true],[13,true],[14,false]]){w.turn=turn;assert.equal(E.P.windowOpen(w,p),expected);}
 const cell=o.cell,original=w.tiles[cell].terrain;w.tiles[cell].terrain='deep';const deep=E.B.moveCost(w,o,cell);w.tiles[cell].terrain='shallow';const shallow=E.B.moveCost(w,o,cell);assert(Number.isFinite(deep)&&deep>0&&Number.isFinite(shallow)&&shallow>0);w.tiles[cell].terrain=original;
 const parasite=E.S.infection(w,'leafparasite',o.id,0),q=E.S.hyper(w,parasite.id,0);parasite.q=q;o.infection=parasite;q.E=1;
 for(let i=0;i<(favored?1:4);i++){const c=E.context(w);c.byParasite.get(parasite.id).qFull=true;E.P.mature(w,c);}assert.equal(q.phase,2);
 for(let i=0;i<(favored?2:8);i++){const c=E.context(w);c.byParasite.get(parasite.id).qFull=true;E.P.mature(w,c);}assert.equal(q.phase,3);assert.equal(q.E,favored?.98:.8);
 profiles.push({Qgrowth:{first:favored?1:4,second:favored?2:8,cost:favored?.02:.2},Qadvantage:favored,maturePhaseIEligible:true,juvenilePhaseIVIneligible:true,Qwindow:'matureAt+1..+3 only',deepCost:deep,shallowCost:shallow});
}
fs.writeFileSync(out+'/model-report.json',JSON.stringify({routeConditions:routes.length,routes,profiles,scope:'Authored routes and direct rule boundaries only; not all-land connectivity, long-term survival or balance certification'},null,2)+'\n');console.log(JSON.stringify({routeConditions:routes.length,profiles:profiles.length,passed:true}));
