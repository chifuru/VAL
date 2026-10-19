'use strict';
const path=require('node:path');
module.exports=function(name,source){
 const change=(from,to)=>{if(source.split(from).length!==2)throw Error('Producer support source contract moved: '+from);source=source.replace(from,to);};
 if(name==='engine'){
  change('  function prepare(w, ctx) {','  const ProducerSupport=require('+JSON.stringify(path.join(__dirname,'support.cjs'))+');\n  function prepare(w, ctx) {');
  change('    w.turn++;\n    const ctx = context(w, options.observeId);','    w.turn++;\n    ProducerSupport.begin(w,S);\n    const ctx = context(w, options.observeId);');
  change('      const ageLight=S.round(light*p.ageFactors.light*(w.config.solarScale || 1));','      const ageLight=S.round(light*p.ageFactors.light*(w.config.solarScale || 1)*ProducerSupport.factor(w,o,S));');
  change('  function finish(w, ctx) {','  function finish(w, ctx) {\n    ProducerSupport.finish(w,ctx,S);');
  change('return {turn:w.turn,relations:', 'return {...(w.producerSupport?{environmentEstablished:{...w.producerSupport.last.established}}:{}),turn:w.turn,relations:');
  change('totals.E + w.ledger.sinks - w.ledger.initialE - w.ledger.solar,','totals.E + w.ledger.sinks - w.ledger.initialE - w.ledger.solar - (w.ledger.producerE||0),');
  change('    const totals = S.totals(w),','    if(w.producerSupport && [w.ledger.producerE,w.ledger.producerM].some(v=>!Number.isFinite(v)||v<0))errors.push("PRODUCER_LEDGER");\n    const totals = S.totals(w),');
  change('Merror = S.round(totals.M + w.ledger.Mloss - w.ledger.initialM);','Merror = S.round(totals.M + w.ledger.Mloss - w.ledger.initialM - (w.ledger.producerM||0));');
 }
 if(name==='nutrition'){
  change('    const list = [];','    const list = [];\n    if(plant && ProducerSupport.factor(w,o,S)===0)return list;');
  change('  function investAndDrops(w, ctx) {','  const ProducerSupport=require('+JSON.stringify(path.join(__dirname,'support.cjs'))+');\n  function investAndDrops(w, ctx) {');
  change('              o.E - keep,','              (s.group === "plant" && ProducerSupport.factor(w,o,S)===0) ? 0 : o.E - keep,');
  change('ctx.deaths.push({ species: o.species, reason,','ctx.deaths.push({ species: o.species, reason, ...(o.producerReserve===0?{environmentCause:"basal-nutrition-exhausted"}:{}),');
 }
 if(name==='reproduction'){
  change('  function eligible(w, o, ctx, asexual = false) {','  const ProducerSupport=require('+JSON.stringify(path.join(__dirname,'support.cjs'))+');\n  function eligible(w, o, ctx, asexual = false) {');
  change('    if(p?.ageStage === "juvenile")return false;','    if(p?.ageStage === "juvenile" || (s.group === "plant" && ProducerSupport.factor(w,o,S)===0))return false;');
 }
 return source;
};
