/* Species and anatomical part groups; no file paths or renderer coordinates. */
(function (root, factory) {
  var definitions = factory();
  if (typeof module === 'object' && module.exports) module.exports = definitions;
  else root.LegacyLineageDefinitionsV4 = definitions;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function freeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.keys(value).forEach(function (key) { freeze(value[key]); });
      Object.freeze(value);
    }
    return value;
  }
  var data = {
  "LINEAGES": [
    {
      "id": "abyss",
      "mark": "〰",
      "group": "深淵触手",
      "names": [
        "ミナモルフ",
        "ウロネクト",
        "ノクトラケル"
      ],
      "finalName": "ネフ＝エルド",
      "primary": "tentacles",
      "niche": [
        1,
        0,
        0,
        0
      ]
    },
    {
      "id": "myth",
      "mark": "🜂",
      "group": "神鳥",
      "names": [
        "ミナモルフ",
        "ミツアシハヤ",
        "カラスヴァ"
      ],
      "finalName": "天導ヤタリス",
      "primary": "wings",
      "niche": [
        0,
        1,
        0,
        0
      ]
    },
    {
      "id": "recursive",
      "mark": "λ",
      "group": "再帰知性",
      "names": [
        "ミナモルフ",
        "ラムダイル",
        "リスプラトス"
      ],
      "finalName": "ゼータ＝パレン",
      "primary": "heads",
      "niche": [
        0,
        0,
        1,
        0
      ]
    },
    {
      "id": "sail",
      "mark": "✦",
      "group": "光帆",
      "names": [
        "ミナモルフ",
        "セイルルガ",
        "アストレイヴ"
      ],
      "finalName": "ヘリオ＝ヴェルカ",
      "primary": "wings",
      "niche": [
        0.5,
        0,
        0.5,
        0
      ]
    },
    {
      "id": "gravity",
      "mark": "◎",
      "group": "重力環",
      "names": [
        "ミナモルフ",
        "トリグラノ",
        "オルビレグス"
      ],
      "finalName": "ゼロ＝ケプレア",
      "primary": "orbit",
      "niche": [
        0,
        0.45,
        0,
        0.55
      ]
    },
    {
      "id": "crystal",
      "mark": "◇",
      "group": "星晶",
      "names": [
        "ミナモルフ",
        "プリズメル",
        "ネビュラティス"
      ],
      "finalName": "セレス＝グラシア",
      "primary": "shell",
      "niche": [
        0,
        0,
        0,
        1
      ]
    },
    {
      "id": "manyeyes",
      "mark": "◉",
      "group": "多眼知覚",
      "names": [
        "ミナモルフ",
        "マガノーヴ",
        "パノプセラ"
      ],
      "finalName": "オムニ＝ノクティス",
      "primary": "eyes",
      "niche": [
        0.2,
        0,
        0.25,
        0.55
      ]
    },
    {
      "id": "abyssshell",
      "mark": "▣",
      "group": "深殻",
      "names": [
        "ミナモルフ",
        "カルカシェル",
        "アビサルド"
      ],
      "finalName": "ウル＝ダルシェル",
      "primary": "shell",
      "niche": [
        0.55,
        0,
        0,
        0.45
      ]
    },
    {
      "id": "parallel",
      "mark": "∥",
      "group": "並列生命",
      "names": [
        "ミナモルフ",
        "コンカリオ",
        "パラレギオン"
      ],
      "finalName": "ゴル＝コンカレス",
      "primary": "limbs",
      "niche": [
        0,
        0.5,
        0.5,
        0
      ]
    },
    {
      "id": "memory",
      "mark": "⛨",
      "group": "記憶殻",
      "names": [
        "ミナモルフ",
        "スタックラ",
        "ボロウ＝フェラク"
      ],
      "finalName": "メモル＝クラスト",
      "primary": "shell",
      "niche": [
        0,
        0,
        0.5,
        0.5
      ]
    },
    {
      "id": "serpent",
      "mark": "Ϟ",
      "group": "多頭蛇",
      "names": [
        "ミナモルフ",
        "ミダレクビ",
        "ヤツマガノ"
      ],
      "finalName": "八星蛇オロマグナ",
      "primary": "heads",
      "niche": [
        0.5,
        0.5,
        0,
        0
      ]
    },
    {
      "id": "solar",
      "mark": "☼",
      "group": "日輪",
      "names": [
        "ミナモルフ",
        "カガミノア",
        "アマツリンカ"
      ],
      "finalName": "日輪神アマ＝ゼル",
      "primary": "glow",
      "niche": [
        0,
        0.75,
        0.25,
        0
      ]
    },
    {
      "id": "antimeme",
      "mark": "∅",
      "group": "反記銘生命",
      "names": [
        "ミナモルフ",
        "ノル＝メム",
        "レテグラフ"
      ],
      "finalName": "アネムネシス",
      "primary": "orbit",
      "niche": [
        0,
        0,
        0.25,
        0.75
      ]
    },
    {
      "id": "valis",
      "mark": "⌁",
      "group": "異化通信生命",
      "names": [
        "ミナモルフ",
        "ノオフィラ",
        "アイオ＝レイ"
      ],
      "finalName": "ヴェイル＝シオン",
      "primary": "glow",
      "niche": [
        0,
        0.16,
        0.72,
        0.12
      ]
    }
  ],
  "PART_DEFINITIONS": {
    "abyss": [
      [
        "frontTentacle",
        "前触腕",
        "forelimb",
        "tide",
        "fizzbuzz",
        2
      ],
      [
        "sensingWhisker",
        "感知触髭",
        "mouth",
        "signal",
        "number",
        2
      ],
      [
        "shoulderShell",
        "肩殻",
        "shoulder",
        "tide",
        "buzz",
        2
      ],
      [
        "tentacleMembrane",
        "背触膜",
        "dorsal",
        "tide",
        "fizz",
        1
      ],
      [
        "luminousTail",
        "発光尾",
        "tailTip",
        "void",
        "fizzbuzz",
        1
      ]
    ],
    "myth": [
      [
        "crown",
        "羽冠",
        "head",
        "heat",
        "fizz",
        1
      ],
      [
        "wing",
        "翼腕",
        "shoulder",
        "heat",
        "fizz",
        2
      ],
      [
        "chestArmor",
        "胸装甲",
        "chest",
        "signal",
        "buzz",
        1
      ],
      [
        "claw",
        "鉤爪脚",
        "hindlimb",
        "heat",
        "number",
        2
      ],
      [
        "tailFeathers",
        "尾羽",
        "tailTip",
        "heat",
        "fizzbuzz",
        1
      ],
      [
        "napeFeathers",
        "背羽",
        "dorsal",
        "signal",
        "fizz",
        1
      ]
    ],
    "recursive": [
      [
        "branchHorn",
        "枝角",
        "head",
        "signal",
        "fizz",
        2
      ],
      [
        "senseNode",
        "感知節点",
        "eye",
        "signal",
        "fizzbuzz",
        2
      ],
      [
        "jointArm",
        "多節前肢",
        "forelimb",
        "signal",
        "number",
        2
      ],
      [
        "dorsalMembrane",
        "神経背膜",
        "dorsal",
        "void",
        "buzz",
        1
      ],
      [
        "nerveTail",
        "神経尾",
        "tailTip",
        "signal",
        "fizz",
        1
      ]
    ],
    "sail": [
      [
        "photonSail",
        "背光帆",
        "dorsal",
        "tide",
        "fizz",
        1
      ],
      [
        "pectoralWing",
        "胸光翼",
        "shoulder",
        "signal",
        "fizz",
        2
      ],
      [
        "forkTail",
        "分岐尾",
        "tailTip",
        "tide",
        "number",
        1
      ],
      [
        "lateralGlow",
        "側線発光",
        "flank",
        "signal",
        "fizzbuzz",
        2
      ]
    ],
    "gravity": [
      [
        "orbitRing",
        "軌道環",
        "outerOrbit",
        "void",
        "number",
        1
      ],
      [
        "orbitalNode",
        "周回節点",
        "outerOrbit",
        "void",
        "fizzbuzz",
        3
      ],
      [
        "stabilizerFin",
        "安定ひれ",
        "forelimb",
        "tide",
        "fizz",
        2
      ],
      [
        "gravityCore",
        "重力胸核",
        "chest",
        "void",
        "buzz",
        1
      ],
      [
        "orbitTail",
        "軌道尾",
        "tailTip",
        "tide",
        "number",
        1
      ]
    ],
    "crystal": [
      [
        "crystalCrown",
        "背結晶冠",
        "dorsal",
        "void",
        "buzz",
        1
      ],
      [
        "bodyCrystalShell",
        "結晶殻",
        "chest",
        "void",
        "buzz",
        1
      ],
      [
        "sensoryLens",
        "晶眼",
        "eye",
        "signal",
        "fizzbuzz",
        2
      ],
      [
        "crystalClaw",
        "結晶前肢",
        "forelimb",
        "void",
        "number",
        2
      ],
      [
        "crystalAntler",
        "枝晶角",
        "head",
        "signal",
        "fizz",
        2
      ],
      [
        "crystalTail",
        "尾結晶",
        "tailTip",
        "void",
        "buzz",
        1
      ]
    ],
    "manyeyes": [
      [
        "lateralEye",
        "側眼",
        "eye",
        "void",
        "fizzbuzz",
        3
      ],
      [
        "oralTentacle",
        "口元触手",
        "mouth",
        "tide",
        "number",
        2
      ],
      [
        "sideTentacle",
        "側触腕",
        "flank",
        "void",
        "fizzbuzz",
        2
      ],
      [
        "sensoryMembrane",
        "知覚背膜",
        "dorsal",
        "signal",
        "fizz",
        1
      ],
      [
        "sensoryTail",
        "触手尾",
        "tailTip",
        "void",
        "number",
        1
      ]
    ],
    "abyssshell": [
      [
        "spiralShell",
        "巻殻",
        "chest",
        "tide",
        "buzz",
        1
      ],
      [
        "segmentedArmor",
        "肩殻節",
        "flank",
        "tide",
        "buzz",
        2
      ],
      [
        "sensingAntenna",
        "感知触角",
        "head",
        "void",
        "number",
        2
      ],
      [
        "shellTentacle",
        "殻前触腕",
        "forelimb",
        "tide",
        "fizzbuzz",
        2
      ],
      [
        "shellSpines",
        "殻棘",
        "dorsal",
        "void",
        "buzz",
        1
      ],
      [
        "armoredTail",
        "殻尾",
        "tailTip",
        "tide",
        "buzz",
        1
      ]
    ],
    "parallel": [
      [
        "primaryArm",
        "肩主腕",
        "shoulder",
        "heat",
        "number",
        2
      ],
      [
        "auxiliaryArm",
        "側補助腕",
        "flank",
        "signal",
        "number",
        4
      ],
      [
        "gripLeg",
        "把持後肢",
        "hindlimb",
        "heat",
        "buzz",
        2
      ],
      [
        "supportPlate",
        "背支持器",
        "dorsal",
        "signal",
        "fizz",
        1
      ],
      [
        "jointTail",
        "節関節尾",
        "tailTip",
        "heat",
        "number",
        1
      ]
    ],
    "memory": [
      [
        "memoryPlate",
        "胸記憶甲",
        "chest",
        "signal",
        "buzz",
        1
      ],
      [
        "sidePlate",
        "側装甲",
        "flank",
        "signal",
        "buzz",
        2
      ],
      [
        "receiverPlate",
        "背受信板",
        "dorsal",
        "signal",
        "fizz",
        1
      ],
      [
        "mechanicalSensor",
        "機械センサ",
        "eye",
        "signal",
        "fizzbuzz",
        2
      ],
      [
        "articulatedArm",
        "装甲前肢",
        "forelimb",
        "signal",
        "number",
        2
      ],
      [
        "signalTail",
        "信号尾",
        "tailTip",
        "signal",
        "buzz",
        1
      ]
    ],
    "serpent": [
      [
        "additionalNeck",
        "副首",
        "shoulder",
        "heat",
        "fizz",
        2
      ],
      [
        "neckScales",
        "首分岐鱗",
        "chest",
        "tide",
        "buzz",
        1
      ],
      [
        "flameCrown",
        "炎冠",
        "head",
        "heat",
        "fizz",
        1
      ],
      [
        "hookedFin",
        "前鉤爪",
        "forelimb",
        "tide",
        "number",
        2
      ],
      [
        "serpentTail",
        "蛇尾",
        "tailTip",
        "heat",
        "fizz",
        1
      ],
      [
        "headHalo",
        "頭光輪",
        "outerOrbit",
        "heat",
        "fizzbuzz",
        1
      ]
    ],
    "solar": [
      [
        "solarRing",
        "日輪",
        "outerOrbit",
        "heat",
        "fizzbuzz",
        1
      ],
      [
        "luminousCrown",
        "光冠",
        "head",
        "heat",
        "fizz",
        1
      ],
      [
        "fireMembrane",
        "火膜",
        "shoulder",
        "heat",
        "fizz",
        2
      ],
      [
        "radiatingWhisker",
        "放射器",
        "flank",
        "signal",
        "fizzbuzz",
        2
      ],
      [
        "solarTail",
        "太陽尾",
        "tailTip",
        "heat",
        "fizz",
        1
      ]
    ],
    "antimeme": [
      [
        "absenceMask",
        "忘却面",
        "head",
        "void",
        "number",
        1
      ],
      [
        "unseenEye",
        "不在眼",
        "eye",
        "void",
        "fizzbuzz",
        1
      ],
      [
        "erasureCrown",
        "抹消冠",
        "dorsal",
        "void",
        "number",
        1
      ],
      [
        "memoryFilament",
        "記憶吸糸",
        "flank",
        "void",
        "fizzbuzz",
        2
      ],
      [
        "brokenTail",
        "欠章尾",
        "tailTip",
        "void",
        "number",
        1
      ]
    ],
    "valis": [
      [
        "receiverCrown",
        "受信冠",
        "head",
        "signal",
        "fizz",
        1
      ],
      [
        "observingEye",
        "観測焦点",
        "eye",
        "signal",
        "fizzbuzz",
        1
      ],
      [
        "revelationMembrane",
        "受信膜",
        "shoulder",
        "heat",
        "fizz",
        2
      ],
      [
        "lightKernel",
        "偏在光核",
        "chest",
        "signal",
        "fizzbuzz",
        1
      ],
      [
        "detachedNode",
        "漂遊衛片",
        "outerOrbit",
        "void",
        "number",
        3
      ],
      [
        "signalTail",
        "符号尾",
        "tailTip",
        "signal",
        "fizzbuzz",
        1
      ]
    ]
  }
};
  var signatures={
    abyss:['aquatic',210,'深海圧に適応する長い触腕と発光鰓','電位'],
    myth:['avian',38,'三足と重なる羽翼・黄金の冠','熱'],
    recursive:['ethereal',270,'多重焦点と再帰する首・思考膜','位相'],
    sail:['avian',185,'薄い光帆と広がる翼脈','偏光'],
    gravity:['ethereal',305,'浮遊衛体と湾曲する重力環','重力'],
    crystal:['crystal',265,'鋭い結晶鎧と屈折する瞳','偏光'],
    manyeyes:['crystal',320,'巨大な複眼と漂遊する眼群','広域電位'],
    abyssshell:['aquatic',175,'重なる貝殻と深海の鉤爪','圧力'],
    parallel:['crystal',22,'機械装甲と分岐する多関節肢','磁場'],
    memory:['crystal',150,'記憶殻と符号を刻む感覚塔','符号'],
    serpent:['serpent',12,'伸びる蛇体と枝分かれする首','赤外線'],
    solar:['serpent',45,'太陽環・燃える膜と放射冠','紫外線'],
    antimeme:['ethereal',245,'欠けた輪郭と漂う不在眼','位相'],
    valis:['ethereal',195,'受信膜・偏在光核と漂遊衛片','信号']
  };
  data.LINEAGES.forEach(function(l){var s=signatures[l.id];l.bodyFamily=s[0];l.hue=s[1];l.signature=s[2];l.sense=s[3];});
  data.CORE_PLANS=['aquatic','amphibian','avian','serpent','crystal','arthropod','jelly','cephalopod','botanical','whale','mechanical','ethereal'];
  var plans={abyss:'cephalopod',myth:'avian',recursive:'amphibian',sail:'aquatic',gravity:'ethereal',crystal:'crystal',manyeyes:'arthropod',abyssshell:'cephalopod',parallel:'mechanical',memory:'mechanical',serpent:'serpent',solar:'serpent',antimeme:'jelly',valis:'ethereal'};
  data.LINEAGES.forEach(function(l){l.bodyPlan=plans[l.id];});
  var extra=[
    ['jelly','◉','浮遊傘',['シェルム','ルミクラ','エアロネマ'],'ルミナ＝アンブラ','tentacles',[.65,0,.35,0],'jelly','ethereal',205,'傘と触糸が一体となり漂う浮遊生命','水流'],
    ['kelp','❧','植物共生',['ハナモル','フィトリア','花冠樹'],'フロラ＝ヴァイン','glow',[.2,.65,.15,0],'botanical','aquatic',135,'花冠・種子核・根がつながる光合成生命','化学'],
    ['whale','≈','星海鯨',['ウミモル','ホエリア','星海鯨'],'オルカ＝エオン','shell',[.8,0,0,.2],'whale','aquatic',215,'厚い胴と濾過器官・大きな尾びれ','音響'],
    ['swarm','⋈','群体節足',['コロニル','アラクネア','群星殻'],'ミリオ＝コロニー','limbs',[.25,.15,.5,.1],'arthropod','crystal',280,'節足・分節殻・群体感覚が連携する生命','振動'],
    ['plasma','☉','プラズマ生命',['ヒカリル','プラズミア','放射生命'],'イグニス＝ルーメン','glow',[.1,.4,.15,.35],'ethereal','ethereal',25,'流れる膜と光核が循環する高熱生命','電磁'],
    ['cephalopod','≋','深淵頭足',['マントル','セファリア','深淵頭足'],'クトラ＝マントル','tentacles',[.35,.05,.15,.45],'cephalopod','aquatic',310,'柔らかい外套と腕がつながる深海生命','圧力']
  ];
  data.ASSET_ALIASES={};
  var reused={
    jelly:[['abyss','frontTentacle','触糸','flank'],['sail','photonSail','傘膜','dorsal'],['gravity','orbitalNode','浮遊嚢','outerOrbit'],['valis','lightKernel','発光核','chest']],
    kelp:[['myth','wing','葉冠','dorsal'],['abyss','frontTentacle','根腕','forelimb'],['myth','tailFeathers','蔓尾','tailTip'],['valis','lightKernel','種子核','chest']],
    whale:[['abyssshell','segmentedArmor','濾過板','chest'],['sail','pectoralWing','胸びれ','shoulder'],['sail','forkTail','大尾びれ','tailTip'],['abyss','sensingWhisker','音響ひげ','mouth']],
    swarm:[['parallel','primaryArm','主節肢','forelimb'],['parallel','gripLeg','把持脚','hindlimb'],['crystal','bodyCrystalShell','分節殻','chest'],['manyeyes','lateralEye','群体眼','eye']],
    plasma:[['solar','solarRing','エネルギー環','outerOrbit'],['solar','fireMembrane','放電膜','shoulder'],['valis','lightKernel','放射核','chest'],['solar','radiatingWhisker','放電枝','flank']],
    cephalopod:[['abyss','frontTentacle','主触腕','mouth'],['abyss','tentacleMembrane','外套膜','shoulder'],['manyeyes','lateralEye','側眼','eye'],['abyssshell','spiralShell','外套殻','chest']]
  };
  extra.forEach(function(x){var l={id:x[0],mark:x[1],group:x[2],names:x[3],finalName:x[4],primary:x[5],niche:x[6],bodyPlan:x[7],bodyFamily:x[8],hue:x[9],signature:x[10],sense:x[11]};data.LINEAGES.push(l);
    data.PART_DEFINITIONS[l.id]=reused[l.id].map(function(a,i){var source=data.PART_DEFINITIONS[a[0]].find(function(p){return p[0]===a[1];}),id=a[1]+'_'+(i+1);data.ASSET_ALIASES[l.id+':'+id]=a[0]+':'+a[1];return [id,a[2],a[3],source[3],source[4],source[5]];});
  });
  data.LINEAGE_BY_ID = Object.fromEntries(data.LINEAGES.map(function (lineage) { return [lineage.id, lineage]; }));
  data.PART_GROUP_COUNT = Object.values(data.PART_DEFINITIONS).reduce(function (total, parts) { return total + parts.length; }, 0);
  return freeze(data);
});
