# A・Bとイメージモックの対応

[第4組・状態対応/1](observation-state-contract-v1.md)を意味/状態/計数の対応正本とし、遠景記号・近景絵柄・採用造形は維持する。群落の量/基部/年齢、Qの寄生I〜III/羽化IV、死骸/感染体/情報の役割を区別する。Qの成熟羽化例外以外の相/年齢独立性を維持し、旧モック内の栄養付き情報/三相Q等を復活させない。量機の追加分岐図は造形提案として保存し、実行アトラスは変更しない。

[植物・P・Qの造形対応/1](appearance-correspondence-v1.md)を今回の採用形と相/枝の正本とする。森冠/星冠は別系統の陸生生産者、浮遊して移動する淡水光合成体は別の一系統。Pは既存二系統のA/B/C形態×I〜III、QはI〜IIIと別画像の最終IVへ対応済み。画像枚数から種数を増減せず、機械ID/専用値/配置容量/実装用素材は後続接続とする。群落量/被食/老化/相を区別し、今回保存した8画像は実行用アトラスではない。

[量機/1](ryouki-v1.md)は別の独立主生物。通常型の初回の平たい菱形/長い脚、相変異1〜3の背面だけ黒/4の黒と深緑を正とする。[採用3図と原案5点](../ryouki-v1/README.md)を保存し、通常III3→IV6の新しい9身体は**造形提案**と区別する。追加図の線/矢印は採用せず、親子対応は仕様表を使う。相変異の低密度継続による解除と進化相の後退を混同しない。

## 現在の参照方法

モックを元に決めた条件はA・Bの仕様本文へ反映し、画像実体はdesign配下へ保存して参照する。Nodeへ画像そのものを複製しない。本表はA1、B5.2、B5.3から参照する共通の対応表。仕様の正本は[仕様索引](README.md)、現在の採用と作業範囲は[UI・バランス決定稿](ui-balance-baseline-v1.md)。

「画像が保存されている」「方向を採用した」「全差分の作画が完成した」「製品へ実装・検証した」は別の状態。現状は決定済み仕様・採用造形と、未完の作画/実装差分を併記する。

## 基本から細部までの対応

|対象|Aの仕様責務|Bの機能責務|イメージ資料|採用・読み方|
|---|---|---|---|---|
|基本システム・食物網・同期進行|A1/A1.7|B4/B4.4/B5.2|[統合説明一枚画像](atlas-v1.3/ecology-system-master.png)、[読む順序](atlas-v1.3/README.md)|全体構造の説明。v1.4〜v1.8で更新した条件は最新本文を優先|
|遠景と近景の構成|A1/A1.2|B5/B5.3|[遠景](../visual-alignment-v4/far.png)、[近景](../visual-alignment-v4/near.png)|遠景は存在/位置の記号、近景は詳細。別生成画像の座標・個体数の不一致は採用しない|
|同じ世界の遠近・重なり|A1.2/A1.7|B5.3|[場面遠景](../scene-mock-v1/01-far.png)、[場面近景](../scene-mock-v1/02-near.png)、[重なり・縮尺](../scene-mock-v1/03-overlap-density.png)|同セルの主/餌/資源/死骸、H→P→Qを区別。実装では同じID/セルから描く|
|背景・地形・障害物|A1.2|B4/B5/B5.3|[地形素材](../asset-mock-v1/01-terrain.png)、[地形の接続](../scene-mock-v1/06-terrain-edges.png)|自然な連続地形の描画基準。6事前地形と限定ランダム化はv1.6本文に従う|
|一般主生物の基本形|A1.1|B5.1/B5.3|[主役1〜7](../asset-mock-v1/02-main-a.png)、[8〜14](../asset-mock-v1/03-main-b.png)、[15〜21](../asset-mock-v1/04-main-c.png)|案出し前の描画・材質・色彩・生命感の基準。最新採用で変えた特殊3種の形は下表を優先|
|餌・植物・菌・資源|A1.2/A1.6/A1.7|B4.3/B4.4/B5.2/B5.3|[餌と資源](../asset-mock-v1/05-food-resources.png)、[量・環境・鮮度](../scene-mock-v1/04-food-states.png)|基部と可食葉、量と鮮度、環境差を区別。外見差を別資源ID/無償生成へ変換しない|
|情報と延長された表現型|A1.2/A1.4/A1.5|B4.1/B4.2/B5.2/B5.3|[寄生と情報](../asset-mock-v1/06-parasites-information.png)、[特殊生活環](../scene-mock-v1/07-special-lifecycles.png)|情報は滞留/浮遊するエネルギー状の表現。水平伝播や全域操作にはしない|
|移動・攻撃・防御・採食|A1.1/A1.4/A1.7|B4/B4.1/B5.3|[動作素材](../asset-mock-v1/07-motion-actions.png)、[相互作用](../scene-mock-v1/05-interactions.png)|確定イベントの演出。失敗した移動・命中・栄養移転を成立したように描かない|
|出生・進化・宿主変化|A1.1/A1.3/A1.5|B4.2/B5.2/B5.3|[生活モーション](../asset-mock-v1/08-motion-life.png)、[特殊生活環](../scene-mock-v1/07-special-lifecycles.png)|出生は第一相・幼体。演出による無償全快や寄生群の地表個体化をしない|
|第三相3枝・第四相6枝|A1.1|B5.1/B5.2/B5.3|[日輪](../branch-mock-v1/01-solar.png)、[浮遊傘](../branch-mock-v1/02-jelly.png)、[日輪の強調案](../creature-design-review-v2/02-branches.png)|日輪の強調分岐は確認済み。全系統の全枝作画完成ではない。名称・条件は本文を優先|
|量機の通常型/相変異|A1.1/A1.4/A1.7|B4.1/B5.1/B5.2/B5.3/B5.6|[通常I/II](../ryouki-v1/01-normal-i-ii.png)、[相変異1〜3](../ryouki-v1/02-density-i-iii.png)、[相変異4](../ryouki-v1/03-density-iv.png)、[通常枝の提案](../ryouki-v1/04-normal-branches-proposal.png)|最初の3図は採用参照、最後は未採用提案で矢印除外。通常は青緑/金、相変異だけ背面黒・4は黒と深緑。全身黒/筒状案へ戻さない|
|雌雄・階級|A1.3/A1.7|B5.1/B5.2/B5.3|[確認済みの雌雄・階級](../branch-mock-v1/03-sex-caste.png)、[後続の比較案](../creature-design-review-v2/03-sex-options.png)|見分けられる輪郭差はv1.6へ反映済み。後続A/B比較のどちらかを選択済みとはしない|
|幼体・成体・老齢|A1.1/A1.3/A1.6|B4/B5.2/B5.3|[同じ第三相での年齢比較](../creature-design-review-v2/01-age.png)|年齢と進化相は独立。全相に全年齢があり得る。能力はv1.8、境界はv1.7を優先|
|独立陸生植物|A1.1/A1.6|B4.3/B5.2/B5.3|[森冠と星冠の基本相](../creature-design-review-v3/03-land-plants.png)、[森冠の枝](../appearance-baseline-v1/07-forestcrown-branches.png)、[星冠の枝](../appearance-baseline-v1/08-starcrown-branches.png)|別系統の生産者。本体一個体/有限可食量、定着/近隣繁殖、III3→IV6。年齢は別軸、画像内寸法は確定値ではない|
|移動する淡水光合成体|A1.1/A1.2/A1.6|B4.1/B4.3/B5.3|[四相](../appearance-baseline-v1/01-freshwater-phases.png)、[採用した分岐](../appearance-baseline-v1/02-freshwater-branches.png)|完全浮遊で局所移動。根/接続枝/泳法を付けない。分岐図は造形だけを参照し、航跡を除外。IV-3bの欠けは被食状態例|
|一次寄生P|A1.5|B4.2/B5.1/B5.3|[潮環](../appearance-baseline-v1/03-tideparasite-phases.png)、[葉環](../appearance-baseline-v1/04-leafparasite-phases.png)|各系統のA付着/B潜行/C被覆×I〜III。形態/相/宿主段階を別軸にし、宿主付随/群体/無雌雄を維持|
|高次寄生Q|A1.5|B4.2/B5.1/B5.3|[元図のI〜IIIのみ](../appearance-baseline-v1/05-hyperparasite-source-i-iii-only.png)、[最終IV](../appearance-baseline-v1/06-hyperparasite-adult.png)|珠状→連結珠状→網状→翅なし自立形。元図の旧IVは除外。採用造形だけで羽化条件/感染能力を変えない|

## 特殊生物の形の参照

|対象|A/Bの接続先|採用画像と区画|実装時の扱い|
|---|---|---|---|
|植物共生|A1.6 / B4.3・B5.3|[v5植物共生](../creature-design-review-v5/01-symbiont-8.png)の**05：下段左端**|流動的な身体と内部共生体の配置を保持|
|社会性生物|A1.3・A1.7 / B4・B5.3|[v5社会性](../creature-design-review-v5/02-social-8.png)の**01：上段左端**|低い環状の身体と支持部/信号部を保持。一図一個体|
|早成生物|A1.1・A1.3 / B4・B5.3|[v5早成](../creature-design-review-v5/03-precocial-8.png)の**08：下段右端**|低く広い薄片防護の身体を保持。第三相完結|
|旧海生光合成体02|海の将来拡張の参照|[v5海生](../creature-design-review-v5/04-marine-8.png)の**02：上段左から2番目**|今回の淡水系統へ使わない。現行六地形に海専用マップはなく、海生系統/塩分/海流の追加は保留|

採用図は**形・構造の参照**。実装用の絵は[素材](../asset-mock-v1/README.md)、[場面](../scene-mock-v1/README.md)、[分岐](../branch-mock-v1/README.md)の案出し前モックに、描線・材質・色・発光・生命感を合わせる。候補紙をそのまま縮小してスプライトへ貼らない。[今回の保存台帳](../appearance-baseline-v1/registry.json)は元画像名/ハッシュ/採用区画/除外区画を持つ。

## 旧案・未完の扱い

- v2の旧寄生/特殊、v3の旧特殊/海生、v4以前の却下された体制案を最新の採用形へ混ぜない。v4の8方向は多様性の参考であり、製品の完成した造形ではない。
- 古い索引や画像にある旧条件・仮生物・誤記は仕様にしない。現行本文、決定稿、採用区画を優先する。外観の手掛かりから生態能力・食性・射程・感染経路を追加しない。
- 代表図だけの項目について、全系統/全枝/全年齢/全方向の画像が揃っているとはしない。実装用アトラス、動作、実寸の判読性、生存バランスは後続の対象。
- 植物/P/Qの造形対応は上表と[現在正本](appearance-correspondence-v1.md)へ採用済み。専用値/正式ID/配置容量/形態判定の細部/素材化は後続。決定稿への採用を、未決定の数値や全年齢の素材が完成したことへ読み替えない。

## 今回の照合・反映範囲

量機の既存15A/B Nodeの責務内でFLOW-05/対象判断FLOW-04を接続する。[量機の契約](../../operations/plans/ryouki-ab-v1.md)に従い、採用3画像/原案5点と追加造形提案1画像を区別して保存する。新規Node/分割/正式状態変更なし。植物/P/Qの[採用台帳](../appearance-baseline-v1/registry.json)と[反映記録](../../operations/logs/appearance-correspondence-ab-v1.md)は維持する。core・C/D/E・src/tests・実行用素材・製品版は変更しない。画像実体/ハッシュ/リンク/採用範囲とManifestの現在参照を照合する。

## 現在の制作接続（4.2.2）

全系統が完成対象。[全31系統の専用差分台帳](../dedicated-variants-v4.2.2/coverage.md)を参照。主21系統の専用枝183枠は製品へ接続し、雌雄/年齢/階級/寄生/下層差と最終外観は未完として分離。これまでのモックの採用範囲を狭めない。
