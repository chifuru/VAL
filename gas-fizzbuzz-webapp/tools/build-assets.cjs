'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),D=require('../src/composite/lineage-definitions');
function build(){
 const config={version:'desktop-art-v1',sprites:{},files:[]};
 for(const family of ['common',...D.LINEAGES.map(l=>l.id)]){
  const meta=JSON.parse(fs.readFileSync(path.join(root,'design/assets/desktop-creatures',family+'.json'))),bytes=fs.readFileSync(path.join(root,meta.file));
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==meta.sha256)throw Error('Asset SHA mismatch: '+family);
  if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.readUInt32BE(16)!==meta.width||bytes.readUInt32BE(20)!==meta.height)throw Error('Invalid PNG: '+family);
  const rows=family==='common'?['head','torso','eye','tail','fin','limb']:D.PART_DEFINITIONS[family].map(p=>p[0]);
  if(JSON.stringify(rows)!==JSON.stringify(meta.rows)||meta.regions.length!==rows.length*3)throw Error('Anatomy mismatch: '+family);
  config.files.push({file:meta.file.replace(/^src\//,''),sha256:meta.sha256,width:meta.width,height:meta.height});
  rows.forEach((id,row)=>{config.sprites[family+':'+id]=[0,1,2].map(col=>{const i=row*3+col,[x,y,w,h]=meta.regions[i],pivot=meta.roots[i];if(x<0||y<0||w<1||h<1||x+w>meta.width||y+h>meta.height||pivot.some(v=>!Number.isFinite(v)))throw Error('Invalid sprite geometry: '+family+':'+id);return {file:meta.file.replace(/^src\//,''),region:[x,y,w,h],root:pivot};});});
 }
 const outputs={'src/assets/creatures/config.json':JSON.stringify(config,null,2)+'\n','src/composite/asset-config.js':'/* Generated local-image geometry. Run npm run build:assets. */\nwindow.VALIS_ASSETS='+JSON.stringify(config)+';\n'};
 for(const [file,text]of Object.entries(outputs)){const full=path.join(root,file);if(process.argv.includes('--check')){if(!fs.existsSync(full)||fs.readFileSync(full,'utf8')!==text)throw Error('Asset configuration out of date: '+file);}else fs.writeFileSync(full,text);}
 console.log('Local PNG configuration: '+config.files.length+' atlases, '+Object.keys(config.sprites).length+' body/organ groups, '+Object.keys(config.sprites).length*3+' sprites');return config;
}
if(require.main===module)build();module.exports={build};
