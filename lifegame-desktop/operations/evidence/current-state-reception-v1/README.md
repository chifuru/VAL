# CS08二次：情報受信の共通照会

起点fb859a012c9e13c801f6a4e1f7b8e8610222c947。製品4.2.77。変更前57332f90…、変更後9631330d…。[実装契約](../../../design/implementation/current-state-reception-v1.md)、[対象ハッシュ/要約](report.json)、[出力ゲート](final-check.json)。

今回の変更は、**同じマスの見える発信候補、本人の親子/養育者照会、発信の分母/鮮度をターン内で再利用すること**。本人除外、適合、受信強度、学習順序、費用、慣れ、各情報時計を変えない。公開内容の同期スナップショットを維持し、キャッシュは世界/保存/Workerへ追加しない。

| 限定確認 | 結果 |
| --- | --- |
| 新規3項目 | 同マスの見通しは一度、親子・他個体は別判定。役割の違う受信者へ適合結果を共有しない。次ターンに発信元が消えれば古い候補/費用を使わない |
| 情報の既存15項目 | 初期値＋a、発信/受信/慣れ、正負、範囲、親子、費用不足/影響0、宿主選好、死亡地点生成、同期拡散/期限、場所作用、Q痕跡、読取不変を維持 |
| 接合の既存12項目 | 実Worker3形式、確定世界、取消、形式4、読取/再生/新規保存、版違い/破損等を維持 |
| 実世界の境界2点 | 保持T0→1とT133→134で、観測を含む全世界が変更前と一致。入力世界も不変 |
| 再生/従来経路 | 57332f90…の形式4記録の初期条件再生が一致し、原bytesを維持。未選択の従来マス境界も一致 |

計30項目の結果は[tests.log](tests.log)。世界比較と単回の計時は[boundary.json](boundary.json)。自然133Tの状態を再利用し、4分の自然進行を繰り返していない。保持世界のSHA256はCS08一次のsummary.jsonと一致する。

## 計時と解釈

| 保持世界 | 情報受信開始・変更前 | 変更後 | 全1T・変更前 | 変更後 |
| --- | ---: | ---: | ---: | ---: |
| T0・生体419レコード | 16.30ms | 8.96ms | 270.41ms | 227.83ms |
| T133・生体6,314レコード | 453.03ms | 307.25ms | 2468.50ms | 1986.28ms |

各点は同じ保持世界からの各1T・単回計測で、メソッド計時と呼出数カウンタの負荷を含む。情報受信開始は拡散/発信索引/受信を含む内包時間であり、全1Tへ足さない。JIT/キャッシュ/GCの影響を含み、情報処理の32%減や全体の20%減を、すべての観察条件に保証する値とはしない。

T133の全1Tを通じた近傍照会回数は17,276→11,940、親子照会は1,729→694。全1Tの値で、情報受信以外の呼出しも含む。新規の同マス確認では、見通し照会1回の共有と、2受信者の個別の親子照会を確認した。

新しく残した結果の違いを許容して速度を得た変更ではなく、実結果の一致を確認した照会再利用。生体数・ターン・全T観測・親子/遺伝・実在資源を間引いていない。共有配分や全面的な世界複製/転送の改善は今回完了していない。500T完走、全条件/大盤面、全アプリのメモリ/画面性能、Windows/配布は未認定。

## 再実行

```sh
node --test-reporter=tap -e "require('./tests/current-information-cache.test.cjs');require('./tests/current-information.test.cjs');require('./tests/current-integration.test.cjs');"
git show fb859a0:lifegame-desktop/src/ecology/observation-modules.js > /tmp/current-reception-before-modules.js
node tests/current-reception-boundary.cjs /tmp/current-reception-before-modules.js /tmp/current-runtime /tmp/current-reception-boundary.json
node tools/build-observation-model.cjs --check
```

/tmp/current-runtimeの保持世界はCS08一次で得たもの。Gitへ毎T世界を蓄積しない。保持ファイルがない場合は同工程の測定器から作成し、異なる世界を同じ値の再現と扱わない。UI/素材・Core/A/B・61Nodeの草案/階層/層間参照は維持する。
