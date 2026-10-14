# A/B 要求トレーサビリティ独立監査

対象: `/workspace/VAL/gas-fizzbuzz-webapp` の b93e6c4158e344fa745ea87d9ea1815356b5c644 時点の実装。
読取専用。実装、テスト、既存Node、coreへの変更なし。追加再現物のみ `/tmp/valis-requirements-audit.cjs` と `/tmp/valis-requirements-audit.json`。

## 読み込んだ範囲

- A層全7件: A1 / A1.1〜A1.6。
- B層全9件: B1 / B1.1〜B1.6 / B1.4.1 / B1.4.2。
- `design/part-composition-v1.md`, `design/mockups/README.md`, `design/mockups/core-9-20261013.md`, `design/mockups/git-assets-inventory.json`。
- `src/composite/creature-engine.js`, `app.js`, `Index.template.html`, `styles.css` 全文。
- `tests/creature.test.cjs`, `composite-runtime-contract.test.cjs`, `draft-organ-sprites.test.cjs`, `browser-smoke.cjs`, `package.json`。
- `design/assets/composite-asset-ledger.v42-draft.json` は関係する検索結果のみ。原寸画像の目視比較は別担当に委ねた。

現在全Nodeは草案。過去の承認版と後続試作差分が同じNode内に積層されており、魚/陸生/宇宙の旧命名だけを現行違反とは判定しない。ただし次の継承・色/体積・初期入力プレビュー・低モーション・結果画面の契約には明示的な撤回がない。これらは実装と契約の不一致として扱う。

## Findings

### R1 / P1: 育成餌による体色と成長Pによる体積の連続変化が描画に接続されていない

要求: `valis/nodes/A/A1.3.md:12-16`, `A1.5.md:11`, `B/B1.5.md:11`。3種栄養餌の比率で体色、有効成長Pで体積が増加し、完全成熟で外見を固定する。

実装: `src/composite/app.js:175`, `:200-247`。コアはDNAの2択、幅/高さはDNAのtorsoRatio/headRatioのみ (`:229-231`)。描画がfoodsまたはpointsを参照しない。pointsはUIバー (`:271-272`) 、foodsは4種合計値 (`:274`) のみ。

再現: 同DNA480・myth器官Lv2・同stageを固定し、Fizz30/P24 → Buzz30/P0 に変更して正確なpaintSpecimenでクリア済みCanvasを描く。両方のdataURL SHA-256は `38ea3cd27370e53991131aed283c2d9de393c8ed8daccc0d34dd12cef2376b5b` で完全一致。これは合成器官が育つこととは独立した契約の欠落。

テスト穴: `tests/creature.test.cjs:79-83` は成熟後partXpが固定であることだけを確認。`tests/browser-smoke.cjs:80-110` は図鑑の器官Lv0〜3の画像差のみ。異なるfood比率/Pに対する造形差を検証していない。

### R2 / P1: 交差進化時に獲得済み継承器官の4番目以降が描画から消える

要求: `A/A1.4.md:65`, `B/B1.4.2.md:48`, `design/part-composition-v1.md:39`。別系統へ移っても獲得済み器官Lvを消さず、旧器官を次の身体に描く。

実装: engine `:145-147` は全獲得済み器官を保存するが、app `:232-234` が `entry.parts.slice(0,3)` として描画を最大3個へ制限。

再現: DNA480で第一相からvalis目標のplannedEnvironmentを使い、第二相に入った後はantimeme目標へ変更。24行目でvalis、80行目でantimeme。heritageにはvalis6器官が保存されるが、drawImage記録に偏在光核(lightKernel Lv3)、漂遊衛片(detachedNode Lv3)、符号尾(signalTail Lv3) がない。先頭3個のみ描かれる。JSONのheritageDrawnに個別証拠。

テスト穴: `tests/creature.test.cjs:67-72` はheritageの中にいずれかのLv>0器官が保存されていることを確認するだけで、全器官の実描画を確認していない。

### R3 / P1: 完走時のリザルト画面・ログ開閉・4種別集計が失われている

要求: `A/A1.2.md:11`, `A/A1.5.md:16-17`, `B/B1.2.md:12`, `B/B1.5.md:15`。完走時に大きな静止肖像を主役とする結果モードへ切替え、称号/個体ID/種族/段階/P/色/4種餌数を表示。ログ開閉と再育成を提供。

実装: `app.js:141` finishはstop/complete=true/notice更新のみ。テンプレート全体に専用結果モード、ログ開閉、4種別餌数が存在せず、`foodTotal` は総数のみ。B1.5:20の「育成/リザルト二画面、ログ開閉と再育成を実装済み」は現行と一致しない。

再現: N1000で開始→スキップ。表示は`LIVE · 完走`、出力textareaは可視、result/Result ID要素0、bodyのdata-modeなし。N15など未成熟でも同じ状態ラベル変化だけ。

境界: ユーザーが観測UIモックを選択したため画面設計を意図的に変えた可能性はあるが、A/Bに当該契約を撤回した記録がなく、現行契約として整合していない。監査で勝手に旧UIを復元せず、採用する契約を整理する必要がある。

### R4 / P2: 低モーションでも最終結果へ直接移らず全行タイマー再生する

要求: `A/A1.2.md:12`, `B/B1.2.md:12`, `B/B1.5.md:16`。低モーションは逐次処理と同じ最終結果/外見を直接示す。

実装: `app.js:6` でmediaReducedを読むが、`:99-103` startPlaybackは常にsetInterval。mediaReducedの参照は`:191-198` の描画アニメ停止だけ。

再現: Chromium context `reducedMotion:'reduce'`、N1000で開始し120ms後に検査→`LIVE · 育成中`、2/1000前後、ログ2〜3行。開始時の環境を使って残り全行を直接処理する経路はない。ブラウザsuite自体が全contextをreduceで走らせるが、毎回スキップを押すため見逃す (`tests/browser-smoke.cjs:37`,`:124-125`,`:136-143`)。

### R5 / P2: 入力Nの編集中にDNA個体プレビューが更新されない

要求: `A/A1.6.md:10`, `A/A1.5.md:10`。有効なN変更で事前プレビュー。

実装: `app.js:344-388` setupにseedInput input/changeイベントがない。runまたは初期化を押すまでseed/specimenが古いまま。

再現: LIVE表示へ戻し、入力480→481へ変更。入力481だがIDは#0480、Canvasも変更前と完全一致。`tests/creature.test.cjs:49-54` は同NのDNA値の再現性だけを検証し、入力編集とプレビュー連動を検証しない。

### R6 / P2: 「Nを変更」で入力欄と個体のNが食い違う

実装: `app.js:359` はrandom seedをresetに渡すが、reset (`:72-75`) はseedInput.valueを更新しない。

再現: 入力481の状態でMath.randomを0.001に固定して「Nを変更」を押す。個体ID#0002・0/2となる一方、入力欄は481のまま。次に育成開始を押すと入力欄481を使うため、表示された個体2は育成されない。操作の意味と個体IDに実際の不整合がある。

### R7 / P2: 不正Nで「初期化」を押すと未捕捉例外、途中で状態変更される

要求: `A/A1.1.md:13`, `B/B1.1.md:9-12`。不正入力拒否とエラー表示。

実装: `app.js:358` は検証なしにfloor(Number(input)||480)をresetへ渡す。reset `:73` はstopとseed代入後にE.initialを呼び、範囲外でthrowする。runの安全な入力検証 (`:113-115`) を初期化で共有していない。

再現: N1000を完走後、入力1001→初期化。未捕捉pageerror `個体Nは1〜1000`、UIは旧1000完走表示のまま。seedは1001へ代入済みのため、次のUI更新で古い個体/ログと分母Nが食い違い得る。小数はfloor、0/空欄は480への暗黙変換で、拒否契約にも一致しない。

### R8 / P2: 草案ノード内の現在実態欄が複数世代の実装状態を同時に示す

- `A/A1.md:25` / `B/B1.md:25` はC/D/Eが旧4段階のまま・新実装未実施と記載。現行engine `:73`,`:142-162` は10/35/100の3相と4種餌を既に実装。
- `A/A1.3.md:22-23`, `B/B1.3.md:20` は数字餌未実装と記載。engine `:138-142` は数字の促進/抑制と次栄養の倍率を実装。
- `B/B1.6.md:21` はDNA対応実装未作成と記載。engine `:74-89` は決定的6軸DNAを実装。
- `B/B1.5.md:20` は結果2画面と入力プレビューを実装済みとする一方、現行appには存在しない。
- `design/part-composition-v1.md:79` / `design/mockups/core-9-20261013.md:5` は原本バイナリ未登録とするが、mockups/README:5でGit配置更新あり。READMEは旧記録であることを明記するが、正とされるcore-9側には現行配置対応表がなく、C01〜C09原本同定は未解決。

これはNode全体を古い仕様として捨てる理由にはならないが、次の実装でどの段落を採用すべきか、何が未実装か誤判断する原因になる。履歴を残しつつ最新の契約と実態を明示して整理する必要がある。

## 補助観察（決定前に仕様整理が必要）

- phase1とphase2で同DNA/同器官Lvの造形はピクセル完全一致 (`app.js:175`,`:228-231`)。A1.5:12の相の大きな造形変化や相内4tier描画は現在の器官Lv0〜3と別物だが、UIには正式な相内tierの実体がない。安定コアを維持する新方針との両立を仕様で決める必要がある。
- `dna.eyeSpacing`, `tailRatio`, `hue`, `aptitude`, `sensitivity` は生成後に参照されない。変化するのは主にbodyVariantと全体の幅/高さで、眼・尾・表皮の独立したDNA表現、主副特化、DNA感受性の成長写像は接続されていない。候補/暫定規則も混在するため、未承認試作の取り残しとして記録。
- 数字餌のmodifierは最新1値しか保持されず、A1.3:11/B1.3:11が求める促進/抑制別累積数・履歴はない。foods.numberはまとめた件数だけ。3栄養比率を計算する関数も現行engineにない。
- A1.2:12/B1.5:6/12の餌飛来や行に同期する食事反応は描画に接続されず、呼吸・光点・衛片動作だけが時刻依存で動く。
- 形態遷移1100ms/tier560ms/Bayerディザは現行appに存在しない（A1.5:56/60）。これは後続の画像差替え便で取りやめた可能性があり、採用方針を整理してから判断すべき。

## 正常に接続されている事項

- 入力N全体からの決定的DNA6軸、birth lineage未確定、DNAのfreeze。
- 本来のFizzBuzz文字列/順序/N行、GAS応答の厳格な検査と通信エラー時の拒否（実GASは未検証）。
- 4種餌の排他的分類、数字剰余の促進/抑制、次の栄養1回での0.75/1.25P適用と中立化。
- P10/35で3相、P100で成熟しpartXp/P/lineage固定、カウンターとN行再生は続く。
- 相内環境累積/直近12行と餌による14系統選択、相入口だけで分岐固定。環境変更とスキップが既存履歴を保持。
- PART定義23器官×3Lvの実画像接続、Lv1/6/16、12系統PNGアトラス＋VALIS6/反記銘5器官。第4相は候補名だけ。
- active srcは実装内容に整理済み。元モック/旧素材はdesignへ保持。

既存suite成功は上記の正常項目を支えるが、R1〜R7を網羅しない。画像が読める/器官Lvで画面が変わることと、モック忠実性・全要求への適合は別の確認結果。
