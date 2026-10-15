'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {PNG}=require('pngjs');
const root=path.resolve(__dirname,'..'),D=require('../src/composite/lineage-definitions');
function build(){
 const config={version:'desktop-art-v5',food:{},environments:{},sprites:{},files:[]};
 const rasters=new Map();
 function attachmentRoot(file,bytes,region,pivot){
  if(!rasters.has(file))rasters.set(file,PNG.sync.read(bytes));
  const png=rasters.get(file),[x,y,w,h]=region,px=Math.min(w-1,Math.round(pivot[0])),py=Math.min(h-1,Math.round(pivot[1]));
  if(png.data[((y+py)*png.width+x+px)*4+3]>=128)return [px,py];
  let best=Infinity,result=null;
  for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){if(png.data[((y+yy)*png.width+x+xx)*4+3]<128)continue;const distance=(xx-pivot[0])**2+(yy-pivot[1])**2;if(distance<best){best=distance;result=[xx,yy];}}
  if(!result)throw Error('No opaque attachment surface: '+file);return result;
 }
 for(const family of ['common',...D.LINEAGES.slice(0,14).map(l=>l.id),...['aquatic','avian','crystal','serpent','ethereal'].map(x=>'body-'+x),...D.CORE_PLANS.map(x=>'core-'+x),...D.CORE_PLANS.map(x=>'bio-'+x)]){
  const meta=JSON.parse(fs.readFileSync(path.join(root,'design/assets/desktop-creatures',family+'.json'))),bytes=fs.readFileSync(path.join(root,meta.file));
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==meta.sha256)throw Error('Asset SHA mismatch: '+family);
  if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.readUInt32BE(16)!==meta.width||bytes.readUInt32BE(20)!==meta.height)throw Error('Invalid PNG: '+family);
  const rows=(family.startsWith('core-')||family.startsWith('bio-'))?['body','fin','limb']:(family==='common'||family.startsWith('body-'))?['head','torso','eye','tail','fin','limb']:D.PART_DEFINITIONS[family].map(p=>p[0]);
  const levels=family.startsWith('bio-')?4:3;
  if(JSON.stringify(rows)!==JSON.stringify(meta.rows)||meta.regions.length!==rows.length*levels)throw Error('Anatomy mismatch: '+family);
  if(!config.files.some(f=>f.file===meta.file.replace(/^src\//,'')))config.files.push({file:meta.file.replace(/^src\//,''),sha256:meta.sha256,width:meta.width,height:meta.height});
  rows.forEach((id,row)=>{config.sprites[family+':'+id]=Array.from({length:levels},(_,col)=>{const i=row*levels+col,[x,y,w,h]=meta.regions[i],pivot=meta.roots[i];if(x<0||y<0||w<1||h<1||x+w>meta.width||y+h>meta.height||pivot.some(v=>!Number.isFinite(v)))throw Error('Invalid sprite geometry: '+family+':'+id);return {file:meta.file.replace(/^src\//,''),region:[x,y,w,h],root:pivot,attachmentRoot:attachmentRoot(meta.file,bytes,[x,y,w,h],pivot),...(meta.anatomy&&id==='body'?{anatomy:meta.anatomy[col]}:{})};});});
 }
 for(const [alias,source]of Object.entries(D.ASSET_ALIASES)){if(!config.sprites[source])throw Error('Missing alias '+source);config.sprites[alias]=config.sprites[source];}
 for(const l of D.LINEAGES){
  const family='eco-'+l.id,meta=JSON.parse(fs.readFileSync(path.join(root,'design/assets/desktop-creatures',family+'.json'))),bytes=fs.readFileSync(path.join(root,meta.file));
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==meta.sha256||meta.regions.length!==8)throw Error('Invalid ecology body '+family);
  config.files.push({file:meta.file.replace(/^src\//,''),sha256:meta.sha256,width:meta.width,height:meta.height});
  config.sprites[family+':body']=meta.regions.map((region,i)=>({file:meta.file.replace(/^src\//,''),region,root:meta.roots[i],attachmentRoot:attachmentRoot(meta.file,bytes,region,meta.roots[i]),anatomy:meta.anatomy[i],exclusions:meta.exclusions[i]}));
 }
 for(const [kind,names]of [['food',['life','mineral','information','habitat-life']],['environments',['tide','heat','signal','void','growth','habitat-flora']]])for(const id of names){
  const meta=JSON.parse(fs.readFileSync(path.join(root,'design/assets/ecology',id+'.json'))),bytes=fs.readFileSync(path.join(root,meta.file));
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==meta.sha256)throw Error('Ecology SHA '+id);
  config.files.push({file:meta.file.replace(/^src\//,''),sha256:meta.sha256,width:meta.width,height:meta.height});config[kind][id]={file:meta.file.replace(/^src\//,''),regions:meta.regions};
 }
 const outputs={'src/assets/creatures/config.json':JSON.stringify(config,null,2)+'\n','src/composite/asset-config.js':'/* Generated local-image geometry. Run npm run build:assets. */\nwindow.VALIS_ASSETS='+JSON.stringify(config)+';\n'};
 for(const [file,text]of Object.entries(outputs)){const full=path.join(root,file);if(process.argv.includes('--check')){if(!fs.existsSync(full)||fs.readFileSync(full,'utf8')!==text)throw Error('Asset configuration out of date: '+file);}else fs.writeFileSync(full,text);}
 console.log('Local PNG configuration: '+config.files.length+' atlases, '+Object.keys(config.sprites).length+' body/organ groups, '+Object.values(config.sprites).reduce((n,s)=>n+s.length,0)+' sprites');return config;
}
if(require.main===module)build();module.exports={build};
