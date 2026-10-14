'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{PNG}=require('pngjs');
const root=path.resolve(__dirname,'..'),D=require('../src/composite/lineage-definitions'),config=require('../src/assets/creatures/config.json');
test('every anatomical organ and body tier resolves to a checked local PNG with a usable socket',()=>{
 const expected=['head','torso','eye','tail','fin','limb'].map(id=>'common:'+id);for(const l of D.LINEAGES)for(const p of D.PART_DEFINITIONS[l.id])expected.push(l.id+':'+p[0]);for(const family of ['aquatic','avian','crystal','serpent','ethereal'])for(const part of ['head','torso','eye','tail','fin','limb'])expected.push('body-'+family+':'+part);for(const family of D.CORE_PLANS)for(const part of ['body','fin','limb'])expected.push('core-'+family+':'+part);assert.deepEqual(Object.keys(config.sprites).sort(),expected.sort());
 const images=new Map();for(const item of config.files){assert.match(item.file,/^assets\/creatures\/[a-z-]+\.png$/);const bytes=fs.readFileSync(path.join(root,'src',item.file));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),item.sha256);const png=PNG.sync.read(bytes);assert.equal(png.width,item.width);assert.equal(png.height,item.height);images.set(item.file,png);}
 const bounds=new Set();for(const [key,sprites] of Object.entries(config.sprites)){
  assert.equal(sprites.length,3);for(const s of sprites){const png=images.get(s.file);assert.ok(png);const [x,y,w,h]=s.region;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=png.width&&y+h<=png.height);assert.ok(s.root[0]>=0&&s.root[0]<=w&&s.root[1]>=0&&s.root[1]<=h,'socket outside '+key);let visible=0,clear=0;for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const a=png.data[(yy*png.width+xx)*4+3];if(a>32)visible++;if(a<8)clear++;}assert.ok(visible>60,'empty '+key);assert.ok(clear>0,'opaque poster '+key);if(key.startsWith('body-')||key.startsWith('core-')){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){if(xx!==x&&xx!==x+w-1&&yy!==y&&yy!==y+h-1)continue;assert.ok(png.data[(yy*png.width+xx)*4+3]<=32,'cropped or neighboring sprite at '+key);}}const id=s.file+':'+s.region;if(!D.ASSET_ALIASES[key])assert.ok(!bounds.has(id),'duplicated tier '+key);bounds.add(id);}
 }
 assert.equal(bounds.size,441);
});
test('atlas provenance covers all26 physical runtime PNGs and declares24 reused anatomical aliases',()=>{
 const names=fs.readdirSync(path.join(root,'src/assets/creatures')).filter(n=>n.endsWith('.png')).sort();assert.deepEqual(names,config.files.map(f=>path.basename(f.file)).sort());assert.equal(names.length,26);
 const ledger=fs.readdirSync(path.join(root,'design/assets/desktop-creatures')).filter(x=>x.endsWith('.json')).map(x=>JSON.parse(fs.readFileSync(path.join(root,'design/assets/desktop-creatures',x))));
 for(const file of config.files){const p=ledger.find(p=>p.file==='src/'+file.file&&p.sha256===file.sha256);assert.ok(p,'provenance '+file.file);assert.ok(p.method.includes('image_gen'));if(p.boundaryWarnings)assert.deepEqual(p.boundaryWarnings,[],'neighbor overlap '+file.file);}
 for(const [alias,original] of Object.entries(D.ASSET_ALIASES))assert.deepEqual(config.sprites[alias],config.sprites[original]);
});
test('desktop entry contains no GAS, embedded atlas bytes, source previews or remote asset dependency',()=>{
 const html=fs.readFileSync(path.join(root,'src/Index.html'),'utf8');assert.doesNotMatch(html,/google\.script|https?:\/\/|data:image/);assert.match(html,/connect-src 'none'/);assert.ok(fs.statSync(path.join(root,'src/Index.html')).size<15000);assert.ok(!fs.existsSync(path.join(root,'src/Code.gs')));assert.ok(!fs.existsSync(path.join(root,'src/composite/Index.template.html')));
 const configJs=fs.readFileSync(path.join(root,'src/composite/asset-config.js'),'utf8');assert.doesNotMatch(configJs,/base64|https?:/);const scripts=[...html.matchAll(/<script defer src="([^"]+)"/g)].map(m=>m[1]);for(const file of scripts)assert.ok(fs.existsSync(path.join(root,'src',file)));
});
