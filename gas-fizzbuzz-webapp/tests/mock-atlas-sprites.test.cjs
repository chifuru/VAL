'use strict';
// C1.5.2 / D1.3.2: bounded screenshot-pixel draft extraction.
// Source PNGs in the user's chat are NOT the committed 9 thumbnail JPEGs.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const script=fs.readFileSync(path.join(__dirname,'../src/composite/mock-atlas-sprites.js'),'utf8');
const ctx={window:{}};vm.runInNewContext(script,ctx,{timeout:10000});
const api=ctx.window.CompositeMockAtlas;
function mockEnv() {
 let serial=0;
 class ImageMock {constructor(){this.naturalWidth=362;this.naturalHeight=272;this.src='';}async decode(){return;}}
 const doc={createElement(tag){assert.equal(tag,'canvas');const canvas={width:0,height:0};let crop;
 canvas.getContext=()=>({drawImage(...args){crop=args.slice(1,5);},
 getImageData(){const size=canvas.width*canvas.height,bytes=new Uint8ClampedArray(size*4);
 for(let i=0;i<size;i++){bytes[4*i]=220;bytes[4*i+1]=150;bytes[4*i+2]=130;bytes[4*i+3]=255;}
 return {data:bytes};},putImageData(){},set imageSmoothingEnabled(value){assert.equal(value,false);}});
 canvas.toDataURL=()=>{serial++;return 'data:image/png;base64,MOCK'+serial+'-'+crop.join('.')};
 return canvas;}};
 return {doc,ImageMock};
}
const urls=['data:image/svg+xml;draft1','data:image/svg+xml;draft2','data:image/svg+xml;draft3'];
function config(){return {partImages:{'abyss:abyssHeritage':urls.slice(),'myth:mythHeritage':urls.slice(),'valis:receiverCrown':['fixed-1','fixed-2','fixed-3']},
 sources:{'a.jpg':'data:image/jpeg;base64,a','b.jpg':'data:image/jpeg;base64,b'},
 references:[{id:'C01_deepsea',file:'a.jpg'},{id:'C02_bird_dragon',file:'b.jpg'}],
 draftOrganLineages:['abyss','myth','solar']};}
test('two exact, bounded 3-tier reference crop specs with separate level rectangles',()=>{
 assert.deepEqual(Array.from(api.specs,x=>x.id),['abyss','myth']);
 for(const spec of api.specs){
  assert.equal(spec.crop.length,3);
  assert.equal(new Set(spec.crop.map(b=>b.join(','))).size,3);
  for(const b of spec.crop){assert.ok(b[0]>=0&&b[1]>=0&&b[2]<=1448&&b[3]<=1086);assert.ok(b[0]<b[2]&&b[1]<b[3]);}
 }
});
test('pixel matte removes dark navy and preserves bright creature pigments',()=>{
 assert.equal(api.mask([10,23,40]),0);
 assert.ok(api.mask([247,159,95])>0);
 assert.ok(api.mask([112,140,225])>0);
});
test('replaces exactly 2 draft organ triplets with reference pixel PNG images',async()=>{
 const {doc,ImageMock}=mockEnv(),c=config();
 await api.install(c,{document:doc,Image:ImageMock});
 assert.deepEqual(Array.from(c.mockAtlasLineages),['abyss','myth']);
 assert.equal(c.mockAtlasProvenance.length,2);
 for(const id of ['abyss','myth']){
  const images=c.partImages[id+':'+id+'Heritage'];
  assert.equal(images.length,3);assert.equal(new Set(images).size,3);
  for(const uri of images)assert.ok(uri.startsWith('data:image/png;base64,'));
 }
 assert.deepEqual(Array.from(c.partImages['valis:receiverCrown']),['fixed-1','fixed-2','fixed-3']);
 assert.deepEqual(Array.from(c.draftOrganLineages),['solar']);
 assert.deepEqual(Array.from(c.mockAtlasWarnings),[]);
});
test('incomplete atlas or authored real PNG never gets silently overwritten',async()=>{
 const {doc,ImageMock}=mockEnv();
 const c=config();delete c.sources['b.jpg'];c.partImages['abyss:abyssHeritage']=['original1','original2','original3'];
 await api.install(c,{document:doc,Image:ImageMock});
 assert.deepEqual(Array.from(c.mockAtlasLineages),[]);
 assert.deepEqual(Array.from(c.partImages['abyss:abyssHeritage']),['original1','original2','original3']);
 assert.deepEqual(Array.from(c.partImages['myth:mythHeritage']),urls);
 assert.equal(c.mockAtlasWarnings.length,2);
});
