/* Paint-only world materials. All geography comes from the settled tile map. */
(function(root){
  'use strict';
  const palette=['#326c65','#563c30','#493c5b','#657449','#a5b9b2','#477036','#ac9866','#4a4537'];
  const materialCache=new WeakMap();
  function seamless(image){
    if(materialCache.has(image))return materialCache.get(image);
    const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const g=c.getContext('2d');g.drawImage(image,0,0);
    const src=g.getImageData(0,0,c.width,c.height),dst=g.createImageData(c.width,c.height),W=c.width/4,H=c.height/2;
    // Periodic crossfade, rather than mirrored repetition that made visible symmetric motifs.
    for(let tile=0;tile<8;tile++)for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const ax=Math.sin(Math.PI*x/W)**2,ay=Math.sin(Math.PI*y/H)**2,
        xs=[x,(x+W/2)%W],ys=[y,(y+H/2)%H],weights=[ax*ay,(1-ax)*ay,ax*(1-ay),(1-ax)*(1-ay)],
        out=((Math.floor(tile/4)*H+y)*c.width+tile%4*W+x)*4;
      for(let channel=0;channel<3;channel++){
        let sum=0;for(let j=0;j<4;j++){
          const at=((Math.floor(tile/4)*H+ys[j>>1])*c.width+tile%4*W+xs[j%2])*4;sum+=src.data[at+channel]*weights[j];
        }dst.data[out+channel]=sum;
      }dst.data[out+3]=255;
    }
    g.putImageData(dst,0,0);materialCache.set(image,c);return c;
  }
  function paint(w,art){
    const unit=w.config.width<=40?96:w.config.width<=80?48:24,c=document.createElement('canvas');
    c.width=w.config.width*unit;c.height=w.config.height*unit;const g=c.getContext('2d'),im=art.images.ground?seamless(art.images.ground):null;
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
        const fy=(py+.5)/unit-.5,iy=Math.floor(fy),dy=fy-iy,sy=Math.floor((py/(unit*6)%1)*H);
        for(let px=0;px<c.width;px++){
          const fx=(px+.5)/unit-.5,ix=Math.floor(fx),dx=fx-ix,sx=Math.floor((px/(unit*6)%1)*W),
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
      for(let y=0;y<water.height;y+=repeat)for(let x=0;x<water.width;x+=repeat)v.drawImage(im,0,0,W,H,x,y,repeat,repeat);
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
    // Overview is a separately authored cartographic pass, not a reduced close-up texture.
    const chart=document.createElement('canvas');chart.width=c.width;chart.height=c.height;const cg=chart.getContext('2d'),
      tones=['#507c64','#8a734b','#635779','#7a8958','#b5c8bc','#3f643d','#b6a875','#625c43'];
    for(let p=0;p<w.tiles.length;p++){cg.fillStyle=tones[w.tiles[p].env];cg.fillRect(p%width*unit,Math.floor(p/width)*unit,unit,unit);}
    const softened=document.createElement('canvas');softened.width=c.width;softened.height=c.height;const sc=softened.getContext('2d');sc.filter='blur('+unit*.4+'px)';sc.drawImage(chart,0,0);cg.drawImage(softened,0,0);
    const lake=document.createElement('canvas');lake.width=c.width;lake.height=c.height;const lg=lake.getContext('2d'),gradient=lg.createLinearGradient(0,0,c.width,c.height);
    gradient.addColorStop(0,'#37a4b4');gradient.addColorStop(1,'#176580');lg.fillStyle=gradient;lg.fillRect(0,0,c.width,c.height);
    lg.save();lg.filter='blur('+unit*.45+'px)';lg.globalAlpha=.65;lg.drawImage(mask,0,0);lg.restore();
    m.putImageData(pixels,0,0);lg.globalCompositeOperation='destination-in';lg.drawImage(mask,0,0);cg.drawImage(lake,0,0);
    c.chart=chart;
    m.putImageData(pixels,0,0);v.globalCompositeOperation='destination-in';v.drawImage(mask,0,0);g.drawImage(water,0,0);
    m.putImageData(foam,0,0);g.drawImage(mask,0,0);cg.drawImage(mask,0,0);
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
      const far=view.mode==='overview'||(view.mode==='auto'&&z<24);
      if(far){
        // Small upright landforms with three material planes, anchored to the actual cell.
        const cx=x+.5+Math.sin(p*17)*.1,cy=y+.66+Math.cos(p*23)*.08;
        if(t.cover==='bush'){
          g.fillStyle='#12372d77';g.beginPath();g.ellipse(cx+.05,cy+.08,.36,.15,0,0,7);g.fill();
          for(let j=0;j<3;j++){const a=cx+(j-1)*.17,b=cy-(j%2)*.13;g.beginPath();g.moveTo(a-.19,b);g.quadraticCurveTo(a-.25,b-.25,a,b-.55);g.quadraticCurveTo(a+.25,b-.25,a+.19,b);g.closePath();g.fillStyle=j===1?'#3d6741':'#28533b';g.fill();g.strokeStyle='#8aa16366';g.lineWidth=.025;g.stroke();}
        }else if(t.cover==='boulder'||t.terrain==='rock'){
          g.fillStyle='#162c2d66';g.beginPath();g.ellipse(cx+.07,cy+.08,.42,.15,0,0,7);g.fill();
          const peak=cy-(t.cover==='boulder'?.75:.48);
          g.beginPath();g.moveTo(cx-.4,cy);g.lineTo(cx-.08,peak);g.lineTo(cx+.38,cy);g.closePath();g.fillStyle='#647371';g.fill();
          g.beginPath();g.moveTo(cx-.08,peak);g.lineTo(cx-.02,cy-.08);g.lineTo(cx+.38,cy);g.closePath();g.fillStyle='#354e50';g.fill();g.strokeStyle='#c1c8a966';g.lineWidth=.025;g.stroke();
        }else if(t.cover==='log'){
          g.save();g.translate(cx,cy-.12);g.rotate(-.5);g.fillStyle='#493f2c';g.fillRect(-.4,-.08,.8,.16);g.fillStyle='#ba9c58';g.fillRect(-.4,-.08,.8,.045);g.restore();
        }
        g.strokeStyle='#d4d3ad88';g.lineWidth=.035;
        for(const q of t.walls){if(q===p+1)g.strokeRect(x+.93,y,.07,1);else if(q===p+w.config.width)g.strokeRect(x,y+.93,1,.07);}
        continue;
      }
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
