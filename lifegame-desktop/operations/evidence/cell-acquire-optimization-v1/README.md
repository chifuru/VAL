# 栄養取得・配分の重複処理軽減

起点 `2ae71d0`。契約 [cell-acquire-optimization-v1](../../plans/cell-acquire-optimization-v1.md)。C7.2/D7 → E5、再生署名互換はC8.2/D9 → E6。新Node/分割/初期登録は不要。Core/A/B、正式61Nodeの草案/Graph、能力・収容・生活環・UI/画像・製品版/配布を維持する。

## 結果

同じ500T終端から旧版/最終版を各2回・別プロセスで501T目だけ実行した。すべて全世界JSON・全観測・生態指紋が一致し、元の世界も不変、収支の不変条件は成功した。**取得部分は平均19.7%、1ターン全体は平均10.2%短縮**した。この終端/環境/少数回に限定した値で、全マップ・全PCや500T全体の改善率ではない。

| 対象 | 旧版平均 | 最終版平均 | 短縮 |
| --- | ---: | ---: | ---: |
| 栄養取得・配分 | 1792.2ms | 1438.7ms | 19.7% |
| 1ターン全体 | 5397.0ms | 4848.0ms | 10.2% |

[comparison.json](comparison.json) は一致対象と平均の計算根拠。旧版 [1](before-1.json) / [2](before-2.json)、最終版 [1](after-2.json) / [2](after-3.json) を使う。取得時間の範囲は旧1681.7〜1902.7ms、最終1415.3〜1462.0ms。全体は旧5342.7〜5451.2ms、最終4655.2〜5040.7msで、実行ごとの揺れを含む。

`after-1.json` は列挙・作業行/光Map/菌処理能力だけを直した中間案で、全体/取得時間の改善がほぼ出なかった。主体/在庫の再利用を加えた最終版の平均へ混ぜない。中間案の署名は7df7763515463aa330dbbf40885483ba2725c22d3077e501890edb6fc22679cdで、採用/再生互換へ登録しない。

## 変更の意味

- `allocate` は各要求のrates/fulfills列挙を一度だけ作り、検証・候補判定・加重集計・残量処理で再利用する。作業行には必要項目だけを持つ。行ソート・列挙順・加算順・切捨て/丸めの位置を維持し、`fulfills`未指定と空指定を区別する。
- `acquire` の主体キー/容量登録と、菌の処理能力をその取得編集中だけ共有する。今回の分解要求102316件に対し、菌の処理能力を評価する主体は2518体。同じ計算を繰返す構造を減らす。水消費の既存分母・丸めは流用/変更しない。
- 非捕獲の在庫について、取得編集中の同じsource snapshotと資源キーを共有する。編集中は在庫移転を行わず、確定で参照先rowだけを更新するため、旧版の要求ごとの同値snapshotと同じになる。捕獲在庫は主体ごとの資格を毎回検査し、共有キャッシュで迂回しない。
- 3719行ある光記録は公開配列とその順序を維持し、一時Mapで同じ行を参照する。`used`は確定順の代入であり、加算へ変更しない。キャッシュは取得の関数内だけに置き、次ターン・別世界・別の取得へ持ち越さない。

## 限定照合

| 実行 | 結果 | 証跡 |
| --- | --- | --- |
| 資源検査 `tests/cell-resources.test.cjs` | 23成功/0失敗。光配列/最終代入、捕獲資格拒否も含む | [resources.log](resources.log) |
| 固定配分ベクトル `tests/cell-acquire-allocation.test.cjs` | 1成功。旧版12ベクトル/逆順、原入力不変/拒否を確認 | [allocation.log](allocation.log)、[固定入力](../../../tests/cell-acquire-allocation-fixture.json) |
| 通常ターン `tests/cell-turn.test.cjs` | 7成功。生成元/生成物・段階/Worker/取消等 | [turns.log](turns.log) |
| 保存 `tests/cell-archive.test.cjs` | 6成功/0失敗 | [archive.log](archive.log) |
| 新方式の旧署名再生 `tests/cell-acquire-replay.cjs` | 起点とのT0〜T3の全世界・全観測が一致。旧記録再生、原記録不変、再生無保存、別の生態版拒否と新記録のraw署名保持 | [replay.json](replay.json) |
| 従来方式の比較 | 旧2条件×T0〜T2の全世界JSON・観測・CSVが一致 | [legacy-parity.json](legacy-parity.json)、[比較コード](legacy-parity.cjs) |
| 静的生成 | 8プロファイル/22固有モジュールが一致 | [generation-check.txt](generation-check.txt) |

新署名は `b76f5c4fd56870ed550f35eb16992be542f747f2adb27f5f49ba35680bf7a19d`。今回の最適化版だけ、再生の照合時に直前のe5a7bdca…へ接続する。新方式の保存はraw署名と観測metadataを保持し、原記録を書き換えない。13Tの端数修正より前のc7b6198b…は引き続き区別する。別名追加そのものを一致の証拠にしない。

## 対象と再現上の制約

[前回の計測](prior-profile-result.json) / [CPU内訳](prior-profile-hotspots.json) では取得/配分・世界複製・情報受信が主な候補だった。今回は取得/配分だけを変更した。CPUサンプリング値の比率と、今回の計時平均/改善率は区別する。

500T終端は元のfingerprint fe1606bae39eff0ad650a22e9f4bc6402d120022fe6231cd9928f12c85936f0a、JSON SHA256 4933119b52363f40ff859756378ef134e6c82fe514a07b9ed75808af4b6684ab。生体6503・死骸27941の同一状態から、501Tの全世界SHA256 bba7ad403dbdb8ddc0b47453c237bc06709d4c5a79a9e87f1fc0c7a0efd67c38 と観測SHA256 9fa3af81619b80add9c695d6bef25f969496b1a60dcc58780d8f150c81e05da4 が一致した。前回1T確認の指紋とも一致する。

作業用の終端 `/tmp/cell-long-observation-world.json`（約134MiB）はリポジトリへ追加していない。`tests/cell-acquire-benchmark.cjs` はその終端と出力先を明示して実行し、起点静的生成物を第3引数で渡すと旧版を使う。例：`node tests/cell-acquire-benchmark.cjs /tmp/cell-long-observation-world.json /tmp/after.json`。起点モジュールは `git show 2ae71d0:lifegame-desktop/src/ecology/observation-modules.js` で一時ファイルへ取り出す。終端が失われた場合は指紋で一致を確認できる世界が必要で、検査は勝手に500Tを再生成しない。今回は中間案1回と旧/最終各2回の計5Tだけを比較し、500Tを再走していない。

[source-hashes.json](source-hashes.json) と同じ実装/検査/資料へ限定有効。[final-check.json](final-check.json) にCore/A/B・正式構造/草案・Manifest/生成/署名と出力前照合を保持する。計算式・列挙順・在庫の確定時点・キャッシュ寿命・再生署名条件を変えた場合は対応境界を再確認する。前回の自然500Tはその対象署名の観察であり、新版の全500Tを再検証したとは扱わない。

次は世界の複製、情報受信など残る負荷を扱う。自然P/Q循環・全系統/R1〜R6・未選定係数/既定化・実画面/Windows/配布は未認定/後続。グラフィックを省略する設定へ変更していない。
