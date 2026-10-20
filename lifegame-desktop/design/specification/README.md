# 生態シミュレーション：現在のA・B仕様

管理版 `specification-index/3`。A/Bを読む入口は本書と[採用状況・具体化待ち](decision-register-v1.md)。Node構造は[Project Summary Manifest](../../valis/summary/lifegame-desktop.summary.md)、詳細責務は各Nodeを参照する。採用済みは実装済み・検証済み・Node承認済みを意味しない。

現在はC01「各生物への情報作用」の基本構造と作用先を[持続する情報/2](persistent-information-v1.md)へ反映済み。情報は環境/生物間で蓄積した関係性と意味で、2影響/2保持形態/非排他的5成分、親養育者から幼体への強い伝達、集中/反復による強化を持つ。C02の暫定値を[情報評価/1](information-evaluation-v1.md)へ反映済み。保持6件/3経験ターン、実績40/40/20、通常出現率10〜70%/実被害痕跡の下限40%を採用する。正規化/確率写像は比較選定待ち。次はC03の鮮度を確認する。[今回の契約](../../operations/plans/information-evaluation-ab-v1.md)。製品は4.2.32のまま。

## 読む順序と優先順位

1. 運用判断ではプロジェクト内の `valis/core/` をOperation→Summary→Flowの順に参照する。3coreは読取専用で、ゲーム仕様やProject Summary Manifest実体の代用にしない。
2. 本書から対象分野の現在正本を選び、[採用状況表](decision-register-v1.md)で採用/保留/撤回/提案のみ、残る具体化を確認する。
3. 下表の正本が明示的に置き換えた条件だけを優先する。日付・ファイル名の版数・ノード本文の後ろにあることだけで優先順位を決めない。
4. 未変更部分は基礎仕様を維持する。基礎仕様の旧数値が現行正本と衝突する場合は、置換対象として読む。解消できない競合は推定で補わず確認事項にする。
5. 図・モックは造形/説明の資料、版付き証跡は当該実装版の根拠。画像の仮表記や過去版の成功を、現在のルール・新モデルの合格へ転用しない。

各Nodeや作業計画に残る旧「最新/現在/確認待ち」は、対象版と下表の適用範囲に照合する。回答済みのQ成体の採食/情報加工/情報対象・層区分を再確認待ちへ戻さない。現在の採否と未確定事項を読むために旧変更履歴を順番に追う必要はない。履歴はGitと版付きログへ委ねる。

## 対象別の現在正本

| 対象 | 読む正本 | 優先する内容・境界 |
| --- | --- | --- |
| 採用範囲/未確定事項 | [採用状況](decision-register-v1.md) | 採用済み・保留・撤回・提案のみと具体化C01〜C13。ゲームの具体規則は各正本 |
| 情報の定義/作用 | [持続する情報/2](persistent-information-v1.md)、[死亡情報/5](death-information-v1.md) | 関係性と意味、経験蓄積、通常/親養育者、学習/場所作用、集中/反復。全生物に非栄養、死亡地点/実績と同層/全層は維持。旧一回消費/重み補正だけの作用を置換 |
| 情報の経験条件/実績評価 | [情報評価/1](information-evaluation-v1.md) | C02の暫定値と重複抑制、保持資格と死亡生成の分離、役割別評価。実測済み値や確定数式とはしない |
| 寄生/遺伝/メタ操作 | [寄生メタ/2](parasite-meta-v1.md) | P段階別感染・経路遺伝、Qの限定窓/寄生成長/羽化/通常採食の自立成体、Pメタ/Qメタメタ。Qは主に死亡情報の出現率上昇/歪曲 |
| 生産者の群落/生存目標 | [群落・R1〜R6](balance-restoration-v1.md) | 生産者のみ群落、面積と可食量分離。500T/150〜250T窓、低競争8/10・混合最低1/10/目標3/10等。R0だけの完成を置換 |
| 多様な初期条件 | [多様生成/2](diverse-world-generation-v1.md) | おまかせの関連条件、手動ロック/明示0、有限候補、全実効値保存、再抽選なし再生 |
| 陸水の食物網/供給 | [生産基盤v2.7](producer-pyramid-v2.7.md)、[陸水v2.6](trophic-foundation-v2.6.md)、[食性訂正v2.5](ab-visual-ecology-v2.5.md) | 基底生産者→一次消費者→上位、通常植物非捕食/植物共生体食虫型、分解/還元。生産者の記録単位は群落仕様を優先 |
| 初期量/優遇/自由設定 | [供給](initial-supply-v1.md)、[種別数](founder-counts-v1.md)、[観測整理](observation-clarity-v4.2.30.md)、[製品モデル](observation-model-v4.2.md) | 供給と優遇の選択、非主生物/PQ直接数、QをPに応じて減らす。旧探索Qの初期状態を新生活環へ黙って変換しない（C12） |
| 年齢/繁殖/行動 | [生態観察v2.4](ab-ecology-observation-v2.4.md)、[複数行動/境界v2.5](ab-visual-ecology-v2.5.md)、[年齢能力v1.8](ab-age-abilities-v1.8.md) | 年齢成熟で繁殖・第三相ゲートなし。進化相と年齢は独立。移動/戦闘/採食は条件別に同一ターン成立可能 |
| 停止/遷移/配置/グラフ | [観測UI/5](observation-ui-v1.md) | 右上開始/停止、別画面で停止、同画面操作で進行、無確認再生成と失敗保護、右の常設3グラフと独立詳細、作成画面で非表示 |
| 現在像サマリ | [サマリ/2](ecosystem-summary-v1.md)、[関係面/1](relationship-network-v1.md) | 上部一体サマリ、総括と関係面→Bピラミッド→円。関係面は上1/下4の100T区間、共通記号、線幅＋単位付き数値。50T指標と混同しない |
| 個体/系統の選択 | [選択v2.5](ab-visual-ecology-v2.5.md)、[分類一覧31](optimization-v4.2.31.md)、[観測UI](observation-ui-v1.md) | 分類別折返し、複数色の所在強調、横詳細/追跡、0数項目非表示、非主名札切替 |
| 記録/結果分析/再生 | [図鑑と全期間記録](archive-history-v1.md) | 初期条件・最終集計・全ターン原値、明示保存、再生後は別ID。旧版/欠測/保存失敗を保護。追加モデルの保存項目も同書 |
| 描画/採用した形 | [描画条件v2.5](ab-visual-ecology-v2.5.md)、[モック対応表](ab-visual-reference-v1.md)、[固有差の現在対応](../../operations/plans/remaining-completion-v4.2.md) | 既存遠景記号/近景絵柄、主生物の識別・地形奥行き、系統固有の相/枝/雌雄/年齢/階級。群体節足は942.png、多頭蛇は承認体制 |
| 地形/環境 | [事前地形v1.6](ab-map-visual-v1.6.md)、[渡河/領域v2.5](ab-visual-ecology-v2.5.md) | 代表6地形×対応寸法、自然な接続/浅瀬等、許可部分の変化、環境固定。旧seed入力UI・1000T・III相繁殖等は対象別正本で置換 |
| 軽量化/演出 | [最適化31](optimization-v4.2.31.md)、[32](optimization-v4.2.32.md)、[処理軽減/2](display-load-reduction-v1.md) | 乱数表/索引/差分/背景部品合成/事前陰影/行動マーク。最大軽減でも近景を強制記号化しない。操作中画質低下は任意で既定OFF |

層分離は[観測整理](observation-clarity-v4.2.30.md)により通常UIから撤去しOFF固定。通常の「1ターン確定」は[最適化31](optimization-v4.2.31.md)で撤去。下層の一括集団化案ではなく、生産者だけ[群落仕様](balance-restoration-v1.md)を適用する。旧計画の未完項目をそのまま復活させない。

## 未変更部分の基礎仕様

基礎の適用順は[統合v1.3](ab-system-specification-v1.3.md)→[着手前調整v1.4](ab-readiness-v1.4.md)→[生態調整v1.5](ab-balance-v1.5.md)→[地形v1.6](ab-map-visual-v1.6.md)→[年齢/独立植物v1.7](ab-life-age-plant-v1.7.md)→[能力v1.8](ab-age-abilities-v1.8.md)。対象別の追加は[食性v1.9](diet-survival-v1.9.md)、[接触寄生v2.0](parasite-contact-v2.0.md)、[通常生存v2.1](ordinary-survival-v2.1.md)、[社会性v2.2](colony-survival-v2.2.md)、[観察速度v2.3](observation-session-v2.3.md)。上表で変更した条件は基礎へ戻さない。

[系統付表](ab-catalogue-v1.md)と[84候補の採否](ab-feature-scope-v1.md)も未変更部分の付表。古いF71接触感染の初回外、情報栄養、III相繁殖、群落化の一律不採用等は追加正本の該当条件で置換される。独立四相植物・寄生造形の専用値/割当の未確定を、既存の全採用方針の撤回と解釈しない。

## 資料・実装状況・後続

- [一枚の全体説明画像と索引](atlas-v1.3/README.md)、[採用画像と本文の対応](ab-visual-reference-v1.md)。旧画像内の仮表記や旧ルールを現在の仕様にしない。
- [現在の構造](../../valis/summary/lifegame-desktop.summary.md)、[既存製品の実測範囲](../../operations/evidence/optimization-v4.2.32/README.md)。製品4.2.32と追加A/Bの成立範囲は別に確認する。
- [既存の全工程計画](../../operations/plans/remaining-completion-v4.2.md)は作業計画でありゲーム仕様の正本ではない。C01の基本方針とC02の暫定値を採用し、現在は[残るC03〜C13](decision-register-v1.md)の個別確認を先に行う。今回の整理からC/D/E・src/tests・画像制作を自動開始しない。
