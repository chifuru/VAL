"use strict";
const fs=require('node:fs'),path=require('node:path'),base=require('../ecosystem-foundation/transform.cjs');
module.exports=(name,source,flags)=>{
 let s=base(name,source,flags);
 if(name==='state'){
  const old=fs.readFileSync(path.join(__dirname,'../ecosystem-foundation/world-body.txt'),'utf8');
  if(!s.includes(old))throw Error('Natural landscape insertion contract changed');
  s=s.replace(old,fs.readFileSync(path.join(__dirname,'world-body.txt'),'utf8'));
 }
 if(name==='behavior'){
  const edit=(a,b)=>{if(!s.includes(a))throw Error('Friendship contract: '+a);s=s.replace(a,b);};
  edit('  const phaseA =',`  function friendly(a,b){
    return a.species===b.species || ['solar|kelp','kelp|solar'].includes(a.species+'|'+b.species);
  }
  const phaseA =`);
  edit('target.species !== o.species &&','!friendly(o,target) &&');
  edit('t.species !== o.species &&','!friendly(o,t) &&');
  edit('        target.HP <= 0 ||','        target.HP <= 0 || friendly(o,target) ||');
 }
 return s;
};
