"""Reconcile I10 implementation, existing Nodes, retained sources and current index."""
from pathlib import Path
import datetime
import hashlib
import json
import re
import subprocess
import urllib.parse

root = Path(__file__).resolve().parents[3]
repo = root.parent
evidence = root / 'operations/evidence/i10-rendering-materials-v1'
baseline = 'a196f8b'
output = evidence / 'final-structure-check.json'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()

def previous(p):
    return subprocess.check_output(['git', 'show', baseline + ':' + str(p.relative_to(repo))], cwd=repo)

def metadata(data):
    return json.loads(data.decode().split('---', 2)[1])

formal = ['id', 'title', 'layer', 'status', 'parent_id', 'implements', 'derived_from', 'verifies', 'related_to', 'evidence_for']
ids = ['C8', 'C8.1', 'D9', 'E6']
expected = {f'valis/nodes/{n[0]}/{n}.md' for n in ids}
nodes = sorted(root.joinpath('valis/nodes').rglob('*.md'))
old_nodes = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', baseline, '--', 'lifegame-desktop/valis/nodes'], cwd=repo, text=True).splitlines()
assert len(nodes) == 61
assert {str(p.relative_to(repo)) for p in nodes} == {p for p in old_nodes if p.endswith('.md')}
changed = []
references = 0
for p in nodes:
    old = previous(p)
    before, after = metadata(old), metadata(p.read_bytes())
    assert {k: before.get(k) for k in formal} == {k: after.get(k) for k in formal}, p
    if old != p.read_bytes():
        changed.append(str(p.relative_to(root)))
    for field in ['files', 'tests', 'logs']:
        for relative in after.get(field, []):
            if root / relative != output:
                assert (root / relative).exists(), (p, field, relative)
            references += 1
assert set(changed) == expected, changed

for p in [*root.joinpath('valis/core').glob('*.md'), *root.joinpath('valis/nodes/A').glob('*.md'), *root.joinpath('valis/nodes/B').glob('*.md')]:
    assert previous(p) == p.read_bytes(), p

manifest = (root / 'valis/summary/lifegame-desktop.summary.md').read_text()
assert manifest.startswith('# Project Summary Manifest\n')
assert '開発版は4.2.42' in manifest and '次はI11' in manifest
manifest_ids = re.findall(r'(?m)^\t*([A-E]\d+(?:\.\d+)*):（', manifest)
assert len(manifest_ids) == len(set(manifest_ids)) == len(nodes)
assert set(manifest_ids) == {metadata(p.read_bytes())['id'] for p in nodes}
assert not re.search(r'(?m)^#{1,6} .*?(?:更新履歴|変更履歴|過去履歴)', manifest)
for n in ids:
    assert re.search(r'(?m)^(?:\t|\\t)*' + re.escape(n) + r':（', manifest), n

old_assets = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', baseline, '--', 'lifegame-desktop/src/assets'], cwd=repo, text=True).splitlines()
retained_images = 0
for name in old_assets:
    p = repo / name
    if p.suffix.lower() in ['.png', '.webp', '.jpg']:
        assert previous(p) == p.read_bytes(), p
        retained_images += 1
adopted = root / 'design/appearance-baseline-v1'
for p in adopted.iterdir():
    if p.is_file():
        assert previous(p) == p.read_bytes(), p

biological_sources = ['map-data', 'map-templates', 'landscape', 'hash', 'catalogue', 'state', 'nutrition', 'behavior', 'reproduction', 'parasites', 'engine', 'observation-modules', 'observation-model', 'observations', 'archive', 'replay-version']
for name in biological_sources:
    p = root / ('src/ecology/' + name + '.js')
    assert previous(p) == p.read_bytes(), p

hashes = json.loads((evidence / 'source-hashes.json').read_text())
for relative, digest in hashes.items():
    assert sha(root / relative) == digest, relative
links = 0
for relative in ['README.md', 'operations/plans/i10-rendering-materials-v1.md', 'operations/plans/implementation-sequence-v1.md', 'operations/plans/completion-roadmap-v1.md', 'operations/evidence/i10-rendering-materials-v1/README.md']:
    p = root / relative
    for link in re.findall(r'\]\(([^)]+)\)', p.read_text()):
        if re.match(r'\w+://', link) or link.startswith('#'):
            continue
        target = p.parent / urllib.parse.unquote(link.split('#', 1)[0])
        if target != output:
            assert target.exists(), (relative, link)
        links += 1

result = dict(passed=True, baseline=baseline, dateUTC=datetime.datetime.now(datetime.timezone.utc).isoformat(), nodes=len(nodes), updatedNodes=sorted(changed), formalFieldsUnchanged=formal, nodeReferencesChecked=references, coreAndABUnchanged=True, manifestCurrentOnly=True, adoptedOriginalsAndPriorImagesUnchanged=True, retainedRuntimeImages=retained_images, biologicalSourcesUnchanged=biological_sources, sourceHashesChecked=len(hashes), markdownLinksChecked=links, next='I11 survival/emergence/performance', noNewWindowsPackage=True)
output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(result, ensure_ascii=False))
