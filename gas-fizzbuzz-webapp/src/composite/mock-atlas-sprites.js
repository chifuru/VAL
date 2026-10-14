(function(root){
'use strict';
// C1.5.2 / staged mock import: REAL pixels cropped from the existing nine
// reference JPEG thumbnails. These are LOW-RES DRAFT extractions, not the
// user's newly attached high-resolution originals or quality-approved organs.
// Never replace 33 pre-existing VALIS / antimeme transparent PNGs.
var SOURCE_SIZE=[1448,1086];
var SPECS=[
 {id:'abyss',reference:'C01_deepsea',organ:'abyssHeritage',label:'触肢',
  crop:[[36,960,112,1036],[139,959,247,1038],[265,959,392,1039]]},
 {id:'myth',reference:'C02_bird_dragon',organ:'mythHeritage',label:'冠羽',
  crop:[[155,615,335,679],[372,611,553,680],[585,610,789,678]]}
];
function mask(rgb){
 var hi=Math.max(rgb[0],rgb[1],rgb[2]),low=Math.min(rgb[0],rgb[1],rgb[2]),chroma=hi-low;
 // Keep bright/light or saturated creature pigments. Reject navy panel matte.
 return hi>=162?255:hi>=98&&chroma>=36?Math.min(255,Math.round((hi-75)*3)):0;
}
function croppedImage(image,rect,documentObj){
 var sx=image.naturalWidth/SOURCE_SIZE[0],sy=image.naturalHeight/SOURCE_SIZE[1];
 var x=Math.round(rect[0]*sx),y=Math.round(rect[1]*sy);
 var w=Math.max(2,Math.round((rect[2]-rect[0])*sx));
 var h=Math.max(2,Math.round((rect[3]-rect[1])*sy));
 if(x<0||y<0||x+w>image.naturalWidth||y+h>image.naturalHeight)throw Error('Mock crop bounds');
 var canvas=documentObj.createElement('canvas');canvas.width=w;canvas.height=h;
 var ctx=canvas.getContext('2d',{willReadFrequently:true});
 if(!ctx)throw Error('Canvas2D missing');
 ctx.imageSmoothingEnabled=false;
 ctx.drawImage(image,x,y,w,h,0,0,w,h);
 var data=ctx.getImageData(0,0,w,h),p=data.data,opaque=0;
 for(var yy=0;yy<h;yy++)for(var xx=0;xx<w;xx++){
  var at=(yy*w+xx)*4;
  var a=mask([p[at],p[at+1],p[at+2]]);
  // Prevent original cyan-framed screenshot border or labels at crop edges.
  if(xx<2||yy<2||xx>=w-2||yy>=h-2)a=0;
  p[at+3]=a;if(a>48)opaque++;
 }
 var coverage=opaque/(w*h);
 if(coverage<.05||coverage>.86)throw Error('Mock extraction coverage outside draft bounds: '+coverage);
 ctx.putImageData(data,0,0);
 return {src:canvas.toDataURL('image/png'),coverage:coverage,size:[w,h]};
}
function referenceFor(config,id){
 return (config.references||[]).find(function(r){return r.id===id;});
}
async function install(config,options){
 if(!config||!config.partImages||!config.sources)throw Error('Missing source image config');
 var documentObj=options&&options.document||root.document;
 var ImageType=options&&options.Image||root.Image;
 if(!documentObj||!ImageType)throw Error('Mock cutout needs browser Image and Canvas');
 config.mockAtlasLineages=[];
 config.mockAtlasProvenance=[];
 config.mockAtlasWarnings=[];
 for(const spec of SPECS){
  var ref=referenceFor(config,spec.reference);
  if(!ref||!config.sources[ref.file]){config.mockAtlasWarnings.push(spec.id+': reference JPEG absent');continue;}
  var im=new ImageType();
  im.src=config.sources[ref.file];
  try{
   if(im.decode)await im.decode();
   else await new Promise(function(resolve,reject){im.onload=resolve;im.onerror=reject;});
   if(!im.naturalWidth||!im.naturalHeight)throw Error('reference image dimensions unavailable');
   var images=spec.crop.map(function(box){return croppedImage(im,box,documentObj);});
   // Atomic replacement: a failed level must not replace the other two.
   var key=spec.id+':'+spec.organ;
   // Only replace the known provisional fallback, not authored PNG replacements.
   var existing=config.partImages[key];
   if(!existing||existing.some(function(u){return !u.startsWith('data:image/svg+xml;');})){
    config.mockAtlasWarnings.push(spec.id+': authored replacement retained');continue;
   }
   config.partImages[key]=images.map(function(result){return result.src;});
   config.mockAtlasLineages.push(spec.id);
   config.mockAtlasProvenance.push({
    id:spec.id,reference:spec.reference,referenceFile:ref.file,
    provenance:'embedded low-res reference JPEG crop; draft, NOT original hi-res PNG',
    cropPx:spec.crop,sourceSize:SOURCE_SIZE.slice(),
    outputPx:images.map(function(r){return r.size;}),
    alphaCoverage:images.map(function(r){return Number(r.coverage.toFixed(3));})
   });
  }catch(err){config.mockAtlasWarnings.push(spec.id+': '+String(err.message||err));}
 }
 // Any lineage that could not be extracted keeps its clearly-labeled SVG draft.
 config.draftOrganLineages=(config.draftOrganLineages||[]).filter(function(id){
  return config.mockAtlasLineages.indexOf(id)<0;
 });
 return config;
}
root.CompositeMockAtlas=Object.freeze({specs:SPECS,mask:mask,install:install,croppedImage:croppedImage});
})(window);
