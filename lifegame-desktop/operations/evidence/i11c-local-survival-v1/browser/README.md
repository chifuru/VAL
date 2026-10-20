# I11c 新生成・短期Worker・保存再生境界

対象4.2.45、計算署名 `c78400a515eba25515dd699c1f3f5ba6cc2004c5dc4b992fbf3e4c2d1c6082d9`。前I11bのrunnerをこの証跡側へ複製し、新しいUI生成 `survival/3` と旧 `survival/2` / `survival/1` / 版なしの分類・保存・再生に絞って確認した。src/Node/CSS/絵柄/rendererを変更せず、画像再比較・500Tは行っていない。

実行：`node operations/evidence/i11c-local-survival-v1/browser/runner.cjs`。Linux Chromium1460×1030の1 browser、40×28/river、初期主生物24体（日輪・量機・浮遊傘）、通常1000ms cadence。**49項目成功、page/console/Workerエラー0**。詳細は `report.json`、短い要約は `summary.json`、ログは `run.log`。faviconは204対応。

- 新UIの設定・生成実体・保存config・最終状態のmodelがすべて `survival/3`。初期主生物の相Iと寿命前半の年齢分散、既存の説明表示も確認した。
- 実Workerで4Tを確定し、0〜4Tの世界指紋5件・全5行の原値/metadata/定義/関係区間が同じ実効設定のdirect生成版と完全一致。先行計算の10turn/30phaseメッセージは観測達成へ加算しない。
- 開始、一時停止時の確定T復帰、停止保持、再開、種族説明選択中の継続を確認。
- 図鑑へ4Tを保存し、全原値と最終指紋を保持。再生は元の初期状態へ戻り、開いただけでは記録を追加しない。1Tの再生を明示保存すると別ID/元記録IDで新記録となり、元の4T記録は変わらない。
- 新しいv3記録を旧v2/v1/版なしの3署名として扱うarchive入口へ渡すと、すべて拒否した。新しい世界を旧規則として誤分類しない。
- 旧v2署名 `ada68bb8…`、v1署名 `95b7405d…`、版なし署名 `a7cac02a…` の境界fixtureは、現UIから同じ旧modelで初期状態と1T終端を再現した。全2行が一致し、観測全体の相違は現buildによる再観測署名のみ。旧原記録/原署名を保持し、自動再保存はない。実在する全旧記録を網羅した認定ではない。

`worker-paused.png` は4Tを明示終了して図鑑へ保存した実画面。`final-world.json.gz` と `observations.json.gz` は短期終端と全5原値。対応するsource10ファイルのSHAは実体と一致し、画像は目視確認した。

今回の初期作成1.18秒、Worker準備8.64秒、停止/操作込みの4T観測19.30秒。並行計算を含む一条件の短期値で、改善率・500Tの速度・長期生存・全端末性能へ一般化しない。
