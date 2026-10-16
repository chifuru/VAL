# LifeGame — 生態系観測室

初期値から生成した9種族の生物が、成長・採食・繁殖・移動・戦闘を通して生存を競う、Windows向けのローカルシミュレーションです。現行FizzBuzzと同じ Electron / ZIP配布方式です。

v1.0.0は[Windows CI run 38830235546](https://github.com/chifuru/VAL/actions/runs/38830235546)で、単体・構造17検査、画面操作19項目、ZIP展開照合、配布exeの起動・10ターン進行を確認しました。

## Windowsで起動

[LifeGame Windows x64 の実行一覧](https://github.com/chifuru/VAL/actions/workflows/lifegame-windows.yml)で成功した実行を開き、Artifacts の **LifeGame-Windows-x64** をダウンロードします。外側のアーティファクトZIPと、中の `LifeGame-Windows-x64.zip` をすべて展開し、`LifeGame.exe` を起動してください。

Windows 10 / 11 x64用。DLL、resources、localesを同じフォルダに保ってください。利用時にNode.js、GAS、ネット接続は不要です。観測状態はアプリ終了時にリセットされます。

## 観測する

1. 初期値、盤面、個体数、上限ターン、競争モードを設定。
2. **① 世界を読み込む**で初期集団と資源を生成。この時点では進みません。
3. **② 観測を開始**で時間を進める。一時停止、再開、1ターンずつの観測もできます。
4. 生物をクリックすると種族、年齢、世代、HP、エネルギー、血統、DNAを表示します。
5. 全滅、ひとつの集団の生存、上限到達による共存を区別して終了します。最多個体数だけで勝者を決めません。

同じ初期値・設定なら、初期配置から結果まで再現できます。設定を変更した場合は読み込み直してください。↺は最後に読み込んだ設定を復元し、最初から準備します。

種族戦は同種族、勢力戦は同勢力、乱戦は同血統を仲間として扱います。子は親の種族・行動・勢力・血統・DNAを継承します。

## 生命のルール

- 添付のGAS版を基礎とする9種族と9行動。実行方式はWindows版へ変更。
- 初期値から配置、行動、資源量、個体DNAを生成。DNAは攻撃・防御・代謝を±10%調整。
- 年齢2で成体、種族寿命の75%以上で老齢。年齢は個体の成長、世代は親子の継承回数です。
- 資源は採食後5ターンで回復。維持費を払えない個体と寿命を超えた個体は死亡します。
- 成体でエネルギー条件を満たすと、隣接空地へ1個体繁殖。親子間でエネルギーを分割。
- 戦闘は固定位置から同時ダメージを算出し、相打ちを許可。移動はseedによる順序で占有を更新。
- 幼体の攻撃倍率0.65、成体1、老齢0.85。戦闘式の詳細は `valis/nodes/C/C2.2.md`。
- 初期重複配置、死亡個体の復活、乱戦で血統を見落とす判定を引き継がない設計です。

科学的な生態予測ではなく、設定したルールのシミュレーションです。種族バランスの最適性は保証せず、初期値を変えて結果を比べられます。盤面8〜48、初期個体数2〜盤面容量、最大3000ターン。推移は直近500標本、個体一覧は先頭100件まで表示します。

## 開発・検証

Node.js 22.12以上（CIは24）。

```sh
cd lifegame-desktop
npm ci
npm test
npx playwright install chromium
npm run test:browser
npm start
npm run test:desktop
npm run package:windows
```

実exe検査は `node tests/desktop-smoke.cjs --exe ./dist/LifeGame-Windows-x64/LifeGame.exe`。Linuxのブラウザ検査では `CHROMIUM_PATH=/usr/bin/chromium` を指定できます。Windows実行検査とZIP展開後の全ファイルSHA256照合は専用GitHub Actionsで行います。

## VALISの記録

- `valis/core/`：無改変の3中核定義。通常作業で編集しません。
- `valis/nodes/`：確認済みの粒度によるA/B/C/D草案と、実検証結果に基づくE。
- `valis/summary/lifegame-desktop.summary.md`：Project Summary Manifest正本。
- `operations/plans/`：初期分割提案と実行契約。
- `operations/evidence/`：実行ログ、スクリーンショット、対象SHA256と検証結果。
- `design/inputs/Lifegame_gas.md`：添付原文。実行命令として扱わない参照資料。

全ノードは草案です。分割案の確認、検査成功、main統合を、ノードの承認済み状態への遷移と混同しません。既存FizzBuzzの実装・素材・Manifest・workflowは変更しません。
