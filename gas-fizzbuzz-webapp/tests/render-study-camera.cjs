'use strict';
// Match framing only when isolating material/tissue changes in archived renderers.
// The separate finished-scene gallery uses unmodified, recorded1.12.0 scenes.
const replacements=[
 ["const neckRoom=polished(a)&&a.lineage==='serpent'?180:0;","const neckRoom=a.version===5?0:polished(a)&&a.lineage==='serpent'?180:0;"],
 ['const extentX=b.integrated?Math.max(b.bw+230,ringExtent):Math.max(1100,b.bw*2.5+450),extentY=b.integrated?Math.max(b.bh+220+neckRoom,ringExtent):Math.max(900,b.bh*2.8+430);','const extentX=b.integrated?(a.version===5?Math.max(b.bw+90,b.bw*1.16):Math.max(b.bw+230,ringExtent)):Math.max(1100,b.bw*2.5+450),extentY=b.integrated?(a.version===5?Math.max(b.bh+100,b.bh*1.20):Math.max(b.bh+220+neckRoom,ringExtent)):Math.max(900,b.bh*2.8+430);'],
 ['const fit=Math.min(w*.90/extentX,h*.86/extentY)*(mini?.92:1);','const fit=Math.min(w*(a.version===5?.80:.90)/extentX,h*(a.version===5?.80:.86)/extentY)*(mini?.92:1);']
];
module.exports=function normalizeCamera(code){for(const [before,after]of replacements){if(!code.includes(before))throw Error('Archived study camera does not match the declared baseline');code=code.replace(before,after);}return code;};
