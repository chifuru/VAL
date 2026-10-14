# VALIS Windowsデスクトップ配布案（分割確認前・未実装）

2026-10-14。リポジトリのsrc、tests、Node File、core、package.jsonを変更していない。調査・依存導入・packaging能力試験は /workspace/val-desktop-setup と /tmp に限定。

## 判定

Windows10/11 x64向けに、Node/npmを利用者へインストールさせず、ZIPを展開して.exeを起動する構成はElectronで実現可能。LinuxクラウドからのWindows x64パッケージ生成を実証した。今回生成したものはゲームを含まない最小capability probeであり、VALIS完成版・Windows実機動作の証明ではない。

配布物は「exe単体」ではなく、exe・DLL・resources/app.asar・locales・runtime資源・LICENSE・LICENSES.chromium.htmlをまとめたフォルダのZIP。フォルダ全体を保ち、exeをダブルクリックする。デスクトップにexeへのショートカットを置けば同じ実行ファイルを起動できる。ZIP展開後のデスクトップショートカット作成はWindows側の別検証項目とする。クラウドのNode/npmは開発・ビルド用であり、利用者の環境依存ではない。

## 利用可能環境・固定版

| 項目 | 実確認 |
|---|---|
| Host | Linux x86_64 |
| Node/npm | v24.19.0 / 11.9.0 |
| Electron | 44.7.2（npm版情報・公式ZIP内versionが一致）、MIT |
| @electron/packager | 20.3.0、BSD-2-Clause、要求Node>=22.12.0 |
| @electron/asar | 4.3.1、MIT、要求Node>=22.12.0 |
| Wine | 未導入。今回のZIP構築には不要だった |
| ツール依存 | /workspace/val-desktop-setup/tooling のpackage.json/package-lock.json、48packages。repo未変更 |
| ZIP操作 | zip/unzip・Python zipfile利用可 |

Electron公式変更記録はv23以降Windows10以上を要求する。Win10/11 x64対象を満たす一方、具体的なWindows build/GPU/端末での起動結果は実機試験が必要。32bit Windows、ARM64専用配布は今回の対象外。

## ダウンロード・crossbuildの実証

- 公式Windows ZIP: https://github.com/electron/electron/releases/download/v44.7.2/electron-v44.7.2-win32-x64.zip
- 公式hash: https://github.com/electron/electron/releases/download/v44.7.2/SHASUMS256.txt
- ZIP: 157,867,015bytes。SHA256 `10a89447ef64ac5cb9f782af48ffd83734a40ae91681259d1048ca3c9e6c5da4` が公式一覧と一致。
- curl HTTPS証明書検証を維持。`-k`、TLS検証無効化、非公式ミラーを使用していない。
- packagerの`electronZipDir`へ検証済みZIPを指定し、platform=win32、arch=x64、electronVersion=44.7.2、asar=trueで成功。
- 20.3.0のWindowsリソース編集はresedit純JS実装で、Wine/rceditを実行しなかった。過去のpackagerやelectron-builderのWine制約を今回版へ機械的に当てはめない。
- 出力exeのPE32+ Windows10 GUI/x86-64（machine0x8664）を検査。app.asarを開いてmain.cjs/index.html/package.jsonを確認。
- probe出力73files、合計384,693,783bytes。ZIP化157,939,990bytes、全entry CRC検査成功。
- probe ZIP SHA256 `bd3dd81c9c5bf427a94d914dd8ab50fba0615d827c442a2161b90bd2423d1ca0`。
- Windows exeはLinuxでは実行していない。WineもWindowsVMもない。exe生成成功を実機起動成功と扱わない。

実体:

- `/workspace/val-desktop-setup/package-probe.mjs`
- `/workspace/val-desktop-setup/probe-out/VALIS-Capability-Probe-win32-x64/`
- `/workspace/val-desktop-setup/VALIS-Capability-Probe-win32-x64.zip`
- `/workspace/val-desktop-setup/package-probe-report.json`

これらは外部能力試験の証跡で、配布するゲーム成果物ではない。

## アプリ構成案

既存の進化engineとCanvas/UIを再利用し、desktop entryを追加する。rendererはローカルHTML/CSS/JSとsrcの実画像を読む。デスクトップ配布へ現Indexの約23.9MB base64 bundleをそのまま載せる方式より、資源ファイルをapp.asarへ入れてローカル相対URLで読む構成を採る。部位ID/画像path/regions/roots/layerの純粋なruntime設定を使い、本文説明・出所台帳・テスト・Node/coreをrendererへ持ち込まない。表示原画はsrc画像とbyte一致させる。

- main process: BrowserWindow、アプリ生命周期、単一インスタンス、保存先制御、履歴入出力。
- preload: contextBridgeで型・責務を限定したloadHistory/saveRun/exportHistory等のAPI。
- renderer: engineによるFizzBuzz生成・餌energy・出生DNA・各部位成長・全相履歴・1000行較正を利用。GASへの呼出しを行わない。数理仕様は別のA/B/C改訂を確定してから実装。
- BrowserWindow: nodeIntegration=false、contextIsolation=true、sandbox=true。rendererへ任意fs/path/shell権限を渡さない。ローカル画面のみ読み込み、外部navigation/window.openを制御する。
- ネットワーク不要の実行を検査。起動後の画像、JS、フォント、計算、保存にCDN/GitHub/GASへ接続しない。自動更新は今回の能力試験に含めない。

保存先はapp.getPath('userData')の専用subdir。Windowsでは通常 `%APPDATA%/<app-name>/valis-data/` となる。コードや画像が入るapp.asar/ZIP展開フォルダへユーザー履歴を書かないため、配置変更や更新に耐えられる。配布フォルダを移すだけでは別PCへ個体履歴が移らないので、履歴エクスポート／インポートを独立機能として設計する。

履歴にはschemaVersion・runId・入力N・出生DNA・使用engine版・逐次環境/餌イベント・各相/器官状態・完走/未完走区分・時刻を保持する。結果の再演に必要な記録粒度と中断保存の扱いは、専用責務として先に確定する。原子書込（temp→rename）、前回正常版backup、破損JSON検出、version migration、エラーを利用者に伝える経路を設ける。巨大なCanvas/dataURIを個体ごとに保存せず、固定資産参照＋状態から復元する案。

## Crossbuildの残課題

1. 今回はnative addonなしのJS probeなので成功した。SQLite等のnative addonを導入するならWindows/Electron ABI向けrebuildとWindows runnerを別途必要とし得る。まずNode fsによるversioned JSON保存で外部native addon依存を避ける。
2. ZIP配布生成にはWine不要。単一self-extracting portable.exe/NSIS installerを別途求める場合は、builder/NSIS/signing等の追加検証が必要で、今回のZIP成功から断定しない。
3. ElectronのMIT LICENSEとChromium/ffmpeg等のthird-party noticesを配布に残す。packagerの開発ツールライセンスと実配布ランタイムのライセンスを区別する。
4. probeはunsigned。署名・Windowsダウンロード後の起動表示・組織ポリシーは未確認。任意Win10/11で警告なく一回クリック起動できると現時点では保証できない。署名付き配布を行う場合は証明書/署名方式が別の配布工程になる。
5. 大きさはprobeだけでもZIP約158MB、展開約385MB。実画像を同梱すれば増える。完成版の起動時間/メモリ/GPU/FPSと一緒に実測する。

## D層責務案（Node Fileは未作成）

既存A/B/Cの分割案と合わせて確認する。A/B/C/Dを同数へ揃えず、検証責務で以下を区別する。

- 既存D1.1: ローカル計算でも1..NのFizzBuzz原文/順序/件数/不正入力の契約を維持する。
- 既存D1.2: 新energy/出生DNA/全部位成長/1000行較正の数理境界と決定性を改訂。UI再生速度から独立して通常/スキップ/低モーションの同値を検査する。
- 既存D1.3.1: desktopの編集コード・runtime資産設定・package内資源がsourceと一致することを加える。GAS版の同期結果とは別に対象hashを記録する。
- 既存D1.3.2: モック全身形状・部位の造形/接続/Alpha・実file読込・成長Lv・全相継承を継続。
- 既存D1.3.3: desktop rendererの通常完走/停止/再開/skip/reset/入力/履歴UI/低モーション/キーボード等を継続。今回発見した既存操作欠陥を回帰項目として含める。
- 新D1.5候補「Windows配布・実機起動検証」: win32-x64 PEと全資源/ライセンス/画像hash/依存なし/ZIP CRC/desktop shortcut、Win10とWin11でcold start/ネット切断/GAS不要/Node未導入/標準権限/日本語path/空白path/DPI100,125,150%/実GPU・FPSを検査。静的crossbuildと実機ゲートを同じ計画内で別結果として保持する。GASのD1.4は既存の別責務。
- 新D1.6候補「個体履歴の永続化・復旧検証」: save→process完全終了→relaunchのDNA/全相/器官/ログ一致、重複save防止、複数個体の履歴区別、途中保存方針、JSON破損/書込失敗/旧schema移行、原子書込中断時の前回正常版保持、import/exportと境界検証。package更新/フォルダ移動後に保存が失われないことを含む。

D1.5とD1.6はそれぞれ変更単位と証跡実体が異なるため新しい独立責務候補。親子を機械的に増やさず、必要になった細分化だけ追加する。ここでEノードを作成したり、VALISゲーム本体のWindows検証成功を記録したりしない。

## 合格を主張できる段階

1. 能力試験済み: 公式ZIPの取得/hash、Linuxからwin32-x64実パッケージ作成、PE/asar/ZIP整合。今回到達。
2. 本体統合検証: Windows版資源・ローカル計算・育成契約・履歴永続化・renderer操作を実装後にNode/Chromium/Electron Linux補助検証。未実施。
3. Windows実機検証: Win10/11の実exe・offline起動・全操作・再起動保存・性能・desktop shortcut・配布後起動表示。未実施。Windows runnerのGUI自動化は補助にできるが実端末の視覚受入/FPSを代替しない。

版とhash・環境・実操作・未実施項目を分けてE証跡とManifestへ接続する。草案状態を勝手に承認済みへ変えない。

## 参照

- Electron手動配布: https://github.com/electron/electron/blob/main/docs/tutorial/application-distribution.md
- Windows最低OS変更: https://github.com/electron/electron/blob/main/docs/breaking-changes.md （Windows7/8/8.1削除節）
- app.userData: https://github.com/electron/electron/blob/main/docs/api/app.md#appgetpathname
- 署名: https://github.com/electron/electron/blob/main/docs/tutorial/code-signing.md
- packager20.3.0実装: 外部tooling/node_modules/@electron/packager/dist/win32.js・resedit.js
