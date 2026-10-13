# 画像合成 工程4 — 全対象パーツ統合草案（2026-10-14）

状態: **草案 / 実画質未承認 / GAS未配信**。対象: C1.5.2 / D1.3.2。実装ブランチ: `work/valis-full-mock-baseline-20261014`（Draft PR #1）。

## 由来と優先順位

- 正本造形の優先度: C01〜C09の9中核モック > 旧13案・VALIS混合案・UIモック等の参考案。全モックを参照対象とするが正本順位を混ぜない。
- 元の`fizzbuzz_core_9_mocks_20261013.zip`と`fizzbuzz_image_composite_v42.zip`に含まれる原PNG/改善肖像は、このGitHub作業環境にバイナリがない。原本9PNGと改善24肖像のGitHub保全・SHA256再計算・輪郭/背景/ラベルの目視照合は**未実施**。
- GitHub自己完結HTML内の**既存68点**はそのまま保持: 共通コア2 PNG、反記銘/VALISの11器官×3Lv＝33 PNG、旧12系統の相II/III暫定肖像24 WebP、閲覧用サムネイル9 JPEG。これらは元9PNG原本と同義ではない。
- 欠落を補う**新規36点**はコード生成の透過SVG**仮器官画像**。元のモックから実画素を切り出したものではなく、正規の高画質128px PNGレイヤーとも称しない。各レベルの幾何は異なる。既存partImagesキーに実素材があれば仮SVGを上書きしない。

## 全14系統の対応

| 系統 | 生体器官ID（既存engine） | 仮画像の描画意図 | 状態 |
|---|---|---|---|
| abyss | abyssHeritage | 潮流触肢：触手数・長さの変化 | SVG Lv1〜3 草案 |
| myth | mythHeritage | 神鳥翼紋：羽状重なり | SVG Lv1〜3 草案 |
| recursive | recursiveHeritage | 枝角：再帰的な分岐 | SVG Lv1〜3 草案 |
| sail | sailHeritage | 光帆：膜面の重なり | SVG Lv1〜3 草案 |
| gravity | gravityHeritage | 重力環：同心環の増殖 | SVG Lv1〜3 草案 |
| crystal | crystalHeritage | 星晶：結晶片の増殖 | SVG Lv1〜3 草案 |
| manyeyes | manyeyesHeritage | 側眼：眼の追加 | SVG Lv1〜3 草案 |
| abyssshell | abyssshellHeritage | 深殻：層板の成長 | SVG Lv1〜3 草案 |
| parallel | parallelHeritage | 多腕：左右腕数の変化 | SVG Lv1〜3 草案 |
| memory | memoryHeritage | 記憶甲：胸部記銘片 | SVG Lv1〜3 草案 |
| serpent | serpentHeritage | 蛇頭：枝頭数の変化 | SVG Lv1〜3 草案 |
| solar | solarHeritage | 日輪：環と光条の追加 | SVG Lv1〜3 草案 |
| antimeme | 5器官 | 既存の透明PNG 5×3=15枚 | 既存素材維持、個別の画質再審査待ち |
| valis | 6器官 | 既存の透明PNG 6×3=18枚 | 既存素材維持、個別の画質再審査待ち |

## 実装上の境界

- 旧12系統の第二/第三相24点は**全身を含む暫定肖像**としてそのまま使用。二重の幼体コアは重ねない。その肖像の前面に`part.level`に応じた独立SVG仮器官を描画する。真正な「部位分解」はまだ済んでいない。
- 反記銘/VALISは従来どおり後景器官→不変コア→過去相の継承器官→前景器官で合成。旧12の仮器官も`phenotype`・`heritage.parts`の既存成長/継承ルールを使用する。
- SVGは透明背景で外部参照なし、ブラウザでImageにロードできる独立`data:`画像。実機デコード/画素の透明率/接続位置/見切れは工程5のブラウザ検証待ち。UIの表示は`MOCK PORTRAIT + DRAFT Lv ORGAN`とし、完成器官と区別する。
- `src/composite/draft-organ-sprites.js`を`app.js`の前に同一スクリプトへ組み込む。自己完結HTML2本を一致させ、68点の埋め込みソース画像データURIを変更しない。`src/Index.pixel-legacy.html`、`Code.gs`、`valis/core`は変更しない。

## 受入れ待ち（完了と呼ばない）

1. ZIP原本・改善24肖像の再取得と原寸/SHA照合、原本を加工せず版管理に登録。画像の出所・二次創作差分と利用条件を明示。
2. C01〜C09と他参考案を並置して、旧12の真の分離透過PNGを部位ごと/相ごと/Lvごとに作り、背景・余計な文字・輪郭・透明画素を検査。
3. `npm test`・`npm run check:composite`、Chromiumの全14系統×Lv1/2/3・交差継承・履歴・狭幅表示、実GASを個別実測。旧系統はまだ「全身肖像＋仮器官」であることをD1.3.2の判定に残す。
4. 人間によるシルエット・継承・C01〜C09比較と画質判断。第4相の解放・表示は引き続き未実装。

この文書は実装草案の資産台帳であり、E層の検証証跡または正式な画質PASSではない。

## 工程4追補 — バンドル済み画像の個別復元（草案）

GitHubの既存実行HTMLへ埋め込まれていた画像68点（PNG35、WebP24、JPEG9）を**データURIを再符号化せず、バイト単位で同一のファイル**として `assets/` 配下へ格納した。`assets/composite-asset-ledger.v42-draft.json` に相対パス・MIME・byte数・Git blob SHA-1を登録し、`npm run check:assets` により実行HTMLと抽出原本の完全一致・RGBA型・画像形式を検証できる。原画の不変性および参照元の追跡性のための復元であり、画質改善ではない。

編集用の一覧 `design/stage4-asset-review.html` に14系統の相II/III肖像と36のSVG仮器官、2系統の33枚のPNG Lv器官、およびC01–C09の縮小JPEG見本を同時展示した。現段階では旧12系統はベクター仮器官であり、原画から透過切出しした完成PNGではない。ZIP原本9点・改善24肖像の画像データやそのSHA一致確認は引き続き欠落。正式受入れではなく比較作業面の整備である。
