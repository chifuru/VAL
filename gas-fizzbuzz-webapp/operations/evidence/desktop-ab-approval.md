# desktop A/B採用承認とNode/Manifest反映

## 採用と状態決定

- 明示回答: ユーザー「この仕様・分割を承認して進める」。採用正案はoperations/plans/2026-10-14-desktop-migration.md。対象はA/B20件の具体本文版と新規10件の責務分割。
- FLOW-09判定: 対象A/B20の草案→承認済みを確定。許可条件は明示採用、具体版の識別SHA、必要な確認根拠（定義と要件対応）、core/層/参照/粒度/残存フラグ確認。
- FLOW-05正式反映: Git保存された本文案のSHAを照合し、見出しの［草案］と実態の「状態: 草案。」の2箇所だけ承認済みへ変更。本文意味はexact採用版のまま。各承認後SHAはdesktop-ab-approval/reflection.json。
- A/B承認は仕様/機能の生成基準の受入。部位係数完成、製品実装成功、PNG美術受入、Windows10/11実機検証の承認ではない。C/D/Eは草案を維持。

## 原文保全と現在定義

- 反映前A/B/C/D本文とProject Manifestはoperations/archive/pre-desktop-valis/valis/へbyte保存。元パス/保存パス/SHAと反映前commitは同archive/index.json。Gitの過去履歴も維持。
- 現在唯一正はvalis/nodesとvalis/summary。保存コピーやPlan原稿を正本にしない。
- C17/D10はdesktopの現在責務/予定src/検証条件へ整理し、旧GAS/Canvas工程の変更ログを現在本文へ累積しない。係数や画像接続の具体化待ちは処理フラグとして明示。
- E1〜E20の対象版と本文は本反映で変更しない。旧Eをdesktop成功へ読み替えない。

## 初期登録とManifest反映

- 新規初期登録10件: A1.7/A1.8/B1.7/B1.8/C1.7/C1.8/C1.5.2.1/C1.5.2.2/D1.5/D1.6。
- 既存反映: A/B16件の現在契約、採用したA/B20件の承認状態、C13/D8のdesktop責務/src/tests対応、親子/層間参照/読み込み経路、実装と検証の残存課題。
- Project Manifestは現在の短い構造索引へ再構成。全67件（A9/B11/C17/D10/E20）、承認済み20/草案47。core3・src/tests/tools/packageの変更はこのNode反映担当では行わない。

## 実読したcore

Operation §32.1-32.7（粒度/親子/層間/反映）、§2.18.5（承認ゲート）。Flow §13.5-13.7.1（状態/草案→承認）、§13.15（決定と正式反映）。Summary §12.1-12.6（現在唯一正/履歴分離/初期登録/Node記録）、§12.11-12.12（src/tests接続/反映）。採用PlanとGit保存されたA/B具体本文20件を照合した。

## 未実施と次の作業

この記録は定義採用と構造反映の結果であり、移行製品の成功Eではない。現在C/Dの条件に従ってsrc/画像/配布/実run保存を具体化し、実行後だけ新Eを登録する。Windows実機を実行できなければ未確認を維持する。
