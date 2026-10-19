'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const out='operations/evidence/death-motion-v4.2.11',oldModules=require('../'+out+'/before-modules.cjs'),M=require('../src/ecology/observation-model.js'),A=require('../src/ecology/archive.js');
const source=fs.readFileSync('src/ecology/observation-model.js','utf8'),moduleOld={exports:{}};
vm.runInThisContext('(function(require,module){'+source+'\n})')(id=>id==='./observation-modules.js'?oldModules:require(path.resolve('src/ecology',id)),moduleOld);
const checks=[],check=(v,n)=>{assert(v,n);checks.push(n);};let deaths=0,attacks=0,feeds=0;
for(let mask=0;mask<8;mask++){
 const flags={producer:!!(mask&1),waterbug:!!(mask&2),hyperparasite:!!(mask&4)},old=moduleOld.exports.model(flags),E=M.model(flags),config={seed:'telemetry-'+mask,width:16,height:12,initial:24,lineages:'few',landscape:'watershed'};
 let a=old.create(config),b=E.create(config);check(old.fingerprint(a)===E.fingerprint(b),'initial equal profile'+mask);
 for(let turn=0;turn<30;turn++){
  if(turn===3){a.organisms[0].HP=0;b.organisms[0].HP=0;}
  a=old.step(a);b=E.step(b);check(old.fingerprint(a)===E.fingerprint(b),'full biological fingerprint equal '+mask+'/'+turn);check(JSON.stringify(a.stats)===JSON.stringify(b.stats),'statistics equal '+mask+'/'+turn);
  for(const e of b.events){if(e.type==='death'){check(!!e.appearance&&Number.isInteger(e.appearance.phase)&&e.appearance.age>=0,'death carries actual state');deaths++;}if(e.type==='attack'){check(e.actualDamage>=0&&e.mitigated>=0,'attack carries measured results');attacks++;}if(e.type==='feed'){check(['plant','carcass','resource','soil'].includes(e.sourceType),'feed carries actual source class');feeds++;}}
 }
}
const E=M.model(),w=E.create({seed:'death-exact',width:16,height:12,initial:24,lineages:'few'}),o=w.organisms.find(o=>o.slot==='main');o.phase=4;o.branch3=2;o.branch4=1;o.sex='female';o.age=77;o.HP=0;const expected=structuredClone(o),next=E.step(w),event=next.events.find(e=>e.id===o.id&&e.type==='death');
check(event.appearance.phase===4&&event.appearance.branch3===2&&event.appearance.branch4===1&&event.appearance.sex==='female'&&event.appearance.age===78,'death snapshot has exact final phase/branch/sex/age');check(JSON.stringify(event.appearance.dna)===JSON.stringify(expected.dna),'snapshot preserves DNA without mutation');
let stored;const storage={getItem:()=>stored,setItem:(_,v)=>stored=v},oldSig='cbab69c80c0122ff99a6ded0528f10e7c4070652a587aa0468c868678437e7fe',newSig='8119156dc6760f78ba8ab02a683390562e262802fd977d85de27115b15c38c48',legacy=A.create(storage,E,oldSig),record=legacy.capture(w,'user');legacy.save(record);check(A.create(storage,E,newSig).replay(record.id).signature===oldSig,'known presentation-only legacy signature remains playable');assert.throws(()=>A.create(storage,E,'unrecognized').replay(record.id));check(true,'unknown replay signatures remain rejected');
check(deaths>0&&attacks>0&&feeds>0,'old/new comparison exercised death attack and feeding');fs.writeFileSync(out+'/model-report.json',JSON.stringify({checks,profiles:8,turnsPerProfile:30,deaths,attacks,feeds,biologicalStateEqual:true},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,deaths,attacks,feeds}));
