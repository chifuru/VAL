"use strict";
// Reproduce the private survival/2 comparison from baseline48876e7, not the
// adopted survival/3 implementation. No full historical source is duplicated.
module.exports=source=>{
  const change=(from,to)=>{if(source.split(from).length!==2)throw Error("I11c private candidate boundary changed: "+from);source=source.replace(from,to);};
  change('const preference=host=>host.infection?.location==="external"?(q.hyper.preference?.[host.infection.species]??.5)*informationHostFactor(w,q,host.infection.species):.5;', 'const preference=host=>host.infection?.location==="external"?(w.config.balanceModel==="survival/2"?1:0)+(q.hyper.preference?.[host.infection.species]??.5)*informationHostFactor(w,q,host.infection.species):.5;');
  change('readyToLay=q.E>=z.eggCost&&q.ready<=w.turn?1:.15,\n          score=cell=>{', 'readyToLay=q.E>=z.eggCost&&q.ready<=w.turn?1:.15,\n          exploring=v2&&(!cue||(cue.infection?.location!=="external"&&S.distance(w,q.cell,cue.cell)===0))&&q.hyper.starvationRun===0&&q.E>=2*z.maintenance[4]+z.adultMoveCost,\n          score=cell=>{');
  change('approach=cue?(3-S.distance(w,cell,cue.cell))/3:0,','approach=cue&&!exploring?(3-S.distance(w,cell,cue.cell))/3:0,');
  change('threat(cell)*(.65+learned)+(places?.get(cell).value||0)*.1-movement*.1;','threat(cell)*(.65+learned)+(places?.get(cell).value||0)*.1-movement*.1+(exploring&&cell!==q.cell?.02:0);');
  return source;
};
