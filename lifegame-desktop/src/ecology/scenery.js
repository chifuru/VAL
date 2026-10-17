/* Paint-only world materials. All geography comes from the settled tile map. */
(function(root){
  'use strict';
  const palette=['#326c65','#563c30','#493c5b','#657449','#a5b9b2','#477036','#ac9866','#4a4537'];
  function paint(w,art){
    const unit=w.config.width<=80?48:24,c=document.createElement('canvas');
    c.width=w.config.width*unit;c.height=w.config.height*unit;const g=c.getContext('2d'),im=art.images.ground;
    const width=w.config.width,height=w.config.height,isWater=t=>["shallow","deep"].includes(t.terrain);
    const envs=w.tiles.map((t,p)=>{
      if(!isWater(t))return t.env===3&&t.terrain!=="rock"?5:t.env;
      const x=p%width,y=Math.floor(p/width);
      const near=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>w.tiles[Math.max(0,Math.min(height-1,y+dy))*width+Math.max(0,Math.min(width-1,x+dx))]).find(t=>!isWater(t));
      return near?(near.env===3&&near.terrain!=="rock"?5:near.env):5;
    });
    if(im){
      const source=document.createElement('canvas');source.width=im.width;source.height=im.height;const sg=source.getContext('2d');sg.drawImage(im,0,0);
      const src=sg.getImageData(0,0,im.width,im.height).data,dst=g.createImageData(c.width,c.height),W=im.width/4,H=im.height/2,
        envAt=(x,y)=>envs[Math.max(0,Math.min(height-1,y))*width+Math.max(0,Math.min(width-1,x))];
      for(let py=0;py<c.height;py++){
        const fy=(py+.5)/unit-.5,iy=Math.floor(fy),dy=fy-iy,sy=Math.min(H-1,Math.floor((1-Math.abs((py/(unit*6)%2)-1))*H));
        for(let px=0;px<c.width;px++){
          const fx=(px+.5)/unit-.5,ix=Math.floor(fx),dx=fx-ix,sx=Math.min(W-1,Math.floor((1-Math.abs((px/(unit*6)%2)-1))*W)),
            kinds=[envAt(ix,iy),envAt(ix+1,iy),envAt(ix,iy+1),envAt(ix+1,iy+1)],weights=[(1-dx)*(1-dy),dx*(1-dy),(1-dx)*dy,dx*dy],k=(py*c.width+px)*4;
          for(let i=0;i<4;i++){
            const e=kinds[i],q=((Math.floor(e/4)*H+sy)*im.width+(e%4)*W+sx)*4;
            for(let ch=0;ch<3;ch++)dst.data[k+ch]+=src[q+ch]*weights[i];
          }
          dst.data[k+3]=255;
        }
      }
      g.putImageData(dst,0,0);
    }else{g.fillStyle='#477036';g.fillRect(0,0,c.width,c.height);}
    for(let p=0;p<w.tiles.length;p++)if(w.tiles[p].terrain==='mud'){g.fillStyle='#322d2040';g.fillRect(p%width*unit,Math.floor(p/width)*unit,unit,unit);}
    const water=document.createElement('canvas');water.width=c.width;water.height=c.height;const v=water.getContext('2d');
    if(im){const W=im.width/4,H=im.height/2,repeat=unit*6;
      for(let y=0;y<water.height;y+=repeat)for(let x=0;x<water.width;x+=repeat){
        const flipX=Math.floor(x/repeat)%2,flipY=Math.floor(y/repeat)%2;
        v.save();v.translate(x+(flipX?repeat:0),y+(flipY?repeat:0));v.scale(flipX?-1:1,flipY?-1:1);v.drawImage(im,0,0,W,H,0,0,repeat,repeat);v.restore();
      }
    }else{v.fillStyle='#27888d';v.fillRect(0,0,water.width,water.height);}
    v.fillStyle='#116e823d';v.fillRect(0,0,water.width,water.height);
    const mask=document.createElement('canvas');mask.width=c.width;mask.height=c.height;const m=mask.getContext('2d');
    m.fillStyle='#032e58dc';for(let p=0;p<w.tiles.length;p++)if(w.tiles[p].terrain==='deep')m.fillRect(p%width*unit,Math.floor(p/width)*unit,unit,unit);
    v.save();v.filter='blur('+unit*.5+'px)';v.drawImage(mask,0,0);v.restore();
    m.clearRect(0,0,mask.width,mask.height);const pixels=m.createImageData(mask.width,mask.height),foam=m.createImageData(mask.width,mask.height);
    const value=(x,y)=>isWater(w.tiles[Math.max(0,Math.min(height-1,y))*width+Math.max(0,Math.min(width-1,x))])?1:0;
    // Bilinear contour through real cell-centre values; every cell centre keeps its class.
    for(let py=0;py<c.height;py++){
      const fy=(py+.5)/unit-.5,y=Math.floor(fy),dy=fy-y;
      for(let px=0;px<c.width;px++){
        const fx=(px+.5)/unit-.5,x=Math.floor(fx),dx=fx-x,
          top=value(x,y)*(1-dx)+value(x+1,y)*dx,bottom=value(x,y+1)*(1-dx)+value(x+1,y+1)*dx,n=top*(1-dy)+bottom*dy,
          a=Math.max(0,Math.min(1,(n-.46)/.08)),k=(py*c.width+px)*4;
        pixels.data[k+3]=Math.round(a*255);
        foam.data[k]=208;foam.data[k+1]=237;foam.data[k+2]=211;foam.data[k+3]=Math.abs(n-.5)<.018?120:0;
      }
    }
    m.putImageData(pixels,0,0);v.globalCompositeOperation='destination-in';v.drawImage(mask,0,0);g.drawImage(water,0,0);
    m.putImageData(foam,0,0);g.drawImage(mask,0,0);
    return c;
  }
  function props(g,w,art,view,box){
    const im=art.images.props;if(!im)return;const z=view.scale,W=im.width/4,H=im.height/2;
    const left=Math.max(0,Math.floor(-view.x/z)-1),right=Math.min(w.config.width,Math.ceil((box.width-view.x)/z)+1),
      top=Math.max(0,Math.floor(-view.y/z)-1),bottom=Math.min(w.config.height,Math.ceil((box.height-view.y)/z)+1);
    for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
      const p=y*w.config.width+x,t=w.tiles[p],h=((p*71+137)%97)/97;
      let id=-1,size=1;
      if(t.cover==='boulder'){id=p%2;size=1+h*.3;}
      else if(t.cover==='bush'){id=[2,4,7][p%3];size=.8+h*.4;}
      else if(t.cover==='log'){id=3;size=1.25;}
      else if(t.terrain==='rock'&&h<.25){id=1;size=.9;}
      // Low decoration lies within the material; it is neither an edible body nor a blocker.
      if(id>=0){g.save();g.globalAlpha=t.cover==='bush'?.85:1;
        g.translate(x+.5+Math.sin(p*17)*.12,y+.5+Math.cos(p*23)*.1);g.rotate((h-.5)*(t.cover==='log'?1.8:.65));
        if(p%2)g.scale(-1,1);
        g.drawImage(im,(id%4)*W,Math.floor(id/4)*H,W,H,-size*.5,-size*.48,size,size*.85);g.restore();}
      for(const q of t.walls){
        if(q===p+1){g.drawImage(im,2*W,H,W,H,x+.83,y-.05,.34,1.1);}
        else if(q===p+w.config.width){g.drawImage(im,2*W,H,W,H,x-.05,y+.8,1.1,.36);}
      }
    }
  }
  root.EcoScenery={paint,props};
})(globalThis);
