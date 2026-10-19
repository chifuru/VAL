'use strict';
module.exports=(name,source)=>{function change(from,to){if(source.split(from).length!==2)throw Error('Aquatic producer contract moved: '+name+'/'+from);source=source.replace(from,to);}
if(name==='catalogue')change('  data.byId = Object.fromEntries',`  data.species.push({id:'phytoplankton',name:'浮遊微藻',group:'plant',slot:'food',tag:'plant',phases:['微小体','分裂体'],life:80,maturity:2,maintenance:.1,birthCooldown:2,initial:[6,8,.5,6],capacity:[20,16,2,6],color:'#73d2bf'});
  data.byId = Object.fromEntries`);
if(name==='state')change('    if (s.id === "algae" || s.id === "waterbug")','    if (s.id === "phytoplankton") return ["shallow","deep"].includes(t.terrain) && t.light > 0;\n    if (s.id === "algae" || s.id === "waterbug")');
if(name==='engine'){change('? 4 * w.tiles[o.cell].light * S.leafFactor(o)','? (s.id === "phytoplankton" ? 8 : 4) * w.tiles[o.cell].light * S.leafFactor(o)');change('        ctx.records.get(o.id).light = ageLight;', '        if(s.id === "phytoplankton")o.photoGrowth=S.round((o.photoGrowth||0)+add);\n        ctx.records.get(o.id).light = ageLight;');}
if(name==='reproduction'){change('if (old === 1 && o.age >= s.maturity && o.E >= 6)', 'if (old === 1 && (s.id === "phytoplankton" ? (o.photoGrowth||0) >= 4 : o.age >= s.maturity) && o.E >= 6)');change('!(s.group === "fungus" ? [1,2,3] : [2,3]).includes(same.length)','!(["fungus","phytoplankton"].includes(s.id) ? [1,2,3] : [2,3]).includes(same.length)');}
if(name==='nutrition')change('s.group === "fungus" ? [1,2,3] : [2,3]','["fungus","phytoplankton"].includes(s.id) ? [1,2,3] : [2,3]');
return source;};
