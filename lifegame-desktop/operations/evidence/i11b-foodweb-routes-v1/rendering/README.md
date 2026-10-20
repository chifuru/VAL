# I11b 地形の空処理・bitmap所有権の限定確認

基準main `1b248aa` と今回の `habitat.js` / `renderer.js` を比較した。画質・遠景記号・近景造形・UI・生態規則・画像を変更しない。対象ソースSHAと全結果は `report.json`、実行ログは隣接の `rendering-run.log`。

## 実装

1. 量子化済みマスクの全画素が厳密に0の場合だけ、その素材のquilt/全サイズscratch合成、または色overlayを省略する。非0画素が一つでもあれば既存処理を保つ。dryマスクが全0の水域では最終的に透明になる陸canvasも作らない。マスクcache再利用時も同じ非0集合を保持する。
2. 旧overviewを先にnullへ捨てず、`resetTerrain()` 内で `close()` してから参照を解放する。既存near差替/世界変更/stale応答のcloseを維持する。
3. 地形workerへの入力を `manifest.terrain` の11sheetへ限定し、地形面が使わない `habitat-props` のbitmap作成/転送/保持を除く。元画像のdecodeや肖像の読み込み方式は変更しない。

## 実行・結果

`LIFEGAME_EVIDENCE=operations/evidence/i11b-foodweb-routes-v1/rendering node --test tests/terrain-zero-work.test.cjs`

Linux Chromiumの1 process、固定8×8の陸/深水/陸水混在fixtureを逐次使用。**Node1試験、45項目成功、ブラウザ例外0**。500Tや追加画像生成は行っていない。

- 各fixtureの128px/セルの初回patch、同じマスクを再使用する64px/セルpatch、近景/遠景へ投影した背景の合計12比較は、すべてRGBAチャンネルの差0。混在fixtureには0〜1の中間値を持つ陸水境界を含む。
- 同一patchのcache再利用を保持。陸は素材quilt12→3回、水は12→2回、混在は12→11回。水では透明になる陸canvasを1枚省略。
- 実ImageBitmapを2×2に限定したWorker probeで実際のtransfer/送信側detachを検査した。入力対象12→11sheet。対応する原画像寸法のRGBA換算は約72→66MiB（差6MiB）だが、probe実payloadは192→176byteであり、実workerのRSS削減を測った値ではない。
- 旧世界変更でoverview closeが0回となる基準の問題を再現し、今回1回へ修正。near差替・nearの世界変更・stale応答は両版とも各1回close。
- 全fixtureの生態入力は描画前後でbyte一致。

| 新鮮な4×4patch（128px/セル） | 基準・3回中央値 | 今回・3回中央値 |
| --- | ---: | ---: |
| 陸 | 84.2ms | 31.0ms |
| 深水 | 85.5ms | 18.0ms |
| 陸水混在 | 91.8ms | 74.9ms |

中央値は両版の不変素材featherが準備された後、毎回新しいHabitatとpatch/maskを作り、順番を交互にした3標本。patch cache hitの時間ではない。ほかの生態計算が並行する環境の小標本なので、全マップ/端末や実ゲームの改善率へ一般化しない。

最初に訪問した各fixtureのcold値も隠さず記録した。陸483.1→88.9ms、深水95.1→49.8ms、混在89.1→190.4ms。基準は最初の陸patchで11素材すべてのfeatherを準備するが、今回は不要素材を作らず後の混在で初使用するため、混在のcold準備は遅かった。全体のcold近景15.53秒を今回短縮したという認定はしていない。

`background-comparison.png` は左が基準、右が今回。陸/水/混在それぞれ遠景→近景の順。地形だけの説明fixtureで、通常ゲーム画面や生存・創発の証跡ではない。テスト作成時の無効な生物群/初期数のfixture入力は、最低4体・単系統の合法初期世界を作ってから固定地形へ縮める形へ修正した。製品の設定検証は変更していない。

## 既存表示設定検査の時計を固定

rootが実施した `model/browser-units.log` では、受領寿命の専用検査38項目は成功したが、既存 `display-load-reduction.test.cjs` の最初の静止マーク有無が失敗した。既存testは基準1b248aaとSHA一致し、`duration=1000000` は補間/追加演出の時間だけを延ばしていた。静止マークの独立した850ms寿命は延びない。

`display-controls-probe.cjs` はsrcを変更せず、同じfixtureを基準/今回のrendererへ逐次与えた。`display-controls-probe.json` / `.log` の自然cold値は基準840.2ms/今回737.9msで、このprobeでは両版ともマーク1件だった。受領は各1件、2体描画、対象/マークは画面内、全素材loaded、背景pendingは共通だった。900msの意図的待ち後は両版とも受領1件のままマーク0、時計固定では両版ともマーク1。元の失敗runの内部時刻は記録していないため、同じ失敗時刻の直接再現とはせず、受領欠落/座標と壁時計期限を分離した結果として扱う。

このtestの責務は同一フレームでの表示設定の独立性なので、fixture内だけ `performance.now` を固定し、操作終了の復帰は時計を明示的に210ms進めて検査するよう修正した。全既存assertは維持し、src・TTL・画質・生態は変更していない。HTMLのUTF-8も明記した。修正後の正式 `node --test tests/display-load-reduction.test.cjs` は1試験成功、失敗0（`display-controls-final.log`）。850ms失効・再演抑制そのものは別の受領専用検査の対象として維持する。
