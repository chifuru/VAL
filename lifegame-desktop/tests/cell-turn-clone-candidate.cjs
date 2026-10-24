'use strict';
// Rejected optimization experiment, for explicit benchmark use only.
// This is not a supported general-purpose clone or production import.
module.exports = function cloneTurnData(source, nativeClone = structuredClone) {
  const fallback={},seen=new Map(),sources=[],copies=[],depths=[];
  function copy(value,depth){
    if(value===null||typeof value!=="object"){
      if(typeof value==="function"||typeof value==="symbol")throw fallback;
      return value;
    }
    if(seen.has(value))return seen.get(value);
    const array=Array.isArray(value),prototype=Object.getPrototypeOf(value);
    if(depth>128||!array&&prototype!==Object.prototype&&prototype!==null)throw fallback;
    const result=array?new Array(value.length):{};
    seen.set(value,result);sources.push(value);copies.push(result);depths.push(depth);
    return result;
  }
  try{
    const result=copy(source,0);
    for(let i=0;i<sources.length;i++)for(const key of Object.keys(sources[i])){
      const descriptor=Object.getOwnPropertyDescriptor(sources[i],key);
      if(!descriptor||!Object.hasOwn(descriptor,"value"))throw fallback;
      const value=copy(descriptor.value,depths[i]+1);
      if(key==="__proto__")Object.defineProperty(copies[i],key,{value,writable:true,enumerable:true,configurable:true});
      else copies[i][key]=value;
    }
    return result;
  }catch{
    return nativeClone(source);
  }
};
