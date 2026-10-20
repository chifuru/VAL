# I05 P描画の限定検査

`tests/parasite-remains-ui.cjs` を Linux Chromium で実行し、117項目成功・ブラウザ例外0件。実行ログは `test.log`、項目と読込時の生態署名は `report.json`。最終署名は `18f0f22973f2f9d0ae3e47672f234e83f0835aa69afce2ffe1310dbe5682a66f`。

## 対応と検査範囲

- `primaryParasiteModel:'primary/1'` の実定着 `primary-established` と翌Tの同P移行定着 `primary-transferred` だけを既存の寄生マーク・短い感染モーションへ、実排除 `primary-clear` を既存の除去マーク・線へ接続した。曝露、侵入、移行準備、失敗、感染体放出は成功演出やその4行動予算に入れない。
- 付随Pの名札は新モデルだけ本人の `phase` と記録された `age` を別に表示する。旧モデルの宿主 `stage` 表示、Q、記号、配置、採用画像は保持する。体外量・移行待ちを通常の付随生体P/Qとして描かない。
- 旧97項目は遠景/簡略表示の画素一致、P/Q/探索Qの実IDヒット、既存相選択、原画の非空・相差、遺体の残量・経時差と入力不変を確認。新20項目は実行APIが作った定着/同ID移行/排除イベント、成功マーク、準備/失敗の無演出、本人相/年齢、移行待ち/感染量の非付随、4行動内の感染優先、世界の完全不変と背景準備を確認する。

新Pは初期自動配分の自然発生比較ではなく、明示した状態から実 `EcoEngine.P` を呼ぶ表示fixture。Pの最終A/B/C素材、全方向・全年齢素材、体外感染量の専用描画、長期生態・全条件性能の認定はI10等の別範囲。新絵・画像生成はない。

## PNG

- `primary-established.png`：実定着した娘Pと既存の寄生マーク。
- `primary-transferred.png`：翌Tに定着した同じP/Q IDと寄生マーク。
- `primary-cleared.png`：実排除後の除去マーク。
- `primary-migration-wait.png` / `primary-amounts-no-success.png`：移行待ち・有限感染量には付随する生体像/成功マークを作らない。
- `primary-own-phase-age.png`：宿主段階firstと独立した本人3相・37T。
- `near-normal.png` / `near-separated.png` / `lifecycle-remains.png`：既存97項目側の採画。

新Pの採画は既存rendererが準備したoverview地形fallbackまたは精細地形を待つ。精細near Workerの完了時間を今回の性能認定には使わない。

## 比較原本とfixture調整

`before-renderer.js` はI05直前の採用main `3167a2d203df5f5e5848a8bf0a5494dcde0df56a` の `src/ecology/renderer.js` をそのまま保存したもの。SHA-256は `4a11404c4a36c982baf39240124faf2a63a44731e27206149da7d648259f74ce`。

初回の既存ハーネスはv4.2.5時点のbefore-rendererと現在を比較しており、I03/I04以前の記号実装/キャッシュ差で画素比較が不適合だった。旧検査項目は削らず、比較原本をI05直前へ更新した。新fixtureの実行APIもブラウザ公開契約 `EcoEngine.P` へ合わせた。最終PNG用に追加した精細near地形待ちだけは並行検査下の45秒で未完了だったため、採画準備条件を既存のoverview fallbackまたは精細地形の準備へ限定した。これらは試験側の修正で、renderer sourceは凍結後に変更していない。

実行コマンド：

```sh
LIFEGAME_EVIDENCE=operations/evidence/i05-primary-parasites-v1/graphics node tests/parasite-remains-ui.cjs
```
