"use strict";
// Offline authoring only: runtime loads these exact size-specific cells.
const fs = require("node:fs"), path = require("node:path");
const definitions = [["river","蛇行河川"],["lake","湖沼"],["wetland","湿地"],
  ["ridge","岩地"],["woodland","疎林平原"],["basin","盆地"]];
function author(id,W,H) {
  const tiles=[];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++) {
    const u=x/(W-1),v=y/(H-1),s=Math.sin, e=Math.exp;
    const river=Math.abs(u-(.48+.15*s(v*7)+.045*s(v*19)));
    const lake=((u-.49)/.28)**2+((v-.51)/.31)**2;
    const wave=s(u*9+v*3)*s(v*8-u*2);
    let wet=0,rock=0,wood=0;
    if(id==='river'){wet=Math.max(0,1-river/.09);rock=e(-((u-.83)**2+(v-.24)**2)/.025);wood=(s(u*12+v*4)+s(v*8))*.25+.5;}
    if(id==='lake'){wet=Math.max(0,1-lake);rock=e(-((u-.16)**2+(v-.2)**2)/.025);wood=.5+.4*s(u*8+v*3);}
    if(id==='wetland'){wet=Math.max(0,.5+.38*wave-Math.abs(u-.48)*.5);rock=0;wood=.5+.3*s(v*10+u*3);}
    if(id==='ridge'){wet=Math.max(0,1-Math.abs(u-(.44+.1*s(v*6)))/.04);rock=Math.max(0,1-Math.abs(u-(.71+.05*s(v*9)))/.2);wood=.3+.25*s(u*10+v*8);}
    if(id==='woodland'){wet=Math.max(0,1-Math.abs(v-(.68+.07*s(u*8)))/.055);rock=e(-((u-.8)**2+(v-.15)**2)/.02);wood=.5+.35*s(u*10+v*4)*s(v*8);}
    if(id==='basin'){wet=Math.max(0,1-(((u-.52)/.21)**2+((v-.55)/.22)**2));rock=Math.max(0,1-Math.abs(Math.sqrt(((u-.5)*1.2)**2+(v-.5)**2)-.43)/.1);wood=.4+.3*s(u*12+v*6);}
    let terrain=wet>.6?'deep':wet>.12?'shallow':wet>0?'mud':rock>.58?'rock':'plain';
    // Declared bank crossing along the upper route, not a random rescue.
    if(y===1&&terrain==='deep')terrain='shallow';
    let env=wet>.12?0:wet>0?5:rock>.58?(v<.4?6:4):wood>.64?7:
      (u>.72&&v>.5)?1:(u<.25&&v>.58)?2:3;
    let cover=terrain==='plain'&&wood>.67?'bush':'none';
    tiles.push({env,terrain,cover});
  }
  const index=(x,y)=>y*W+x, neighbors=p=>{
    const x=p%W,y=Math.floor(p/W);return [x? p-1:-1,x<W-1?p+1:-1,y?p-W:-1,y<H-1?p+W:-1].filter(p=>p>=0);
  };
  const land=Array.from({length:W-2},(_,x)=>index(x+1,1));
  const routes=[{kind:'land',cells:land}];
  const wet=p=>['deep','shallow'].includes(tiles[p].terrain),seen=new Set();let largest=[];
  for(let p=0;p<tiles.length;p++)if(wet(p)&&!seen.has(p)){
    const q=[p];seen.add(p);for(let i=0;i<q.length;i++)for(const n of neighbors(q[i]))if(wet(n)&&!seen.has(n)){seen.add(n);q.push(n);}
    if(q.length>largest.length)largest=q;
  }
  if(largest.length<2)throw Error(id+' has no water route');
  const start=Math.min(...largest),end=Math.max(...largest),q=[start],parents=new Map([[start,null]]);
  for(let i=0;i<q.length&&!parents.has(end);i++)for(const n of neighbors(q[i]))if(wet(n)&&!parents.has(n)){parents.set(n,q[i]);q.push(n);}
  const water=[];for(let p=end;p!==null;p=parents.get(p))water.push(p);water.reverse();routes.push({kind:'water',cells:water});
  const protectedCells=new Set(routes.flatMap(r=>r.cells)),used=new Set(),candidates=[];
  // Sparse, authored candidate groups; all other cells remain fixed.
  for(let y=4;y<H-3;y+=Math.max(4,Math.floor(H/6)))for(let x=4;x<W-3;x+=Math.max(5,Math.floor(W/7))){
    const cells=[index(x,y),index(x+1,y)];
    if(cells.some(p=>protectedCells.has(p)||used.has(p)||['deep','shallow'].includes(tiles[p].terrain)))continue;
    cells.forEach(p=>used.add(p));candidates.push({cells,patterns:[['none','none'],['bush','none'],['log','bush'],['boulder','none']]});
  }
  const runs=[];
  for(const t of tiles){const prev=runs.at(-1);if(prev&&prev[1]===t.env&&prev[2]===t.terrain&&prev[3]===t.cover)prev[0]++;else runs.push([1,t.env,t.terrain,t.cover]);}
  return {width:W,height:H,runs,routes,candidates};
}
const data={version:'terrain-set/1',maps:definitions.map(([id,name])=>({id,name,version:1,
  sizes:Object.fromEntries([[40,28],[80,56],[160,112]].map(([w,h])=>[w+'x'+h,author(id,w,h)]))}))};
const target=path.resolve(__dirname,'../src/ecology/map-data.js');
fs.writeFileSync(target,'// Generated offline by tools/build-map-templates.cjs. Do not regenerate during play.\n'+
  '(function(root,data){if(typeof module==="object"&&module.exports)module.exports=data;else root.EcoMapData=data;})(globalThis,'+JSON.stringify(data)+');\n');
console.log('Wrote six maps with three separately authored sizes: '+fs.statSync(target).size+' bytes');
