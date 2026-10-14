#!/usr/bin/env python3
"""Read-only VALIS Node/Manifest structural audit, including CI ERE reproduction.

Run with a project root argument. Prints JSON and does not alter the project.
Counts are intentionally derived from files so that registering a later E node
does not erase the original audit report or become a hard-coded failure.
"""
import collections
import json
import pathlib
import re
import subprocess
import sys

project = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/workspace/VAL/gas-fizzbuzz-webapp').resolve()
manifest_path = project / 'valis/summary/gas-fizzbuzz-webapp.summary.md'
manifest = manifest_path.read_text()
files = sorted((project / 'valis/nodes').glob('[ABCDE]/*.md'))
ids = {file.stem for file in files}
issues = []
nodes = []
for file in files:
    content = file.read_text()
    header = content.splitlines()[0]
    parsed = re.match(r'# ([A-E]\d+(?:\.\d+)*):（(.*?)\s*/\s*(.*?)）［(.*?)］', header)
    if not parsed:
        issues.append({'file': str(file.relative_to(project)), 'issue': 'invalid_header'})
        continue
    ident, sources, name, status = parsed.groups()
    nodes.append({'id': ident, 'status': status, 'file': str(file.relative_to(project))})
    if ident != file.stem or ident[0] != file.parent.name:
        issues.append({'file': str(file.relative_to(project)), 'issue': 'header_path_mismatch'})
    if status != '草案':
        issues.append({'id': ident, 'issue': 'not_draft', 'status': status})
    for reference in re.findall(r'[A-E]\d+(?:\.\d+)*', sources):
        if reference not in ids:
            issues.append({'id': ident, 'issue': 'missing_header_reference', 'reference': reference})
    if '.' in ident:
        expected = ident.rsplit('.', 1)[0]
        parent = re.search(r'parent_id:\s*([A-E]\d+(?:\.\d+)*)', content)
        if expected not in ids or not parent or parent.group(1) != expected:
            issues.append({'id': ident, 'issue': 'parent_mismatch', 'expected': expected, 'actual': parent.group(1) if parent else None})

entries = []
for entry in re.finditer(r'^([ \t]*)([A-E]\d+(?:\.\d+)*):（(.*?)）［(.*?)］', manifest, re.M):
    indent, ident, body, status = entry.groups()
    entries.append({'id': ident, 'status': status, 'line': manifest[:entry.start()].count('\n') + 1})
    if indent != '\t' * ident.count('.'):
        issues.append({'id': ident, 'issue': 'manifest_indentation', 'indent': repr(indent)})
    for reference in re.findall(r'[A-E]\d+(?:\.\d+)*', body):
        if reference not in ids:
            issues.append({'id': ident, 'issue': 'manifest_missing_header_reference', 'reference': reference})
entry_counts = collections.Counter(entry['id'] for entry in entries)
for ident in sorted(ids | set(entry_counts)):
    if ident not in ids or entry_counts[ident] != 1:
        issues.append({'id': ident, 'issue': 'manifest_registration_count', 'count': entry_counts[ident], 'file_exists': ident in ids})
statuses = {node['id']: node['status'] for node in nodes}
for entry in entries:
    if statuses.get(entry['id']) != entry['status']:
        issues.append({'id': entry['id'], 'issue': 'manifest_status_mismatch'})
node_paths = sorted(set(re.findall(r'Node File:\s*(valis/nodes/[ABCDE]/[A-E]\d+(?:\.\d+)*\.md)', manifest)))
for relative in node_paths:
    if not (project / relative).is_file():
        issues.append({'path': relative, 'issue': 'manifest_node_path_missing'})
for node in nodes:
    if node['file'] not in node_paths:
        issues.append({'id': node['id'], 'issue': 'manifest_node_path_unregistered'})

workflow = project.parent / '.github/workflows/gas-fizzbuzz-stage5.yml'
workflow_text = workflow.read_text()
match = re.search(r"if grep -E '([^']+)'", workflow_text)
ci_pattern = match.group(1) if match else None
ci_cases = []
for relative in ['gas-fizzbuzz-webapp/valis/core/VALIS Summary Manifest.md', 'gas-fizzbuzz-webapp/src/Code.gs', 'gas-fizzbuzz-webapp/design/archive/Index.pixel-legacy.html']:
    result = subprocess.run(['grep', '-E', ci_pattern], input=relative + '\n', text=True, capture_output=True) if ci_pattern else None
    ci_cases.append({'path': relative, 'matched': result.returncode == 0 if result else False, 'exit_code': result.returncode if result else None})
report = {
    'project': str(project),
    'git_head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=project, text=True).strip(),
    'node_files': len(files),
    'counts': {layer: sum(file.stem.startswith(layer) for file in files) for layer in 'ABCDE'},
    'manifest_entries': len(entries),
    'unique_registered_ids': len(entry_counts),
    'node_file_paths': len(node_paths),
    'draft_nodes': sum(node['status'] == '草案' for node in nodes),
    'structural_checks_pass': not issues,
    'structural_issues': issues,
    'ci_protected_path_pattern': ci_pattern,
    'ci_protected_path_cases': ci_cases,
    'ci_protected_path_guard_pass': all(case['matched'] for case in ci_cases),
    'limits': 'Structural checks do not attest Node meaning, historical/current-version consistency, mock fidelity, GAS execution, or test coverage. Independent protected Git-blob checks exist in tests/manifest-consistency.test.cjs.'
}
print(json.dumps(report, ensure_ascii=False, indent=2))
