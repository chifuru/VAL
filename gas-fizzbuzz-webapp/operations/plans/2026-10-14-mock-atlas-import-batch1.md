# 参考モック実装便1 — C01深海 / C02神鳥のLv器官切り出し

日付: 2026-10-14、状態: **草案 / 画質未承認 / GAS未公開**。ベースmain `ac07bba400ca88f0d25be6d334ea217261149bec`。
責務: C1.5.2 実装、D1.3.2 検証。core3定義・承認済み36 Node・GAS Code.gs・FizzBuzz出力形式は不変。

## 指示と入力

ユーザーが提示した参考モック（高解像度進化アトラス・深海種・神鳥竜・VALIS異化・反記銘・UI等）を**実際の参考画像**として扱う。ユーザー添付の原寸PNGはGitHubリポジトリの正本とは別経路で提供され、現作業用環境で読み取れた。画像名・サイズ・Cropを履歴に残す。以前の中核9枚と、それ以外の参考案は保存優先度を混ぜない。

第一便では、最終的に実際の切り出しが可能かを実装基盤に統合して試験するため、元からHTMLに内包されている**C01/C02縮小JPEG見本の実ピクセル**からLv1/2/3の切り出しをCanvas生成し、2系統の既存仮SVGを置換する。ユーザーが今回添付した**原寸PNGの6切り出しファイルそのものは、現時点ではGitHub配布HTMLに内包していない**。本便のランタイム素材はあくまで縮小JPEG由来であり、真正な高解像原本由来の完成器官と混同しない。

## ソースと描画接続

- `src/composite/mock-atlas-sprites.js`: JPG参照 `C01_deepsea` の3区画→`abyss:abyssHeritage`、`C02_bird_dragon` の3区画→`myth:mythHeritage`を変換。座標は元1448×1086ピクセル版の原点左上・矩形で、内包JPEGの寸法比に比例変換。暗紺の背景と枠線を透明マスク化。画素の輝度・色差でマスク、矩形周辺2px切り落とし。
- `src/composite/draft-organ-sprites.js`のインストール後、`app.js`の`preload()`の**直前**に非同期で2系統の各3枚へ置換。参照画像欠落・デコード失敗・マスク面積不正・事前の正式素材ありならSVGなど既存代替を保持し、半端に1段階だけ置換しない。
- `C.mockAtlasLineages`と`mockAtlasProvenance`、`mockAtlasWarnings`で実適用した範囲を機械判定し、見た目の文言を `JPEG CROP Lv ORGAN (DRAFT)` と区別。
- `tools/build-composite-html.cjs`は編集可能スクリプト3種を束ねて2配布HTMLへ再生成。既存の元68埋込バイナリを維持、旧12系統のうち残10は36点中30点の仮SVG。
- 真の部位分解ではなく、旧12系統の本体は引き続き既存24 WebP全身肖像。新2系統の33 PNG器官と共通コア2点を置換しない。
- 添付原寸PNGから試作した6枚の透明PNGと原画sha/crop台帳は会話側ファイル `mock-stage7-parts-draft.zip` で別途提供。元画像の全画素を保存できる媒体のため、品質審査と本流同期は次便。現段階でZIPの取得経路をGitHub保管済みと誤記しない。

## 検証計画と判定

1. Node `mock-atlas-sprites.test.cjs`: crop矩形・マスク・Lv3×2実画素変換モック・PNG上書き防止・失敗時のSVG継続を検証。
2. 既存 `npm test` 全PASS、`npm run check:assets` 68元バイナリ一致、`npm run check:composite` 両HTML一致。
3. Chromium `tests/browser-smoke.cjs`: 本物の内包JPEGをdecodeし、ブラウザCanvas生成のPNGが2系統×3Lvとして採用され、30SVGの残存・全104画像decode・14系統Canvasレベル差・N15/1000・420pxなどがPASS。
4. 失敗・不一致時はマージしない。自動PASSは元高解像PNG/原寸品質・alpha境界・ラベル混入・本体の部位分解・実GAS配信の合格を意味しない。必要ならC1.5.2への差戻し。

## 次便

原寸PNG資産の完全な再取り込み、旧12全系統の各パーツLv画像（頭・眼・背・肢・殻・尾・光輪など）を原画から切り出す。原本9 PNGのSHAおよび新しい添付モックのsource SHAを保存、実画素アルファ・文字混入・ヒトの外観レビューを通した後にSVGを全面置換する。第4相とGAS実配信は別ゲート。
