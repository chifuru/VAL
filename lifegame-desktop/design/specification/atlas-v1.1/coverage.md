# 仕様全体と図解資料の対応

各仕様章に説明シートを割り当てた目次です。図は理解用の要約/代表例で、式・容量・例外の正本を置き換えません。特に乱数キー、丸め、特徴式、予約の細則は規範本文を併読します。

## [ab-specification-v1.md](../ab-specification-v1.md)

| 規範章 | 対応する資料ID |
|---|---|
| 1. 目的と不変条件 | [17](17-ecosystem-overview.png), [19](19-state-and-inheritance.png), [28](28-failures-and-boundaries.png) |
| 2. 世界・占有・初期配置 | [18](18-initial-conditions.png), [11](11-environment-terrain.png), [01](01-cell-layers.png) |
| 3. 個体状態と遺伝 | [19](19-state-and-inheritance.png), [34](34-precocial-profile.png), [35](35-food-species-profiles.png) |
| 4. 栄養と有限移転 | [02](02-nutrient-budget.png), [21](21-payment-and-feeding.png) |
| 5. 光・生産・分解・材料 | [02](02-nutrient-budget.png), [13](13-producers-and-prey.png), [35](35-food-species-profiles.png) |
| 6. 非生物資源 | [03](03-food-identities.png), [14](14-resource-appearance.png), [22](22-cellular-rules.png) |
| 7. 移動・感知・戦闘 | [09](09-sensing-movement-combat.png), [20](20-turn-sequence.png) |
| 8. 行動・経験・庇護 | [10](10-emergent-behavior.png), [23](23-learning-and-memory.png), [06](06-eusociality.png) |
| 9. 情報は延長された表現型 | [08](08-hyperparasite-information.png), [25](25-information-lifecycle.png) |
| 10. P/Qの生活環と情報作用 | [07](07-parasite-cycles.png), [08](08-hyperparasite-information.png), [16](16-parasite-forms.png), [26](26-parasite-contract.png) |
| 11. 成長と繁殖 | [04](04-growth-branches.png), [05](05-reproduction.png), [06](06-eusociality.png), [15](15-precocial-and-sex.png), [24](24-growth-thresholds.png), [34](34-precocial-profile.png), [35](35-food-species-profiles.png), [36](36-tree-abyss.png), [37](37-tree-myth.png), [38](38-tree-recursive.png), [39](39-tree-sail.png), [40](40-tree-gravity.png), [41](41-tree-crystal.png), [42](42-tree-manyeyes.png), [43](43-tree-abyssshell.png), [44](44-tree-parallel.png), [45](45-tree-memory.png), [46](46-tree-serpent.png), [47](47-tree-solar.png), [48](48-tree-antimeme.png), [49](49-tree-valis.png), [50](50-tree-jelly.png), [51](51-tree-kelp.png), [52](52-tree-whale.png), [53](53-tree-swarm.png), [54](54-tree-plasma.png), [55](55-tree-cephalopod.png) |
| 12. 死骸と腐敗 | [02](02-nutrient-budget.png), [07](07-parasite-cycles.png), [21](21-payment-and-feeding.png), [26](26-parasite-contract.png) |
| 13. 一ターンの確定契約 | [20](20-turn-sequence.png), [21](21-payment-and-feeding.png) |
| 14. 観測・図鑑・説明・モーション | [27](27-observation-and-scale.png), [12](12-motion-storyboards.png) |
| 15. 例外・不成立・性能の境界 | [09](09-sensing-movement-combat.png), [27](27-observation-and-scale.png), [28](28-failures-and-boundaries.png) |
| 16. A/Bの文書完成と次段階 | [28](28-failures-and-boundaries.png) |

## [ab-execution-contract-v1.1.md](../ab-execution-contract-v1.1.md)

| 規範章 | 対応する資料ID |
|---|---|
| 1. 値・時刻・再現性 | [18](18-initial-conditions.png), [19](19-state-and-inheritance.png), [20](20-turn-sequence.png) |
| 2. 状態の必須項目と上限 | [01](01-cell-layers.png), [19](19-state-and-inheritance.png), [23](23-learning-and-memory.png), [27](27-observation-and-scale.png) |
| 3. 固定世界の生成と初期配置 | [11](11-environment-terrain.png), [18](18-initial-conditions.png) |
| 4. 資源・餌の完全な分類 | [03](03-food-identities.png), [13](13-producers-and-prey.png), [14](14-resource-appearance.png), [35](35-food-species-profiles.png) |
| 5. CAと有限予算の組合せ | [22](22-cellular-rules.png) |
| 6. 一ターンの支払順と確定点 | [20](20-turn-sequence.png), [21](21-payment-and-feeding.png) |
| 7. 採食・回復・物質収支の調停 | [02](02-nutrient-budget.png), [21](21-payment-and-feeding.png) |
| 8. 移動予約・射線・同時戦闘 | [09](09-sensing-movement-combat.png) |
| 9. 行動特徴の具体式 | [10](10-emergent-behavior.png) |
| 10. 経験・情報の有限更新 | [23](23-learning-and-memory.png), [25](25-information-lifecycle.png) |
| 11. 成長・出生の数値条件 | [04](04-growth-branches.png), [05](05-reproduction.png), [06](06-eusociality.png), [15](15-precocial-and-sex.png), [24](24-growth-thresholds.png), [34](34-precocial-profile.png), [35](35-food-species-profiles.png) |
| 12. P/Q：感染と生活環を最後まで閉じる | [07](07-parasite-cycles.png), [08](08-hyperparasite-information.png), [16](16-parasite-forms.png), [26](26-parasite-contract.png) |
| 13. 真社会性・雌雄・形態を見分ける | [06](06-eusociality.png), [13](13-producers-and-prey.png), [14](14-resource-appearance.png), [15](15-precocial-and-sex.png), [16](16-parasite-forms.png) |
| 14. 表示・モーションの静止絵コンテ | [12](12-motion-storyboards.png), [27](27-observation-and-scale.png) |
| 15. 不成立理由と観測項目 | [27](27-observation-and-scale.png), [28](28-failures-and-boundaries.png) |
| 16. 文書上の照合例と残る評価 | [21](21-payment-and-feeding.png), [23](23-learning-and-memory.png), [26](26-parasite-contract.png), [28](28-failures-and-boundaries.png) |

## 系統定義表・初回採否

| 範囲 | 図解 |
|---|---|
| 既存20の名称・四相・全3→6経路 | 36〜55：全20系統を個別掲載 |
| 既存20の寿命・維持・繁殖・材料・移動・固有能力・9値・適性・食性 | 29〜33：全20系統を4系統ずつ掲載 |
| 感知と射程の独立 | 09、29〜33の系統表は能力表6節を併読 |
| 早成甲殻 | 15、34 |
| 植物・菌・小型6系統 | 13、35 |
| 寄生P2・高次寄生Q1 | 07、08、16、26 |
| 繁殖方式の例外 | 05、06、15、34、35 |
| 初回採否84件 | 28で境界を要約。全件は[採否表](../ab-feature-scope-v1.md) |

## 全体版への拡張時に変えていないもの

今回の全体版化は表示資料の拡充です。20系統の名称/枝、30系統の数値、A/Bの責務、Nodeの親子/承認状態、ゲームの実装範囲は変えていません。全55枚と規範文書の併読を「仕様全体」とし、図だけで端数や全例外を推測して実装しません。
