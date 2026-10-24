# CS07前半：Worker・ネイティブ記録の限定証跡

起点 `34b6f57b5a7c8bd42d6603567206bce181240b75`。製品4.2.77。生態署名 `7808c4542ba8277512ec7302fe8f8d6d7063ea7171f3c878b3340ce4de52a2d6`。[実装契約](../../../design/implementation/current-state-integration-v1.md)、[対象ハッシュ/判定](report.json)。

| 確認 | 結果 | 証跡 |
| --- | --- | --- |
| 新規境界 | 12成功。同マス情報の識別/変更/削除/並び替え、現在状態の差分復元と基底不変、不正な差分拒否、実Worker、取消/未確定保存拒否、新形式4の保存/読取/再生・新規再保存・版違い/破損拒否 | [integration.log](integration.log) |
| 実Worker | 上記12内、一括・段階送信・最終のみの3形式×2Tで通常計算の確定世界と一致 | [検査コード](../../../tests/current-integration.test.cjs) |
| 既存境界 | 通常ターン/Worker7・従来マス保存6・CS02情報15の計28成功 | [related.log](related.log) |
| 実ブラウザの記録API | Linux Chromium/IndexedDBで6確認成功。保存、軽いヘッダ、再読込、初期条件からの再生/自動保存なし、ヘッダ/本文不一致拒否、失敗後も本文不変 | [browser.json](browser.json) |
| 従来経路 | 3条件×T0〜T2で世界/観測行、CSV（raw署名以外）と旧再生/原bytesを保持 | [legacy-parity.json](legacy-parity.json) |

計40項目に加え、ブラウザ6確認と従来3条件。ブラウザは2T/3観測行の記録API確認で、通常ゲーム画面の確認ではない。新形式は3Tの初期条件再生を確認した。500境界は時計499から2Tの既存検査で、自然500T走行ではない。

初回のWorker照合は追加系統の登録不足で失敗した。不明へ落ちた経験の相手を、再開時にも現在の実効設定から登録して修正し、3形式の一致を確認した。生態署名はこの修正を含む。新規則の旧署名互換は作らず、無指定の未変更経路だけ条件付きで旧再生へ接続する。

ブラウザログの `headerCharacters` / `bodyCharacters` はJSONの文字数であり、バイト数や速度ではない。新形式の一覧は履歴・最終状態を含まない軽いヘッダで、本文と照合する。ローカルHTTPが必要な検査はネットワーク権限付きの環境で実行した。

## 再実行

```sh
node --test-reporter=tap tests/current-integration.test.cjs
node --test-reporter=tap -e "require('./tests/cell-turn.test.cjs');require('./tests/cell-archive.test.cjs');require('./tests/current-information.test.cjs');"
node tests/current-integration-browser.cjs
git show 34b6f57b5a7c8bd42d6603567206bce181240b75:lifegame-desktop/src/ecology/observation-modules.js > /tmp/current-integration-baseline-modules.js
node tests/current-integration-legacy-parity.cjs /tmp/current-integration-baseline-modules.js
node tools/build-observation-model.cjs --check
```

## 残件

工程7前半のAPI/受渡しだけの証跡。通常画面/3グラフ/サマリ/手動詳細/CSV/図鑑画面の新形式全接合、明示マス方式からの新規作成は後半。UI配置/素材/既定モード・製品版・配布を維持する。自然500T/総合速度・長期メモリ・通常画面の外観/操作・Windowsは未測定。
