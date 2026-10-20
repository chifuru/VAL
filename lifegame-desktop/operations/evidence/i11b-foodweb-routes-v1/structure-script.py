"""Reconcile this limited I11b change with existing Nodes and retained material."""
from pathlib import Path
import datetime
import hashlib
import json
import re
import subprocess
import urllib.parse

root = Path(__file__).resolve().parents[3]
repo = root.parent
evidence = Path(__file__).resolve().parent
baseline = '1b248aa'
output = evidence / 'final-structure-check.json'
formal = ['id', 'title', 'layer', 'status', 'parent_id', 'implements', 'derived_from', 'verifies', 'related_to', 'evidence_for']
expected_ids = ['C7', 'C7.1', 'C7.2', 'C7.3', 'C7.4', 'C7.5', 'C8', 'C8.1', 'C8.2', 'D7', 'D8', 'D8.1', 'D8.2', 'D9', 'E5', 'E6']
expected = {f'valis/nodes/{n[0]}/{n}.md' for n in expected_ids}
previous = lambda p: subprocess.check_output(['git', 'show', baseline + ':' + str(p.relative_to(repo))], cwd=repo)
metadata = lambda data: json.loads(data.decode().split('---', 2)[1])
nodes = sorted(root.joinpath('valis/nodes').rglob('*.md'))
old = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', baseline, '--', 'lifegame-desktop/valis/nodes'], cwd=repo, text=True).splitlines()
assert len(nodes) == 61
assert {str(p.relative_to(repo)) for p in nodes} == {p for p in old if p.endswith('.md')}
changed, references = [], 0
for p in nodes:
    before, after = metadata(previous(p)), metadata(p.read_bytes())
    assert {k: before.get(k) for k in formal} == {k: after.get(k) for k in formal}, p
    if previous(p) != p.read_bytes():
        changed.append(str(p.relative_to(root)))
    for field in ['files', 'tests', 'logs']:
        for relative in after.get(field, []):
            assert root / relative == output or (root / relative).exists(), (p, field, relative)
            references += 1
assert set(changed) == expected, changed
retained = ['valis/core', 'valis/nodes/A', 'valis/nodes/B', 'design', 'src/assets', 'src/styles.css', 'src/ecology/art.js', 'src/ecology/scenery.js']
for name in retained:
    subprocess.run(['git', 'diff', '--exit-code', baseline, '--', str((root / name).relative_to(repo))], cwd=repo, check=True, stdout=subprocess.DEVNULL)
manifest = (root / 'valis/summary/lifegame-desktop.summary.md').read_text()
assert manifest.startswith('# Project Summary Manifest\n') and '開発版は4.2.44' in manifest and 'I11継続' in manifest
matches = re.findall(r'(?m)^(\t*)([A-E]\d+(?:\.\d+)*):（', manifest)
assert len(matches) == len({n for _, n in matches}) == len(nodes)
assert {n for _, n in matches} == {metadata(p.read_bytes())['id'] for p in nodes}
assert all(len(tabs) == node.count('.') for tabs, node in matches)
assert not re.search(r'(?m)^#{1,6} .*?(?:更新履歴|変更履歴|過去履歴)', manifest)
for relative, digest in json.loads((evidence / 'source-hashes.json').read_text()).items():
    assert hashlib.sha256((root / relative).read_bytes()).hexdigest() == digest, relative
signature = re.search(r'EcoReplayVersion = "([a-f0-9]{64})"', (root / 'src/ecology/replay-version.js').read_text()).group(1)
assert f"foodwebBuildSignature='{signature}'" in (root / 'src/ecology/archive.js').read_text()
assert json.loads((root / 'package.json').read_text())['version'] == '4.2.44'
links = 0
for relative in ['README.md', 'operations/plans/i11b-foodweb-routes-v1.md', 'operations/plans/i11-evaluation-matrix-v1.md', 'operations/plans/implementation-sequence-v1.md', 'operations/plans/completion-roadmap-v1.md', 'operations/evidence/i11b-foodweb-routes-v1/README.md']:
    p = root / relative
    for link in re.findall(r'\]\(([^)]+)\)', p.read_text()):
        if re.match(r'\w+://', link) or link.startswith('#'):
            continue
        assert (p.parent / urllib.parse.unquote(link.split('#', 1)[0])).exists(), (relative, link)
        links += 1
result = dict(passed=True, baseline=baseline, version='4.2.44', biologicalSignature=signature,
              dateUTC=datetime.datetime.now(datetime.timezone.utc).isoformat(), nodes=61,
              updatedNodes=sorted(changed), unchangedFormalFields=formal, nodeReferencesChecked=references,
              unchangedMaterialAndDefinitionPaths=retained, manifestCurrentOnly=True, markdownLinksChecked=links,
              noNewWindowsPackage=True, next='Continue I11: remaining lineage and P/Q routes, R1-R6, performance')
output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(result, ensure_ascii=False))
