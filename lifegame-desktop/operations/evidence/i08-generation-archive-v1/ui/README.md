# I08 生成・保存 UI 検査

- 実行: `LIFEGAME_EVIDENCE=operations/evidence/i08-generation-archive-v1/ui node tests/generation-archive-ui.cjs`
- 環境: Linux Chromium、ローカル HTTP、実 IndexedDB / export Worker。
- 生態署名: `2789e4711fd87f4824e11ff10762fde9a26880fa322db3a1bfbeb808b094d85d`
- 結果: **49 項目成功、ブラウザ例外・native dialog 0**。原値は [ui-report.json](ui-report.json)、実行要約は [run.log](run.log)。

おまかせ・6 プロファイル、手入力の固定、明示 0、供給 OFF、連続生成で倍率を累乗しないことを確認した。設定へ戻った際も常設の空グラフ・生存一覧は非表示で、保存結果の分析では既存の全ターングラフが表示される。無効にした P をプリセットが勝手に有効化せず、矛盾した固定条件の生成と T0 観測失敗は現在世界を保持する。

schema 3 本文の全ターン原値・解決済初期配置・計算署名、軽量一覧ヘッダ、解決済条件からの初期・終端指紋一致再生、新しい保存 ID と元記録の保全を実測した。本文欠落・非有限値・未知定義・ヘッダとの不一致を拒否し、ヘッダ再読込失敗時も検証済一覧を保持する。実 IndexedDB 取引の失敗では未保存結果を維持し、export Worker から [pending-result.json](pending-result.json) を救出した後、同じ ID で再試行できる。旧 schema 2 の再生設定には新モデルの既定値を注入しない。

最終状態の個別例は分類ごと最大 4 件で、`total` / `retained` / `truncated` を持つ。全個体履歴ではない。全期間の参照元は毎確定ターンの観測原値で、毎ターン全世界の複製は保存しない。

画面 3 枚を実見した。画面配置・採用原画は維持する。

- [generation-settings.png](generation-settings.png): 生成前設定と固定入力、空の常設グラフ・生存一覧がない設定画面。
- [generation-saved-analysis.png](generation-saved-analysis.png): 保存結果の分析と個別例の範囲注記。ダイアログ内のグラフ 5 面は検査コードで表示を確認。
- [generation-old-schema2.png](generation-old-schema2.png): 旧 schema 2 条件からの再生。

担当の単体検査は `generation-archive.test.cjs` 9 件、`archive-history.test.cjs` 5 件（501 行の旧観測を含む）、`archive.test.cjs` 5 件が成功。全件単体・生態比較・長期条件は root 担当の別証跡を参照する。
