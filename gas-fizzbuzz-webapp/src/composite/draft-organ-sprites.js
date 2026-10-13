(function(root) {
'use strict';
// C1.5.2 / Stage 4: provisional vector artwork, NOT traced mock PNGs.
// Transparent, deterministic, standalone organ images for the 12 legacy lineages.
// 2 fully modular lineages still use their existing 33 original PNGs unchanged.
var IDS=['abyss','myth','recursive','sail','gravity','crystal','manyeyes','abyssshell','parallel','memory','serpent','solar'];
var COLORS={
 abyss:['#64b7ed','#9de4e4'], myth:['#deb77d','#fff0c5'],
 recursive:['#8dccbf','#d9ffd3'], sail:['#67badb','#c6f9ff'],
 gravity:['#ad98eb','#f0deff'], crystal:['#b59cfa','#e5ddff'],
 manyeyes:['#70ddcd','#d8ffff'], abyssshell:['#628ebd','#b8d6ec'],
 parallel:['#d995a5','#f4c6c7'], memory:['#a7a1d6','#e7e1ff'],
 serpent:['#74c5ad','#bff6db'], solar:['#ecc16d','#fff3b0']
};
function path(d,fill,stroke,w) {
 return '<path d="'+d+'" fill="'+(fill||'none')+'" stroke="'+(stroke||'none')+'" stroke-width="'+(w||3)+'"/>';
}
function ell(x,y,rx,ry,fill,stroke,w) {
 return '<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="'+(fill||'none')+'" stroke="'+(stroke||'none')+'" stroke-width="'+(w||3)+'"/>';
}
function circ(x,y,r,fill) {return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'"/>';}
function poly(points,fill,stroke,w) {return '<polygon points="'+points+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+(w||3)+'"/>';}
function motif(id,lv,c) {
 var a=c[0],b=c[1],o='';
 switch(id) {
 case 'abyss':
  for(var i=0;i<lv+2;i++){var x=54+i*31;
   o+=path('M 126 158 Q '+x+' 148 '+x+' 98 T '+(x+((i%2)?-12:12))+' '+(34-i%2*12),'none',a,9-lv);
   o+=circ(x+((i%2)?-12:12),34-i%2*12,4+lv,b);}
  o+=ell(126,154,48,15,a,b,3);break;
 case 'myth':
  for(var j=0;j<lv+2;j++){var y=150-j*31;
   o+=poly('38,154 100,'+(y-14)+' 200,'+(26+j*5)+' 176,'+(y+7),a,b,3);
   o+=path('M 62 142 L 181 '+(y+4),'none',b,3);}
  break;
 case 'recursive':
  o+=path('M 127 172 L 127 73','none',a,11);
  for(var k=0;k<lv+2;k++){var y0=125-k*29;
   o+=path('M 127 '+y0+' Q '+(83-k*6)+' '+(y0-20)+' '+(51-k*3)+' '+(y0-60),'none',b,6);
   o+=path('M 127 '+y0+' Q '+(171+k*6)+' '+(y0-20)+' '+(202+k*3)+' '+(y0-60),'none',a,6);}
  break;
 case 'sail':
  for(var s=0;s<lv+1;s++){var off=s*23;
   o+=poly((42+off)+',159 '+(70+off)+','+(54-off*0.2)+' '+(164+off)+','+(25+off*0.2)+' '+(205-off)+',160',a,b,5);
   o+=path('M '+(72+off)+' 145 L '+(163+off)+' '+(32+off*.2),'none',b,3);}
  break;
 case 'gravity':
  for(var g=0;g<lv;g++){o+=ell(128,96,42+g*29,16+g*19,'none',g%2?a:b,8-g); }
  o+=circ(128,96,11,b);break;
 case 'crystal':
  for(var q=0;q<lv+2;q++){var px=36+q*43,tip=28+(q%2)*34;
   o+=poly(px+',163 '+(px+17)+','+tip+' '+(px+39)+',163 '+(px+20)+',182',q%2?a:b,b,3);
   o+=path('M '+(px+17)+' '+tip+' L '+(px+20)+' 182','none',a,2);}
  break;
 case 'manyeyes':
  for(var e=0;e<lv+2;e++){var ex=51+e*39,ey=74+(e%2)*44;
   o+=ell(ex,ey,22+lv,14+lv,a,b,3);
   o+=circ(ex,ey,8+lv,'#092b40');o+=circ(ex-3,ey-3,3,b);}
  break;
 case 'abyssshell':
  o+=path('M 29 152 Q 45 48 128 23 Q 211 48 227 152 L 128 182 Z',a,b,6);
  for(var sh=0;sh<lv+2;sh++){var sx=56+sh*43;
   o+=path('M 128 34 Q '+sx+' 95 '+sx+' 159','none',b,3);}
  for(var t=0;t<lv;t++)o+=poly((42+t*45)+',156 '+(61+t*45)+',122 '+(87+t*45)+',160',b,a,2);
  break;
 case 'parallel':
  for(var ar=0;ar<lv+2;ar++){var dy=28+ar*35;
   o+=path('M 126 102 L '+(82-ar*9)+' '+dy+' L '+(31-ar*3)+' '+(dy+17),'none',ar%2?a:b,8);
   o+=path('M 130 108 L '+(173+ar*9)+' '+dy+' L '+(223+ar*3)+' '+(dy+17),'none',ar%2?b:a,8);}
  o+=ell(128,106,25,27,a,b,4);break;
 case 'memory':
  o+=poly('128,15 220,60 203,147 128,183 53,147 36,60',a,b,6);
  for(var m=0;m<lv+2;m++){var xx=65+m*32;
   o+=path('M '+xx+' 64 L '+(xx+17)+' 91 L '+xx+' 118','none',b,6);}
  break;
 case 'serpent':
  for(var n=0;n<lv+1;n++){var hx=54+n*69;
   o+=path('M 128 176 Q '+(hx-40)+' 115 '+hx+' 84','none',a,18);
   o+=ell(hx,66,29,22,a,b,4);
   o+=circ(hx-9,63,5,'#0a3441');
   o+=path('M '+(hx+10)+' 79 l 13 13','none',b,3);}
  break;
 case 'solar':
  o+=ell(128,96,47+lv*18,47+lv*18,'none',a,7);
  for(var r=0;r<4+lv*4;r++){var ang=r*Math.PI*2/(4+lv*4),
   x1=Math.round(128+Math.cos(ang)*(49+lv*18)),y1=Math.round(96+Math.sin(ang)*(49+lv*18)),
   x2=Math.round(128+Math.cos(ang)*(64+lv*18)),y2=Math.round(96+Math.sin(ang)*(64+lv*18));
   o+=path('M '+x1+' '+y1+' L '+x2+' '+y2,'none',b,6);}
  o+=circ(128,96,13,b);break;
 }
 return o;
}
function svg(id,level) {
 var color=COLORS[id];if(!color||level<1||level>3)throw Error('Unknown draft organ: '+id+' / '+level);
 return '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="192" viewBox="0 0 256 192" shape-rendering="geometricPrecision">'+
 '<g stroke-linecap="round" stroke-linejoin="round">'+motif(id,level,color)+'</g></svg>';
}
function imageUrl(id,level) {return 'data:'+'image/svg+xml;charset=utf-8,'+encodeURIComponent(svg(id,level));}
function install(config) {
 if(!config||!config.partImages)throw Error('Missing asset config');
 IDS.forEach(function(id){
  var key=id+':'+id+'Heritage';
  // Respect future real PNG replacements; draft fallback is installed only when absent.
  if(!config.partImages[key])config.partImages[key]=[1,2,3].map(function(level){return imageUrl(id,level);});
 });
 config.draftOrganLineages=IDS.slice();
 return config;
}
root.CompositeDraftOrgans=Object.freeze({ids:IDS.slice(),install:install,svg:svg});
})(window);
