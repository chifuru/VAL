# Hello VALIS — デザイン適用契約
主FLOW: FLOW-05。ユーザーの「この内容を各ファイルに適用」に基づく世界観・インタラクションの実装反映。
対象: A1/B1/C1/D1/E1、src、tests、README、Project Summary Manifest。
変更禁止: valis/core/ の3中核定義。全ノードは草案を維持。
配置: VAL/hello-valis/。文書内の参照はこのプロジェクトルートからの相対パス。
正本: valis/summary/hello-valis.summary.md。

## 実装条件
電子空間に知性が宿るような静謐な生態系。回路と細胞の中間の粒子。
Hello, VALISの文言と可読性を維持し、出現・同調・侵食・交信・再構成の姿を変える。
クリックに即時反応し、状態依存のランダム挙動と3秒の無操作後の一度だけの返答を実装。
停止、初期化、モバイル、キーボード、reduced-motion、オブジェクト上限を設ける。
外部アセット、音、永続保存、実AI接続なし。

## 確認
node tests/hello-valis.test.cjs: GAS配信スタブ・HTML関連付け・構文。
node tests/state.test.cjs: 状態遷移・遅延・上限・停止・初期化。
npm run test:browser: Chromiumで実インタラクションと画面幅を確認（今回Chromium未配置のため未実施）。
GAS実行と閲覧制限確認はユーザー担当。実施済みとは報告しない。
現在の検証対応はD1/D2/D3、取得済みスタブ結果はE1/E2を正とする。

## GASへの導入（ユーザー実施）
1. 新規GASプロジェクトのCode.gsにsrc/Code.gsをコピー。
2. HTMLファイルをIndexとして追加し、src/Index.htmlをコピー。
3. 保存し、テストデプロイで表示、クリック、3秒後の応答、90秒前後の文字変化、停止・リセットを確認。
4. 限定メンバー向けのアクセス制御をGAS側で設定し、許可外アカウント・未ログインで拒否されることを確認。
5. Webアプリ公開版へ適用する場合、更新したバージョンでデプロイを更新する。
資料: https://developers.google.com/apps-script/guides/html
資料: https://developers.google.com/apps-script/guides/web

## 終了条件
実装・資料・テスト・証跡・Manifestが整合し、ユーザー承認済みのGitHubコミットに含まれること。
GitHub先端が変わった場合は上書きせず差分を確認。GAS作成・共有・デプロイは行わない。

## 現在の作業単位：最小ノード分割
ユーザー指示: 最小限必要な程度に分割。FLOW-05で反映。
作成: B2/C2/D2/D3/E2。
更新: B1/C1/D1/E1、Project Summary Manifest、README、この計画。
維持: A1、3中核定義、src、tests、package.json。
機能・配信境界・実行環境が独立する単位を兄弟として分割。停止・初期化は生態系と文字に共通する制御としてB1/B2接続条件に記載し、独立ノードは増やさない。
既存結果を対象ハッシュ照合のうえE1/E2へ移管。新規テスト・再実行は行わない。
Chromium起動不能の事実はD2に残し、GAS未実施はD3に残す。未実施の成功証跡は作らない。
終了条件: 10ノードの参照先が存在し、各新規ノードが初期登録され、既存責務と証跡がManifestに反映されること。
