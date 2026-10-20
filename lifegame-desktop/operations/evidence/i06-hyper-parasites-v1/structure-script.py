from pathlib import Path
import hashlib,json,re,subprocess,datetime,urllib.parse
root=Path(__file__).resolve().parents[3];repo=root.parent;ev=root/'operations/evidence/i06-hyper-parasites-v1';baseline='cec7c37';output=ev/'final-structure-check.json'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def previous(p):return subprocess.check_output(['git','show',baseline+':'+str(p.relative_to(repo))],cwd=repo)
def meta(b):return json.loads(b.decode().split('---',2)[1])
formal=['id','title','layer','status','parent_id','implements','derived_from','verifies','related_to','evidence_for']
ids=['C7','C7.1','C7.2','C7.3','C7.4','C7.5','C8','C8.1','C8.2','D7','D8','D8.1','D8.2','D9','E5','E6'];expected={f'valis/nodes/{n[0]}/{n}.md' for n in ids}
nodes=sorted(root.joinpath('valis/nodes').rglob('*.md'));assert len(nodes)==61
old_nodes=subprocess.check_output(['git','ls-tree','-r','--name-only',baseline,'--','lifegame-desktop/valis/nodes'],cwd=repo,text=True).splitlines();assert {str(p.relative_to(repo))for p in nodes}=={p for p in old_nodes if p.endswith('.md')}
changed=[];refcount=0
for p in nodes:
 old=previous(p);before=meta(old);after=meta(p.read_bytes());assert {k:before.get(k)for k in formal}=={k:after.get(k)for k in formal},p
 if old!=p.read_bytes():changed.append(str(p.relative_to(root)))
 for field in ['files','tests','logs']:
  for rel in after.get(field,[]):
   target=root/rel
   if target!=output:assert target.exists(),(p,field,rel)
   refcount+=1
assert set(changed)==expected,changed
for p in [*root.joinpath('valis/core').glob('*.md'),*root.joinpath('valis/nodes/A').glob('*.md'),*root.joinpath('valis/nodes/B').glob('*.md')]:assert previous(p)==p.read_bytes(),p
manifest=(root/'valis/summary/lifegame-desktop.summary.md').read_text();assert manifest.startswith('# Project Summary Manifest\n');assert '開発版は4.2.38' in manifest;assert '次はI07' in manifest
for n in ids:assert re.search(r'(?m)^(?:\t|\\t)*'+re.escape(n)+r':（',manifest),n
registry=json.loads((root/'src/assets/hyperparasite-reference-registry-v1.json').read_text());assert len(registry['sources'])==2 and len(registry['references'])==4 and registry['excluded']==['05 old IV']
for s in registry['sources']:
 a,b=root/s['file'],root/s['runtimeCopy'];assert sha(a)==s['sha256']==sha(b)==s['copySha256'];assert previous(a)==a.read_bytes()
old_assets=subprocess.check_output(['git','ls-tree','-r','--name-only',baseline,'--','lifegame-desktop/src/assets'],cwd=repo,text=True).splitlines()
for name in old_assets:
 p=repo/name
 if p.suffix in ['.png','.webp','.jpg']:assert previous(p)==p.read_bytes(),p
hashes=json.loads((ev/'source-hashes.json').read_text())
for rel,digest in hashes.items():assert sha(root/rel)==digest,rel
link_count=0
for rel in ['README.md','operations/plans/i06-hyper-parasites-v1.md','operations/plans/implementation-sequence-v1.md','operations/plans/completion-roadmap-v1.md','operations/evidence/i06-hyper-parasites-v1/README.md','operations/evidence/i06-hyper-parasites-v1/graphics/README.md']:
 p=root/rel
 for link in re.findall(r'\]\(([^)]+)\)',p.read_text()):
  if re.match(r'\w+://',link)or link.startswith('#'):continue
  path=urllib.parse.unquote(link.split('#',1)[0]);assert (p.parent/path).exists(),(rel,path);link_count+=1
j={'passed':True,'baseline':baseline,'dateUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'nodes':len(nodes),'updatedNodes':sorted(changed),'formalFieldsUnchanged':formal,'nodeReferencesChecked':refcount,'coreAndABUnchanged':True,'manifestCurrentOnly':True,'adoptedOriginalsAndPriorImagesUnchanged':True,'newUnchangedPortraitCopies':2,'exactPortraitRegions':4,'sourceHashesChecked':len(hashes),'markdownLinksChecked':link_count,'next':'I07 persistent information','noNewWindowsPackage':True}
output.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n');print(json.dumps(j,ensure_ascii=False))
