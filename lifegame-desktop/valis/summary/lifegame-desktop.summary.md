# Project Summary Manifest

lifegame-desktop。現在のNode構造と適用範囲を示す。詳細は各Node、仕様と資料の入口は `design/specification/README.md`。

現在入口: `design/specification/README.md`。量機仕様/採用分岐は `design/specification/ryouki-v1.md` と `design/ryouki-branches-v2/README.md`。実装順序は `operations/plans/implementation-sequence-v1.md`。全61Nodeは草案で、正式状態/階層/層間参照を維持する。新規登録・状態遷移なし。

現在の確定ソースは4.2.74。現在対象は切り抜き漏れ確認/1（operations/evidence/remaining-cutouts-v1/README.md）。303素材領域と96描画で背景矩形の残りを確認し、主生物詳細6状態の端欠けを短辺基準へ修正。Linux11項目で限定照合。既存68状態と構成円切替は各証跡の範囲を維持。採用素材/盤面/生態本体/全T原値/保存形式/正式草案状態は不変。次は承認済み7単位の3、設定UI整理・選択制約・案内。現在表と後続順は operations/plans/improvement-status-v1.md。ピラミッド拡張/関係指標再設計/資源地形強調/要因色分けは今回対象外。全状態直積/Windows/配布は未認定。

## A：仕様

```text
A1:（起点 / 生態系の成長と生存観測）［草案］
	構成（要素・関係）:
		valis/nodes/A/A1.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
	ロジック:
		第1〜第4組の構造を採用し、状態/計数/表示/説明/保存を同じID/単位/確定時点に揃える。植物の生産者役割/個体単位、P/Qの形態/相と採用画像を既存観測・保存へ対応させる。 量機を独立した主生物として追加採用し、通常型/相変異型/同居/個体単位と現行観測を接続する。
	実態:
		既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。QはI06、情報はI07、生成/保存はI08接続。観測UIはI09接続・限定検査済み。採用素材はI10接続、全体実測はI11以降。草案/構造/既存証跡の対象版を維持。

	A1.1:（A1 / 個体・系統・段階進化）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.1.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			通常の相/枝/年齢とQ第四相の成熟羽化例外を、盤面/横詳細/構成集計で一貫させる。三植物のIII3→IV6、P形態×三相、Q四相を年齢/宿主段階と区別する。 通常型I〜IVの移動1/2/3/4とIII3→IV6、相変異の共通3マス・1〜3/4の外見を区別する。通常型の第三相3枝/第四相6枝は採用した2画像へ対応させる。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。QはI06、情報はI07、生成/保存はI08接続。観測UIはI09接続・限定検査済み。採用素材はI10接続、全体実測はI11以降。草案/構造/既存証跡の対象版を維持。

	A1.2:（A1 / 各マスの環境・餌資源）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.2.md。正本: design/specification/grassbug-balance-v1.md。契約: operations/plans/i11g-grassbug-balance-v1.md。証跡: operations/evidence/i11g-grassbug-balance-v1/README.md。
		ロジック:
			下層の生産者/菌膜は群落、草棲虫/水游虫は小集団。草棲虫の新版生存枠は過密を抑えた暫定値。人数・体量・栄養の有限性を維持。 菌膜の既存群落処理も保持。
		実態:
			4.2.49 / consumer-group-parameters/3を接続。限定確認はI11g証跡参照。正式状態は草案、全系統生存/R1〜R6・自然P/Q循環・性能・新Windowsは未認定。

	A1.3:（A1 / 性別・繁殖・遺伝）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.3.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			性別/無性別/階級、年齢成熟/繁殖待機と相を別に表示する。 高い繁殖力を維持し、相変異4の繁殖目的と実際の出生資格/費用/待機を分ける。子はI/年齢0。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。QはI06、情報はI07、生成/保存はI08接続。観測UIはI09接続・限定検査済み。採用素材はI10接続、全体実測はI11以降。草案/構造/既存証跡の対象版を維持。 4.2.54で新規世界の群体節足後継繁殖型・有限出生30Eを接続。最終500T未確認。

	A1.4:（A1 / 局所経験と系統戦略）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.4.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			観察者の情報/適応/抵抗解析と、生物が局所的に知る情報を分離する。 相変異は低密度が一定ターン続いてから解除する可逆状態。密度/継続Tの数値は比較案として分離し、4の繁殖準備への優先補正を既存の局所判断へ接続する。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。QはI06、情報はI07、生成/保存はI08接続。観測UIはI09接続・限定検査済み。採用素材はI10接続、全体実測はI11以降。草案/構造/既存証跡の対象版を維持。 4.2.54で同群2マス以内への局所接近を接続。強制集合・無償移動なし。

	A1.5:（A1 / 寄生と宿主の生活環）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.5.md。 現在正本: design/specification/parasite-cohorts-v1.md。造形対応: design/specification/appearance-correspondence-v1.md。
		ロジック:
			H→P→Qの付随とP→H/Q→Pの関係線、Qの発育/羽化失敗/成功/IV自立を区別する。既存P二系統の形態とQの翅なしIVを対応させ、感染経路/成熟羽化/群体単位を維持する。
		実態:
			4.2.53でP/Q有限群体、宿主通過と有限分散、寄生中の維持・発育費と自立Qの有限分割・有償回避・P残余同化を接続し、新規Q設定値を追加優遇。群体数と構成員数を分ける。全系統長期生存は未認定。草案/階層/参照を維持。

	A1.6:（A1 / 光合成と共生の栄養）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.6.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。
		ロジック:
			記録数/生物量B/可食量/基部/蓄え/生産/再生/感染量/情報量を別尺度で表示保存する。森冠/星冠/淡水系統を生産者とし、本体一個体・有限可食量・有償再生を分ける。
		実態:
			植物/P/Qの造形対応をA/B反映済み。独立植物はI03、一次寄生PはI05接続。QはI06、情報はI07、生成/保存はI08接続。観測UIはI09接続・限定検査済み。採用素材はI10接続、全体実測はI11以降。後続修正/検証要否・草案/階層/参照は維持。

	A1.7:（A1 / 共通生物モデルと栄養関係）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.7.md。正本: design/specification/grassbug-balance-v1.md。契約: operations/plans/i11g-grassbug-balance-v1.md。証跡: operations/evidence/i11g-grassbug-balance-v1/README.md。
		ロジック:
			内部人数/相/年齢を持つ一次消費者の小集団を採用し、新版のみ草棲虫へ寿命・維持・待機・HPの暫定値を適用。主生物/独立大型植物は個体を維持。 菌膜の既存群落処理も保持。
		実態:
			4.2.49 / consumer-group-parameters/3を接続。限定確認はI11g証跡参照。正式状態は草案、全系統生存/R1〜R6・自然P/Q循環・性能・新Windowsは未認定。

A2:（起点 / 独立した Windows ローカル実行）［草案］
	構成（要素・関係）:
		valis/nodes/A/A2.md。正本: design/specification/observation-speed-v1.md。契約: operations/plans/observation-speed-v1.md。証跡: operations/evidence/observation-speed-v1/README.md。
	ロジック:
		3速度を設け、最速のみ10T表示と強制軽減を使う。生態計算/全T観測/画質を維持し、解除後は表示選好を復元する。
	実態:
		観測速度/1: app4.2.73の基準/2倍/最速・10T表示と強制軽減/復元を接続。Node35+10試験、Linux実画面18+26項目は operations/evidence/observation-speed-v1/README.md。全T計算/記録と生態本体を維持。全件/500T性能/Windows/配布は未認定。草案。

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
		既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。QはI06、情報はI07、生成/保存はI08接続。観測UIはI09接続・限定検査済み。採用素材はI10接続、全体実測はI11以降。草案/構造/既存証跡の対象版を維持。

	B4.1:（A1.4, A1.2, A1.1 / 局所パラメータによる動作判断）［草案］
		構成（要素・関係）:
			valis/nodes/B/B4.1.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			宿主選好/実適合/遺伝適応/抵抗の条件付き値を観察者詳細へ渡し、生物自身の透視知識にはしない。淡水植物は全相で合法な局所移動を行い、位置変化だけで栄養/経験を生成しない。 進化枝と個体状態から行動を選び、相変異4は繁殖適地/栄養確保を優先する。全域命令や常時出生にしない。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。QはI06、情報はI07、生成/保存はI08接続。観測UIはI09接続・限定検査済み。採用素材はI10接続、全体実測はI11以降。草案/構造/既存証跡の対象版を維持。 4.2.54で群体節足の同群接近を局所候補へ追加。

	B4.2:（A1.5, A1.2, A1.4 / 寄生の遷移）［草案］
		構成（要素・関係）:
			valis/nodes/B/B4.2.md。現在正本: design/specification/parasite-cohorts-v1.md。契約: operations/plans/i11h-parasite-cohorts-v1.md。
		ロジック:
			寄生の各段階/Q発育/羽化準備/失敗/成功/IV自立とP死亡の確定記録を表示保存へ渡す。P形態/本人相/宿主段階とQ羽化状態を別に扱い、絵から感染経路/飛翔を追加しない。
		実態:
			P第一宿主の非出生移出、終宿主出生、Q相IV繁殖、群体負担と減衰を接続。4.2.53で寄生中の大幅な低費用・有限分散・自立Qの分割と有償回避を新規世界へ適用。草案/階層/参照を維持。

	B4.3:（A1.6, A1.2 / 非採食の栄養収支）［草案］
		構成（要素・関係）:
			valis/nodes/B/B4.3.md。正本: design/specification/fungal-colonies-v1.md。契約: operations/plans/i11d-fungal-colonies-v1.md。証跡: operations/evidence/i11d-lower-renewal-v1/README.md。
		ロジック:
			菌膜は実有機物を分解・同化し、Eを支払って可食部を再生する。維持不足の連続で基部も消滅する。
		実態:
			採用仕様をA/Bへ反映し4.2.46へ接続。草案。限定実測/検査の範囲は現行証跡参照。全系統の生存・P/Q自然循環・R1〜R6・新Windowsは未認定。

	B4.4:（A1.7, A1.2, A1.6 / 生産者・餌生物の共通生活処理）［草案］
		構成（要素・関係）:
			valis/nodes/B/B4.4.md。正本: design/specification/grassbug-balance-v1.md。契約: operations/plans/i11g-grassbug-balance-v1.md。証跡: operations/evidence/i11g-grassbug-balance-v1/README.md。
		ロジック:
			部分損失・内部有償出生・局所分散/合流。無償再生/二重出生/集団時計による一斉寿命なし。 菌膜の既存群落処理も保持。
		実態:
			4.2.49 / consumer-group-parameters/3を接続。限定確認はI11g証跡参照。正式状態は草案、全系統生存/R1〜R6・自然P/Q循環・性能・新Windowsは未認定。

B5:（A1.1, A1.2, A1.3, A2, A1.4 / 生態系の観測・比較操作）［草案］
	構成（要素・関係）:
		valis/nodes/B/B5.md。正本: design/specification/observation-speed-v1.md。契約: operations/plans/observation-speed-v1.md。証跡: operations/evidence/observation-speed-v1/README.md。
	ロジック:
		最速の10T単位表示と端数観察を両立し、同画面操作で観測を止めず、盤面/集計の表示時点を揃える。
	実態:
		観測速度/1: app4.2.73の基準/2倍/最速・10T表示と強制軽減/復元を接続。Node35+10試験、Linux実画面18+26項目は operations/evidence/observation-speed-v1/README.md。全T計算/記録と生態本体を維持。全件/500T性能/Windows/配布は未認定。草案。

	B5.1:（A1.1, A1.2 / 系統樹と進化条件の参照機能）［草案］
		構成（要素・関係）:
			valis/nodes/B/B5.1.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			系統樹の相/枝/年齢成熟と寄生生活状態/Q第四相例外、植物の機能3→6分岐/比較閾値/未提示値を区別する。三植物の3→6分岐、PのA/B/C×I〜III、QのI〜IVを採用区画と対応させる。 量機のIII-1→IV-1/2、III-2→IV-3/4、III-3→IV-5/6と相変異の区分を参照する。第三相/第四相の採用2画像を使い、第四相同士を進化順に接続しない。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。QはI06、情報はI07、生成/保存はI08接続。観測UIはI09接続・限定検査済み。採用素材はI10接続、全体実測はI11以降。草案/構造/既存証跡の対象版を維持。

	B5.2:（A1.1, A1.2, A1.3, A1.4, A1.5, A1.6, A1.7 / 進化・繁殖・生態関係の説明シート）［草案］
		構成（要素・関係）:
			valis/nodes/B/B5.2.md。正本: design/specification/consumer-groups-v1.md。契約: operations/plans/i11e-consumer-groups-v1.md。証跡: operations/evidence/i11e-consumer-groups-v1/README.md。
		ロジック:
			人数/集団数/体量、内部年齢と相、感染代表1体の説明。
		実態:
			4.2.47 / consumer-group/1を接続。限定確認はI11e証跡参照。正式状態は草案、全系統生存/R1〜R6・自然P/Q循環・性能・新Windowsは未認定。

	B5.3:（A1.1, A1.2, A1.3, A1.5, A1.6 / 確定した行動のモーション表示）［草案］
		構成（要素・関係）:
			valis/nodes/B/B5.3.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			既存遠景記号/近景絵柄/事前陰影を保ち、確定した採食/捕食/攻撃/防御/排除/感染/羽化を区別して描く。陸生二系統/浮遊淡水系統/P形態/翅なしQを採用図で描き、年齢・状態差を重ねる。 初回の平たい通常型と採用した通常分岐2画像・相変異2画像へ対応し、輪郭/殻/支持構造と黒い窪み/小さい脚/同居を描き分ける。実行用素材と縮小判読性は未完。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。QはI06、情報はI07、生成/保存はI08接続。観測UIはI09接続・限定検査済み。採用素材はI10接続、全体実測はI11以降。草案/構造/既存証跡の対象版を維持。

	B5.4:（A1, A2, A1.2 / 最終結果図鑑と再生・新規保存）［草案］
		構成（要素・関係）:
			valis/nodes/B/B5.4.md。正本: design/specification/long-record-restore-v1.md。契約: operations/plans/long-record-restore-v1.md。証跡: operations/evidence/long-record-restore-v1/README.md。
		ロジック:
			有効な保存済み全ターンを欠落なく復元し、入力からの分離と読取専用の記録を維持する。
		実態:
			長期記録復元/1を限定適用。保存形式/再生条件を変更しない。

	B5.5:（A1, A1.1, A1.3, A1.5, A1.7 / 個体数・集団構成・生態関係のグラフ）［草案］
		構成（要素・関係）:
			valis/nodes/B/B5.5.md。正本: design/specification/current-donut-switch-v1.md。契約: operations/plans/current-donut-switch-v1.md。証跡: operations/evidence/current-donut-switch-v1/README.md。
		ロジック:
			単一円を全生物の系統別/分類別と既存6分類へ切り替え、現在の対象内割合を示す。3グラフ対象と独立する。
		実態:
			現在構成の切替/1: app4.2.74で単一ドーナツ8表示を接続。Linux23項目は operations/evidence/current-donut-switch-v1/README.md。対象内分母/0/盤面色/進行意図/図鑑復帰を限定確認。生態/記録形式/正式状態を維持。残件13項目の現在表は operations/plans/improvement-status-v1.md。草案。

	B5.6:（A1.1, A1.2, A1.5, A1.7, A2 / 生物の選択・所在強調・個体追跡）［草案］
		構成（要素・関係）:
			valis/nodes/B/B5.6.md。正本: design/specification/remaining-cutouts-v1.md。契約: operations/plans/remaining-cutouts-v1.md。証跡: operations/evidence/remaining-cutouts-v1/README.md。
		ロジック:
			選択詳細と系統樹で全身を枠へ収め、既存透明画像を参照する。本人相/年齢/雌雄と採用造形を維持する。
		実態:
			切り抜き漏れ確認/1: app4.2.74で303素材領域と96描画を確認し、主生物詳細6状態の端欠けを短辺基準で修正。Linux11項目は operations/evidence/remaining-cutouts-v1/README.md。採用素材/盤面/生態は不変。全直積/Windows/配布は未認定。草案。

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
		valis/nodes/C/C7.md。正本: design/specification/consumer-groups-v1.md。契約: operations/plans/i11e-consumer-groups-v1.md。証跡: operations/evidence/i11e-consumer-groups-v1/README.md。
	ロジック:
		consumerModel group/1を同期処理へ接合。無指定の旧経路を維持。
	実態:
		4.2.47 / consumer-group/1を接続。限定確認はI11e証跡参照。正式状態は草案、全系統生存/R1〜R6・自然P/Q循環・性能・新Windowsは未認定。

	C7.1:（B4, B4.4 / 初期値・固定世界・31種の共通状態）［草案］
		構成（要素・関係）:
			valis/nodes/C/C7.1.md。正本: design/specification/grassbug-balance-v1.md。契約: operations/plans/i11g-grassbug-balance-v1.md。証跡: operations/evidence/i11g-grassbug-balance-v1/README.md。
		ロジック:
			有限年齢区分/人数状態、局所初期束ね、初期総人数を保存し、新版の草棲虫蓄え差分を有限初期台帳へ加える。 菌膜の既存群落処理も保持。
		実態:
			4.2.49 / consumer-group-parameters/3を接続。限定確認はI11g証跡参照。正式状態は草案、全系統生存/R1〜R6・自然P/Q循環・性能・新Windowsは未認定。

	C7.2:（B4.3, B4.4 / 有限栄養・資源CA・生産と死骸）［草案］
		構成（要素・関係）:
			valis/nodes/C/C7.2.md。正本: design/specification/consumer-groups-v1.md。契約: operations/plans/i11e-consumer-groups-v1.md。証跡: operations/evidence/i11e-consumer-groups-v1/README.md。
		ロジック:
			人数に応じた有限採食/維持、部分死亡の有限死骸。 菌膜の既存群落処理も保持。
		実態:
			4.2.47 / consumer-group/1を接続。限定確認はI11e証跡参照。正式状態は草案、全系統生存/R1〜R6・自然P/Q循環・性能・新Windowsは未認定。

	C7.3:（B4.1 / 局所行動・同時移動戦闘・学習）［草案］
		構成（要素・関係）:
			valis/nodes/C/C7.3.md。正本: design/specification/consumer-groups-v1.md。契約: operations/plans/i11e-consumer-groups-v1.md。証跡: operations/evidence/i11e-consumer-groups-v1/README.md。
		ロジック:
			既存行動と費用の人数換算、局所分散/競合/合流。
		実態:
			4.2.47 / consumer-group/1を接続。限定確認はI11e証跡参照。正式状態は草案、全系統生存/R1〜R6・自然P/Q循環・性能・新Windowsは未認定。

	C7.4:（B4, B4.4 / 成長・遺伝・出生と繁殖例外）［草案］
		構成（要素・関係）:
			valis/nodes/C/C7.4.md。正本: design/specification/consumer-groups-v1.md。契約: operations/plans/i11e-consumer-groups-v1.md。証跡: operations/evidence/i11e-consumer-groups-v1/README.md。
		ロジック:
			有償内部出生、年齢区分ごとの成熟/寿命、分散を出生にしない。
		実態:
			4.2.47 / consumer-group/1を接続。限定確認はI11e証跡参照。正式状態は草案、全系統生存/R1〜R6・自然P/Q循環・性能・新Windowsは未認定。 4.2.54 / socialRenewalModel: successor/1 を新規世界へ接続。旧世界は無指定。

	C7.5:（B4.2 / 寄生生活環と外部情報）［草案］
		構成（要素・関係）:
			valis/nodes/C/C7.5.md。現在正本: design/specification/parasite-cohorts-v1.md。契約: operations/plans/i11h-parasite-cohorts-v1.md。証跡: operations/evidence/i11h-parasite-cohorts-v1/README.md。
		ロジック:
			感染代表1体の移動/死亡へP/Qを一度接続し複製しない。
		実態:
			4.2.53 / parasiteCohortModel: cohort/1・parasiteDispersalModel: fanout/1と低費用設定を新規世界へ接続。旧世界は保存済み設定を維持。全系統生存/R1〜R6・自然P/Q循環・性能・新Windowsは未認定。

C8:（B5, B5.1, B5.2, B5.5, B5.6 / 観測操作・図鑑と説明シート）［草案］
	構成（要素・関係）:
		valis/nodes/C/C8.md。正本: design/specification/current-donut-switch-v1.md。契約: operations/plans/current-donut-switch-v1.md。証跡: operations/evidence/current-donut-switch-v1/README.md。
	ロジック:
		現在表示中の観測行だけを参照して構成円を切り替える。最速端数は同期し、図鑑復帰でライブ選好を復元する。
	実態:
		現在構成の切替/1: app4.2.74で単一ドーナツ8表示を接続。Linux23項目は operations/evidence/current-donut-switch-v1/README.md。対象内分母/0/盤面色/進行意図/図鑑復帰を限定確認。生態/記録形式/正式状態を維持。残件13項目の現在表は operations/plans/improvement-status-v1.md。草案。

	C8.1:（B5.3, B5.5, B5.6 / 盤面と個体の描画・確定モーション）［草案］
		構成（要素・関係）:
			valis/nodes/C/C8.1.md。正本: design/specification/remaining-cutouts-v1.md。契約: operations/plans/remaining-cutouts-v1.md。証跡: operations/evidence/remaining-cutouts-v1/README.md。
		ロジック:
			主生物の詳細半径だけ短辺基準へ変更する。盤面描画/透明素材を変更せず、残る素材経路も確認する。
		実態:
			切り抜き漏れ確認/1: app4.2.74で303素材領域と96描画を確認し、主生物詳細6状態の端欠けを短辺基準で修正。Linux11項目は operations/evidence/remaining-cutouts-v1/README.md。採用素材/盤面/生態は不変。全直積/Windows/配布は未認定。草案。

	C8.2:（B5.4 / 結果保存と初期条件からの再実行）［草案］
		構成（要素・関係）:
			valis/nodes/C/C8.2.md。正本: design/specification/long-record-restore-v1.md。契約: operations/plans/long-record-restore-v1.md。証跡: operations/evidence/long-record-restore-v1/README.md。
		ロジック:
			既存の全行structuredClone後、各行を順番に追加し、可変長引数へ全行展開しない。
		実態:
			追加3試験と容量6試験が成功。全行/値/参照/CSV互換を維持。

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
		valis/nodes/D/D7.md。正本: design/specification/observation-speed-v1.md。契約: operations/plans/observation-speed-v1.md。証跡: operations/evidence/observation-speed-v1/README.md。
	ロジック:
		最終差分でも逐次計算と一致し、容量6T・境界・不正応答・旧世代破棄を限定確認する。
	実態:
		観測速度/1: app4.2.73の基準/2倍/最速・10T表示と強制軽減/復元を接続。Node35+10試験、Linux実画面18+26項目は operations/evidence/observation-speed-v1/README.md。全T計算/記録と生態本体を維持。全件/500T性能/Windows/配布は未認定。草案。

D8:（C7 / 生態循環と結合進行）［草案］
	構成（要素・関係）:
		valis/nodes/D/D8.md。正本: design/specification/consumer-groups-v1.md。契約: operations/plans/i11e-consumer-groups-v1.md。証跡: operations/evidence/i11e-consumer-groups-v1/README.md。
	ロジック:
		固定陸水の限定比較と死因/出生/分散を観測。全系統生存認定はしない。
	実態:
		4.2.47 / consumer-group/1を接続。限定確認はI11e証跡参照。正式状態は草案、全系統生存/R1〜R6・自然P/Q循環・性能・新Windowsは未認定。

	D8.1:（C7.4 / 相・出生・遺伝と繁殖例外）［草案］
		構成（要素・関係）:
			valis/nodes/D/D8.1.md。正本: design/specification/grassbug-balance-v1.md。契約: operations/plans/i11g-grassbug-balance-v1.md。証跡: operations/evidence/i11g-grassbug-balance-v1/README.md。
		ロジック:
			内部出生の費用・I/年齢0、分散保存と一斉寿命の回避。
		実態:
			4.2.49 / consumer-group-parameters/3を接続。限定確認はI11g証跡参照。正式状態は草案、全系統生存/R1〜R6・自然P/Q循環・性能・新Windowsは未認定。 4.2.54の後継娘・有償出生・給餌・旧世界境界を対象とし、最終長期実測は未取得。

	D8.2:（C7.5 / 寄生・高次寄生と情報）［草案］
		構成（要素・関係）:
			valis/nodes/D/D8.2.md。現在正本: design/specification/parasite-cohorts-v1.md。契約: operations/plans/i11h-parasite-cohorts-v1.md。証跡: operations/evidence/i11h-parasite-cohorts-v1/README.md。
		ロジック:
			感染者の部分移動/死亡によるP/Q単一所有と宿主参照。
		実態:
			4.2.53の群体・通過・出生境界と低費用・分散設定、旧P/Q契約、収支・決定性を対象とする。長期自然循環/性能/新Windowsは未認定。草案を維持。

D9:（C8, C8.1, C8.2 / 観測画面・系統樹・説明と描画）［草案］
	構成（要素・関係）:
		valis/nodes/D/D9.md。正本: design/specification/remaining-cutouts-v1.md。契約: operations/plans/remaining-cutouts-v1.md。証跡: operations/evidence/remaining-cutouts-v1/README.md。
	ロジック:
		303素材領域/96描画、実主生物/下層詳細・系統樹を確認し、下端欠けの修正前6→修正後0と入力不変を照合する。
	実態:
		切り抜き漏れ確認/1: app4.2.74で303素材領域と96描画を確認し、主生物詳細6状態の端欠けを短辺基準で修正。Linux11項目は operations/evidence/remaining-cutouts-v1/README.md。採用素材/盤面/生態は不変。全直積/Windows/配布は未認定。草案。

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
		valis/nodes/E/E5.md。正本: design/specification/observation-speed-v1.md。契約: operations/plans/observation-speed-v1.md。証跡: operations/evidence/observation-speed-v1/README.md。
	ロジック:
		Worker10試験とclient35試験のログ、生態本体不変のSHAを保持する。全T一致の限定証跡を生存/性能認定へ転用しない。
	実態:
		観測速度/1: app4.2.73の基準/2倍/最速・10T表示と強制軽減/復元を接続。Node35+10試験、Linux実画面18+26項目は operations/evidence/observation-speed-v1/README.md。全T計算/記録と生態本体を維持。全件/500T性能/Windows/配布は未認定。草案。

E6:（D9 / 現行観測画面のLinux実測証跡）［草案］
	構成（要素・関係）:
		valis/nodes/E/E6.md。正本: design/specification/remaining-cutouts-v1.md。契約: operations/plans/remaining-cutouts-v1.md。証跡: operations/evidence/remaining-cutouts-v1/README.md。
	ロジック:
		Linux11項目、303領域/96描画の実測値と修正前6状態、実装/素材不変の照合と限界を保持する。
	実態:
		切り抜き漏れ確認/1: app4.2.74で303素材領域と96描画を確認し、主生物詳細6状態の端欠けを短辺基準で修正。Linux11項目は operations/evidence/remaining-cutouts-v1/README.md。採用素材/盤面/生態は不変。全直積/Windows/配布は未認定。草案。

E7:（D4, D7, D8, D8.1, D8.2, D9 / 現行Windows配布exeの実測証跡）［草案］
	構成（要素・関係）:
		valis/nodes/E/E7.md。operations/evidence/optimization-v4.2.32/windows-native.json、Windows app4.2.32 / 2309185。
	ロジック:
		対象SHAと版が一致する配布物を展開し、実exe・Worker・画像読込・Node非公開の実測で判定する。
	実態:
		4.2.32: CI39340183030/job118359506331で全件・画面・ZIP展開SHA・実Windows exe/Worker/画像/Node非公開が成功。対象2309185/artifact12229435734。全PC性能保証ではない。 範囲/未確認: operations/evidence/optimization-v4.2.32/README.md。草案。

```
