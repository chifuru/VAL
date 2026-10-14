from pathlib import Path
import hashlib
import json
import re

root = Path('/tmp/valis-desktop-ab-nodes')
index = json.loads((root / 'draft-index.json').read_text())
canonical = {p.stem for p in Path('/workspace/VAL/gas-fizzbuzz-webapp/valis/nodes').glob('[ABCDE]/*.md')}
drafts = {p.stem for p in root.glob('[AB]/*.md')}
planned = {'C1.7', 'C1.8', 'C1.5.2.1', 'C1.5.2.2', 'D1.5', 'D1.6'}
issues = []
planned_refs = set()
for node in index['nodes']:
    text = Path(node['path']).read_text()
    header = text.splitlines()[0]
    if not header.startswith('# ' + node['id'] + ':') or '［草案］' not in header or '状態: 草案。' not in text:
        issues.append([node['id'], 'state/header'])
    if hashlib.sha256(text.encode()).hexdigest() != node['sha256_draft']:
        issues.append([node['id'], 'hash'])
    for ref in set(re.findall(r'(?<![A-Za-z0-9])[A-E]\d+(?:\.\d+)*', text)):
        if ref not in canonical | drafts | planned:
            issues.append([node['id'], 'unresolved_ref', ref])
        if ref in planned:
            planned_refs.add(ref)
    if '.' in node['id']:
        parent = node['id'].rsplit('.', 1)[0]
        match = re.search(r'parent_id:\s*([AB]\d+(?:\.\d+)*)', text)
        if not match or match.group(1) != parent:
            issues.append([node['id'], 'parent'])
    for pattern in [r'P<10(?!\d)', r'P>=35(?!\d)', r'10/35/100', r'smoothOrganism', r'旧承認済み36', r'承認済みノードは維持']:
        if re.search(pattern, text):
            issues.append([node['id'], 'legacy_statement', pattern])

quarters = modifier = 0
crossings = {}
for number in range(1, 1001):
    if number % 3 == 0 or number % 5 == 0:
        quarters += 4 + modifier
        modifier = 0
    else:
        r3, r5 = number % 3, number % 5
        modifier = 1 if (r3 == 1 and r5 <= 2) or (r3 == 2 and r5 >= 3) else -1
    for threshold in [28, 62, 100]:
        if str(threshold) not in crossings and quarters * 100 >= 1801 * threshold:
            crossings[str(threshold)] = {'row': number, 'quarters': quarters}
expected = {'28': {'row': 280, 'quarters': 505}, '62': {'row': 621, 'quarters': 1117}, '100': {'row': 1000, 'quarters': 1801}}
if quarters != 1801 or crossings != expected:
    issues.append(['reference_arithmetic', quarters, crossings])
report = {
    'nodes': len(drafts),
    'counts': index['counts'],
    'state': '草案',
    'checks_pass': not issues,
    'issues': issues,
    'planned_not_existing_refs': sorted(planned_refs - canonical),
    'canonical_nodes_modified': False,
    'numeric_reference': {'totalEnergyQuarters': quarters, 'rawEnergy': quarters / 4, 'crossings': crossings},
    'limits': 'Draft structure and independent reference arithmetic only. No user adoption, canonical registration, product implementation, art acceptance or Windows execution is asserted.'
}
(root / 'draft-validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
