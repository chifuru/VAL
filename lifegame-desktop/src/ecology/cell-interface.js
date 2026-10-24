/* Presentation/configuration adapter. It never initializes or advances a world. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./state.js'):root.EcoState);if(typeof module==='object'&&module.exports)module.exports=api;else root.EcoCellInterface=api;})(globalThis,S=>{
 'use strict';
 const version='cell-setup-guide/1',model='cell-reorganization/1',enabled=config=>config?.cellModel===model,
  fields=['soilQuality','temperature','landPH','waterPH','mineralLevel','mineralInput','rainScale','lightScale'];
 function settings(config){if(!config||config.cellModel===undefined)return null;if(!enabled(config))throw Error('未知のマス設定モデルです。');return S.CellSpace.settings(config.cellSettings);}
 function defaults(config){const current=settings(config);return current?S.CellSpace.settings(current.aquaticProfile?{aquaticProfile:current.aquaticProfile}:{}):null;}
 function connect(base,reference){
  const environment=settings(reference);if(!environment)return base;
  if(!base?.producerSettings?.land||!base.producerSettings.water)throw Error('生産者の初期設定を読み取れません。');
  const next=structuredClone(base);next.cellModel=model;next.cellSettings=environment;if(reference.currentStateModel!==undefined){if(reference.currentStateModel!=='current-state/1')throw Error('未知の現在状態モデルです。');next.currentStateModel=reference.currentStateModel;}next.observationMode='custom';
  next.generationSettings={...next.generationSettings,mode:'manual',profile:'auto',locks:[]};next.producerSupport={enabled:false};
  if(next.advantageSettings)next.advantageSettings.producer=false;
  for(const region of ['land','water'])next.producerSettings[region]={...next.producerSettings[region],capacityB:20,regrowthB:2};
  return next;
 }
 const card=(title,body)=>'<article class="sheet-card"><h3>'+title+'</h3><p>'+body+'</p></article>',
  grid=rows=>'<div class="sheet-grid">'+rows.map(([a,b])=>card(a,b)).join('')+'</div>';
 function guide(name,w){
  if(!enabled(w?.config))return null;
  if(name==='system')return '<section data-cell-guide="system"><h2>マスの有限資源と、多層の生態系</h2><div class="flow">固定環境・0次養分 → 所在マスの生産と採食 → 維持・成長・出生 → 死骸・分解 → 次ターンの養分</div>'+grid([
   ['0〜5次は空間占有層','0次は土壌・鉱物などの基礎養分。1次は低次植物6群落、2次は定着する高次植物3個体、3次は低次動物5小集団、4次は主生物側の定住3枠、5次は分解者6群落。同じマスで層を越えて共存します。番号は捕食順位ではなく、食性・グラフ分類・情報の役割とは別です。'],
   ['共有する有限在庫','生物は実際にいるマスの資源だけを取得します。同種も異種も、水・0次養分・可食部・死骸などの利用が重なれば競争します。要求をまとめて配分し、先に処理された生物だけが取り尽くす仕組みにしません。未占有マスからの遠隔取得はありません。'],
   ['固定環境と変動する在庫','雨の基準量・光量・気温・pH・土壌の質は初期条件から固定。光量は光合成条件をまとめた軸で、CO₂を別在庫として消費しません。水・無機養分・可食量・有機物は収支で変わります。水域の水量は土壌保水量と別です。天候変化や巨大植物は今後の課題です。'],
   ['定住と移動','4次は定住と移動の2状態。定住は3枠、移動中も合わせた物理枠は5枠。量機の相変異型だけは定住1枠に3個体まで入り、3枠で9個体を保持できます。内部人数を持つ低次動物とは別の実個体です。動く淡水光合成体も4次ですが、食物網では生産者です。'],
   ['同じターンの資格と次ターンの物質','開始時の相・身体・所在資格を使い、移動は実到達先へ接続します。既存の葉を食べて当ターンの維持へ使えますが、新葉・新生・一般利用の新死骸・還元物質・新情報は原則次ターンから。撃破者や捕獲者の限定取得は一般の死骸採食と分け、二重取得しません。'],
   ['人口・群数・生物量を分ける','グラフの人口は主生物/独立植物が個体、基底植物/分解者が群落、低次動物が内部人数、P/Qが生存群体。群数・定住枠数は別です。生物量ピラミッドは実際のB量で、人口や占有枠から換算しません。情報は栄養ではありません。']
  ])+'</section>';
  if(name==='food'){
   const bounds=(kind,phase=1)=>S.CellLife.bounds({phase,cellLife:{kind}}),low=bounds('colony'),fungus=bounds('fungus');
   return '<section data-cell-guide="food"><h2>同じマスで循環する食物網</h2><div class="flow">光・水・無機養分 → 低次/高次植物 → 低次動物・植物食 → 捕食・死骸食 → 分解者 → 0次へ</div>'+grid([
    ['低次植物：最大6群落','1群落の基部は'+low.base+' B、可食上限は'+low.edible+' B。内部の株を一体ずつ数えず、通常採食では基部を残します。葉量と実取得した光・水・養分に応じて生産・維持・繁殖・衰退します。枠が増えても、初期の占有面積率や群落数を自動で6倍にしません。'],
    ['高次植物：最大3個体','相がI/II/III/IVと進むと基部2/4/6/8 B、可食上限10/20/30/40 B。占有枠を増やさず、身体と維持負担を増やします。低次植物と同じ水/0次養分を共有し、受光は実際の葉面・高さ等から調停します。層番号だけの固定優先はありません。'],
    ['低次動物：5小集団・各8体まで','植物食の一次消費者です。水游虫と草棲虫は所在マスの低次/高次植物の可食部を利用します。内部で成熟・出生・部分死亡が起こり、7〜8体の群れは条件が良ければ3体を分けて近傍へ進出します。分群で人数・栄養・P/Qを複製しません。'],
    ['主生物の食性と直接捕食','植物・動物・菌など、各系統の食性と実際の不足に応じて取得します。生きた小集団からの捕獲、主生物の戦闘死、死骸採食は別の成立条件です。植物共生体は光合成と小型動物食を行う例外で、通常植物に捕食を追加しません。'],
    ['分解者：最大6群落','菌膜は基部'+fungus.base+' Bと可食上限'+fungus.edible+' B。死骸や有機物を利用し、植物とも水/養分が競合します。通常菌食で基部を残しても、入力不足が続けば消失します。古い死骸は有限量ずつ分解し、軽い腐敗負荷は温度・水分・pH・土壌条件とともに作用します。'],
    ['餌量と在庫の違い','可食B、自由なE/M、身体に結合したM、死骸B、現在の有機物と次ターン待ちは別の値です。光や明示した境界入力を除き、時間経過や生存状況を見た無償補充で食物を作りません。情報・感染量・卵も生きた個体数へ加算しません。']
   ])+'</section>';
  }
  if(name==='action')return '<section data-cell-guide="action"><h2>移動・定住と、局所の競争</h2>'+grid([
   ['満員でも通過できる','定住3枠が満員でも、物理枠と通行条件を満たせば移動・通過・採食・攻撃の機会があります。4体目の通常定住は認めず、既存定住者を優先します。地形・障害物・費用・危険の評価は残り、全地点への到達は保証しません。'],
   ['行動はパラメータの組合せ','攻撃・逃走・場所への愛着・探索・群れなどは、本人の経験、系統傾向、親子・接触・情報の影響を受けた重みから生じます。空き枠競合の再現可能な抽選は、細かな位置関係や場所を発見する機会をまとめたものです。'],
   ['密集の利益と負担','密集への直接罰・定住期限・強制追放・集団戦闘ボーナスを追加しません。有限資源の競合と各個体の接触/攻撃機会から、防波堤にも負担にもなります。戦闘距離は実際のマスを使い、表示用の位置分けでは変わりません。'],
   ['移動・作用・採食は別判定','同じターンに成立し得ますが、毎回すべてを強制しません。対象・資源・費用・資格がある場合だけ行います。定着高次植物は移動せず、動く淡水光合成体は主生物側の移動/定住枠を使います。群落移動は対象種の選定が残るため、全群落の実装済み能力とはしません。']
  ])+'</section>';
  if(name==='birth')return '<section data-cell-guide="birth"><h2>実資源から成長し、第一相の子を残す</h2>'+grid([
   ['年齢と相は独立','主生物と独立植物の成熟/寿命、経験から進む相は別です。成熟すればI/IIでも繁殖できます。子は第一相・年齢0。植物は生産・繁殖拡散・耐食のIII三枝/IV六経路を維持し、進化だけで身体や蓄えを無料補充しません。'],
   ['維持と形成の予算','当ターンの維持と実在する蓄えを確認し、成長・再生・出生の費用を予約して一度だけ支払います。新しい組織もEと身体Mを使い、同じ費用を再生と繁殖へ二重に回しません。空き枠や資源がなければ失敗し、出生を強制しません。'],
   ['群落と小集団の世代','低次植物/分解者の成立後Tを内部全体の年齢とせず、一斉寿命死させません。低次動物は内部コホートごとの年齢・相・人数で世代交代し、分群した人数は同じターンに再分群/再出生しません。'],
   ['新生体の利用時点','出生した個体・新しい葉・還元された物質は、次のターンの資格へ接続します。親と子のID/身体/蓄えを別にし、同居や分群だけで寄生群体や遺伝情報の受取を複製しません。']
  ])+'</section>';
  return null;
 }
 function treeNote(species){
  if(species==='ryouki')return '新しい定住枠では、通常型は1枠1個体、相変異型だけ1枠3個体。3枠で最大9個体、移動は1個体1枠です。密度が下がって必要期間を満たしても、通常の1個体枠を確保できない間は解除待ちとなります。';
  return species==='freshwaterlight'?'動く淡水光合成体は生産者の食性を保ち、4次の移動/定住枠を使います。定着植物の600T基準や相別容量を流用せず、専用の寿命・成熟・膜量を使います。':'定着高次植物は同マス最大3個体。相ごとの基部2/4/6/8 B・可食上限10/20/30/40 Bを使い、維持・再生・出生は同じ有限予算から支払います。低次植物と水/0次養分を共有し、移動しません。';
 }
 return {version,model,fields,enabled,settings,defaults,connect,guide,treeNote};
});
