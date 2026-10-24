# CS07後半：通常画面とネイティブ全T観測の限定証跡

起点5006c1b0a9cb4494d16ab84bd82b954ae8250b5f。製品4.2.77・生態署名7808c454…。[契約](../../../design/implementation/current-state-interface-v1.md)。正式61Nodeは草案/階層/層間参照を維持する。

| 対象 | 結果 | 証跡 |
| --- | --- | --- |
| 新規接合 | 6成功。全T系列/合算、Bと関係面、読取不変、旧欠測非推定、CSV分割、形式4、旧設定保護 | [最終の新規検査](native-tests.log) / [検査コード](../../../tests/current-interface.test.cjs) |
| 関連境界 | 新規6＋CS07前半12＋設定6＋従来観測12＝36成功 | [tests.log](tests.log) |
| 実ブラウザ | Linux Chromium/1500×1050の代表1条件・19確認成功。一般の既定設定、明示マス設定、新世界、実Worker、停止/再開、詳細の手動固定、CSV Worker/代替一致、形式4のIndexedDB保存/通常図鑑読取、全グラフ、初期条件再生/自動保存なし、例外/通常ポップアップなし | [report-browser.json](report-browser.json) / [検査コード](../../../tests/current-interface-browser.cjs) |
| 生成物/対象版 | 元モジュールと生成物一致、製品/生態署名は変更なし | [generated-check.json](generated-check.json) / [対象ハッシュ](report.json) / [出力ゲート](final-check.json) |

CSVではBlobのUTF-8 BOM除去を揃えて文字列を比較した。初回の比較失敗はBOMの扱いの差で、行の差ではない。接合時に独立植物が下層表示へ重複加算される問題を見つけ、既存画面の下層値と一致するよう修正した。

画面例：[盤面と既存レイアウト](current-map-detail.png) / [集約された手動情報詳細](current-information-detail.png) / [通常図鑑の全期間分析](current-saved-analysis.png)。実画面の記録であり、画像生成モックではない。配置・素材・遠景記号/近景の絵柄は維持し、残骸は同マス在庫の量の印として表示する。

再実行：

```sh
node --test-reporter=tap tests/current-interface.test.cjs
node --test-reporter=tap -e "require('./tests/current-interface.test.cjs');require('./tests/current-integration.test.cjs');require('./tests/cell-interface.test.cjs');require('./tests/ecology-observation.test.cjs');"
node tests/current-interface-browser.cjs
node tools/build-observation-model.cjs --check
```

ブラウザはローカルHTTP用のネットワーク権限を付けて実行した。短期の代表1条件で、自然500Tや全系統/全状態/画面寸法の視認性を認定しない。総合速度・長期メモリ/状態量・Windows・配布は未実施。次はCS08の限定した肥大化/性能確認で、マップ領域可視化は最適化→画面確認→安定化の後へ置く。
