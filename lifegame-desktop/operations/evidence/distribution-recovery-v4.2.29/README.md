# Windows 4.2.29 配布復旧の確認

対象main 5e08d86。製品コード・生態・原画・版4.2.29は変更なし。C4/D4/E7の草案内で検査を修正する。

## 判明した失敗

Actions run39277787728 / job118146446561のdecodedログでは、Browser interactionがusability-performance.cjsのsecond loadで失敗。現行の未保存観測を破棄する確認画面を旧検査が操作していなかった。ZIP作成前に終了し、artifact12199771656は検査資料23件だけ。製品ダウンロードとして案内しない。generic run statusのin_progressと実ジョブログの終了が食い違うため、実ログ・step・成果物を照合する。

## 局所修正・実測

- usability-performance: 現行の確認画面を明示操作、生成完了待ちを追加。Linux Chromiumで20項目成功。画素一致・生態不変・再生成2回を維持。
- observation-model-ui:8項目、dedicated-variants-ui:8項目/183差分、presence-ui、terrain-symbols-uiは成功。各report.json参照。
- population-ui:廃止済みtrend-rangeを現行全期間graph-rangeへ接続。個体選択後の詳細欄から順位を開く。後続の段階観察・記録再生を確認中。

## 配布の判定

ローカルZIPは4.2.29、274718515 bytes、SHA256 5d7908e9a66de36dae7c82b07892a230423adf60d0cd59adfa74a7df6b866226。既存information-release-v4.2.29/package-match.jsonの全72src/35PNG同梱一致を維持。Windows CI再実行・実exe起動・新しい配布artifactは未確認。旧4.1 artifactを最新版として使わない。
