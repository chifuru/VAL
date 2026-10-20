# 固定3条件・500T集計

`tools/aggregate-i11b-foodweb.cjs` は新たな生態計算をせず、`runs/v1` と `runs/v2` の既存製品出力だけを読み取る。source、既存runner、元I11証跡は変更しない。

```sh
node tools/aggregate-i11b-foodweb.cjs --expect-signature <最終製品署名>
```

既定入力は `fixed-cases.json` の河川・湖・森林、各v1/v2、各500Tの6組。全18ファイル（summary・observations gzip・biology gzip）が存在しなければ `aggregation-status.json` に `missing` を出して終了コード2で終える。欠測を0や旧結果で埋めない。破損・異版・別設定・行欠けは `invalid` と終了コード1。全入力が揃い検査を通った場合に限り `paired-comparison.json` と `500T-species-summary.md` を作る。終了コード0も生存目標の認定は意味しない。

検査は各gzipの保存SHA/byte数、全18入力ファイルのSHA、要求・実効設定、全6組のモデルsource一覧/hashと製品署名、全0〜500Tの501行、製品Oの正式バリデータ、観測とbiologyの個体数・P/Qフロー一致、初期と終端の記録一致を含む。集計途中にsourceのモデルhashが変わっても拒否する。再現コマンドと集計スクリプト自身のSHAをJSONへ保存する。入力summaryとgzipを上書きしない。

生物別に初期不在／後から出現／その後の消失、150〜250Tの連続存続・最低数・平均数、500Tの個体数・世代、製品出生累計と観測された新ID、親子、死因、0/150/250/500Tの相・齢・雌雄を整理する。存在しなかった種を維持失敗にはしない。観測された新IDは、コミット状態に現れたgeneration>0の実個体であり、製品累計と混同しない。

死因は既存 `w.last.deathCauses` の原値だけを集計する。Pの除去・宿主喪失などが全てこのログへ出るわけではなく、空の死因集計を「死亡なし」とは解釈しない。初期数・出生数・終端数の差から未記録の原因を補わず、個体数上の消失と記録済みの死因を区別する。

P/QフローはT0を除く1〜500Tの原値を加算する。Pの放出Eは個体数でなく感染材料のエネルギー。同一IDの宿主移行は出生でない。Qは窓の個体T、侵入、新定着、発育、羽化、卵配置、娘の定着を別々に残す。初期自由Qの残存は羽化や次世代成立でない。ID遷移と親子IDを保持し、`last.outcome` は当該Tに `outcomeAt` が一致する時だけイベントとして残す。窓は利用機会の実測であり、感知や接触成功ではない。

**既存runnerの欠測項目**：`biology.turns[].Qstates` は `w.hyperParasiteSummary.byState` を参照しており、正式stockの `states` と異なるためnullとなる。原データは直さず、集計では全Tの製品 `observations.rows[].hyperParasite.states/phases` を正本にする。nullを0補完しない。Pは発育が `counter`、Qは `hyper.development` なので、Pのdevelopment累計はnullとし、Pは同一段階内のcounter増分・段階ごとの最大値を別記する。段階切り替え時のリセットから未測定の進捗を推定しない。

旧 `i11-survival-performance-v1/breeding/candidate-500.json` の同3条件v1は追加の照合先。要求設定と実効設定が完全一致した時だけ終端fingerprint・個体数を比較する。差があれば差分パスとスキップ理由を記録し、同等と見なしたり今回の入力へ補完したりしない。旧source署名と新source署名の同一性を主張する照合でもない。

この3条件はすでに観測した診断seedで、独立評価・holdout・全系統の生存確率評価ではない。v1/v2は年齢初期分布や寄生修正を含む版全体の比較であり、下層2変更への単独の因果帰属はしない。R1〜R6は全て非認定。時刻は同時2プロセス下のheadless参考値で、描画・再生速度・性能達成を示さない。

集計のメタデータ検査は `node operations/evidence/i11b-foodweb-routes-v1/aggregation-check.cjs` で再現できる。全501行・順序、欠測時の結果生成禁止、旧記録の完全一致条件、checksum改変の拒否を局所fixtureで検査し、`aggregation-check.json` へ保存する。生態試行や生存実績を増やす検査ではない。
