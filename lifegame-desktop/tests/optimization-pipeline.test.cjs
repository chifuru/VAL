'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const O=require('../src/ecology/observations.js'),E=require('../src/ecology/observation-model.js').model(),P=require('../src/ecology/display-plane.js');
const config={seed:'pipeline-432',width:12,height:12,initial:24,lineages:'few',ageModel:'life/1',ecologyRevision:'observation/4.1',randomModel:'table/1'};
function history(turns=65){let w=E.create(config),h=O.create(w.config,'test',{species:E.S.D.species});for(let t=0;t<=turns;t++){if(t)w=E.step(w);h.append(w);}return h;}
test('rolling relation totals match independent complete-window aggregation including expiration',()=>{
 const h=history();for(const row of h.rows){const window=h.rows.slice(Math.max(0,row.turn-49),row.turn+1),edges={},partners=new Set(),types=new Set(),rates={};
  for(const r of window)if(r.turn>0){for(const [id,n]of Object.entries(r.counts)){rates[id]??={events:0,unitTurns:0};rates[id].unitTurns+=n;}
   const involvement={...r.contactEpisodes};for(const [key,n]of Object.entries(r.relations)){const [from,to,type]=key.split('|');if(type!=='contact'&&type!=='bond')involvement[key]=(involvement[key]||0)+n;if(n>0&&type!=='contact'){edges[key]=(edges[key]||0)+n;partners.add(from);partners.add(to);types.add(type==='bond'||type==='infection'?'parasitism':type);}}
   for(const [key,n]of Object.entries(involvement)){const [a,b]=key.split('|');if(rates[a])rates[a].events+=n;if(rates[b])rates[b].events+=n;}
  }
  assert.deepEqual(row.current.relations.edges,edges);assert.equal(row.current.relations.species,partners.size);
  for(const [id,r]of Object.entries(rates)){assert.equal(row.rates[id].events,r.events);assert.equal(row.rates[id].unitTurns,r.unitTurns);}
 }
});
test('CSV chunks preserve every row and captured export boundary',()=>{const h=history(3);assert.equal([...h.csvChunks(1)].join(''),h.csv());assert.equal([...h.csvChunks(2)].join(''),h.csv());h.markExported(1);assert(h.unexported);h.markExported();assert(!h.unexported);assert(h.csv().includes('"3","population"'));});
test('spatial buckets retain crossing boundaries and stable input order',()=>{const items=[{id:'negative',box:[-5,-5,-1,-1]},{id:'cross',box:[-1,-1,7,7]},{id:'edge',box:[4,4,4,4]},{id:'far',box:[20,20,21,21]}],query=P.spatial(items,o=>o.box);assert.deepEqual(query([4,4,5,5]).map(o=>o.id),['cross','edge']);assert.deepEqual(query([-4,-4,-3,-3]).map(o=>o.id),['negative','cross']);});
test('export Worker and cooperative fallback preserve JSON/CSV data',async()=>{
 const h=history(3),root=path.resolve('src/ecology'),context={Blob,setTimeout,clearTimeout,EcoObservations:O};vm.createContext(context);vm.runInContext(fs.readFileSync(root+'/export-client.js','utf8'),context);
 const workerFactory=()=>{const worker={terminate(){},onmessage:null},scope={Blob,EcoObservations:O,importScripts(){},postMessage(data){setImmediate(()=>worker.onmessage({data:structuredClone(data)}));}};vm.createContext(scope);vm.runInContext(fs.readFileSync(root+'/export-worker.js','utf8'),scope);worker.postMessage=data=>setImmediate(()=>scope.onmessage({data:structuredClone(data)}));return worker;};
 for(const options of [{workerFactory},{workerFactory:()=>{throw Error('unavailable');}}]){const csv=await context.EcoExport.csv(h,options);assert.equal(Buffer.from(await csv.arrayBuffer()).toString("utf8"),h.csv());const record={id:'test',turn:3,config:h.metadata.config,observation:h.snapshot()};const json=await context.EcoExport.json(record,options);assert.deepEqual(JSON.parse(await json.text()),record);}
});
