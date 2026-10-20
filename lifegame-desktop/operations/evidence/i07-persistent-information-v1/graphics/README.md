# I07 情報場描画の限定検査

Linux Chromiumで55項目成功・例外0件。実行結果・読込生態署名は `graphics-report.json`、終了ログは `test.log`。最終署名は `cc602920ce515db5502edec9d74233a0f397735ff5707ea7ae71fa81eb5fc50d`。実行ハーネスは `tests/persistent-information-graphics.cjs`。

## 最小接合と表示の意味

`informationModel:'persistent/1'` だけ、実在する `informationField` を有効期限 `expires > turn` と最小量 `.01` で選び、1セルにつき量の合計と一意な `originId` 数へ集約する。同じ由来の断片を独立した根拠や生体として数えない。集約は確定状態の受渡し時に一回、近景は既存spatial索引で表示候補を絞る。

既存infoの原画/記号・固定色を再利用する。実量で変えるのは小さく上限を設けた大きさと粒数だけ。実績score・低根拠・内容の符号・Q加工・発信者を色や明るさに渡さず、E/B/Mや栄養・真偽の成功率へ変換しない。名札は既存資源名チェックで「情報量 / 由来数」を示す。

新場は旧info資源の20Tアルファ失活を使わず、実recordの期限を描画側で守る。本人の元経験時計・生成T・期限・量を描画で書き換えない。新 `information-effect` は計算/観測用の記録として保持し、栄養吸収や真偽の成功pulseへ流用しない。

情報は背景/資源の既存層へ描き、主生物・下層生物の既存表示とヒット領域を保つ。`hitAt` はすべての既存生体/遺体IDを優先し、その後で情報記号の領域にだけ `{cell,id:null,kind:'information',information:true}` を返す。Shift/groundOnlyは旧経路のまま。app側は `information:true` で主生物の自動選択をせず、同じセルの実recordを横詳細へ渡す。選択は量の消費/学習/期限延長をしない。

## 検査の範囲

- 採用基準main `836e4fd3afa4b2fee3c0b321ebf6778465da91f1` のArt/rendererを `before-art.js` / `before-renderer.js` に固定。無flagのinfo原画5齢と遠景/簡略/近景の盤面を画素比較する。
- 明示fixtureで疎密/同量の複数由来/同由来断片、実績や根拠と独立した色、実期限/最小量境界、資源チェック、非栄養の表示数/台帳、read不変を確認する。
- 主生物・独立植物・群落・prey・P/Qの6実IDについて、情報が同居しても両表示面のヒットを奪わない。既存の主生物/独立植物の状態札と生体計数を維持する。
- 実appの情報記号をクリックし、`selectedId=null` のセル参照と由来詳細、指紋不変を確認する。

専用canvasのPNGは既存rendererの準備済みoverview地形fallbackまたは精細面を背景にする。`field-app-selected.png` は新世界作成直後の地形準備中に、実クリックで開いた情報場の横詳細を記録したもの。近景疎密2枚・同居・実app選択の計4PNGを `view_image` で実見した。

最終情報場素材/全方向・全齢素材はI10、画面全体の仕上げはI09、長期循環や全端末性能はI11。画像生成・素材編集・新造形・新記号・画面配置変更はない。明示表示fixtureを自然条件での情報生成/学習成功の認定へ一般化しない。

初回fixtureは全生物群disabledを空世界として作ろうとして正式validatorに拒否されたため、初期0のままP/Q群を有効（実宿主0なので配置0）へ修正した。次の試行では、既存のmain状態札設定が独立植物も対象にするのを試験が見落としていた。既存のmain1/producer1/基底0/prey0へ期待を合わせ、最終署名で55成功を確認した。これらは試験側の修正であり、Art/rendererは凍結後に変更していない。

比較原本SHA-256：Art `e35c3f7f976528e71da52ea664aefd65d1695f6f9cb5d017b15a8708438ceb71` / renderer `9fcffdc665a50d439735c6f5409ae3335dcc51c3405a4e7a62f742024660224f`。

実行：

```sh
LIFEGAME_EVIDENCE=operations/evidence/i07-persistent-information-v1/graphics node tests/persistent-information-graphics.cjs
```
