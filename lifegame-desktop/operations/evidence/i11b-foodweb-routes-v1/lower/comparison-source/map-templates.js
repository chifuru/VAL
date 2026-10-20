(function(root,factory){const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./map-data.js'):root.EcoMapData);
  if(node)module.exports=api;else root.EcoMapTemplates=api;
})(globalThis,function(Data){
  'use strict';
  const terrains=['plain','shallow','deep','rock','mud'],covers=['none','bush','log','boulder'];
  const fail=reason=>{throw Error('MAP_INVALID: '+reason);};
  function resolve(config,D,H,data=Data){
    if(!data||!Array.isArray(data.maps)||!data.maps.length)fail('地形データがありません');
    const seed=config.terrainSeed,expected=config.mapResolved;
    if(typeof seed!=='string'||!seed.isWellFormed())fail('地形初期値');
    const choice=config.mapId||'auto';
    const id=expected?.id||(choice==='auto'?data.maps[Math.floor(H.random(seed,'map/select')*data.maps.length)].id:choice);
    if(choice!=='auto'&&choice!==id)fail('指定地形と保存地形が異なります');
    const map=data.maps.find(m=>m.id===id);if(!map)fail('地形IDがありません');
    const def=map.sizes[config.width+'x'+config.height];if(!def)fail('この地形に対応しない盤面寸法です');
    const n=config.width*config.height,base=[];
    for(const [count,env,terrain,cover] of def.runs){
      if(!Number.isSafeInteger(count)||count<1||base.length+count>n||!D.environments[env]||!terrains.includes(terrain)||!covers.includes(cover))fail('地形セルが破損しています');
      for(let i=0;i<count;i++)base.push({env,terrain,cover,walls:[],soilM:5});
    }
    if(base.length!==n)fail('地形セル数');
    function finish(tiles){for(const t of tiles){t.blocked=t.cover==='boulder';t.light=t.blocked?0:H.round(D.environments[t.env].light*(t.cover==='bush'?.7:t.cover==='log'?.8:1)*(t.terrain==='deep'?.6:1));}return tiles;}
    const valid=tiles=>{
      if(!Array.isArray(def.routes)||def.routes.length<2)return false;
      const occupied=new Set();
      for(const group of def.candidates){
        if(group.cells.some(p=>!Number.isSafeInteger(p)||p<0||p>=n||occupied.has(p)))return false;
        group.cells.forEach(p=>occupied.add(p));
      }
      return def.routes.every(route=>route.cells.length>1&&route.cells.every((p,i)=>{
        const t=tiles[p];if(!t||t.blocked)return false;
        if(route.kind==='water'&&!['deep','shallow'].includes(t.terrain))return false;
        if(route.kind==='land'&&t.terrain==='deep')return false;
        if(!['water','land'].includes(route.kind))return false;
        if(!i)return true;const q=route.cells[i-1];return Math.abs(p%config.width-q%config.width)+Math.abs(Math.floor(p/config.width)-Math.floor(q/config.width))===1;
      }));
    };
    if(!valid(finish(base)))fail('安全な既定配置が成立しません');
    let tiles=structuredClone(base),pattern=[];
    for(let i=0;i<def.candidates.length;i++){
      const g=def.candidates[i],k=Math.floor(H.random(seed,'map/obstacle',0,null,[id,i])*g.patterns.length),v=g.patterns[k];
      if(!v||v.length!==g.cells.length||v.some(c=>!covers.includes(c)))fail('候補パターンが破損しています');
      g.cells.forEach((p,j)=>{tiles[p].cover=v[j];});pattern.push(k);
    }
    let fallback=false;
    if(!valid(finish(tiles))){tiles=structuredClone(base);finish(tiles);pattern=[];fallback=true;}
    const metadata={setVersion:data.version,id,version:map.version,width:config.width,height:config.height,
      dataHash:H.sha256(H.stable(def)),pattern,fallback,terrainHash:H.sha256(H.stable(tiles))};
    if(expected&&H.stable(expected)!==H.stable(metadata))fail('保存した地形の版・配置・指紋が一致しません');
    return {tiles,metadata,name:map.name};
  }
  return {resolve,list:()=>Data.maps.map(({id,name})=>({id,name})),version:Data.version};
});
