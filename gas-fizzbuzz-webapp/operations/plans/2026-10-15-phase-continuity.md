# 第二相→第三相の身体連続性

入力: 第二相から第三相の遷移が大きすぎる。具体例N932。標準core3/関連6Node/実装と全421入力を確認。旧版はN932が579行myth(avian)→580行swarm(arthropod)、391入力でbodyPlan自体が変わっていた。
前提/粒度: 第零次前提/Identity/前提フィードバック/全草案を維持。既存A1.4/A1.5/B1.4.2/C1.4.3/D1.2/D1.3.2で吸収でき、追加機能分割不要。Eだけ対象版/環境別。A〜Eを同数化しない。
契約: FLOW04→07計画→外部テスト→08証跡→05反映。読むものcore3/6Node/engine/lineage/renderer/既存テスト。更新は6Node/engine/tests/契約/package1.11.0/README。新規は旧計算比較用test archive、相遷移実画像テスト、実結果後のE55/E56候補/証跡。srcには実装だけ。
仕様: 新規ENGINE5個体はevolutionPolicy=body-continuity-v1。同じbodyPlanの系統だけを第三相候補にし、直前系統の評価へ0.08加点（既存餌適合最大0.085と同程度の連続性）。元の実環境/餌評価・同型分化を残す。N932はmyth→mythとなりsource frame3を引き継ぐ。201/580の相入口と元FizzBuzz/quarters/DNA/環境計画/全器官継承/条件覚醒は変更しない。
版互換: 方針を持たない旧ENGINE5状態は旧無制約ルールを維持し、表示/保存済み肖像を読み替えない。旧1..4と全68PNG/core3/原モック/図鑑session/最終だけ/明示load→startも保持。
検証: 全421入力のbodyPlan保持/同型分化/20系統覚醒到達、932のsource同一/比率/色変化、旧方針・JSON継続・旧画素、20系統/160コマ/80制御生息地/操作/連続性能/実Electron2プロセス、Windows配布/実exe/全ZIP SHA。旧新版の相遷移画像を保存し、新分岐で変わる結果は明示する。E新規登録と既存反映/全草案/入力SHA/未反映なしを出力前照合。利用者実機と美術受入は未認定。
