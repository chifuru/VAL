# VALIS Node / Manifest / documentation audit

Audit baseline: `b93e6c4158e344fa745ea87d9ea1815356b5c644`. Read-only repository review; no repository files modified by this audit agent.

## Verdict

56 Node Files are structurally consistent, but the canonical Node meanings and the Manifest's structural index contain superseded implementations presented as current. README does not describe the current release. Successful structural tests do not establish semantic consistency or mock conformity.

## Structural checks

- Actual count: A7 / B9 / C13 / D8 / E19 = 56.
- All Node headers and Manifest entries are draft, and their states match.
- All 56 IDs are registered exactly once; all 56 Node File paths exist.
- Same-layer parent_id values match ID hierarchy.
- Header references resolve to existing Node IDs; Manifest indentation matches ID hierarchy.
- Existing responsibilities C1.5.1 (bundle generation), C1.5.2 (assets), C1.5.3 (UI) and independent D responsibilities are retained. Layers are not mechanically assigned identical counts.

Reproduction: `python /tmp/valis-node-manifest-structure-audit.py /workspace/VAL/gas-fizzbuzz-webapp`. The report derives counts so a subsequent E20 registration is distinguishable from the original 56-node snapshot.

## Findings

### 1. Current Manifest structural index describes old versions

- `valis/summary/gas-fizzbuzz-webapp.summary.md:284`: C1.5 logic names removed smoothOrganism, Bezier rendering, and old 32-grid fallback.
- `valis/summary/gas-fizzbuzz-webapp.summary.md:294`: C1.5.1 current implementation is indexed using old blob 6199ddba and old HEAD 224802aa.
- `valis/summary/gas-fizzbuzz-webapp.summary.md:302`: C1.5.2 says the old 12 lineages use 36 provisional SVGs and reports 104 decoded images. Current use is 12 PNG atlases and 56 embedded source images, with provisional SVGs archived and excluded.
- `valis/summary/gas-fizzbuzz-webapp.summary.md:368`: D1.3.2 says original PNG SHA/alpha/old 12 organs are unexecuted, whereas later atlas-specific checks were recorded.
- Latest lines 655-657 accurately describe the current layout and limits, but do not repair the contradictory structural reading route. A later FLOW following the index will encounter outdated logic and implementation status.

### 2. Canonical C / D text mixes current definitions with superseded contracts and paths

- `valis/nodes/C/C1.3.md:6`, `:13`, `:15`: state/nextLine/showFinalResult/presentFinal/setMode result, reduced-motion immediate final display, result panel/log toggle/retry are defined as present behavior. Current `src/composite/app.js:141` finish merely stops, marks complete, updates notice/UI, and renders. Functional semantics need a separate decision; this is more than renaming old functions.
- `valis/nodes/C/C1.4.3.md:3-6`: appearanceFor/stepGrowth/branchFor/growthFor/branches and DNA-derived fish/terrestrial/space selection are retained. Current engine uses chooseLineage/step/history with neutral phases and environmental branching. New appendices do not formally replace the opening definition.
- `valis/nodes/C/C1.5.md:6-15`: sprite/pixel/block/renderScene and old final-creature Canvas are described as the actual rendering implementation; current rendering composites PNG images.
- `valis/nodes/C/C1.5.1.md:5`: distribution path src/Index.composite-v4.html no longer exists. Line 39 names missing src/assets/organs/ledger.json. Last line 43 has the updated preview placement, so the same Node offers competing current locations.
- `valis/nodes/D/D1.3.1.md:5`, `:8`: obsolete src preview path and old complete-portrait-only behavior remain validation targets; no current-plan update covers replacement by the common body plus organs.

Explicit historical E14/E15 versions, old SHA references tied to those versions, and documents clearly marked as history are not classified as false merely because they are old.

### 3. Accumulated history conflicts with Summary core placement rules

Rules actually read:

- `valis/core/VALIS Summary Manifest.md:789-796`: summary excludes detailed specification, implementation, history, discussion log, and redundant explanation.
- Same file `:837-845`: histories belong to Git; Node bodies do not retain change/discussion/work history.
- Same file `:1678-1681`: Manifest is not a work log and retains minimal structural summaries needed for subsequent decisions.

The 665-line Project Manifest accumulates chronological v3/v4/stage/diff entries; C Nodes accumulate approvals and prototype deltas. This obscures the current definition. Preserve records in Git/operations/design and retain current meaning, constraints, state reasons, and actionable flags in the Node/Manifest.

`tests/manifest-consistency.test.cjs:93-94` additionally requires historical phrases 36 approved / 16 draft to remain inside the current Manifest. Moving history to its proper record location requires changing these checks to read that historical evidence. This audit does not implement that correction.

### 4. README is misleading as a current implementation guide

`README.md`:

- Lines 5/10: work branch, main not yet merged, and missing src/composite/README.md.
- Line 17: runtime remains unsynchronized v4.1.
- Line 24: obsolete src legacy-HTML path.
- Lines 27/29: old 24 whole-body portraits and 68 embedded sources presented as current.
- Line 44: original PNGs not stored on GitHub.
- Line 196: missing result-screen/log-toggle/retry behavior and obsolete 64-grid renderer.
- Line 210: client test count 71.
- Line 232: 36 Nodes approved and only new E6 draft; directly contradicts 56 drafts.

design/docs documents explicitly mark the following old layouts as history, reducing the risk compared with README. If used as the current onboarding guide, they still need a concise current layout/operation section.

## CI protected-path verification

The script extracts the literal pattern from `.github/workflows/gas-fizzbuzz-stage5.yml:29` and passes it to actual grep -E subprocesses. Core, Code.gs, and legacy HTML paths all match correctly. The protected-path regex passes this check. Independent Git-blob checks in `tests/manifest-consistency.test.cjs:78-87` additionally protect core3, Code.gs, and legacy HTML.

Correction: an earlier preliminary note mistook JSON-escaped backslashes for doubled backslashes in the file and tested a synthesized Python pattern. That preliminary CI defect finding is withdrawn; the literal workflow/grep reproduction is the authoritative result.

## Read scope

Summary core sections 5.1-5.3, 5.6-6.2, 12.1-12.5, initial-registration fields, 12.6, 12.11-12.12; entire Project Manifest; all 13 C Node Files; other-layer headers and parent/reference fields; related D1.3.1/D1.3.2/E19 text; entire README; design/docs and mockups README; Manifest-consistency test and CI workflow; related engine/app/template/build code for implementation correspondence.

## Pending

Meaning corrections, history relocation, README rewrite, and obsolete contractual behavior decisions remain unresolved. Recording E20 and its audit status must not be described as repairing these findings.
