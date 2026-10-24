# CS08一次：現在状態の規模・性能と接触集計

起点634956282d115770342baaabb78d60ec75a6180e。製品4.2.77。自然進行/CPU/画面の測定対象は生態署名7808c454…。接触集計の改善後は57332f90…。[実装契約](../../../design/implementation/current-state-runtime-v1.md)、[集計結果](summary.json)、[出力ゲート](final-check.json)。

## 代表1条件の自然進行

既存の実フォーム条件（小40×28/河川/主84体/多層/淡水比較）を新方式で作り直した。旧方式の実効条件の受領票は流用せず、新方式の受領票を再生成した。最大500Tの計画に対し、計測予算4分で133Tへ到達して終了。ゲームの停止や例外ではなく計測器の予算終了で、500T完走ではない。

| 項目 | T0 | T133 |
| --- | ---: | ---: |
| 生体レコード | 419 | 6,314 |
| 主生物 | 84 | 86 |
| 一次寄生P / Q（自立期含む） | 50 / 20 | 11 / 40 |
| 生態の世界JSON | 1.36MB | 17.19MB |
| 個体内情報JSON | 0.25MB | 6.37MB |
| 旧経験/学習の履歴配列 | 0 | 0 |
| 発信区分の1主体最大数 | 0 | 3 |
| 個別死骸レコード | 0 | 0 |
| 新鮮/有機物/還元待ちの土壌行 | 0 / 0 / 0 | 33 / 719 / 9 |
| 場所の情報区分 | 0 | 305 |
| 観測側の全T行 / JSON | 1 / 0.09MB | 134 / 4.33MB |

全期間の最大収支誤差はE 0.000004、M 0。各チェックポイントの不変条件は空、全T行は欠測なし。初期値＋aは9成分を維持し、生態へ接触ペア/世代の過去全列を再導入していない。土壌/感染体は残る量を持つため、レコード数だけを理由に削除しない。[kernel.json](kernel.json)、[全T計時](turns.json)。

JSONのMBは10進の直列化量で、JSヒープではない。観測の増加は必要な全T記録であり、生態の不要履歴の再増殖とは区別する。初期は人口が急増し、同じ規模の状態を長期固定した実験ではない。旧方式T500の139.69MBと、新方式T133の17.19MBを同一条件/同一期間の改善率として比較しない。

## 計算の残存負荷と改善

最初の10Tの計算中央値約295msに対し、T114〜133は約2311ms、観測appendは約12.1ms。計算時間に描画・転送・観測appendは含まない。内包するメソッド時間を足して全体時間にしない。

保持T133→134のCPU診断では、接触集計の自己時間約377ms、配分allocate約226ms、structuredClone約205ms、受信receive約130msが確認できた。分解要求は37件、要求全体は13,611件。今回の大きな残存要因は、過去の個別死骸の大量分解だけではない。[cpu.json](cpu.json)。サンプリング/GC/Profiler自身の影響を含む。

**今回のコード修正は接触集計だけ。** 個体ペアの生成/重複除去を、マス別・系統別人数からの同じ整数件数の算出へ置き換えた。同一マスのn(n−1)/2、異系統/隣接マスのnmを使い、片方向の壁も含めて成立条件を保つ。乱数・能力・栄養・行動・グラフの意味は変更しない。

保持T133の暖機3回中央値は、接触集計739.56→4.56ms。実1Tの単回比較は2955.92→2157.83ms。**接触集計単体の約99.4%減はこの保持条件の値で、ゲーム全体が99.4%速くなった意味ではない。** 全体の単回値は順番/JIT/キャッシュ/GCの影響も受けるため、安定した全体改善率とは呼ばない。[boundary.json](boundary.json)。

初期/保持T133から各1Tの全世界・観測が変更前と一致し、入力世界も不変。新規5＋関連22項目が成功。[tests.log](tests.log)、強化した片方向の壁の最終5確認は[contacts-final.log](contacts-final.log)。新生成署名は57332f90…。直前の同規則7808c454…の形式4記録は原bytesを変えず再生でき、未選択の従来経路も一致した。過去の別生態規則への互換を増やしていない。

## 転送・描画・全期間グラフ・メモリ

- 実3段階転送はT0→1とT99→100で全世界復元が一致。後者はJSON21.41MB、encode/clone/applyの合計約914ms。ブラウザdispatchを含まない別計測で、計算1Tや描画と合算しない。
- 実renderer/978×431・3回の暖機中央値は、遠景T0 3.9ms→T133 15.1ms、近景0.8ms→5.7ms。近景は各世界の先頭主生物で、同一地点の比較ではない。初回の地形/素材準備と暖機値を区別する。
- 実134時点からの全生物個体数グラフは320×120で暖機中央値1.2ms。構成各系列は0.1〜0.2ms。ネイティブ観測の復元は約475ms、関係系列の集計は0.4ms。全アプリDOM、関係SVGの描画、ユーザー操作全体を含む性能保証ではない。[browser.json](browser.json)。
- 自然進行中のT133のheapUsed約583MBは、GC前の一時割当を含む断面。最終世界と復元観測だけを保持した別Nodeの明示GC後は約49.1MBだった。[memory.json](memory.json)。実アプリ/Workerの最大メモリ・自然GC・メモリリークの不存在をこれで認定しない。

## 残件

優先対象は、共有配分、情報受信、世界複製/一時割当とGC、転送。描画はこの代表断面では計算より小さい。不要履歴の削減と、生体数増に伴う必要計算を分けて次の改善を選ぶ。自然500T/その後の長期安定、全条件/大盤面、実Workerと画面全体のピークメモリ、Windowsは未認定。マップ領域可視化は最適化・画面確認・安定化の後。

## 再実行

```sh
node tests/current-runtime-profile.cjs
node tests/current-runtime-cpu.cjs /tmp/current-runtime/terminal.json /tmp/current-cpu.json
node tests/current-runtime-browser.cjs
node --test-reporter=tap -e "require('./tests/current-contact-counts.test.cjs');require('./tests/current-relations.test.cjs');require('./tests/current-interface.test.cjs');"
git show 6349562:lifegame-desktop/src/ecology/observation-modules.js > /tmp/current-runtime-before-modules.js
node tests/current-runtime-boundary.cjs /tmp/current-runtime-before-modules.js /tmp/current-runtime /tmp/current-boundary.json
node tools/build-observation-model.cjs --check
```

初期/到達世界とネイティブ観測は/tmpへ保持し、毎Tの世界をGitへ蓄積しない。保持ファイルのハッシュ/対象版はsummary.jsonを参照。新しく自然進行を測るときは現在の署名/到達Tを付け、ここにある改善前133Tの測定を上書きしない。ブラウザはローカルHTTPのネットワーク権限が必要。CSP迂回は保持JSONを読む検査用だけで、製品CSPは変更しない。
