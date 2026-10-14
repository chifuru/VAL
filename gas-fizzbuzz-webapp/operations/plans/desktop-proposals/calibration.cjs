'use strict';
const fs=require('node:fs');
const E=require('/workspace/VAL/gas-fizzbuzz-webapp/src/composite/creature-engine.js');
const counts={fizz:0,buzz:0,fizzbuzz:0,number:0},modifiers={promote:0,inhibit:0};
let energyQuarters=0,modifier=0;
const oldCrossings={},proposedCrossings={},milestones=[];
for(let n=1;n<=1000;n++){
 const kind=E.kindFor(E.fmtFizzBuzz(n));counts[kind]++;
 if(kind==='number'){
  modifier=E.modifierFor(n);modifiers[modifier>0?'promote':'inhibit']++;
 }else{energyQuarters+=4+modifier;modifier=0;}
 for(const t of [10,35,100])if(!oldCrossings[t]&&energyQuarters>=4*t)oldCrossings[t]=n;
 for(const t of [28,62,100])if(!proposedCrossings[t]&&energyQuarters*100>=t*1801)proposedCrossings[t]=n;
 if([1,15,100,250,280,500,621,750,850,1000].includes(n))milestones.push({n,energyQuarters,energy:energyQuarters/4,P:100*energyQuarters/1801,phase:energyQuarters*100>=62*1801?3:energyQuarters*100>=28*1801?2:1});
}
const result={scope:'read-only calibration proposal, not migrated game implementation',input:'FizzBuzz 1..1000 with current remainder regulation and next-nutrient-only modifier',counts,modifiers,energyQuarters1000:energyQuarters,rawEnergy1000:energyQuarters/4,oldCrossings,proposedCrossings,milestones};
fs.writeFileSync('/tmp/valis-desktop-calibration.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
