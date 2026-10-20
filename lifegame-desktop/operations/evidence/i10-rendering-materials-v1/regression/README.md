# I10 既存描画の限定回帰

最終対象は開発版4.2.42。基準main `a196f8b139390f46692a546a45788ed119cc8f77`。Linux Chromium、描画用の固定配置・状態fixtureを使用し、生態の長期存続試験とは分ける。結果は [summary.json](summary.json)、実行ソース/不変照合は [preserved-sources.json](preserved-sources.json)。製品と元の4試験は変更していない。

| 対象 | 結果 | 証跡 |
| --- | --- | --- |
| 量機 | 15項目成功。通常/変異13形態、齢3区分、採用肖像画素一致、透明余白。主3同居＋植物/群落/一次消費者と付随P/Qのexact-ID選択、死亡素材保持、世界不変 | [結果](ryouki/graphics-report.json)、[13形態](ryouki/ryouki-art-13.png)、[近景](ryouki/ryouki-six-body-near.png) |
| 三植物 | 9項目成功。33形態/齢/原画肖像画素一致/透明余白、4同居の遠近exact-ID、世界不変 | [結果](plants/graphics-report.json)、[33形態](plants/plant-art-33.png)、[近景](plants/plant-four-layer-near.png) |
| 既存21主系統 | a196f8bのart.jsと498雌雄・年齢状態の画素一致、183枝の描画、flagなし旧非主生物/資源の画素一致。入力不変・キャッシュ再利用/上限・例外0。5215個の低水準assertを実行 | [結果](anatomy/report.json)、[基準SHA](anatomy/baseline.json)、[アダプタ](anatomy/i10-anatomy-adapter.cjs)、[ログ](anatomy/adapter-run.log) |
| 表示設定 | 単体1件成功。近景で演出と静止マークを独立、齢/格子、通常操作は詳細背景を保持し明示ON時だけ簡略、世界不変 | [ログ](display/run.log) |

既存原画/実行PNG70点、生態・背景28modules、遠景記号/固有色・強調色、保存再生署名 `a7cac02a9d7382b478919b40c44823ce0d6bb0325b3e551adb1236908c92774d` は基準mainから不変。新P/Qの素材対応は別のmaterials検査を正とする。量機/植物/主系統の代表PNGを実見し、採用した環状の群体節足、既存多頭蛇、量機の黒背面/黒深緑、植物33形態を確認した。最終外観の利用者承認を代行しない。

## 実行と試験境界

各試験のcwdは `lifegame-desktop`、`LIFEGAME_EVIDENCE=operations/evidence/i10-rendering-materials-v1/regression/<対象>` を指定した。

```sh
node tests/ryouki-graphics.cjs
node tests/independent-plants-graphics.cjs
node tests/all-lineage-anatomy-ui.cjs
node --test --test-isolation=none tests/display-load-reduction.test.cjs
node operations/evidence/i10-rendering-materials-v1/regression/anatomy/i10-anatomy-adapter.cjs
node operations/evidence/i10-rendering-materials-v1/regression/ryouki/prepared-ryouki-graphics.cjs
node operations/evidence/i10-rendering-materials-v1/regression/plants/prepared-independent-plants-graphics.cjs
```

元のall-lineage試験は4.2.8以前のart比較を含み、I07の情報描画変更後には `nonmain art unchanged resource/info` で不適合となる。最初の[失敗ログ](anatomy/run.log)を残し、古い固定値は更新していない。別保持のアダプタは直前mainのart.jsを別名で読み、全21系統に一致を要求する。旧「新規16系統の変更前後」画像ループを除き、同じ入力の再描画を明示してキャッシュ再利用を確認する（ループ除去直後に再利用の入力が消えた[初期アダプタログ](anatomy/adapter-first.log)も保持）。これは試験fixtureの接続修正で、製品不具合の修正ではない。

量機/植物の元試験は200/220msの固定待ちで近景を撮るため、今回の並行コールド実行では地面のWorker準備前だった。別保持のpreparedアダプタでは `renderer.prepared` を待ち、最終近景PNGを再取得した。両方とも11背景素材・256texel/セル・`terrainPending=false` を確認した。診断値は [量機](ryouki/near-ready.json) / [植物](plants/near-ready.json)、再取得ログは [量機](ryouki/prepared-run.log) / [植物](plants/prepared-run.log)。量機約10.5秒、植物約3.6秒のコールド背景値は並行試験条件の値で、通常性能や速度改善の認定へ拡張しない。

画面付き500T、全地形/全密集状態の最終外観、全年齢/全方向の新規作画、Windows実機と全端末性能は対象外。次のI11/I12の評価を置き換えない。
