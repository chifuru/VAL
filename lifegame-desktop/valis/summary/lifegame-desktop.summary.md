# Project Summary Manifest

project_id: lifegame-desktop
canonical_path: valis/summary/lifegame-desktop.summary.md
current_status: 現行A/Bの実装とローカル検査を実施済み。長期持続・自然な主生物繁殖のバランス調整が必要。全57Node草案、承認状態変更なし。
current_specification: design/specification/ab-system-specification-v1.3.md
current_adjustments: design/specification/ab-readiness-v1.4.md
current_contract: operations/plans/ecology-v1.4-implementation.md
current_image: design/specification/atlas-v1.3/ecology-system-master.png

現在の状態と必要な参照だけを記載する。履歴・過去の作業ログは保持しない。coreはプロジェクト内正本を使用し、変更しない。

## A：現在の対象

A1:（起点 / 生態系の成長と生存観測）［草案］
	Node File: valis/nodes/A/A1.md; 親: なし
	実態: 現行仕様。実装開始・分割確認済み。承認状態は草案。

A1.1:（A1 / 個体・系統・段階進化）［草案］
	Node File: valis/nodes/A/A1.1.md; 親: A1
	実態: 現行仕様。実装開始・分割確認済み。承認状態は草案。

A1.2:（A1 / 各マスの環境・餌資源）［草案］
	Node File: valis/nodes/A/A1.2.md; 親: A1
	実態: 現行仕様。実装開始・分割確認済み。承認状態は草案。

A1.3:（A1 / 性別・繁殖・遺伝）［草案］
	Node File: valis/nodes/A/A1.3.md; 親: A1
	実態: 現行仕様。実装開始・分割確認済み。承認状態は草案。

A1.4:（A1 / 局所経験と系統戦略）［草案］
	Node File: valis/nodes/A/A1.4.md; 親: A1
	実態: 現行仕様。実装開始・分割確認済み。承認状態は草案。

A1.5:（A1 / 寄生と宿主の生活環）［草案］
	Node File: valis/nodes/A/A1.5.md; 親: A1
	実態: 現行仕様。実装開始・分割確認済み。承認状態は草案。

A1.6:（A1 / 光合成と共生の栄養）［草案］
	Node File: valis/nodes/A/A1.6.md; 親: A1
	実態: 現行仕様。実装開始・分割確認済み。承認状態は草案。

A1.7:（A1 / 共通生物モデルと栄養関係）［草案］
	Node File: valis/nodes/A/A1.7.md; 親: A1
	実態: 現行仕様。実装開始・分割確認済み。承認状態は草案。

A2:（起点 / 独立した Windows ローカル実行）［草案］
	Node File: valis/nodes/A/A2.md; 親: なし
	実態: 現行仕様。実装開始・分割確認済み。承認状態は草案。

## B：現在の対象

B4:（A1.1, A1.2, A1.3, A1.4, A1.5, A1.6, A1.7 / 生態系の同期進行）［草案］
	Node File: valis/nodes/B/B4.md; 親: なし
	実態: 現行仕様。実装開始・分割確認済み。承認状態は草案。

B4.1:（A1.4, A1.2 / 局所パラメータによる動作判断）［草案］
	Node File: valis/nodes/B/B4.1.md; 親: B4
	実態: 現行仕様。実装開始・分割確認済み。承認状態は草案。

B4.2:（A1.5, A1.2, A1.4 / 寄生の遷移）［草案］
	Node File: valis/nodes/B/B4.2.md; 親: B4
	実態: 現行仕様。実装開始・分割確認済み。承認状態は草案。

B4.3:（A1.6, A1.2 / 非採食の栄養収支）［草案］
	Node File: valis/nodes/B/B4.3.md; 親: B4
	実態: 現行仕様。実装開始・分割確認済み。承認状態は草案。

B4.4:（A1.7, A1.2, A1.6 / 生産者・餌生物の共通生活処理）［草案］
	Node File: valis/nodes/B/B4.4.md; 親: B4
	実態: 現行仕様。実装開始・分割確認済み。承認状態は草案。

B5:（A1.1, A1.2, A1.3, A2, A1.4 / 生態系の観測・比較操作）［草案］
	Node File: valis/nodes/B/B5.md; 親: なし
	実態: 現行仕様。実装開始・分割確認済み。承認状態は草案。

B5.1:（A1.1, A1.2 / 系統樹と進化条件の参照機能）［草案］
	Node File: valis/nodes/B/B5.1.md; 親: B5
	実態: 現行仕様。実装開始・分割確認済み。承認状態は草案。

B5.2:（A1.1, A1.2, A1.3, A1.4, A1.5, A1.6, A1.7 / 進化・繁殖・生態関係の説明シート）［草案］
	Node File: valis/nodes/B/B5.2.md; 親: B5
	実態: 現行仕様。実装開始・分割確認済み。承認状態は草案。

B5.3:（A1.1, A1.2, A1.3, A1.5, A1.6 / 確定した行動のモーション表示）［草案］
	Node File: valis/nodes/B/B5.3.md; 親: B5
	実態: 現行仕様。実装開始・分割確認済み。承認状態は草案。

## C：現在の対象

C4:（A2, B5 / Electron と Windows 配布）［草案］
	Node File: valis/nodes/C/C4.md; 親: なし
	実態: 現行2.0.0接続済み。Windows ZIP生成・展開SHA照合・実exe10ターン成功。対象版と範囲はE7。

C7:（B4 / 同期ターン接合と世界確定）［草案］
	Node File: valis/nodes/C/C7.md; 親: なし
	実態: 実装済み。現行の実測対象・範囲はE5/E6。生態バランスと端末別性能は保証範囲外。

C7.1:（B4, B4.4 / 初期値・固定世界・30系統の共通状態）［草案］
	Node File: valis/nodes/C/C7.1.md; 親: C7
	実態: 実装済み。現行の実測対象・範囲はE5/E6。生態バランスと端末別性能は保証範囲外。

C7.2:（B4.3, B4.4 / 有限栄養・資源CA・生産と死骸）［草案］
	Node File: valis/nodes/C/C7.2.md; 親: C7
	実態: 実装済み。現行の実測対象・範囲はE5/E6。生態バランスと端末別性能は保証範囲外。

C7.3:（B4.1 / 局所行動・同時移動戦闘・学習）［草案］
	Node File: valis/nodes/C/C7.3.md; 親: C7
	実態: 実装済み。現行の実測対象・範囲はE5/E6。生態バランスと端末別性能は保証範囲外。

C7.4:（B4, B4.4 / 成長・遺伝・出生と繁殖例外）［草案］
	Node File: valis/nodes/C/C7.4.md; 親: C7
	実態: 実装済み。現行の実測対象・範囲はE5/E6。生態バランスと端末別性能は保証範囲外。

C7.5:（B4.2 / 寄生生活環と外部情報）［草案］
	Node File: valis/nodes/C/C7.5.md; 親: C7
	実態: 実装済み。現行の実測対象・範囲はE5/E6。生態バランスと端末別性能は保証範囲外。

C8:（B5, B5.1, B5.2 / 観測操作・図鑑と説明シート）［草案］
	Node File: valis/nodes/C/C8.md; 親: なし
	実態: 実装済み。現行の実測対象・範囲はE5/E6。生態バランスと端末別性能は保証範囲外。

C8.1:（B5.3 / 盤面と個体の描画・確定モーション）［草案］
	Node File: valis/nodes/C/C8.1.md; 親: C8
	実態: 実装済み。現行の実測対象・範囲はE5/E6。生態バランスと端末別性能は保証範囲外。

## D：現在の対象

D4:（A2, C4 / 配布と実 Electron 起動）［草案］
	Node File: valis/nodes/D/D4.md; 親: なし
	実態: 現行2.0.0接続済み。Windows ZIP生成・展開SHA照合・実exe10ターン成功。対象版と範囲はE7。

D7:（C7, C7.1, C7.2, C7.3 / 再現性・有限収支・同時競合）［草案］
	Node File: valis/nodes/D/D7.md; 親: なし
	実態: 現行検査を作成・実行済み。ルール34項目または画面32項目の該当範囲はE5/E6参照。

D8:（C7 / 生態循環と結合進行）［草案］
	Node File: valis/nodes/D/D8.md; 親: なし
	実態: 現行検査を作成・実行済み。ルール34項目または画面32項目の該当範囲はE5/E6参照。

D8.1:（C7.4 / 相・出生・遺伝と繁殖例外）［草案］
	Node File: valis/nodes/D/D8.1.md; 親: D8
	実態: 現行検査を作成・実行済み。ルール34項目または画面32項目の該当範囲はE5/E6参照。

D8.2:（C7.5 / 寄生・高次寄生と情報）［草案］
	Node File: valis/nodes/D/D8.2.md; 親: D8
	実態: 現行検査を作成・実行済み。ルール34項目または画面32項目の該当範囲はE5/E6参照。

D9:（C8, C8.1 / 観測画面・系統樹・説明と描画）［草案］
	Node File: valis/nodes/D/D9.md; 親: なし
	実態: 現行検査を作成・実行済み。ルール34項目または画面32項目の該当範囲はE5/E6参照。

## E：現在の対象

E5:（D7, D8, D8.1, D8.2, C7, C7.1, C7.2, C7.3, C7.4, C7.5 / 現行生態計算の実測証跡）［草案］
	Node File: valis/nodes/E/E5.md; 親: なし
	実態: ルール34/34成功、3盤面・1000ターンで収支/占有検査を通過。持続バランスは未成立例あり。

E6:（D9, C8, C8.1 / 現行観測画面のLinux実測証跡）［草案］
	Node File: valis/nodes/E/E6.md; 親: なし
	実態: Linux画面32/32成功。現行Windows配布/実行は別証跡E7。

E7:（D4, D7, D8, D8.1, D8.2, D9, A2, C4, C7, C8, C8.1 / 現行Windows配布exeの実測証跡）［草案］
	Node File: valis/nodes/E/E7.md; 親: なし
	実態: Windows CI成功。単体/構造/回帰51、画面32、ZIP展開SHA照合、実exe10ターン・Node非公開/file表示を確認。

## 登録済みだが現行仕様の対象外

過去の内容は転記せず、適用可否だけ示す。詳細が必要な場合は各Nodeを読む。

B1:（A1 / 再現可能な初期集団）［草案］
	Node File: valis/nodes/B/B1.md; 親: なし; 実態: 旧版対象。現行仕様の実装・検証根拠としては対象外。

B2:（A1 / 生態系進行と状態整合）［草案］
	Node File: valis/nodes/B/B2.md; 親: なし; 実態: 旧版対象。現行仕様の実装・検証根拠としては対象外。

B2.1:（A1 / 生命サイクル）［草案］
	Node File: valis/nodes/B/B2.1.md; 親: B2; 実態: 旧版対象。現行仕様の実装・検証根拠としては対象外。

B2.2:（A1 / 移動と競争）［草案］
	Node File: valis/nodes/B/B2.2.md; 親: B2; 実態: 旧版対象。現行仕様の実装・検証根拠としては対象外。

B3:（A1, A2 / 操作と生存観測）［草案］
	Node File: valis/nodes/B/B3.md; 親: なし; 実態: 旧版対象。現行仕様の実装・検証根拠としては対象外。

C1:（B1 / 初期化・seed・種族定義）［草案］
	Node File: valis/nodes/C/C1.md; 親: なし; 実態: 旧版対象。現行仕様の実装・検証根拠としては対象外。

C2:（B2 / ターン接合とスナップショット）［草案］
	Node File: valis/nodes/C/C2.md; 親: なし; 実態: 旧版対象。現行仕様の実装・検証根拠としては対象外。

C2.1:（B2.1 / 資源・成長・繁殖）［草案］
	Node File: valis/nodes/C/C2.1.md; 親: C2; 実態: 旧版対象。現行仕様の実装・検証根拠としては対象外。

C2.2:（B2.2 / 行動・同時戦闘・移動）［草案］
	Node File: valis/nodes/C/C2.2.md; 親: C2; 実態: 旧版対象。現行仕様の実装・検証根拠としては対象外。

C3:（B1, B3 / 観測画面と制御）［草案］
	Node File: valis/nodes/C/C3.md; 親: なし; 実態: 旧版対象。現行仕様の実装・検証根拠としては対象外。

C5:（B4 / モックの個体・資源・繁殖モデル）［草案］
	Node File: valis/nodes/C/C5.md; 親: なし; 実態: 旧版対象。現行仕様の実装・検証根拠としては対象外。

C6:（B5 / モックの造形投影・観測画面・配布）［草案］
	Node File: valis/nodes/C/C6.md; 親: なし; 実態: 旧版対象。現行仕様の実装・検証根拠としては対象外。

D1:（A1, B1, C1, C2 / 初期値・入力境界・再現性）［草案］
	Node File: valis/nodes/D/D1.md; 親: なし; 実態: 旧版対象。現行仕様の実装・検証根拠としては対象外。

D2:（A1, B2, B2.1, B2.2, C2, C2.1, C2.2 / 生態ルールと不変条件）［草案］
	Node File: valis/nodes/D/D2.md; 親: なし; 実態: 旧版対象。現行仕様の実装・検証根拠としては対象外。

D3:（A1, A2, B3, C3 / 実画面の操作と表示）［草案］
	Node File: valis/nodes/D/D3.md; 親: なし; 実態: 旧版対象。現行仕様の実装・検証根拠としては対象外。

D5:（A1.1, A1.2, A1.3, B4, C5 / 個体・4入力・進化・繁殖の検証計画）［草案］
	Node File: valis/nodes/D/D5.md; 親: なし; 実態: 旧版対象。現行仕様の実装・検証根拠としては対象外。

D6:（A1.1, A1.2, A1.3, B5, C6 / モックの画面・描画・実行検証計画）［草案］
	Node File: valis/nodes/D/D6.md; 親: なし; 実態: 旧版対象。現行仕様の実装・検証根拠としては対象外。

E1:（D1, D2, D4, A1, C1, C2, C2.1, C2.2, C4 / エンジン・パッケージ補助検査）［草案］
	Node File: valis/nodes/E/E1.md; 親: なし; 実態: 旧版対象。現行仕様の実装・検証根拠としては対象外。

E2:（D3, B3, C3 / Chromium 実画面検査）［草案］
	Node File: valis/nodes/E/E2.md; 親: なし; 実態: 旧版対象。現行仕様の実装・検証根拠としては対象外。

E3:（D4, A2, C4 / Windows配布・実exe検証）［草案］
	Node File: valis/nodes/E/E3.md; 親: なし; 実態: 旧版対象。現行仕様の実装・検証根拠としては対象外。

E4:（D5, D6, A1.1, A1.2, A1.3, B4, B5, C5, C6 / 1マス1個体モックの実測証跡）［草案］
	Node File: valis/nodes/E/E4.md; 親: なし; 実態: 旧版対象。現行仕様の実装・検証根拠としては対象外。

## 現在の不足と次作業

長期観測の一初期値でIII到達・主出生0、500ターンまでに全生物消失。収支検査の成功とは別に、持続・成長・繁殖のバランス調整が必要。大盤面は負荷に応じて減速し、全端末の速度は未確認。Windows ZIP/実exeの実測はE7を参照（対象700f57a）。次候補は生態バランスの評価・必要なA/B調整。
