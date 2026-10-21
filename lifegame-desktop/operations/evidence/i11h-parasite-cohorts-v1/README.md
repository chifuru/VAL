# I11h 寄生群体・存続優遇の限定証跡

対象は開発版 4.2.50 の新規世界 `parasiteCohortModel: cohort/1`。旧記録には群体規則を適用しない。計算正本は `src/ecology/state.js`、`parasites.js`、`nutrition.js`、生成済み `observation-model.js`。テストと試行の最終版署名は `src/ecology/replay-version.js`。

## 接続した規則

- P初期3員、子2員。第一宿主からの放出・接触による一員移出は非出生。終宿主内でのみ子を作る。宿主を経るたび侵入率を0.8倍し、子で履歴を戻す。
- 発育したPは有償で近傍宿主へ移る。中間宿主が近くにいない場合は費用・通過数を上乗せして成体終宿主へ短絡する。集団の一斉清掃は群体当たり一ターン一回まで。免疫・清掃の費用と失敗は残す。
- Q初期2員。成熟移行期の終宿主Pへ産卵し、Pが成熟しないうちは羽化できない。自立IVだけが有償で産卵する。自立IVは生産者の有限可食部などを食べ、情報は栄養にしない。捕食回避は確率・費用付き。
- Q初期数はPの40%、半数を自立探索として予定。初期の適合P不足分は自立探索へ移す。Qの初期蓄え0.18、寿命200T、P運搬期限32Tは今回の比較値。

## 検証

`node --test tests/parasite-cohort.test.cjs tests/primary-parasite.test.cjs tests/hyper-parasite.test.cjs tests/archive.test.cjs` と `node --test tests/compute-worker.test.cjs tests/ecology-integration.test.cjs tests/observation-model.test.cjs tests/i11-ecology-evaluate.test.cjs` は合計8ファイル成功。新規群体・通過減衰・P移出/出生・Q早期感染と旧窓・20T決定性/有限収支・全ターン観測と保存再生、Worker接続を含む。最終ソースで `node --check`（app、state、parasites、nutrition）および `git diff --check` は成功。全テスト一式は本最終ソースでは再実行していない。

40×28、主48、選択系統 `ryouki/solar/jelly/recursive`、供給OFF、`survival/4`、小集団モデル、P/Q群体モデル、上記Q設定で3初期値を各100T実行。毎ターン `E.invariants` を検査し、全試行で空だった。P/Qは群体数である。

| 初期値 | 0T P/Q | 50T P/Q | 100T P/Q |
| --- | ---: | ---: | ---: |
| cohort-a | 42/16 | 42/7 | 18/3 |
| cohort-b | 41/16 | 44/17 | 14/13 |
| cohort-c | 42/16 | 39/14 | 17/2 |

長期の追加観測では `cohort-a` が150TでP6/Q3、200TでP/Qとも0、`cohort-b` が150TでP0/Q13、200TでP0/Q4、250TでP/Qとも0。したがって今回確認できたのは短期の存続と一部のQ羽化まで。P/Qの世代をまたぐ長期循環、500T生存率、全系統・全モードのバランスは未認定。特に中間宿主の減少とQの再感染成功が後続観測の焦点となる。
