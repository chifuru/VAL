'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'../src/composite/app.js'),'utf8');

test('v4.2 legacy-lineage portrait excludes a duplicate full juvenile body',()=>{
  assert.match(app,/if\(portrait\)\s*\{/);
  assert.match(app,/\}else\s*\{\s*\/\/ Phase I/);
  assert.doesNotMatch(app,/lineageLayers&&s\.stage>0\?\.60:1/);
});
test('v4.2 VALIS and antimeme retain the common body and independent organ sprites',()=>{
  assert.match(app,/const core=img\(C\.core\[stageCore\(s\)\]\)/);
  assert.match(app,/front\.forEach\(p=>drawPart\(p\)\)/);
  assert.match(app,/LAYER COMPOSITE/);
});
test('legacy images are truthfully marked transitional mock portraits',()=>{
  assert.match(app,/MOCK PORTRAIT/);
});
