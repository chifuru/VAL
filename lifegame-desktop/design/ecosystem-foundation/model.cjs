/* Isolated comparison model. Reads production sources; never edits or replaces them. */
"use strict";
const fs=require("node:fs"),path=require("node:path"),Module=require("node:module");
const root=path.resolve(__dirname,"../../src/ecology");
function model(flags={food:true,budget:true,routes:true,foundation:true}){
  const cache=new Map();
  function replace(source,from,to){return require("../source-replace.cjs")(source,from,to,"Trial source contract");}
  function load(name){
    if(cache.has(name))return cache.get(name).exports;
    const file=path.join(root,name+".js"),m=new Module(file,module);cache.set(name,m);m.filename=file;m.paths=module.paths;
    let source=fs.readFileSync(file,"utf8");

    if(name==="state"&&flags.food){
      const start=source.indexOf('    // Allocate within each group only;'),end=source.indexOf('    let mains =',start);if(start<0||end<0)throw Error("Food allocator moved");
      source=source.slice(0,start)+`
    for(const p of usable){
      const t=w.tiles[p], choices=D.species.filter(s=>["plant","fungus","prey"].includes(s.group)&&config.enabled[s.group]&&validHabitat(w,s,p));
      let u=r(w,"trial/food-founder",0,null,p),sum=0;
      for(const s of choices){
        const rate=s.id==="algae"?.28:s.id==="moss"?.22:s.id==="grass"?(["plain","mud"].includes(t.terrain)?.2:.035):s.id==="fungus"?([5,7].includes(t.env)?.07:.035):s.id==="waterbug"?.12:.075;
        sum+=rate;if(u>=sum)continue;
        const id="i:food:"+Math.floor(p/config.width)+":"+(p%config.width)+":"+s.id;
        const age=Math.floor(r(w,"trial/founder-age",0,id)*s.life*.6);
        w.organisms.push(organism(w,s,p,id,{age}));occupied.add(p);break;
      }
    }
`+source.slice(end);
    }
    if(name==="catalogue"&&flags.budget)source=replace(source,'  data.byId =',`  for(const s of data.species)if(s.group==="main"&&s.id!=="kelp")s.maintenance*=({animal:.7,fungal:.7,mineral:.75,general:.8,plant:.85}[s.diet]||.8);
  data.byId =`);
    if(name==="engine"){
      source=replace(source,'          finish(w, ctx);','          finish(w,ctx);if(options.onTurn)options.onTurn(w,ctx);');
      if(flags.budget){if(!source.includes('? 0.1\n              : neighborCount'))source=replace(source,'? 0.5\n              : neighborCount','? 0.1\n              : neighborCount');source=replace(source,'? 1.5 * w.tiles[o.cell].light','? 0.8 * w.tiles[o.cell].light');}
      if(flags.routes)source=replace(source,'    P.mature(w, ctx);','    P.contacts(w,ctx);\n    P.mature(w, ctx);');
    }
    if(name==="behavior"&&flags.budget)source=replace(source,'      (terrain *\n        environmental','      (0.8 * terrain *\n        environmental');
    if(name==="nutrition"){
      if(flags.budget)source=replace(source,'          0.5 *\n            factor *\n            (0.9 + 0.2 * o.dna.aptitude)','          0.6 *\n            factor *\n            (0.9 + 0.2 * o.dna.aptitude)');
      if(flags.routes){source=replace(source,'if (p && (w.config.ecologyRevision === "observation/4.1" ? p.counter >= ({first:4,middle:6,extra:6,terminal:8}[p.stage]) : ["middle", "extra"].includes(p.stage) && p.counter >= 6))','if (p)');source=replace(source,'a.payloadExpires = w.turn + 4;','a.payloadExpires = w.turn + 16;');source=replace(source,'expires: w.turn + 12,','expires: w.turn + 20,');}
    }
    if(name==="reproduction"&&flags.food)source=replace(source,'              : w.config.ecologyRevision === \"observation/4.1\" ? !(s.group === \"fungus\" ? [1,2,3] : [2,3]).includes(same.length) : same.length !== 3','              : s.group === "fungus" ? ![1,2,3].includes(same.length) : same.length !== 3');
    if(flags.foundation)source=require("./transform.cjs")(name,source,flags);
    const normal=m.require.bind(m);m.require=(id)=>/^\.\/[^/]+\.js$/.test(id)?load(id.slice(2,-3)):normal(id);m._compile(source,file);
    if(name==="parasites"&&flags.routes)m.exports=require("./parasite-routes.cjs")(load("state"),m.exports);
    return m.exports;
  }
  const E=load("engine");E.trialFlags={...flags};return E;
}
module.exports={model};
