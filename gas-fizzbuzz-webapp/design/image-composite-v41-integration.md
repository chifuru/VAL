# 画像合成本流統合 v4.1 — 承認工程の実施記録（2026-10-14）

ユーザー入力: 「各工程を承認します 更に続けてください」。工程実行に対する明示承認として扱い、元36ノードの承認状態を無断変更したり実機GAS検証済みとみなしたりしない。

## GitHub実装（mainへ反映）

- `src/Index.html`: 14系統の自己完結画像レイヤー合成HTML。Git blob `66f338fcd253df87fda46166b5e97389271f49e3`。約2.96MB、68枚の画像データURIを内包。
- `src/Index.composite-v4.html`: 同一ソースを独立候補として保持。
- `src/Index.pixel-legacy.html`: 従来の14系統・64×64ドット版を別名保存。旧Blob `ef7cd1222b469c2c3c24a2953adaea30a7bed1b5`。
- `tests/creature.test.cjs`: 新規合成HTML内のエンジン・画像設定を読み込む13テストへ差し替え（Blob `d38143d7554c83cd018aed4108ff863ff5e7d0c2`）。
- `tests/archive/creature.pixel-legacy.cjs`: 旧71テストを履歴保存、現行の自動テスト対象外。
- `tests/fizzbuzz.test.cjs`: FizzBuzz API契約の9件は維持し、UI連携の要素IDを現行 `fizzbuzzLog` と `validateLines` に合わせた（Blob `f243f69e30fb03fcb197dd627db396d26657f148`）。
- `src/Code.gs` 不変（Blob `8741bbbb690082fa60c82a2a2bbc38fc8811882d`）。3中核定義ファイルも不変。GAS自動デプロイなし。

## 描画構造

- 先行2系統は不変コア2点＋11器官のLv1/Lv2/Lv3画像33点＝計35 PNGを合成。重ね順は背面・体幹・継承器官・前面。
- 旧12系統は第二/第三相の画像24点を既存9枚モックの図案から自動抽出し、透明マット修正を行った**暫定肖像レイヤー**として表示。これらはまだ独立した器官Lv別の完成画像ではない。
- 図鑑から指定した系統について、`plannedEnvironment` がその系統の環境ニッチ比率に近くなるよう**環境刺激を選択**。系統IDの強制代入はしない。14系統の同じ元環境判定で到達可能。
- DNA6軸／相内環境65%・直近12件35%／餌の小補正（特別2系統は0.035）／P=10,35,100／成熟固定／1..N FizzBuzz原文N件／第4相候補名のみ、を維持。
- 9枚の保持指定モックは原本をローカル配布ZIPへ格納。HTML内部の閲覧用9点は縮小JPEG。

## 検証・限定証跡

- ローカル実Node v22: **31/31件成功**（ロジック・サーバー・HTML埋め込み検査を含む）。
- Chromium: 14系統の図鑑切替とCanvas上の描画成功／エラー0、VALIS・反記銘・神鳥・日輪の図鑑指定環境誘導で各500行完走、420px幅の横はみ出しなし、GAS成功・不正応答のローカルスタブ検証。
- GitHubへ反映済みのHTML Blobと両tests BlobとCode.gs Blobを取得して限定V8互換実行: **22/22件成功**（client13＋server9）。この検証は実Node CLIではない。
- 未検証・未完了: 実GAS HtmlServiceの配信とセキュリティ制約／実機FPS／旧12系統の器官ごとの画像アトラス／残る文字・罫線の完全除去／第4相の実装。

## 配布ZIP

`fizzbuzz_image_composite_v41.zip` は219点以上のファイルを含むローカル編集可能なソース・PNG原本・マット補正版・模擬ブラウザスクリーンショットとスクリプト・GAS単一HTMLを含む。

ZIP SHA-256: `3197a205fd8671edcd7ff94c9b6f478af218d025878c9fddabea0faeaf43373e`。

配布ZIPをGitHub本流のソース全体へ同期済みと主張しない。GitHubは画像内包HTMLとテスト、本記録までを反映。アセットの編集元PNGはZIP内で保存している。

## 追加：編集用ソースの抽出（動作変更なし）
GitHubの自己完結 `src/Index.html` から、`src/composite/creature-engine.js` / `app.js` / `styles.css` / `Index.template.html` を原文のまま抽出し、同階層のREADMEおよび `design/image-composite-v41-assets.json` を追加（コミット `9777e6cfb6113543ad7c3776552af66248b2c8da`）。別ファイルは編集用であり、公開画面は引き続きバンドルされたIndex.htmlを正とする。PNG原本と画像ビルドはローカルZIPの `assets/` と `build.py` を使用。E12が参照する本番HTML blob SHAは変更なし。
