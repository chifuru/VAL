/* Deterministic growth state. Renderer is intentionally separate from these rules. */
(function (root, factory) {
  var engine = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
  if (root) root.CreatureEngine = engine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var PHASES = ['第一相・萌生','第二相・変容','第三相・異相'];
  var ENV = ['signal','void','heat','tide'];
  var THRESHOLDS = [1,6,16];
  var PART_DEFINITIONS = {
    valis: [
      ['receiverCrown','受信冠','head','signal','fizz'],
      ['observingEye','観測焦点','eye','signal','fizzbuzz'],
      ['revelationMembrane','受信膜','dorsal','heat','fizz'],
      ['lightKernel','偏在光核','chest','signal','fizzbuzz'],
      ['detachedNode','漂遊衛片','outerOrbit','void','number'],
      ['signalTail','符号尾','tailTip','signal','fizzbuzz']
    ],
    antimeme: [
      ['absenceMask','忘却面','head','void','number'],
      ['unseenEye','不在眼','eye','signal','fizzbuzz'],
      ['erasureCrown','抹消冠','dorsal','void','number'],
      ['memoryFilament','記憶吸糸','flank','void','fizzbuzz'],
      ['brokenTail','欠章尾','tailTip','signal','number']
    ]
  };

  var LINEAGES = Object.freeze([
    {id:'abyss',mark:'〰',group:'深淵触手',names:['ミナモルフ','ウロネクト','ノクトラケル'],finalName:'ネフ＝エルド',primary:'tentacles',niche:[1,0,0,0]},
    {id:'myth',mark:'🜂',group:'神鳥',names:['ミナモルフ','ミツアシハヤ','カラスヴァ'],finalName:'天導ヤタリス',primary:'wings',niche:[0,1,0,0]},
    {id:'recursive',mark:'λ',group:'再帰知性',names:['ミナモルフ','ラムダイル','リスプラトス'],finalName:'ゼータ＝パレン',primary:'heads',niche:[0,0,1,0]},
    {id:'sail',mark:'✦',group:'光帆',names:['ミナモルフ','セイルルガ','アストレイヴ'],finalName:'ヘリオ＝ヴェルカ',primary:'wings',niche:[.5,0,.5,0]},
    {id:'gravity',mark:'◎',group:'重力環',names:['ミナモルフ','トリグラノ','オルビレグス'],finalName:'ゼロ＝ケプレア',primary:'orbit',niche:[0,.45,0,.55]},
    {id:'crystal',mark:'◇',group:'星晶',names:['ミナモルフ','プリズメル','ネビュラティス'],finalName:'セレス＝グラシア',primary:'shell',niche:[0,0,0,1]},
    {id:'manyeyes',mark:'◉',group:'多眼知覚',names:['ミナモルフ','マガノーヴ','パノプセラ'],finalName:'オムニ＝ノクティス',primary:'eyes',niche:[.2,0,.25,.55]},
    {id:'abyssshell',mark:'▣',group:'深殻',names:['ミナモルフ','カルカシェル','アビサルド'],finalName:'ウル＝ダルシェル',primary:'shell',niche:[.55,0,0,.45]},
    {id:'parallel',mark:'∥',group:'並列生命',names:['ミナモルフ','コンカリオ','パラレギオン'],finalName:'ゴル＝コンカレス',primary:'limbs',niche:[0,.5,.5,0]},
    {id:'memory',mark:'⛨',group:'記憶殻',names:['ミナモルフ','スタックラ','ボロウ＝フェラク'],finalName:'メモル＝クラスト',primary:'shell',niche:[0,0,.5,.5]},
    {id:'serpent',mark:'Ϟ',group:'多頭蛇',names:['ミナモルフ','ミダレクビ','ヤツマガノ'],finalName:'八星蛇オロマグナ',primary:'heads',niche:[.5,.5,0,0]},
    {id:'solar',mark:'☼',group:'日輪',names:['ミナモルフ','カガミノア','アマツリンカ'],finalName:'日輪神アマ＝ゼル',primary:'glow',niche:[0,.75,.25,0]},
    {id:'antimeme',mark:'∅',group:'反記銘生命',names:['ミナモルフ','ノル＝メム','レテグラフ'],finalName:'アネムネシス',primary:'orbit',niche:[0,0,.25,.75]},
    {id:'valis',mark:'⌁',group:'異化通信生命',names:['ミナモルフ','ノオフィラ','アイオ＝レイ'],finalName:'ヴェイル＝シオン',primary:'glow',niche:[0,.16,.72,.12]}
  ]);
  var LINEAGE_BY_ID=Object.fromEntries(LINEAGES.map(l=>[l.id,l]));
  // Original 12-lineage primary organ types retained; original mock art is used as
  // a portrait layer until independent sprite parts for these lineages are authored.
  var GENERIC_ORGAN_DEFS={abyss:['触肢','flank','tide','fizzbuzz'],myth:['翼紋','dorsal','heat','fizz'],
    recursive:['枝角','head','signal','fizz'],sail:['光帆','dorsal','tide','fizz'],
    gravity:['重力環','outerOrbit','void','number'],crystal:['星晶','dorsal','void','buzz'],
    manyeyes:['側眼','eye','void','fizzbuzz'],abyssshell:['深殻','chest','tide','buzz'],
    parallel:['多腕','forelimb','heat','number'],memory:['記憶甲','chest','signal','buzz'],
    serpent:['蛇頭','head','tide','fizz'],solar:['日輪','outerOrbit','heat','fizzbuzz']};
  Object.keys(GENERIC_ORGAN_DEFS).forEach(function(id){var d=GENERIC_ORGAN_DEFS[id];
    PART_DEFINITIONS[id]=[[id+'Heritage',d[0],d[1],d[2],d[3]]];
  });
  function fmtFizzBuzz(n) {
    if (n%15===0) return 'FizzBuzz';
    if (n%3===0) return 'Fizz';
    if (n%5===0) return 'Buzz';
    return String(n);
  }
  function linesFor(n) {
    n=Number(n); if(!Number.isSafeInteger(n)||n<1||n>1000) throw Error('1〜1000の整数を入力してください');
    return Array.from({length:n},(_,i)=>fmtFizzBuzz(i+1));
  }
  function kindFor(line) {if(line==='FizzBuzz')return 'fizzbuzz';if(line==='Fizz')return 'fizz';if(line==='Buzz')return 'buzz';if(/^[1-9]\d*$/.test(line))return 'number';throw Error('不正なFizzBuzz出力');}
  function modifierFor(n) {
    if(!Number.isSafeInteger(n)||n<1||n%3===0||n%5===0) return 0;
    var a=n%3,b=n%5;return ((a===1&&b<=2)||(a===2&&b>=3))?1:-1;
  }
  function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
  function stageFor(points){return points>=35?2:points>=10?1:0;}
  function dnaFor(seed){
    var x=(seed^0x9e3779b9)>>>0;
    x=Math.imul(x^(x>>>16),0x85ebca6b)>>>0;
    x=Math.imul(x^(x>>>13),0xc2b2ae35)>>>0;
    x=(x^(x>>>16))>>>0||1;
    function next(){x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;}
    var body=next(),appendage=next(),senses=next(),skin=next(),aptitude=next(),sensitivity=next();
    return Object.freeze({seed,body,appendage,senses,skin,aptitude,sensitivity,
      bodyVariant:Math.floor(body*2),headRatio:.93+senses*.12,
      eyeSpacing:4+Math.round(senses*5),torsoRatio:.94+body*.11,tailRatio:.90+appendage*.18,hue:Math.floor(skin*8)});
  }
  function emptySituation(){return{exposure:{signal:0,void:0,heat:0,tide:0},foods:[],envs:[],steps:0};}
  function initial(seed){
    seed=Number(seed);if(!Number.isSafeInteger(seed)||seed<1||seed>1000)throw Error('個体Nは1〜1000');
    return{seed,dna:dnaFor(seed),current:0,points:0,modifier:0,stage:0,lineage:null,
      history:[],heritage:[],partXp:{},partImprints:{},foods:{number:0,fizz:0,buzz:0,fizzbuzz:0},situation:emptySituation(),matured:false};
  }
  function levelFor(x){return x>=16?3:x>=6?2:x>=1?1:0;}
  function phenotype(state,id){
    id=id||state.lineage;
    if(!id)return[];
    return(PART_DEFINITIONS[id]||[]).map(function(def){
      var xp=state.partXp[id+':'+def[0]]||0;
      return{id:def[0],label:def[1],anchor:def[2],level:levelFor(xp),xp:xp,lineage:id};
    });
  }
  function chooseLineage(situation){
    var keys=['tide','heat','signal','void'],steps=Math.max(1,situation.steps);
    var last=situation.envs.slice(-12),rc=Math.max(1,last.length);
    var food=situation.foods.slice(-12),fc=Math.max(1,food.length);
    var favor={tentacles:'fizzbuzz',wings:'fizz',heads:'fizz',orbit:'number',shell:'buzz',
      eyes:'fizzbuzz',limbs:'number',glow:'fizzbuzz'};
    var pressure=keys.map(k=>.65*(situation.exposure[k]||0)/steps+.35*last.filter(x=>x===k).length/rc);
    var best=LINEAGES[0],bestScore=-Infinity;
    LINEAGES.forEach(function(l){
      var distance=0;for(var i=0;i<4;i++)distance+=(pressure[i]-l.niche[i])**2;
      var weight=l.id==='antimeme'||l.id==='valis'?.035:.085;
      var bonus=weight*food.filter(x=>x===favor[l.primary]).length/fc;
      var score=-distance+bonus;
      if(score>bestScore){best=l;bestScore=score;}
    });
    return best.id;
  }
  function plannedEnvironment(state,targetId){
    var target=LINEAGE_BY_ID[targetId];if(!target)throw Error('存在しない系統');
    var keys=['tide','heat','signal','void'],t=state.situation.steps+1,ex=state.situation.exposure;
    var best=keys[0],deficit=-Infinity;
    keys.forEach(function(k,i){
      var gap=t*target.niche[i]-(ex[k]||0);
      if(gap>deficit){deficit=gap;best=k;}
    });
    return best;
  }
  function step(previous, line, env){
    if(!ENV.includes(env))throw Error('不正な環境');
    var kind=kindFor(line);
    var state={...previous,foods:{...previous.foods},partXp:{...previous.partXp},
      history:previous.history.slice(),heritage:previous.heritage.slice(),partImprints:{...previous.partImprints},
      situation:{exposure:{...previous.situation.exposure},foods:previous.situation.foods.slice(),envs:previous.situation.envs.slice(),steps:previous.situation.steps+1}};
    state.current++;state.foods[kind]++;
    state.situation.exposure[env]++;
    state.situation.foods.push(kind);state.situation.envs.push(env);
    if(state.situation.foods.length>12)state.situation.foods.shift();
    if(state.situation.envs.length>12)state.situation.envs.shift();
    if(kind==='number'){
      state.modifier=modifierFor(Number(line));
    }else{
      if(!state.matured){
        state.points=clamp(state.points+1+.25*state.modifier,0,100);
        var nextStage=stageFor(state.points);
        if(nextStage>state.stage){
          var previousParts=phenotype(previous);
          if(previous.lineage){
            state.heritage.push({phase:previous.stage,lineage:previous.lineage,parts:previousParts.filter(p=>p.level>0).map(p=>({...p}))});
          }
          state.stage=nextStage;state.lineage=chooseLineage(state.situation);
          state.history.push({stage:nextStage,lineage:state.lineage,step:state.current,points:state.points});
          state.situation=emptySituation();
        }
      }
      state.modifier=0;
    }
    if(!state.matured && state.lineage){
      (PART_DEFINITIONS[state.lineage]||[]).forEach(function(def){
        var bonus=(env===def[3]?1:0)+(kind===def[4]?1:0);
        if(bonus)state.partXp[state.lineage+':'+def[0]]=(state.partXp[state.lineage+':'+def[0]]||0)+bonus;
      });
    }
    if(state.points>=100)state.matured=true;
    return state;
  }
  function runAll(seed, envPattern){
    var state=initial(seed);
    linesFor(seed).forEach(function(line,i){state=step(state,line,typeof envPattern==='function'?envPattern(i,line,state):(envPattern||'signal'));});
    return state;
  }
  return{PHASES,PART_DEFINITIONS,LINEAGES,LINEAGE_BY_ID,THRESHOLDS,ENV,fmtFizzBuzz,linesFor,kindFor,modifierFor,stageFor,
    dnaFor,initial,levelFor,phenotype,chooseLineage,plannedEnvironment,step,runAll};
});
