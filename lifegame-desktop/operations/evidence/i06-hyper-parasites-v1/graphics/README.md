# I06 Q描画の限定検査

`tests/hyper-parasite-graphics.cjs` を Linux Chromium で実行し、48項目成功・例外0件。`graphics-report.json` に成功項目と読込署名、`test.log` に終了ログを保存した。生態署名は最終 `32595746fbb53881d5bcda4c42a98f062540cf73d91c85125d5b7dd73df600b1`。

## 接続した範囲

新flag `hyperParasiteModel:'hyper/1'` の実定着 `hyper-established` は既存の寄生、実排除 `hyper-cleared` は除去、羽化成功 `hyper-emerged` は既存の進化マーク/短いモーションへ接続する。羽化の発行主体は同じQのIDで、Hの死亡へ変換しない。曝露・侵入・待機・失敗から成功マークを作らない。

P内Qは本人I〜III、`searchQ` の新Qは本人IV/自立として描画・名札へ渡す。年齢は本人の記録を使い、宿主段階や相の代用にしない。幼体/成体/老齢は既存の小縮尺/老化色係数を使う。同じQの既存アンカー/ヒット対象を保ち、IVの実移動/採食モーションを本人IDへ接続した。採食後の同T移動でもイベントの `to` に実在庫セルを保持し、栄養元を移動後セルへずらさない。

無flagのQ原画は入力相1〜4、盤面は遠景/簡略/近景で採用main `cec7c37c54f44eab73b88d8721ab6eca384efbbb` と画素一致を検査した。旧記号・配置は変えていない。比較原本は `before-art.js` と `before-renderer.js`。

## 採用原画とI10境界

`appearance-correspondence/1` §6を読み、元画像05のI/II/IIIだけを採用した。元画像05の旧IVは使用せず、IVの肖像は最終採用06全体を使う。`Art.parasitePortrait` はこれらの正確なcropを横詳細/系統樹へ描く。4cropは直接原画を描く期待画像と画素一致を検査した。

原画2枚は無加工で `src/assets/hyperparasite-*-reference-v1.png` へ複製し、`hyperparasite-reference-registry-v1.json` に原画/複製ハッシュ・区画・除外区画を保存した。`tools/prepare-hyperparasite-references.py` は無加工コピーと台帳/manifestの準備だけを行う。画像生成・背景除去・新造形はない。

I06の盤面IV本体は、既存 `life-f` の透明なIII本体を暫定使用する。本人IV/年齢/自立状態/ID/羽化結果は接続したが、**盤面IVの輪郭を採用06へ忠実に素材化したという認定ではない**。背景込みの採用原画を盤面の囲みカードにして重ねず、新しいマスクも入れない。採用形の忠実な透過アトラス、P内I〜IIIの仕上げ、全方向/全年齢素材はI10に残す。

## 採画と試験条件

- `q-adopted-portraits.png`：採用I/II/III/最終IVの4crop。各相の固有性と旧IV除外を確認。
- `q-established.png` / `q-cleared.png`：実定着と実排除の既存短札。
- `q-emerged.png`：H生存・P消失・同QのIVと年齢を保つ羽化結果。
- `q-invasion-wait.png` / `q-emergence-failed.png`：侵入待ち/羽化失敗から成功演出を作らない。
- `q-own-phase-age.png`：Pと別の本人相/年齢。
- `q-moving.png` / `q-feed-then-move.png`：本人IDの補間ヒットと実在庫位置からの採食。

専用canvasの背景は既存rendererの準備済みoverview fallbackまたは精細面を待つ。精細地形の速度認定や長期生態の自然成立はこの検査の対象ではない。最終PNGのうち採用4crop/実定着/羽化/採食後移動を `view_image` で実見した。

初回の採食線診断ではfixtureが `focus()` だけを呼び、実選択の `selectedEntity` を設定していなかった。選択個体用の診断が欠けたため、fixtureを実UIと同じ選択状態へ修正して再実行した。Art/renderer/生態sourceはこの試験修正で変更していない。

比較原本SHA-256：

- Art：`a3fd975ed542bf0072ad725ddb168ba3c38b2c6fb7665630bc03ee233280d170`
- renderer：`266784dd7eb4ab43bc705d45cc40f8d898e213acede6cb23abdb945a04c4f60c`

実行：

```sh
LIFEGAME_EVIDENCE=operations/evidence/i06-hyper-parasites-v1/graphics node tests/hyper-parasite-graphics.cjs
```
