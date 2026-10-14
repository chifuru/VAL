# Desktop ENGINE 1: C具体化係数と状態契約

実装: `src/composite/creature-engine.js` / `lineage-definitions.js`。検証: `tests/desktop-growth.test.cjs`。
14系統・75部位群は承認済みの責務に沿って `lineage-definitions.js` へデータ化し、全定義をdeep-freezeした。画像座標・URI・再生時計・記録I/OはENGINEに置かない。

## 摂取と1000行較正

- 行分類はFizzBuzz優先、次にFizz/Buzz/通常数字。食品種は必ず1つ。
- 数字の促進/抑制は既存の3/5剰余規則。次の栄養1回へ最新調節だけを適用し、その摂取で中立へ戻す。
- 有効energyは四分の一単位整数。栄養のquarters増分=4+適用modifier（促進5/中立4/抑制3）、数字は0。
- 1000行でenergyQuarters=1801、energy=450.25。P=min(100,100*energyQuarters/1801)。相は整数比較で28/62P、成熟は1801quarters。
- 行279/280は501/505quartersで相0→1。行620/621は1113/1117で相1→2。行999/1000は1797/1801で未成熟→成熟。
- Nで分母を変更しない。DNA・環境・速度は全体energyの増分を変えない。同じFizzBuzz共通接頭部分は同じP。
- 1000行の集計: 数字533/Fizz267/Buzz134/FizzBuzz66、促進267/抑制266。
- `lastMeal={kind,modifier,quarters,sequence}`。数字のmodifierは現在選んだ調節、栄養のmodifierはその摂取へ実際に適用した調節。
- controllerは行消費ごとにlastMealと一時的な飛来エネルギーイベントを作り、ENGINEの状態と同じ摂取を描画する。演出時計は形態計算へ含めない。

## DNA生成と実効写像

N全体をMurmur型32bit拡散後にxorshift32へ渡し、body/appendage/senses/skin/aptitude/sensitivityの6軸を0〜1で決定。DNAはdeep-freezeする。

| 軸 | 実効性 |
|---|---|
| body | 胴の縦横比、頭/尾/殻の厚み、胴組織へのenergy配分 |
| appendage | 尾の長さ、ひれと肢の縦横比、尾/ひれ組織配分 |
| senses | 頭・眼の比率、眼間隔、頭/眼組織配分 |
| skin | 栄養色への小さい個体差、表皮pattern0〜3、殻組織配分 |
| aptitude | 肢の形/組織配分、qualified器官IDごとのXP親和性 |
| sensitivity | 摂取時modifierが身体組織と器官の発現へ作用する振幅 |

感受性による発現倍率 = `1 + .18 * sensitivity * appliedModifier`（常に正、.82〜1.18）。これは組織/器官への配分だけを調節し、全体P較正を変更しない。過去の組織energy/XPを減算しない。

## 七つの身体部位

部位順序: torso/head/eyes/tail/fin/limb/shell。
組織親和性 = `.84 + .32 * 対応DNA軸`。各栄養摂取で組織energyへ `quarters * 親和性 * 発現倍率` を非負加算、6桁へ丸める。数字摂取は組織energyを増やさないが、次の栄養発現へ作用する。

全身growth = `clamp(.75 * P/100 + .25 * tissueEnergy/1801,0,1)`。全七部位に連続量を持たせる。BODY levelはgrowthの四区間から1〜4で表し、器官Lv0〜3と区別する。

- 体積V=1+2*(P/100)、線形倍率=cuberoot(V)。
- scaleX = DNA縦横比X * (.68+.32*growth) * 線形倍率 * (1+stage*.035) * 系統profileX。
- scaleY = DNA縦横比Y * (.70+.30*growth) * 線形倍率 * (1+stage*.025) * 系統profileY。
- 胴比率: X=.82+.36*body、Y=1.13-.26*body。
- 頭: X=.88+.24*senses、Y=.91+.18*body。
- 眼: X=.76+.40*senses、Y=.82+.34*senses。
- 尾: X=.75+.50*appendage、Y=.88+.24*body。
- ひれ: X=.76+.40*appendage、Y=.82+.32*aptitude。
- 肢: X=.83+.30*aptitude、Y=.82+.32*appendage。
- 殻: X=.90+.20*skin、Y=.89+.22*body。
- variantは対応DNA軸の四区間で0〜3、patternはskinの四区間で0〜3。
- 眼のspacing=.10+.10*senses+.03*growth（身体局所の正規化比率）。肢visibility=.10+.70*P/100+.10*stage、殻visibility=.10+.70*P/100+殻primaryなら.20、いずれも0〜1へclamp。

系統profileは14種類それぞれ七部位の縦横係数を持つ。ENGINEの `BODY_PROFILES` を正とし、同DNA/Pでも全部位profileが14種類で異なることをテストする。単にprimary5カテゴリだけで共通身体を同一にする実装を避けた。較正係数は概ね.92〜1.22で、DNAという個体識別は保持しつつ系統による基礎身体の表現を変える。rendererはこのscale/variant/pattern/spacing/visibilityを骨格・素材へ接続する。

## 色

栄養無しは中立RGB[142,169,182]。栄養は排他的件数比率でFizz[87,167,225]/Buzz[232,204,106]/FizzBuzz[181,132,213]を混色する。数字は第4色として混ぜない。
skin個体差は`(skin-.5)*16`をRGBそれぞれ[1,-.35,.65]倍だけ加え、0〜255へclampし整数化する。同栄養比率で数字数だけを変更しても色は同じ。

## 七十五器官群

qualified XPキーは `lineageId:partId`。memoryとvalisのsignalTailを混同しない。

- 部位の環境一致+1、餌種一致+1（両方一致+2）を基礎点とし、DNA器官親和性と感受性発現倍率を掛ける。
- 器官親和性はqualified IDのFNV32 hashを位相にし、`.8+.4*(.5+.5*cos(2π*(aptitude-phase)))`で.8〜1.2。非決定的乱数は使わない。
- XPは単位点の正の累積値。6桁へ丸め、上限で打ち切らない。
- 解放閾値はXP1/180/600でLv1/2/3。既存1/6/16より時間を延ばし、相が変わった瞬間の一斉Lvアップをしない。
- growthはLv内でも連続。XP1〜180: .12→.40、180〜600: .40→.82、600以降は`.82+.18*(1-exp(-(XP-600)/300))`で1へ漸近。
- 閾値は「全器官を成熟時Lv3に揃える」条件ではない。適性/環境/食餌で個別にLv1〜3の差を保つ。七つの基礎身体部位は別途、必ず連続成長する。
- countは確定defの第6項。個別部位群に対応する左右2、側眼3、補助腕4などをrendererが必要数描く。XPは群の責務でありcount個の別XPノードを機械的に作らない。

## 相遷移と継承

1. 行の餌/環境とenergy、組織、現在系統器官のXPを更新。
2. その行で相境界を越えたら、最終摂取を含む現在系統の全Lv>0器官、anatomy、colorをheritageへ保存。
3. 相内環境累積65%/直近12行35%と直近12餌の小さい加点で14系統から選択し、historyへ記録。前系統やDNAで種族を固定しない。
4. 相内situationだけを初期化し、既存partXp/tissueEnergy/heritageを保持する。

変容を起こす餌は変容前の現系統へXPを与える。新系統の器官は次の摂取から育つ。同系統を選び直した場合も旧snapshotを保持し、rendererがqualified IDごとに最大Lv/XP/growthへマージして二重描画を避ける。データを先頭3個へ切る処理はない。

## appearanceFor状態契約

```text
{
  version:1, seed, dna, stage:0|1|2, points, progress:points/100,
  tier:1..4（現在相内の発達区間）, matured, lineage:null|string,
  color:[r,g,b], volume,
  anatomy:{torso,head,eyes,tail,fin,limb,shell},
  organs:[{id,label,lineage,anchor,level,xp,growth,count}],
  inheritedOrgans:[同形式]
}
```

各anatomyはgrowth/level/scaleX/scaleY/variant/pattern/count、eyes追加spacing、limb/shell追加visibility。画像位置は含めない。全appearanceをdeep-freezeする。

成熟行の食品数・XP・組織更新後にfinalAppearanceを保存。以後の摂取はlastMeal/食品カウント/調節履歴/energyを更新できるが、XP/組織/phase/lineageとfinalAppearanceは変更しない。実際の1000行では成熟は最終行なので、その後の摂取は低レベルAPI継続確認に限る。JSON保存後もfinalAppearanceをそのまま復元し、食品数から無断再計算しない。

## 検証境界

15件の実Nodeテストで整数境界、小N、元FizzBuzz、不正入力、latest modifier、75群typed metadata、14系統実履歴到達、全6VALIS器官継承、Lv内growth、七部位の連続成長、14基礎profile、全6DNA単独因果、栄養色、成熟freeze、JSON再開/処理chunk同値、browser/Node UMD同値を確認した。

画像の素材品質、骨格への実結合、摂取モーション、実個体記録UI、デスクトップ配布物実行はENGINEテストの認定範囲に含めない。
