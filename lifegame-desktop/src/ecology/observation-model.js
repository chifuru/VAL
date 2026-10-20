/* Isolated ecology profiles shared by the main thread, Worker and replay. */
(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 const api=factory(node?require('./observation-modules.js'):root.EcoObservationModules,
   node?require('./hash.js'):root.EcoHash,node?require('./landscape.js'):root.EcoLandscape);
 if(node)module.exports=api;else root.EcoObservationModel=api;
})(globalThis,function(modules,hash,landscape){
 'use strict';
 const VERSION='advantage-switches/1',keys=['producer','waterbug','hyperparasite'];
 function settings(input){
  if(input!==undefined&&(!input||typeof input!=='object'||Array.isArray(input)))throw Error('優遇条件の形式が不正です。');
  const f={producer:true,waterbug:true,hyperparasite:true,...input};
  if(Object.keys(f).some(k=>!keys.includes(k)&&k!=='version')||keys.some(k=>typeof f[k]!=='boolean')||(f.version!==undefined&&f.version!==VERSION))throw Error('優遇条件の値または版が不正です。');
  return {version:VERSION,...Object.fromEntries(keys.map(k=>[k,f[k]]))};
 }
 function model(input){
  const flags=settings(input),mask=keys.reduce((n,k,i)=>n+(flags[k]?(1<<i):0),0),profile=modules.profiles[mask],cache=new Map();
  function load(id){
   const name=id.replace(/^\.\//,'').replace(/\.js$/,'');
   if(name==='hash')return hash;if(name==='landscape')return landscape;
   if(cache.has(name))return cache.get(name).exports;
   if(profile[name]===undefined)throw Error('Unknown ecology module: '+id);
   const m={exports:{}};cache.set(name,m);modules.functions[profile[name]](load,m);return m.exports;
  }
  const E=load('engine'),create=E.create;
  E.create=config=>{
   if(config.advantageSettings){const recorded=settings(config.advantageSettings);if(keys.some(k=>recorded[k]!==flags[k]))throw Error('保存された優遇条件と計算モデルが一致しません。');}
   const w=create(config);w.config.advantageSettings={...flags};return w;
  };
  return E;
 }
 function install(root){
  const models=new Map();let active;
  const choose=input=>{const flags=settings(input),key=keys.map(k=>+flags[k]).join('');if(!models.has(key))models.set(key,model(flags));return models.get(key);};
  active=choose();
  const data=new Proxy({}, {get:(_,k)=>active.S.D[k],ownKeys:()=>Reflect.ownKeys(active.S.D),getOwnPropertyDescriptor:()=>({enumerable:true,configurable:true})}),
    state=new Proxy({}, {get:(_,k)=>k==='D'?data:active.S[k]}),
    engine=new Proxy({}, {get:(_,k)=>{
      if(k==='S')return state;
      if(k==='activate')return config=>{active=choose(config?.advantageSettings);};
      if(k==='create')return config=>{const next=choose(config.advantageSettings),w=next.create(config);active=next;return w;};
      const value=active[k];
      if(typeof value!=='function')return value;
      return (...args)=>{const w=args[0],target=w?.config?.advantageSettings?choose(w.config.advantageSettings):active;return target[k](...args);};
    }});
  root.EcoData=data;root.EcoState=state;root.EcoEngine=engine;
 }
 return {model,settings,install,VERSION};
});
