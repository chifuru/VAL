from PIL import Image, ImageFilter, ImageOps, ImageDraw
import numpy as np,cv2,os,hashlib,json
from pathlib import Path
base=Path('/mnt/data')
assets={
  'abyss':('/mnt/data/aaf4d324-1275-47b3-8408-eb0fdc4d613f(1).png',[(806,833,891,885),(902,819,1012,886),(1027,806,1152,886)]),
  'myth':('/mnt/data/fde20a45-7cc1-4cf3-a06b-4911b0eed716(1).png',[(155,615,335,679),(372,611,553,680),(585,610,789,678)])
}
out=base/'mock-stage7-parts';out.mkdir(exist_ok=True)
ledger=[]
for lineage,(file,boxes) in assets.items():
 image=Image.open(file).convert('RGB')
 for lv,bb in enumerate(boxes,1):
  arr=np.array(image.crop(bb)).astype(np.uint8)
  hsv=cv2.cvtColor(arr,cv2.COLOR_RGB2HSV)
  lum=np.max(arr,axis=2).astype(float)
  # keep bright/colored foreground; remove deep navy background/boxed plate
  # bright blue cyan border is knocked out by excluding outside 2 pixels.
  col=(np.max(arr,axis=2).astype(int)-np.min(arr,axis=2).astype(int))
  value=lum
  # colored/bright sprite pixels, dark board mostly removed
  raw=((value>83)&((col>23)|(value>160))).astype('uint8')
  raw[:2]=0;raw[-2:]=0;raw[:,:2]=0;raw[:,-2:]=0
  n,lab,stats,cents=cv2.connectedComponentsWithStats(raw,8)
  kept=np.zeros_like(raw)
  if n>1:
   # keep all lit clusters large enough: wing highlights may be detached
   for k in range(1,n):
    if stats[k,cv2.CC_STAT_AREA]>=7:
     kept[lab==k]=1
  kept=cv2.morphologyEx(kept,cv2.MORPH_CLOSE,np.ones((2,2),np.uint8))
  alpha=cv2.GaussianBlur(kept.astype('float32'),(3,3),.6)
  # Preserve original pixels, mask black/cyan matte
  rgba=np.concatenate([arr,(alpha*255).clip(0,255).astype('uint8')[:,:,None]],axis=2)
  im=Image.fromarray(rgba,'RGBA')
  # keep native pixel art. Resize to 128px canvas max width using nearest neighbor
  if im.width>100:
   scale=100/im.width
   im=im.resize((100,max(1,round(im.height*scale))),Image.Resampling.NEAREST)
  # palette-reduce RGB while retaining variable alpha
  pix=np.array(im); rgb=Image.fromarray(pix[:,:,:3],'RGB').quantize(colors=40,dither=Image.Dither.NONE).convert('RGB')
  pix[:,:,:3]=np.array(rgb)
  im=Image.fromarray(pix,'RGBA')
  path=out/f'{lineage}-heritage-lv{lv}.png'
  im.save(path,optimize=True,compress_level=9)
  data=path.read_bytes()
  ledger.append({'lineage':lineage,'level':lv,'path':path.name,'source':os.path.basename(file),'source_sha256':hashlib.sha256(Path(file).read_bytes()).hexdigest(),'crop_px':bb,'image_px':im.size,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'alpha_coverage':round(float((np.array(im)[:,:,3]>32).mean()),3)})
  print(path.name,len(data),im.size,ledger[-1]['alpha_coverage'])
# contact sheet checkerboard
canvas=Image.new('RGB',(520,500),'#121d30');d=ImageDraw.Draw(canvas)
for i,row in enumerate(ledger):
 im=Image.open(out/row['path']).convert('RGBA')
 x=(i%3)*172+20;y=(i//3)*220+42
 for xx in range(x,x+140,12):
  for yy in range(y,y+125,12):
   d.rectangle((xx,yy,xx+11,yy+11),fill='#22374b' if((xx-x)//12+(yy-y)//12)%2 else '#32405a')
 im.thumbnail((138,120))
 canvas.paste(im,(x,y),im)
 d.text((x,y-21),row['path'],fill='#fff')
canvas.save('/mnt/data/mock-stage7-preview.png')
(out/'ledger.json').write_text(json.dumps(ledger,ensure_ascii=False,indent=2),encoding='utf8')
