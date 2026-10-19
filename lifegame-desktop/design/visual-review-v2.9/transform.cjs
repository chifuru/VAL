'use strict';
module.exports=(name,source)=>{const change=(a,b)=>{if(source.split(a).length!==2)throw Error('Visual preview contract moved: '+name+'/'+a);source=source.replace(a,b);};
if(name==='projection.js'){change('lift = 1.05','lift = 1.6');change('0.48 + 0.06 * noise(x * 0.37, y * 0.41)','0.65 + 0.08 * noise(x * 0.37, y * 0.41)');change('0.17 + 0.065 * noise(x * 0.12, y * 0.12) + 0.02 * noise(x * 0.45, y * 0.45)','Math.max(.08,.24 + .28 * noise(x * .12,y * .12) + .04 * noise(x * .45,y * .45))');}
if(name==='habitat.js'){change('Math.min(0.38, Math.max(0, 0.045 - 1.05 * (dx + dy)))','Math.min(0.45, Math.max(0, 0.045 - 1.4 * (dx + dy)))');change('Math.min(0.23, Math.max(0, 1.05 * (dx + dy)))','Math.min(0.26, Math.max(0, 1.4 * (dx + dy)))');change('coast * 0.08','coast * 0.14');}
if(name==='renderer.js'){
 change('    if (detail && Art?.creature(g, o, x, y, r)) return;',`    if(detail){
      g.save();
      g.filter='brightness(1.13) contrast(1.07) saturate(1.10)';
      g.shadowColor='rgba(0,12,18,.65)';g.shadowBlur=3;g.shadowOffsetX=1;g.shadowOffsetY=3;
      const drawn=Art?.creature(g,{...o,renderEmphasis:false},x,y,r);
      g.restore();if(drawn)return;
    }`);
 change('        if (view.emphasis) {','        if (view.emphasis && (!detail || !isMain)) {');
}
return source;};
