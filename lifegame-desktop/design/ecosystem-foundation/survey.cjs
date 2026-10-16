"use strict";
const fs=require('node:fs'),path=require('node:path'),{observe}=require('./observe.cjs'),{model}=require('./model.cjs');
const S=model().S,seed=process.argv[2]||'foundation-natural-a',ticks=Number(process.argv[3]||1000),width=Number(process.argv[4]||80),height=Number(process.argv[5]||56),initial=Number(process.argv[6]||320);
const weights=Object.fromEntries(S.D.main.slice(0,20).map(s=>[s.id,1+Math.floor(S.r({config:{seed}},'foundation/initial-weight',0,s.id)*4)]));
const r=observe('foundation',{seed,width,height,initial,distribution:'weighted',weights},ticks),out=path.resolve('operations/evidence/ecosystem-foundation-v2/survey');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,seed+'.world.json'),JSON.stringify(r.world));delete r.world;fs.writeFileSync(path.join(out,seed+'.json'),JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify({seed,richness:r.richness,final:r.snapshots.at(-1),wallMs:r.wallMs}));
