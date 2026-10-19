'use strict';
module.exports=(name,source)=>{function change(from,to){if(source.split(from).length!==2)throw Error('Favored preset contract moved: '+name+'/'+from);source=source.replace(from,to);}
if(name==='catalogue')change('  data.byId = Object.fromEntries',`  for(const s of data.species){if(s.group==='plant'){Object.assign(s,{life:2400,maintenance:.02,birthCooldown:1,initial:[12,s.id==='phytoplankton'?16:20,1,12],capacity:[32,48,4,12]});}if(s.id==='waterbug')Object.assign(s,{life:600,maturity:2,maintenance:.03,birthCooldown:1,initial:[12,4,0,40],capacity:[24,8,2,40]});}
  data.byId = Object.fromEntries`);
if(name==='state'){
change('const resolved=Landscape.templates.resolve(config,D,H);','const resolved=Landscape.templates.resolve(config,D,H);');
change('    const usable = w.tiles','    for(const t of w.tiles)t.soilM=H.round(t.soilM*3);\n    config.freeAdvantage={version:"favored-free/1",externalSupply:false,producerLife:2400,producerLight:2,soilM:3,waterbugLife:600,waterbugBirth:"B123/E8/cost8",QsearchLife:240,QsearchRange:3};\n    const usable = w.tiles');
change('Math.max(4,Math.min(16,Math.ceil(config.width*config.height/400)))','Math.max(32,Math.min(64,Math.ceil(config.width*config.height/40)))');
change('const candidates=w.organisms.filter(o=>o.slot==="main" && ["plant","general"].includes(D.byId[o.species].diet));','const candidates=w.organisms.filter(o=>o.slot==="main");');
change('q.expires=160;q.E=Math.min(.5,host.E);','q.expires=240;q.E=Math.min(1,host.E);');
}
if(name==='engine')change('s.id === "phytoplankton" ? 8 : 4','s.id === "phytoplankton" ? 16 : 8');
if(name==='behavior')change('s.group === "prey" ? 1 : 0','s.id === "waterbug" ? 8 : s.group === "prey" ? 1 : 0');
if(name==='reproduction'){
change('s.group === "prey" ? 12 : 8','s.group === "prey" && s.id !== "waterbug" ? 12 : 8');
change('? ![2, 3].includes(same.length)', '? !(s.id === "waterbug" ? [1,2,3] : [2,3]).includes(same.length)');
change('!(["fungus","phytoplankton"].includes(s.id) ? [1,2,3] : [2,3]).includes(same.length)','![1,2,3].includes(same.length)');
}
if(name==='nutrition')change('["fungus","phytoplankton"].includes(s.id) ? [1,2,3] : [2,3]','[1,2,3]');
if(name==='parasites'){
change('q.counter >= 8 && q.E >= 0.2','q.counter >= 8 && q.E >= 0.02');
change('q.E = S.round(q.E - 0.2);\n          S.dissipate(w, 0.2);','q.E = S.round(q.E - 0.02);\n          S.dissipate(w, 0.02);');
change('const cost=Math.min(q.E,.001);','const cost=Math.min(q.E,.0001);');
change('S.distance(w,q.cell,o.cell)<=1&&','S.distance(w,q.cell,o.cell)<=3&&');
change('if(moves.length && q.E>.001)', 'if(moves.length && q.E>.0001)');
change('q.E=S.round(q.E-.001);S.dissipate(w,.001);','q.E=S.round(q.E-.0001);S.dissipate(w,.0001);');
change('child.expires=w.turn+40;','child.expires=w.turn+240;');
}
return source;};
