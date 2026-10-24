# ターン開始時の世界複製：比較と不採用

起点 `a6bfc53`。契約 [cell-turn-clone-v1](../../plans/cell-turn-clone-v1.md)、既存C7/D7 → E5。新Node/分割/初期登録は不要。Core/A/B・正式61Nodeの草案/Graph、能力・枠・生活環・UI/素材・製品4.2.77・配布は変更しない。

## 結果

**今回の複製候補は採用しない。** 同じ500T終端から旧/候補各2回、別プロセスで501T目だけを比較した。全世界JSON・観測・生態指紋・元世界不変・収支は一致したが、速度短縮を確認できなかった。実行コードと生成物を起点へ戻し、従来の `structuredClone` を維持した。前工程の取得/配分軽減は有効なまま。

| 対象 | 現行平均 | 候補平均 | 今回の観測差 |
| --- | ---: | ---: | ---: |
| ターン準備 | 1171.8ms | 1194.9ms | +2.0% |
| 1ターン全体 | 4894.5ms | 5340.0ms | +9.1% |

準備は `beginTurn` 全体（複製と初期化等）であり、純粋な複製時間ではない。旧版は全体4769.5〜5019.6ms、候補は5000.9〜5679.0ms。1終端/この環境の各2回に限る比較で、一般的な遅延率や統計的有意差の認定ではない。候補の準備は1回目だけ短縮し、2回目は増加した。平均と一致対象は [comparison.json](comparison.json)、実測は旧 [1](before-1.json) / [2](before-2.json)、候補 [1](after-1.json) / [2](after-2.json)。

## 比較した案

新マス方式のターン開始時だけ、通常のオブジェクト/配列をJSで複製する案。共有参照/循環をMapで管理し、不変な原始値をそのまま使い、配列長・穴・列挙順・`__proto__` を扱う。アクセサ・特殊型/プロトタイプ・非複製可能値・深い構造を検出した場合は元グラフ全体をnative複製へ渡す。従来方式とpreviewは変更対象にしなかった。

候補は [tests/cell-turn-clone-candidate.cjs](../../../tests/cell-turn-clone-candidate.cjs) へ比較専用として保存した。製品からの参照はない。通常の生成/JSON世界を対象とした実験であり、任意のProxyや特殊な内部状態を持つオブジェクトの汎用複製器ではない。効果が出なかったため、候補の取消/失敗・特殊型全般等の採用用検査へ広げていない。未実行の検査を成功扱いしない。

比較時の候補署名は `ad66e7c8edf5b2e9e87b4c63be6268d7e5d47e7ef74cfd372779060184211c5a`。製品へ採用せず、再生互換の別名にも登録しない。現在の署名は `b76f5c4fd56870ed550f35eb16992be542f747f2adb27f5f49ba35680bf7a19d` のまま。C8.2/D9/E6や保存スキーマの変更は不要。

## 一致と再現

入力は前工程の `/tmp/cell-long-observation-world.json`（約134MiB）。SHA256 `4933119b52363f40ff859756378ef134e6c82fe514a07b9ed75808af4b6684ab`、T500指紋 `fe1606bae39eff0ad650a22e9f4bc6402d120022fe6231cd9928f12c85936f0a`。大きな作業用終端はリポジトリへ追加していない。

4実測ともT501の全世界JSON SHA256 `bba7ad403dbdb8ddc0b47453c237bc06709d4c5a79a9e87f1fc0c7a0efd67c38`、観測SHA256 `9fa3af81619b80add9c695d6bef25f969496b1a60dcc58780d8f150c81e05da4`、指紋 `cde4500bf5a19093b9d2587c29efbaa00884997cf9d48a411f2744fef70162b7` が一致した。生体6485・死骸27968、不変条件の違反なし。保存された順序のJSON一致であり、全世界/全入力の一般的な同値証明ではない。

明示比較は次のコマンドで行う。第3引数なしは現行処理、`--candidate` の場合だけ開始時の世界複製を比較専用関数へ一度置換し、直後にnative関数を復元する。第3引数に旧静的生成物のパスを渡す比較も可能。採否に使った旧版は `git show a6bfc53:lifegame-desktop/src/ecology/observation-modules.js` で取り出した生成物、候補は当時のengineへ同じ関数を接合して再生成したもの。

```sh
node tests/cell-turn-clone-benchmark.cjs /tmp/cell-long-observation-world.json /tmp/clone-baseline.json
node tests/cell-turn-clone-benchmark.cjs /tmp/cell-long-observation-world.json /tmp/clone-candidate.json --candidate
```

製品を元へ戻した後、保存した比較専用関数の経路を1Tだけ実行し、[reproduction.json](reproduction.json) でも同じ全世界/観測/指紋・元世界不変を確認した。この再現用1回は性能平均へ混ぜない。終端が失われた場合、検査は勝手に500Tを再生成しない。今回は旧/候補各2回＋再現1回の計5Tで、500Tを再走していない。前工程の37検査・旧方式比較も今回再実行済みとは扱わない。

生成8プロファイル/22固有モジュールの整合、実行ファイルの起点一致、正式構造とManifestは [final-check.json](final-check.json)、対象ファイルは [source-hashes.json](source-hashes.json) へ記録する。候補の論理・ベンチマーク・入力指紋・Node/契約を変えた場合、この実測の有効範囲を再確認する。

次は情報受信の重複処理。自然P/Q多世代・全系統/R1〜R6・未選定係数/既定化、総合性能・実画面/Windows/配布は後続のまま。今回の不採用を、複製負荷そのものの解消や全最適化完了とは扱わない。
