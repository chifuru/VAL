#!/usr/bin/env python3
"""Extract only pinned Git dependencies; does not simulate or edit the worktree."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

here = Path(__file__).resolve().parent
if len(sys.argv) != 2:
    raise SystemExit("python prepare-baseline.py /tmp/i11c-lower-baseline")
manifest = json.loads((here / "baseline-dependencies.json").read_text())
repo = subprocess.check_output(["git", "rev-parse", "--show-toplevel"], cwd=here, text=True).strip()
target = Path(sys.argv[1]).resolve()
for name, sha in manifest["files"].items():
    data = subprocess.check_output(["git", "-C", repo, "show", manifest["baselineCommit"] + ":" + name])
    if hashlib.sha256(data).hexdigest() != sha:
        raise SystemExit("Git dependency changed: " + name)
    output = target / name
    if output.exists():
        if hashlib.sha256(output.read_bytes()).hexdigest() != sha:
            raise SystemExit("Existing output differs; choose an empty directory: " + str(output))
        continue
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(data)
print(json.dumps({"status": "prepared-source-only-no-simulation", "commit": manifest["baselineCommit"], "files": len(manifest["files"]), "root": str(target / "lifegame-desktop")}))
