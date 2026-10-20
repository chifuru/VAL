# Project Summary Manifest

lifegame-desktop。現在のNode構造と適用範囲を示す。詳細は各Node、仕様と資料の入口は `design/specification/README.md`。

現在入口: `design/specification/README.md`。量機仕様: `design/specification/ryouki-v1.md`、採用分岐: `design/ryouki-branches-v2/README.md`。第三相3枝/第四相6枝の2画像は採用済みで、造形確認待ちは解消。比較係数と未採用の旧9区画図を区別する。実装順序は `operations/plans/implementation-sequence-v1.md`。I04量機に続きI05一次寄生Pの適合/侵入/翌T定着・同ID移行・遺伝/抵抗・有限量/観察保存を接続し、次はI06高次寄生Q。追加生態全体と最終素材/実測は未完、全Node草案、新規登録・状態遷移なし。

開発版は4.2.37、Windows配布済み版は4.2.32。今回のC/D/E・src/testsと限定検証の範囲は `operations/evidence/i05-primary-parasites-v1/README.md`。Windows配布の現状はE7、新ZIPは未作成。既存最適化の対象は `operations/evidence/optimization-v4.2.32/README.md`。対象版付き証跡は未実装の追加生態仕様の合格根拠ではない。

## A：仕様

```text
A1:（起点 / 生態系の成長と生存観測）［草案］
	構成（要素・関係）:
		valis/nodes/A/A1.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
	ロジック:
		第1〜第4組の構造を採用し、状態/計数/表示/説明/保存を同じID/単位/確定時点に揃える。植物の生産者役割/個体単位、P/Qの形態/相と採用画像を既存観測・保存へ対応させる。 量機を独立した主生物として追加採用し、通常型/相変異型/同居/個体単位と現行観測を接続する。
	実態:
		既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。Q新生活環/情報等の追加分と最終素材/実測は後続。草案/構造/既存証跡の対象版を維持。

	A1.1:（A1 / 個体・系統・段階進化）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.1.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			通常の相/枝/年齢とQ第四相の成熟羽化例外を、盤面/横詳細/構成集計で一貫させる。三植物のIII3→IV6、P形態×三相、Q四相を年齢/宿主段階と区別する。 通常型I〜IVの移動1/2/3/4とIII3→IV6、相変異の共通3マス・1〜3/4の外見を区別する。通常型の第三相3枝/第四相6枝は採用した2画像へ対応させる。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。Q新生活環/情報等の追加分と最終素材/実測は後続。草案/構造/既存証跡の対象版を維持。

	A1.2:（A1 / 各マスの環境・餌資源）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.2.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			生体/群落/体外感染量/死骸/情報を描画・選択・計数で区別し、同居/基部残存/可食部0を識別する。大型植物と基底群落、同居容量、本体/可食部、浮遊する淡水個体の局所位置を区別する。 草と虫の有限在庫、相変異時の摂食増加、主生物側最大3体同居の量機限定例外を定義する。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。Q新生活環/情報等の追加分と最終素材/実測は後続。草案/構造/既存証跡の対象版を維持。

	A1.3:（A1 / 性別・繁殖・遺伝）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.3.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			性別/無性別/階級、年齢成熟/繁殖待機と相を別に表示する。 高い繁殖力を維持し、相変異4の繁殖目的と実際の出生資格/費用/待機を分ける。子はI/年齢0。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。Q新生活環/情報等の追加分と最終素材/実測は後続。草案/構造/既存証跡の対象版を維持。

	A1.4:（A1 / 局所経験と系統戦略）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.4.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			観察者の情報/適応/抵抗解析と、生物が局所的に知る情報を分離する。 相変異は低密度が一定ターン続いてから解除する可逆状態。密度/継続Tの数値は比較案として分離し、4の繁殖準備への優先補正を既存の局所判断へ接続する。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。Q新生活環/情報等の追加分と最終素材/実測は後続。草案/構造/既存証跡の対象版を維持。

	A1.5:（A1 / 寄生と宿主の生活環）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.5.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。
		ロジック:
			H→P→Qの付随とP→H/Q→Pの関係線、Qの発育/羽化失敗/成功/IV自立を区別する。既存P二系統の形態とQの翅なしIVを対応させ、感染経路/成熟羽化/群体単位を維持する。
		実態:
			植物/P/Qの造形対応をA/B反映済み。独立植物はI03、一次寄生PはI05接続。Q新生活環と最終素材/実測は後続。後続修正/検証要否・草案/階層/参照は維持。

	A1.6:（A1 / 光合成と共生の栄養）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.6.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。
		ロジック:
			記録数/生物量B/可食量/基部/蓄え/生産/再生/感染量/情報量を別尺度で表示保存する。森冠/星冠/淡水系統を生産者とし、本体一個体・有限可食量・有償再生を分ける。
		実態:
			植物/P/Qの造形対応をA/B反映済み。独立植物はI03、一次寄生PはI05接続。Q新生活環と最終素材/実測は後続。後続修正/検証要否・草案/階層/参照は維持。

	A1.7:（A1 / 共通生物モデルと栄養関係）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.7.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			動物個体/植物群落/寄生群体を各IDで一度計数し、体外感染量/情報/死骸は生体数へ加えない。三植物は生産者として一回集計し、基底群落/動物/P/Qと有限収支へ接続する。 相変異型2〜3体同居でも各個体のID/栄養/生死/寄生参照/食物網配分を保ち、在庫を複製しない。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。Q新生活環/情報等の追加分と最終素材/実測は後続。草案/構造/既存証跡の対象版を維持。

A2:（起点 / 独立した Windows ローカル実行）［草案］
	構成（要素・関係）:
		valis/nodes/A/A2.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。
	ロジック:
		上部一体サマリ/右常設3パネル/独立横詳細と、作成画面非表示・同画面操作での進行維持を統一する。
	実態:
		第1〜第4組と比較開始値をA/B反映済み。比較値は未実測。追加仕様の実装/データ接続は未完。後続修正/検証要否・草案/階層/参照は維持。

```

## B：機能

```text
B1:（A1 / 再現可能な初期集団）［草案］
	構成（要素・関係）:
		valis/nodes/B/B1.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

B2:（A1 / 生態系進行と状態整合）［草案］
	構成（要素・関係）:
		valis/nodes/B/B2.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

	B2.1:（A1 / 生命サイクル）［草案］
		構成（要素・関係）:
			valis/nodes/B/B2.1.md。登録済みの参照先。
		ロジック:
			現行仕様の成立根拠には使わず、再利用時に本体を確認する。
		実態:
			現行対象外。正式状態の変更は行っていない。

	B2.2:（A1 / 移動と競争）［草案］
		構成（要素・関係）:
			valis/nodes/B/B2.2.md。登録済みの参照先。
		ロジック:
			現行仕様の成立根拠には使わず、再利用時に本体を確認する。
		実態:
			現行対象外。正式状態の変更は行っていない。

B3:（A1, A2 / 操作と生存観測）［草案］
	構成（要素・関係）:
		valis/nodes/B/B3.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

B4:（A1.1, A1.2, A1.3, A1.4, A1.5, A1.6, A1.7 / 生態系の同期進行）［草案］
	構成（要素・関係）:
		valis/nodes/B/B4.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
	ロジック:
		生態確定/観測/描画/保存の時点とIDを一致させ、UI操作/補間でターンや抽選を進めない。 相変異判定/移動/採食/出生/同セル容量の予約を同じ確定状態で調停する。低密度が一定ターン続き通常占有へ収まる場合に同IDで解除し、出生と形態切替を分離する。
	実態:
		既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。Q新生活環/情報等の追加分と最終素材/実測は後続。草案/構造/既存証跡の対象版を維持。

	B4.1:（A1.4, A1.2, A1.1 / 局所パラメータによる動作判断）［草案］
		構成（要素・関係）:
			valis/nodes/B/B4.1.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			宿主選好/実適合/遺伝適応/抵抗の条件付き値を観察者詳細へ渡し、生物自身の透視知識にはしない。淡水植物は全相で合法な局所移動を行い、位置変化だけで栄養/経験を生成しない。 進化枝と個体状態から行動を選び、相変異4は繁殖適地/栄養確保を優先する。全域命令や常時出生にしない。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。Q新生活環/情報等の追加分と最終素材/実測は後続。草案/構造/既存証跡の対象版を維持。

	B4.2:（A1.5, A1.2, A1.4 / 寄生の遷移）［草案］
		構成（要素・関係）:
			valis/nodes/B/B4.2.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。
		ロジック:
			寄生の各段階/Q発育/羽化準備/失敗/成功/IV自立とP死亡の確定記録を表示保存へ渡す。P形態/本人相/宿主段階とQ羽化状態を別に扱い、絵から感染経路/飛翔を追加しない。
		実態:
			植物/P/Qの造形対応をA/B反映済み。独立植物はI03、一次寄生PはI05接続。Q新生活環と最終素材/実測は後続。後続修正/検証要否・草案/階層/参照は維持。

	B4.3:（A1.6, A1.2 / 非採食の栄養収支）［草案］
		構成（要素・関係）:
			valis/nodes/B/B4.3.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。
		ロジック:
			図のB/可食量/生産・再生量と有限な入力/移転/費用を対応させる。三植物の生産/可食部再生/維持を有限入力と費用へ接続し、本体損傷/寿命を残す。
		実態:
			植物/P/Qの造形対応をA/B反映済み。独立植物はI03、一次寄生PはI05接続。Q新生活環と最終素材/実測は後続。後続修正/検証要否・草案/階層/参照は維持。

	B4.4:（A1.7, A1.2, A1.6 / 生産者・餌生物の共通生活処理）［草案］
		構成（要素・関係）:
			valis/nodes/B/B4.4.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。
		ロジック:
			群落の基部/可食部/活性/蓄えと個体年齢/代表状態を表示へ渡す。基底群落の更新と大型植物一個体の成長/成熟繁殖を区別し、再生を出生にしない。
		実態:
			植物/P/Qの造形対応をA/B反映済み。独立植物はI03、一次寄生PはI05接続。Q新生活環と最終素材/実測は後続。後続修正/検証要否・草案/階層/参照は維持。

B5:（A1.1, A1.2, A1.3, A2, A1.4 / 生態系の観測・比較操作）［草案］
	構成（要素・関係）:
		valis/nodes/B/B5.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
	ロジック:
		上部一体サマリ・右常設3パネル・独立横詳細を維持し、選択/追跡/表示/グラフ対象で停止しない。採用形/相/年齢/生活状態を同じ確定IDから盤面/詳細/グラフ/保存へ渡す。 通常/相変異1〜3/4と同居個体を同じ確定IDから描画/選択/集計/保存へ渡す。
	実態:
		既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。Q新生活環/情報等の追加分と最終素材/実測は後続。草案/構造/既存証跡の対象版を維持。

	B5.1:（A1.1, A1.2 / 系統樹と進化条件の参照機能）［草案］
		構成（要素・関係）:
			valis/nodes/B/B5.1.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			系統樹の相/枝/年齢成熟と寄生生活状態/Q第四相例外、植物の機能3→6分岐/比較閾値/未提示値を区別する。三植物の3→6分岐、PのA/B/C×I〜III、QのI〜IVを採用区画と対応させる。 量機のIII-1→IV-1/2、III-2→IV-3/4、III-3→IV-5/6と相変異の区分を参照する。第三相/第四相の採用2画像を使い、第四相同士を進化順に接続しない。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。Q新生活環/情報等の追加分と最終素材/実測は後続。草案/構造/既存証跡の対象版を維持。

	B5.2:（A1.1, A1.2, A1.3, A1.4, A1.5, A1.6, A1.7 / 進化・繁殖・生態関係の説明シート）［草案］
		構成（要素・関係）:
			valis/nodes/B/B5.2.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			短い通常要約と必要な横詳細で、群落/個体/群体/感染量/情報/死骸、選好/遺伝適応/抵抗、鮮度/期限/Q痕跡を説明する。植物の本体/可食量と移動、P形態、Q最終IVの採用範囲と未実装を説明する。 背中だけ黒の1〜3、黒と深緑の4、移動全相3、同居2〜3と繁殖目的/繁殖力の違いを説明する。通常分岐は採用2画像と正本の名称/親子対応を使う。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。Q新生活環/情報等の追加分と最終素材/実測は後続。草案/構造/既存証跡の対象版を維持。

	B5.3:（A1.1, A1.2, A1.3, A1.5, A1.6 / 確定した行動のモーション表示）［草案］
		構成（要素・関係）:
			valis/nodes/B/B5.3.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			既存遠景記号/近景絵柄/事前陰影を保ち、確定した採食/捕食/攻撃/防御/排除/感染/羽化を区別して描く。陸生二系統/浮遊淡水系統/P形態/翅なしQを採用図で描き、年齢・状態差を重ねる。 初回の平たい通常型と採用した通常分岐2画像・相変異2画像へ対応し、輪郭/殻/支持構造と黒い窪み/小さい脚/同居を描き分ける。実行用素材と縮小判読性は未完。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。Q新生活環/情報等の追加分と最終素材/実測は後続。草案/構造/既存証跡の対象版を維持。

	B5.4:（A1, A2, A1.2 / 最終結果図鑑と再生・新規保存）［草案］
		構成（要素・関係）:
			valis/nodes/B/B5.4.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			初期/実効条件・定義版・最終集計/状態要約・全ターン原値/100T要約を保存する。採用形と機械ID/状態/版を保存へ対応させ、旧光樹/海生/旧Q記録を黙って変換しない。 個体ごとの相/枝/相変異/年齢/密度カウンタ/同居参照と定義版を保存再生へ対応させる。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。Q新生活環/情報等の追加分と最終素材/実測は後続。草案/構造/既存証跡の対象版を維持。

	B5.5:（A1, A1.1, A1.3, A1.5, A1.7 / 個体数・集団構成・生態関係のグラフ）［草案］
		構成（要素・関係）:
			valis/nodes/B/B5.5.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			全期間3パネルと現在一体サマリで記録数/B/量/期間/欠測を分離する。大型植物本体は生産者へ一回、P/Qは群体で計数し、可食量/実B/器官数を混同しない。 同セル3体は3個体、相変異は出生/死亡ではない。全期間集計/実B/役割配分の重複を防ぐ。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。Q新生活環/情報等の追加分と最終素材/実測は後続。草案/構造/既存証跡の対象版を維持。

	B5.6:（A1.1, A1.2, A1.5, A1.7, A2 / 生物の選択・所在強調・個体追跡）［草案］
		構成（要素・関係）:
			valis/nodes/B/B5.6.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			分類別折返し/複数固有色の所在強調/0数項目整理/名札切替と独立横詳細を維持する。大型植物を主生物同等に選択/追跡し、再生/宿主付随/離脱でも同じIDへ接続する。 同居する各個体の所在強調/選択/追跡を保ち、セル全体と単一個体の対象を区別する。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。Q新生活環/情報等の追加分と最終素材/実測は後続。草案/構造/既存証跡の対象版を維持。

```

## C：実装

```text
C1:（B1 / 初期化・seed・種族定義）［草案］
	構成（要素・関係）:
		valis/nodes/C/C1.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

C2:（B2 / ターン接合とスナップショット）［草案］
	構成（要素・関係）:
		valis/nodes/C/C2.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

	C2.1:（B2.1 / 資源・成長・繁殖）［草案］
		構成（要素・関係）:
			valis/nodes/C/C2.1.md。登録済みの参照先。
		ロジック:
			現行仕様の成立根拠には使わず、再利用時に本体を確認する。
		実態:
			現行対象外。正式状態の変更は行っていない。

	C2.2:（B2.2 / 行動・同時戦闘・移動）［草案］
		構成（要素・関係）:
			valis/nodes/C/C2.2.md。登録済みの参照先。
		ロジック:
			現行仕様の成立根拠には使わず、再利用時に本体を確認する。
		実態:
			現行対象外。正式状態の変更は行っていない。

C3:（B1, B3 / 観測画面と制御）［草案］
	構成（要素・関係）:
		valis/nodes/C/C3.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

C4:（A2, B5 / Electron と Windows 配布）［草案］
	構成（要素・関係）:
		valis/nodes/C/C4.md。Electron起動とWindows配布。
	ロジック:
		ローカル配布物から起動する。実装と配布検査の詳細は本体へ委ねる。
	実態:
		4.2.32: 4.2.32のWindows ZIPと同梱証跡を生成する接続。出力Workerを含み、同梱READMEを現行の図鑑保存へ修正。 範囲/未確認: operations/evidence/optimization-v4.2.32/README.md。草案。

C5:（B4 / モックの個体・資源・繁殖モデル）［草案］
	構成（要素・関係）:
		valis/nodes/C/C5.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

C6:（B5 / モックの造形投影・観測画面・配布）［草案］
	構成（要素・関係）:
		valis/nodes/C/C6.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

C7:（B4 / 同期ターン接合と世界確定）［草案］
	構成（要素・関係）:
		valis/nodes/C/C7.md。 src/ecology/engine.js / src/ecology/transport.js。 契約: operations/plans/i05-primary-parasites-v1.md。証跡: operations/evidence/i05-primary-parasites-v1/README.md。
	ロジック:
		primary/1の先払い/侵入待ち・段階行動・発育/伝播・確定flowを同期3段階/Workerへ接続。
	実態:
		4.2.37 I05接続・限定検証。草案。次I06。Pの長期循環と500T/R1〜R6、最終素材/配布は後続。

	C7.1:（B4, B4.4 / 初期値・固定世界・31種の共通状態）［草案］
		構成（要素・関係）:
			valis/nodes/C/C7.1.md。 src/ecology/state.js。 契約: operations/plans/i05-primary-parasites-v1.md。証跡: operations/evidence/i05-primary-parasites-v1/README.md。
		ロジック:
			P本人相/齢/Bと宿主段階・形態、遺伝適応/独立選好/後天抵抗、同源有限量、版付き初期配置を接続。
		実態:
			4.2.37 I05接続・限定検証。草案。次I06。Pの長期循環と500T/R1〜R6、最終素材/配布は後続。

	C7.2:（B4.3, B4.4 / 有限栄養・資源CA・生産と死骸）［草案］
		構成（要素・関係）:
			valis/nodes/C/C7.2.md。 src/ecology/nutrition.js / src/ecology/state.js。 契約: operations/plans/i05-primary-parasites-v1.md。証跡: operations/evidence/i05-primary-parasites-v1/README.md。
		ロジック:
			実採食比例の有限曝露、同源微量蓄積、死骸上Pと感染性の別期限、E+Bと感染量の収支を接続。
		実態:
			4.2.37 I05接続・限定検証。草案。次I06。Pの長期循環と500T/R1〜R6、最終素材/配布は後続。

	C7.3:（B4.1 / 局所行動・同時移動戦闘・学習）［草案］
		構成（要素・関係）:
			valis/nodes/C/C7.3.md。 src/ecology/behavior.js。 契約: operations/plans/i05-primary-parasites-v1.md。証跡: operations/evidence/i05-primary-parasites-v1/README.md。
		ロジック:
			維持/発育後の有料P誘導を相別候補補正へ接続。可視な宿主の好みだけを使い、感染適応や内部時刻を透視しない。
		実態:
			4.2.37 I05接続・限定検証。草案。次I06。Pの長期循環と500T/R1〜R6、最終素材/配布は後続。

	C7.4:（B4, B4.4 / 成長・遺伝・出生と繁殖例外）［草案］
		構成（要素・関係）:
			valis/nodes/C/C7.4.md。 src/ecology/state.js / src/ecology/parasites.js。 契約: operations/plans/i05-primary-parasites-v1.md。証跡: operations/evidence/i05-primary-parasites-v1/README.md。
		ロジック:
			Pの三相は実維持成功/有償B成長、本人齢は別時計。娘への適応継承/配分変異とQ非コピーをP生活環へ接続。
		実態:
			4.2.37 I05接続・限定検証。草案。次I06。Pの長期循環と500T/R1〜R6、最終素材/配布は後続。

	C7.5:（B4.2 / 寄生生活環と外部情報）［草案］
		構成（要素・関係）:
			valis/nodes/C/C7.5.md。 src/ecology/parasites.js。 契約: operations/plans/i05-primary-parasites-v1.md。証跡: operations/evidence/i05-primary-parasites-v1/README.md。
		ロジック:
			宿主/経路適合→侵入→翌T定着、同P移行/娘出生、抵抗・放出・水/死骸経路と一回成熟窓を接続。Q新生活環/情報は後続。
		実態:
			4.2.37 I05接続・限定検証。草案。次I06。Pの長期循環と500T/R1〜R6、最終素材/配布は後続。

C8:（B5, B5.1, B5.2, B5.5, B5.6 / 観測操作・図鑑と説明シート）［草案］
	構成（要素・関係）:
		valis/nodes/C/C8.md。 src/app.js / src/ecology/observations.js。 契約: operations/plans/i05-primary-parasites-v1.md。証跡: operations/evidence/i05-primary-parasites-v1/README.md。
	ロジック:
		P本人/宿主段階・好み/適応/抵抗、体外/曝露中/侵入済/生P、全期間原値を同じ実IDと定義へ接続。
	実態:
		4.2.37 I05接続・限定検証。草案。次I06。Pの長期循環と500T/R1〜R6、最終素材/配布は後続。

	C8.1:（B5.3, B5.5, B5.6 / 盤面と個体の描画・確定モーション）［草案］
		構成（要素・関係）:
			valis/nodes/C/C8.1.md。 src/ecology/art.js / src/ecology/renderer.js。 契約: operations/plans/i05-primary-parasites-v1.md。証跡: operations/evidence/i05-primary-parasites-v1/README.md。
		ロジック:
			新P本人相を既存原画へ接続。実定着/移行完了/排除だけ既存の短いマークへ渡し、試行を成功表示しない。
		実態:
			4.2.37 I05接続・限定検証。草案。次I06。Pの長期循環と500T/R1〜R6、最終素材/配布は後続。

	C8.2:（B5.4 / 結果保存と初期条件からの再実行）［草案］
		構成（要素・関係）:
			valis/nodes/C/C8.2.md。 src/ecology/archive.js / src/ecology/observations.js。 契約: operations/plans/i05-primary-parasites-v1.md。証跡: operations/evidence/i05-primary-parasites-v1/README.md。
		ロジック:
			primary-parasite-observed/1とflow/1の全確定T、実効条件・最終指標と署名ゲートを図鑑/再生へ接続。
		実態:
			4.2.37 I05接続・限定検証。草案。次I06。Pの長期循環と500T/R1〜R6、最終素材/配布は後続。

```

## D：検証計画

```text
D1:（A1, B1, C1, C2 / 初期値・入力境界・再現性）［草案］
	構成（要素・関係）:
		valis/nodes/D/D1.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

D2:（A1, B2, B2.1, B2.2, C2, C2.1, C2.2 / 生態ルールと不変条件）［草案］
	構成（要素・関係）:
		valis/nodes/D/D2.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

D3:（A1, A2, B3, C3 / 実画面の操作と表示）［草案］
	構成（要素・関係）:
		valis/nodes/D/D3.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

D4:（A2, C4 / 配布と実 Electron 起動）［草案］
	構成（要素・関係）:
		valis/nodes/D/D4.md。配布・展開照合・実Electron起動の計画。
	ロジック:
		C4と対象版を照合して配布物そのものを実行する。
	実態:
		4.2.32: Windows ZIPの全src/原画一致・全展開SHA・実exe/Worker/画像を別々に確認する。4.2.32のCI結果はE7へ接続。 範囲/未確認: operations/evidence/optimization-v4.2.32/README.md。草案。

D5:（A1.1, A1.2, A1.3, B4, C5 / 個体・4入力・進化・繁殖の検証計画）［草案］
	構成（要素・関係）:
		valis/nodes/D/D5.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

D6:（A1.1, A1.2, A1.3, B5, C6 / モックの画面・描画・実行検証計画）［草案］
	構成（要素・関係）:
		valis/nodes/D/D6.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

D7:（C7, C7.1, C7.2, C7.3 / 再現性・有限収支・同時競合）［草案］
	構成（要素・関係）:
		valis/nodes/D/D7.md。 operations/evidence/i05-primary-parasites-v1/model/paths-script.cjs。 契約: operations/plans/i05-primary-parasites-v1.md。証跡: operations/evidence/i05-primary-parasites-v1/README.md。
	ロジック:
		旧4経路×8優遇の世界/指紋/CSV、新静的/動的8経路、Worker差分/取消再開と有限収支を照合する。
	実態:
		4.2.37 I05接続・限定検証。草案。次I06。Pの長期循環と500T/R1〜R6、最終素材/配布は後続。

D8:（C7 / 生態循環と結合進行）［草案］
	構成（要素・関係）:
		valis/nodes/D/D8.md。 operations/evidence/i05-primary-parasites-v1/model/circulation-script.cjs。 契約: operations/plans/i05-primary-parasites-v1.md。証跡: operations/evidence/i05-primary-parasites-v1/README.md。
	ロジック:
		固定河川/湖沼自由・河川供給の各180Tで成立/未達を残し、初期配置と次世代を分ける。
	実態:
		4.2.37 I05接続・限定検証。草案。次I06。Pの長期循環と500T/R1〜R6、最終素材/配布は後続。

	D8.1:（C7.4 / 相・出生・遺伝と繁殖例外）［草案］
		構成（要素・関係）:
			valis/nodes/D/D8.1.md。 契約: operations/plans/i05-primary-parasites-v1.md。証跡: operations/evidence/i05-primary-parasites-v1/README.md。
		ロジック:
			Pの遺伝適応と独立選好、配分変異/非遺伝抵抗、齢/相/宿主段階、出生と同ID移行の境界を検査する。
		実態:
			4.2.37 I05接続・限定検証。草案。次I06。Pの長期循環と500T/R1〜R6、最終素材/配布は後続。

	D8.2:（C7.5 / 寄生・高次寄生と情報）［草案］
		構成（要素・関係）:
			valis/nodes/D/D8.2.md。 契約: operations/plans/i05-primary-parasites-v1.md。証跡: operations/evidence/i05-primary-parasites-v1/README.md。
		ロジック:
			量0/非宿主/占有/低量、蓄積/期限、侵入と定着、抵抗/実費、P/Q移行/失敗死亡/窓一回性を検査する。
		実態:
			4.2.37 I05接続・限定検証。草案。次I06。Pの長期循環と500T/R1〜R6、最終素材/配布は後続。

D9:（C8, C8.1, C8.2 / 観測画面・系統樹・説明と描画）［草案］
	構成（要素・関係）:
		valis/nodes/D/D9.md。 契約: operations/plans/i05-primary-parasites-v1.md。証跡: operations/evidence/i05-primary-parasites-v1/README.md。
	ロジック:
		横詳細・定義/微量値・実ID選択、P本人相と成功演出、旧UI/図鑑再生を限定実画面で確認する。
	実態:
		4.2.37 I05接続・限定検証。草案。次I06。Pの長期循環と500T/R1〜R6、最終素材/配布は後続。

```

## E：検証証跡

```text
E1:（D1, D2, D4 / エンジン・パッケージ補助検査）［草案］
	構成（要素・関係）:
		valis/nodes/E/E1.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

E2:（D3 / Chromium 実画面検査）［草案］
	構成（要素・関係）:
		valis/nodes/E/E2.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

E3:（D4 / Windows配布・実exe検証）［草案］
	構成（要素・関係）:
		valis/nodes/E/E3.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

E4:（D5, D6 / 1マス1個体モックの実測証跡）［草案］
	構成（要素・関係）:
		valis/nodes/E/E4.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

E5:（D7, D8, D8.1, D8.2 / 現行生態計算の実測証跡）［草案］
	構成（要素・関係）:
		valis/nodes/E/E5.md。 契約: operations/plans/i05-primary-parasites-v1.md。証跡: operations/evidence/i05-primary-parasites-v1/README.md。
	ロジック:
		I05の旧/新経路・専用境界/Worker保存・固定3条件の限定実測。結果/版/反例はI05証跡を正とする。
	実態:
		4.2.37 I05限定実測。新P定着/移行は成立、全3条件180TのP0。長期循環はI11未達。草案、次I06。

E6:（D9 / 現行観測画面のLinux実測証跡）［草案］
	構成（要素・関係）:
		valis/nodes/E/E6.md。 契約: operations/plans/i05-primary-parasites-v1.md。証跡: operations/evidence/i05-primary-parasites-v1/README.md。
	ロジック:
		I05のLinux画面で新P詳細/同じID/全期間保存、既存量機と付随描画を限定照合。最終素材/全性能は後続。
	実態:
		4.2.37 I05接続・限定検証。草案。次I06。Pの長期循環と500T/R1〜R6、最終素材/配布は後続。

E7:（D4, D7, D8, D8.1, D8.2, D9 / 現行Windows配布exeの実測証跡）［草案］
	構成（要素・関係）:
		valis/nodes/E/E7.md。operations/evidence/optimization-v4.2.32/windows-native.json、Windows app4.2.32 / 2309185。
	ロジック:
		対象SHAと版が一致する配布物を展開し、実exe・Worker・画像読込・Node非公開の実測で判定する。
	実態:
		4.2.32: CI39340183030/job118359506331で全件・画面・ZIP展開SHA・実Windows exe/Worker/画像/Node非公開が成功。対象2309185/artifact12229435734。全PC性能保証ではない。 範囲/未確認: operations/evidence/optimization-v4.2.32/README.md。草案。

```
