# Windows 3.1 配布・起動確認

対象: `e4bc93c70cf1b65acb360ed5fb8f0b7d2b0d4b4b` / app3.1.0。実行主体: GitHub Actions Windows Server 2025 x64、Node24.21.0、Electron44.7.2、Chromium141.0.7390.37。

[CI](https://github.com/chifuru/VAL/actions/runs/39037759310) / [配布Artifact](https://github.com/chifuru/VAL/actions/runs/39037759310/artifacts/12102877646)。期限: 2026-11-16T13:48:22Z。Artifactsの外側ZIPと内包するLifeGame-Windows-x64.zipを両方展開し、DLL・resources・localesを残してLifeGame.exeを起動する。

単体・構造・回帰99件、ブラウザ操作46項目が成功。Windows x64 ZIP生成後に全展開ファイルのSHA256を照合し、展開したLifeGame.exeのローカルfile画面で10ターン・804体・原画読込成功・Node非公開・終了コード0を確認した。背景11素材を含む21シートの読込は同対象版のブラウザ検査と実exeのassetsLoaded=true/assetErrors=[]で確認した。

内包製品ZIP SHA256: `a2ff7f4adb3bb44a53c2a1033a19281ce50a80e44a36aec9f1f4d9b7be64cdb8`。GitHub Artifact外側アーカイブのdigestとは別物。

詳細はwindows.json、CIログの対象結果抜粋はwindows-ci-excerpt.log、実行対象の照合はsource-hashes.json。今回このLinux環境で239MBのArtifactを再ダウンロード・展開したとは扱わず、Windowsジョブの展開照合と実exe実行結果を受領した。

限界: 利用者PCの速度、Windows上の近景の目視比較、長期生存バランス、モックとの完全一致・外観承認は未確認。Linuxの背景比較・遠近景検査は別証跡habitat-visual-v3.1を参照する。

FLOW-08→FLOW-05実行契約: 既存D4計画とC4実装に対するCI結果を既存E7へ受領し、C4/D4/E7と現在Manifestへ反映する。A/B・製品コード・検査コード・中核定義・59ノードのID/階層/草案状態は変更しない。期待結果はD4のローカル起動・複数ターン・Node非公開・終了0。失敗条件は資産欠落・ハッシュ不一致・例外・起動/進行不可。反例は別版の結果の誤適用。版・実装・依存・起動方式・検査期待値が一致する範囲で有効、変更時は再検証。次は利用者環境での外観・操作感確認。
