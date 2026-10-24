# 現行ソースの同梱照合と未選定条件の確認

起点 `2f877a2`。契約 [cell-release-preflight-v1](../../plans/cell-release-preflight-v1.md)、既存C4/D4 → E7。新Node/分割/初期登録なし。Core/A/B、61Nodeの正式草案/Graph、全製品ソース・生態署名/既定モード・値/枝・素材/配置/製品版を変更していない。

## 結果

**現行ソースの一時ASAR同梱照合は成功。Windows ZIPと実exeの起動は未確認。** 未選定条件の[照合表](decision-matrix.md)でも、現行の明示比較を止める独立した仕様確認は見つからなかった。正式採用/既定化・任意機能の未接続を、限定比較の利用可否と分ける。

| 確認 | 結果 | 証跡 |
| --- | --- | --- |
| 現行ソースから一時ASARを作成 | src100ファイル・174164463バイトすべてが同梱後も一致。package metadataを含む101ファイルで余分/欠落なし | [package-preflight.json](package-preflight.json)、[実行ログ](package-preflight.log) |
| 入口/参照 | `src/desktop/main.cjs`を同梱。Index.htmlからのローカル参照25件が存在し、パス/大文字小文字が一致 | 同上 |
| チェックサムの既存検査 | 1項目成功/0失敗 | [package-checksums.log](package-checksums.log) |
| 生成物の整合 | 8プロファイル/22固有モジュールが一致 | [generation-check.txt](generation-check.txt) |
| 残っていたローカル配布ASAR | 4.2.72。現行と19ファイルが不一致、2ファイルが欠落 | [package-preflight.json](package-preflight.json) |

一時ASARのSHA256は `f0d49afff2fefb56c2928a84a630b895c59f66bc20120fa8e7eee6286eef2c93`。検査後は一時ディレクトリごと削除した。これはWindowsランタイムを含まない検査用ペイロードであり、配布用ZIPやダウンロード版ではない。既存distや過去の配布物を上書き・公開していない。

ローカルの旧配布物が一致しないため、それを現行mainの確認済み配布物として案内しない。現行の製品宣言版は4.2.77、生態署名は `219b2a50d6ecf08eb552770f8e26535dbfde144b57751195ebe18757f2a035cf`。新しい配布物を作る際には、その時点のコードから梱包して同梱照合・実起動確認を行い、対象コードと成果物を対応させる。

## 環境と再現範囲

実行環境はLinux。この環境のLinux向けElectron本体は未導入で、Windows上の実起動も行っていない。Chromiumでの代表画面22項目は [前工程の証跡](../cell-finish-ui-v1/README.md) を参照し、Electron/Windows実起動の代わりにしない。

検査コードは [tests/cell-package-preflight.cjs](../../../tests/cell-package-preflight.cjs)。確認対象の40桁コミットSHAを引数に渡す。例えば `node tests/cell-package-preflight.cjs 2f877a299ea9d6a10a631cf10667c6ab245115fe`。コードは一時ステージから実ASARを作り、全ファイルを抽出してSHA256で元のsrcと照合する。ASARの一覧だけを成功の根拠にしない。梱包用package metadataは既存 `tools/package-windows.cjs` と同じ射影を使う。コミット引数だけを出所の証明にせず、製品ソース不変と [source-hashes.json](source-hashes.json) を併せて確認する。

今回の検査を500T・全系統/自然P/Q・全件テスト・全PC性能へ広げていない。[final-check.json](final-check.json) に正式構造/Manifest・製品不変と実施範囲を保持する。梱包対象、入口、依存/ランタイム、生成物/署名、比較値や既定モードを変更した場合は対応する境界の再確認が必要。

## 次へ残すもの

- 専用係数/対象種、定着植物の再生枝効果、A/B正式採用/既定化は照合表の区別を維持する。今回、推測で閉じていない。
- 重い終端の計算負荷と実稼働の配置調整は [前工程の残件](../cell-finish-ui-v1/remaining.md) を保持する。
- 配布には、現行ソースによるWindows ZIP作成、展開後の同梱/チェックサム照合、実Windows exe/Workerの起動確認が残る。新しい配布物は未作成・未公開。
