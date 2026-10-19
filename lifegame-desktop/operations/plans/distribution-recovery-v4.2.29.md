# 最新Windows配布の復旧

対象: main 5e08d86 / 製品4.2.29。既存C4/D4/E7、標準coreの出力前ゲート・Manifest反映・FLOW04/05を実読。新ノード・製品仕様変更なし。

CI 39277787728 / job118146446561 の実ログを確認。Browser interaction は旧usability-performanceの再生成確認操作不足で失敗し、Windows ZIP作成前に終了。always artifactは検査資料のみであり製品配布に使わない。

FLOW契約: 旧検査を現行UIに接続→配布後続検査を局所確認→main統合→Windows CIのパッケージ生成・全展開SHA・実exe起動結果とartifact内容を照合→最新版への直接リンクを提示。製品4.2.29の生態/原画/版は変更しない。既存500Tを重複実行しない。正式状態は草案を維持する。

population-uiの廃止済みtrend-range参照はgraph-range（全期間）に変更し、12/13Tの履歴と新世界0Tの検査を維持する。

## 局所照合結果

再生成20、集団23、段階26、全期間記録14、Worker再生25項目が成功。先行する観測8/専用差分8、強調13/地表記号23も成功。製品source不変。C4/D4/E7と現在のみManifestに接続し草案を維持。Windowsの配布検査/公開待ちは残件として明記する。
