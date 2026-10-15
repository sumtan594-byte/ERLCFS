import * as THREE from './vendor/three.module.js';
import {TileStore} from './tile-store.js';

export class DetailMap {
  constructor(renderer,baseTexture,url,meta) {
    this.owner=renderer;
    this.base=baseTexture;
    this.url=url;
    this.meta=meta;
    this.cache=new Map();
    this.pending=new Map();
    this.store=new TileStore(url);
    this.canvas=document.createElement('canvas');
    this.canvas.width=this.canvas.height=3960;
    this.context=this.canvas.getContext('2d');
    this.texture=new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace=THREE.SRGBColorSpace;
    this.texture.anisotropy=Math.min(8,renderer.renderer.capabilities.getMaxAnisotropy());
    this.uniforms={detailMap:{value:this.texture},detailFrame:{value:new THREE.Vector4()},detailActive:{value:0}};
    this.timer=setInterval(()=>this.update(),350);
    this.update();
  }

  material() {
    const material=new THREE.MeshBasicMaterial({map:this.base,toneMapped:false,side:THREE.DoubleSide});
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,this.uniforms);
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
        uniform sampler2D detailMap;
        uniform vec4 detailFrame;
        uniform float detailActive;`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        if(detailActive>0.5){
          vec2 detailUV=(vMapUv-detailFrame.xy)/detailFrame.zw;
          if(all(greaterThanEqual(detailUV,vec2(0.0)))&&all(lessThanEqual(detailUV,vec2(1.0)))){
            vec2 edge=min(detailUV,1.0-detailUV);
            float blend=smoothstep(0.0,0.025,min(edge.x,edge.y));
            diffuseColor.rgb=mix(diffuseColor.rgb,texture2D(detailMap,detailUV).rgb,blend);
          }
        }`);
    };
    material.customProgramCacheKey=()=> 'local-detail-map-v2';
    return material;
  }

  async tile(x,y) {
    if(this.meta.present[5][y*30+x]!=='1')return null;
    const key=`${x}_${y}`;
    if(this.cache.has(key)){
      const bitmap=this.cache.get(key);
      this.cache.delete(key);this.cache.set(key,bitmap);
      return bitmap;
    }
    if(this.pending.has(key))return this.pending.get(key);
    const task=(async()=>{
      const bitmap=await createImageBitmap(await this.store.read(key));
      if(this.disposed){bitmap.close();return null;}
      this.cache.set(key,bitmap);
      return bitmap;
    })().finally(()=>this.pending.delete(key));
    this.pending.set(key,task);
    return task;
  }

  warm() {
    if(this.warming)return;
    this.warming=true;
    const keys=[];
    for(let y=0;y<30;y++)for(let x=0;x<30;x++)if(this.meta.present[5][y*30+x]==='1')keys.push(`${x}_${y}`);
    
    this.store.warm(keys,()=>this.busy||document.hidden||navigator.connection?.saveData,(done,total)=>{
      if(!this.disposed)this.owner.host.dataset.cachedTiles=`${done}/${total}`;
    });
  }

  async update() {
    if(this.disposed||this.busy)return;
    const target=this.owner.controls.target;
    const u=(target.z+5472)/10800,v=(4688-target.x)/10800;
    const x=Math.max(0,Math.min(26,Math.floor(u*30)-2)),y=Math.max(0,Math.min(26,Math.floor(v*30)-2));
    const key=`${x},${y}`;
    if(key===this.key&&(!this.retryAt||Date.now()<this.retryAt))return;
    this.busy=true;
    try{
      const results=await Promise.allSettled(Array.from({length:16},(_,i)=>this.tile(x+i%4,y+Math.floor(i/4))));
      const tiles=results.map(result=>result.status==='fulfilled'?result.value:null);
      if(this.disposed)return;
      const context=this.context;
      context.drawImage(this.base.image,x/30*this.base.image.width,y/30*this.base.image.height,
        4/30*this.base.image.width,4/30*this.base.image.height,0,0,3960,3960);
      tiles.forEach((tile,i)=>{if(tile)context.drawImage(tile,i%4*990,Math.floor(i/4)*990);});
      this.texture.needsUpdate=true;
      this.uniforms.detailFrame.value.set(x/30,1-(y+4)/30,4/30,4/30);
      this.uniforms.detailActive.value=1;
      this.key=key;
      this.retryAt=results.some(result=>result.status==='rejected')?Date.now()+3000:0;
      this.owner.host.dataset.detailWindow=key;
      this.owner.dirty=true;
      this.warm();
    }catch(error){console.warn(error);}
    finally{
      
      
      while(this.cache.size>48){
        const first=this.cache.keys().next().value;
        this.cache.get(first).close();this.cache.delete(first);
      }
      this.busy=false;
    }
  }

  dispose() {
    this.disposed=true;
    clearInterval(this.timer);
    this.store.dispose();
    for(const bitmap of this.cache.values())bitmap.close();
    this.cache.clear();
    this.texture.dispose();
    this.base.dispose();
  }
}
