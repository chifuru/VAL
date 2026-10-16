"use strict";
const fs=require('node:fs'),path=require('node:path'),{model}=require('./model.cjs');const root=path.resolve(__dirname,'../..'),e=path.join(root,'operations/evidence/ecosystem-foundation-v2');
const cases={};
function compact(w){return {config:w.config,tiles:w.tiles,organisms:w.organisms.map(o=>Object.fromEntries(['id','species','slot','cell','phase','facing','dna','branch3','branch4','sex','role','B','E','M','G','HP','age','generation','infection','sperm'].map(k=>[k,o[k]]))),resources:w.resources,carcasses:w.carcasses,turn:w.turn,events:[],stats:w.stats};}
const E=model(),w=E.create({seed:'ECOSYSTEM-2026'});
const report={richness:{main:20,food:6},rows:E.S.D.species.map(s=>({id:s.id,group:s.group,name:s.name,initial:w.stats.counts[s.id],final:w.stats.counts[s.id],births:0,firstAbsent:w.stats.counts[s.id]?null:0}))};
cases.initial={label:'標準初期値 / 開始時点',world:compact(w),report};
for(const [key,file,label] of [['colony','colony/colony','群体繁殖候補 / 600ターン'],['standard','standard/foundation','標準初期値 / 1000ターン'],['natural-a','survey/foundation-natural-a','標準規模・偏り A / 1000ターン'],['natural-b','survey/foundation-natural-b','標準規模・偏り B / 1000ターン'],['a','multi/foundation-a','偏りあり A / 600ターン'],['b','multi/foundation-b','偏りあり B / 600ターン'],['c','multi/foundation-c','偏りあり C / 600ターン']]){
 const filePath=path.join(e,file);if(!fs.existsSync(filePath+'.world.json'))continue;const world=JSON.parse(fs.readFileSync(filePath+'.world.json')),report=JSON.parse(fs.readFileSync(filePath+'.json'));cases[key]={label,world:compact(world),report};
}
const data={note:'確認用の分離モデルです。存続数だけで安定共存とは判断せず、系統別の出生と経時変化を報告に記録します。初期にいない生物は未配置として区別します。地形・環境は初期値で固定され、描画で変更しません。画面操作は保存された実計算結果の参照です。',cases};fs.writeFileSync(path.join(__dirname,'preview-data.js'),'window.FOUNDATION_DATA='+JSON.stringify(data)+';\n');console.log(Object.keys(cases));
