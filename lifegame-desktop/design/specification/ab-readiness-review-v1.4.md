# A/B 実装着手前レビュー v1.4：資料照合

判定：調整後のA/Bは、C設計と段階的な実装へ進める基準を持つ。実装を今回開始した意味でも、ゲームの動作/性能を合格とした意味でもない。

## 指摘と処置

| 対象 | 従来の問題/曖昧さ | 今回の確定条件 | 補遺節 |
|---|---|---|---:|
| 回復/負傷 | HP50で回復が止まり繁殖資格70へ戻れない。小型に主のHP絶対値が適用され得る | 主の緊急優先50/回復目標100、餌専用収支、負傷は残率 | 1 |
| 採食 | 餌枠の小型と植物の共存、菌の隣接分解の解釈 | 群別の源/距離/二口/合法接触を明記 | 2 |
| 状態 | CAの期限、密度費、成長後能力の参照時点 | 期限除外CA、密度額固定、新能力翌ターン | 3 |
| 育児 | 後段の死亡で移転を取消す因果の循環 | 確定前の無効化と確定後の無返金を区別 | 4 |
| 出生 | 順次貪欲法と全予約勝者方式が混在 | 親/枠の固定二段階、敗者繰上げなし | 5 |
| 供給 | 予約後予算で順位が変動、同じ予算への重複候補 | 固定順位/供給元とセルの両予約 | 6 |
| Q | 成熟当日能力/成果カウンタ/操作成分が不明 | 開始段階・前日までの成果、固定成分選択/付加値 | 7 |
| 記憶 | 位置履歴と遅延成果/揺らぎ寄与の更新が不明 | 固定長の更新/置換/消費/期限を明記 | 8 |
| 再現性 | JSON表現/微小丸め/出生値の分布が不明 | 直列化・端数配分・用途分離と準拠例 | 9 |

## 実施した照合

- 現行coreはプロジェクト内配置からOperationを先行し、Summary/Flow関連節を実読。FLOW-04/粒度判断/Manifest反映/出力前ゲートの条件へ接続。
- 補遺11節、既存統合正本の回復/育児/出生/CA/採食の該当文を実際に更新し、相違時の優先順を入口へ明示。
- 41 Nodeのメタデータ、更新17件の責務参照、Manifest17要約、相対リンク、差分範囲を照合。全Node草案・名称/親子/derived_from/tests等を維持。
- 設計算例14件を小数演算で照合。これは下記の算例を計算したもので、ゲームの生態処理を実行した結果ではない。
- [直列化/ハッシュ準拠例3件](ab-readiness-v1.4-vectors.json)をUTF-8/SHA-256から作成。日本語・先頭空白/改行を含む合成初期値で、省略やtrimなしの表現を記録。
- 一枚の統合PNG/旧分冊画像/core/A2/旧B1〜B3/C/D/E/src/tests/CIは本変更に含めない。git diff --checkで空白エラーなし。

| 設計算例 | 算術結果 |
|---|---|
| HP68 + e4×0.5 reaches reproduction HP70 | 70.0 |
| HP99 needs e2 to reach HP100 | 2 |
| e4 after e2 healing gives reserve E42 | 42 |
| E20 first reserves e15 before healing | 15 |
| remaining e5 heals HP40 to42.5 | 42.5 |
| care payer cost equals recipient gain plus loss | 2.0 |
| capacity1.7 is insufficient for care1.8 | True |
| removing one expired neighbor removes B3 eligibility | 2 |
| movement k+2 is valid before expiry k+3 | True |
| 6-place round of half micro gives one micro | 0.000001 |
| two rounded halves overshoot by one micro | 0.000001 |
| source conservation after one-micro correction | 0.000001 |
| healthy small HP8 out of max8 is 100 percent | 1 |
| small HP2 out of max8 is severe below30 percent | True |

## 残る評価と次段階

未決定のゲーム方式をユーザーへ差し戻す必要は今回ない。次段階は実装許可後のC/D具体化から。全30系統/各特殊生態を段階的に接続する順を補遺10節に記す。生存率・分岐速度・寄生完走・社会性創設・情報効果・大盤面性能・Windows実機は実装後の評価として残す。

今回の算例/資料照合をD/Eのゲーム検証証跡に流用せず、過去の旧実装に対するE3等も現行生態仕様の合格根拠へ流用しない。承認状態の変更は行っていない。
