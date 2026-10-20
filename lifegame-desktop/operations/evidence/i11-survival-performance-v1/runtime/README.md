# I11 通常速度・実ブラウザ500Tの限定確認

対象は4.2.43、計算署名 `95b7405d3e4513acabf2194ed0ed1b9eb79c9ffd566bcc9e0b5f1edc3ca1b889`。Linux Chromium、1460×1030、40×28、混合Wの評価seed00の一例で実測した。通常cadence1000ms、現行の記号/近景素材・背景・モーション・効果を保持し、製品source・生態規則・画質を変更していない。

最終判定とsource SHAは `final-report.json`。元の `report.json`・`run.log`・`failure.png`・実行した `first-run-test.cjs` を保持する。最初のharnessは最後のconsole検査だけ失敗した。原因は製品ではなくテストHTTPサーバの `/favicon.ico` 404一件であり、`console-recheck.json` がURLを再現・特定し、favicon204対応後に同じ製品と実Worker3Tでconsole/例外/素材エラー0を確認した。500Tを繰り返さず、この短い再確認を分けて記録している。今後の `tests/i11-survival-runtime.cjs` はfavicon204と軽量メモリ取得を含む。

## 確認結果

- UIの新規設定は `balanceModel: survival/1` を返す。同じ初期configで既存direct W00と初期指紋が一致し、実ブラウザWorkerの500T後も最終指紋が完全一致した。
- `browser-observations.json.gz` の全501原値は、既存direct W00の全501原値とmetadata・関係区間を含めて完全一致した。表示の有無や速度による原値の補完/間引きはない。`browser-final-world.json.gz` も保持する。
- Workerは準備1回、phase1500件、turn500件、エラー0。top-right一時停止は途中表示を確定Tへ戻し、再開できた。種族説明の選択は観測を止めなかった。
- IndexedDBへ500Tと全501行・実効設定・最終指紋を保存できた。新モデル再生は元の初期状態へ戻り、開いただけでは記録を増やさない。短い2T再生を明示保存すると元の500T記録を残して別記録を作った。
- 前署名のflagless記録を模した境界fixtureは、新規UIを経由しても `survival/1` を獲得せず、旧経路の最終指紋を再現した。すべての実在する旧記録を網羅した結果ではない。
- 近遠切替は生態と観測を変えず、近景の詳細素材・通常背景・モーション/効果を維持した。`near-initial.png` は実画面。`checkpoint-500.png` は背景作成後の実遠景と全期間グラフ。`far-initial.png` は背景作成完了前の一時表示であり、完成した背景の資料には使用しない。

## 実測値と限界

| 項目 | 結果 |
| --- | ---: |
| 500T経過時間（手動停止/操作を含む） | 546.42秒（9分6秒） |
| 手動停止分を除いた時間 | 545.02秒 |
| 初期世界作成 | 0.685秒 |
| Worker事前準備 | 1.015秒 |
| cold遠景背景作成 | 3.20秒 |
| cold近景背景作成 | 15.53秒 |
| drawIfChanged全呼出平均 / p95 / p99 | 3.72 / 10.2 / 30.1ms |
| rAF間隔 p50 / p95 / p99 | 16.7 / 50.0 / 83.3ms |
| Chrome RSS合算の観測最大 | 2327.8MiB（250Tサンプル） |
| 500T Chrome RSS合算 | 1837.2MiB |
| 500T art cache計上量 | 181.07MiB（variants eviction8件） |
| 500T CDP main-renderer JS heap使用量 | 143.61MiB |

初期作成・Worker準備は各60秒以内、500Tは5〜15分目標内だった。一方、rAFの遅い区間や高いRSSは残るため、全端末の滑らかな動作/低メモリ達成とはしない。

`light-state-500.json` は500T確定後に既存APIから取得したcache bytes/evictions、表示canvas寸法、JS heap、描画診断。実行開始後に追加依頼されたため、当該測定だけtest Node debuggerから読み取り、製品や生態状態を変更していない。重いheap snapshotや強制GCは行っていない。CDP heapとperformance.memoryは取得対象/時点が異なり、合算しない。offscreen地形bitmap寸法はrenderer内部の非公開状態であり、getterを追加していない。

RSSはChrome各processの `/proc` RSSの合算で、共有ページの重複を含み得る。実機物理メモリ使用量やリークの証拠へ読み替えない。画像cache計上量とJS heapだけで全RSSを説明することもできない。次の検討では画像decode・worker/bitmap・JS状態を分ける材料とする。

この一例は既存W00の描画付き重複測定であり、生存率の分母へ追加しない。R1〜R6の一般的達成、すべての盤面/優遇/端末、全画面配置の完成を認定するものではない。画面構成の追加修正は利用者指定に従って後続とする。
