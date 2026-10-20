'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),transform=require('./private-transform.cjs'),manifest=require('./baseline-dependencies.json');
const variants=['baseline','rarity','risk','fungus'],sha=x=>crypto.createHash('sha256').update(x).digest('hex'),verified=new Set();
function options(){const o={root:process.env.I11C_BASELINE_ROOT,out:'/tmp/i11c-lower-replay',variant:'baseline',checkOnly:false};for(let i=2;i<process.argv.length;i++){const key=process.argv[i];if(key==='--help'){console.log('node diagnostic-runner.cjs --root /tmp/i11c-lower-baseline/lifegame-desktop --variant baseline|rarity|risk|fungus [--out DIR] [--check-only]\nFixtures accept the same --root/--out options. Reruns default to /tmp; measured evidence is not overwritten.');process.exit(0);}if(key==='--check-only'){o.checkOnly=true;continue;}if(!['--root','--out','--variant'].includes(key)||i+1===process.argv.length)throw Error('Unknown/missing option: '+key);o[key.slice(2)]=process.argv[++i];}if(!o.root)throw Error('--root is required; prepare Git baseline48876e7 first');o.root=path.resolve(o.root);o.out=path.resolve(o.out);if(!variants.includes(o.variant))throw Error('Unknown private variant');if(o.out===__dirname)throw Error('Do not overwrite measured evidence; choose a separate output directory');fs.mkdirSync(o.out,{recursive:true});return o;}
function verify(root){if(verified.has(root))return;const checkout=path.dirname(root);for(const [file,expected]of Object.entries(manifest.files)){if(sha(fs.readFileSync(path.join(checkout,file)))!==expected)throw Error('Replay requires unchanged Git48876e7 dependency: '+file);}verified.add(root);}
function model(root,variant='baseline'){
 verify(root);if(!variants.includes(variant))throw Error('Unknown private variant');
 if(variant==='baseline')return require(path.join(root,'src/ecology/observation-model.js')).model();
 const original=fs.readFileSync,sourceSHA={},ecology=path.join(root,'src/ecology')+path.sep;
 fs.readFileSync=function(file,...args){const value=original.call(fs,file,...args);if(!String(file).startsWith(ecology))return value;const name=path.basename(String(file),'.js'),changed=transform(name,String(value),variant);sourceSHA[name]={base:sha(value),private:sha(changed)};return Buffer.isBuffer(value)?Buffer.from(changed):changed;};
 try{const E=require(path.join(root,'design/advantage-switches/model.cjs')).model();Object.defineProperty(E,'diagnosticSourceSHA',{value:sourceSHA});return E;}finally{fs.readFileSync=original;}
}
module.exports={options,verify,model,sha};
