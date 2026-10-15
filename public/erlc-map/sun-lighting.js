import {MeshLambertMaterial,Color,Vector3,PCFSoftShadowMap,Mesh,ShadowMaterial} from './vendor/three.module.js';
import {Sky} from './vendor/Sky.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export class SunLighting{
  constructor(viewer){
    this.viewer=viewer;this.hour=18.8;this.enabled=false;this.originals=new Map();this.meshes=new WeakMap();this.direction=new Vector3();this.centre=new Vector3();this.lastCentre=new Vector3(Infinity,Infinity,Infinity);this.lastUpdate=0;
  }
  setup(){
    if(this.sun)return;const v=this.viewer;
    this.sun=v.scene.children.find(n=>n.isDirectionalLight);this.fill=v.scene.children.find(n=>n.isHemisphereLight);
    this.saved={sunColor:this.sun.color.clone(),sunIntensity:this.sun.intensity,sunPosition:this.sun.position.clone(),fillColor:this.fill.color.clone(),groundColor:this.fill.groundColor.clone(),fillIntensity:this.fill.intensity,background:v.scene.background,fog:v.scene.fog.color.clone()};
    this.sky=new Sky();this.sky.name='Atmospheric sky';this.sky.scale.setScalar(30000);this.sky.renderOrder=-1000;this.sky.frustumCulled=false;
    const u=this.sky.material.uniforms;u.turbidity.value=7;u.rayleigh.value=2.6;u.mieCoefficient.value=.005;u.mieDirectionalG.value=.82;
    this.sky.material.fragmentShader=this.sky.material.fragmentShader.replace('vec4( retColor, 1.0 )','vec4( retColor * 0.28, 1.0 )');
    this.sun.shadow.mapSize.set(4096,4096);this.sun.shadow.camera.near=6000;this.sun.shadow.camera.far=18000;this.sun.shadow.bias=-.00012;this.sun.shadow.normalBias=1.2;this.sun.shadow.intensity=.72;this.sun.shadow.autoUpdate=false;
    v.renderer.shadowMap.type=PCFSoftShadowMap;v.scene.add(this.sun.target);
  }
  register(){
    this.viewer.scene.traverse(mesh=>{
      if(!mesh.isMesh||mesh===this.sky||mesh===this.waterReceiver||this.meshes.has(mesh))return;
      this.meshes.set(mesh,{cast:mesh.castShadow,receive:mesh.receiveShadow});
      const water=mesh.name==='Water',materials=[].concat(mesh.material);
      mesh.receiveShadow=!water;mesh.castShadow=!water&&!['Road surfaces','Tunnel floors'].includes(mesh.name)&&materials.some(m=>!m.transparent||m.alphaTest>.1);
      if(water)return;
      const lit=materials.map(material=>{
        if(mesh.parent!==this.viewer.scene||!material.isMeshBasicMaterial||material.transparent||!material.map)return material;
        if(!this.originals.has(material)){
          const replacement=new MeshLambertMaterial({map:material.map,color:material.color,side:material.side,vertexColors:material.vertexColors,alphaTest:material.alphaTest,polygonOffset:material.polygonOffset,polygonOffsetFactor:material.polygonOffsetFactor,polygonOffsetUnits:material.polygonOffsetUnits});
          replacement.onBeforeCompile=material.onBeforeCompile;replacement.customProgramCacheKey=material.customProgramCacheKey;this.originals.set(material,replacement);
        }
        return this.originals.get(material);
      });
      mesh.material=Array.isArray(mesh.material)?lit:lit[0];
    });
  }
  setEnabled(enabled){
    if(enabled){this.setup();this.enabled=true;this.viewer.renderer.shadowMap.enabled=true;this.sun.castShadow=true;this.viewer.scene.background=null;this.viewer.scene.add(this.sky);this.register();
      const water=this.viewer.scene.children.find(n=>n.name==='Water');if(water&&!this.waterReceiver){this.waterReceiver=new Mesh(water.geometry,new ShadowMaterial({color:0x202338,opacity:.38,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));this.waterReceiver.name='Water shadow receiver';this.waterReceiver.receiveShadow=true;this.waterReceiver.renderOrder=3;this.viewer.scene.add(this.waterReceiver);}
      this.applyTime();
    }else if(this.sun){
      this.enabled=false;this.sun.castShadow=false;this.viewer.renderer.shadowMap.enabled=false;this.sky.removeFromParent();this.viewer.scene.background=this.saved.background;
      this.sun.color.copy(this.saved.sunColor);this.sun.intensity=this.saved.sunIntensity;this.sun.position.copy(this.saved.sunPosition);this.sun.target.position.set(0,0,0);this.fill.color.copy(this.saved.fillColor);this.fill.groundColor.copy(this.saved.groundColor);this.fill.intensity=this.saved.fillIntensity;this.viewer.scene.fog.color.copy(this.saved.fog);
      const reverse=new Map([...this.originals].map(([a,b])=>[b,a]));this.viewer.scene.traverse(mesh=>{const flags=this.meshes.get(mesh);if(!flags)return;mesh.castShadow=flags.cast;mesh.receiveShadow=flags.receive;mesh.material=Array.isArray(mesh.material)?mesh.material.map(m=>reverse.get(m)||m):reverse.get(mesh.material)||mesh.material;});this.meshes=new WeakMap();
      if(this.waterReceiver){this.waterReceiver.removeFromParent();this.waterReceiver.material.dispose();this.waterReceiver=null;}
    }
    this.viewer.dirty=true;
  }
  applyTime(){
    if(!this.enabled)return;const phase=clamp((this.hour-6.5)/13,0,1),elevation=Math.sin(phase*Math.PI)*65*Math.PI/180,azimuth=(phase-.5)*Math.PI+Math.PI*.2;
    this.direction.setFromSphericalCoords(1,Math.PI/2-elevation,azimuth);const warm=clamp((35-elevation*180/Math.PI)/30,0,1);
    this.sun.color.copy(new Color('#fff4dc')).lerp(new Color('#ffad61'),warm);this.sun.intensity=2.5-warm*.65;
    this.fill.color.copy(new Color('#cbe5ff')).lerp(new Color('#bac1df'),warm);this.fill.groundColor.copy(new Color('#9b9b79')).lerp(new Color('#8b7882'),warm);this.fill.intensity=1.7-warm*.25;
    this.viewer.scene.fog.color.copy(new Color('#d5e5eb')).lerp(new Color('#dbad94'),warm);
    this.sky.material.uniforms.sunPosition.value.copy(this.direction).multiplyScalar(450000);this.lastCentre.set(Infinity,Infinity,Infinity);this.sun.shadow.needsUpdate=true;this.viewer.dirty=true;
  }
  update(){
    if(!this.enabled)return;const v=this.viewer,f=v.flight;this.register();this.sky.position.copy(v.camera.position);
    const p=f?.model?this.centre.set(f.model.x,f.model.y,f.model.z):this.centre.copy(v.controls.target);
    const ground=v.groundAt(p.x,p.z)||0;p.y=f?Math.max(ground,Math.min(p.y,ground+1500)):ground;
    const distance=f?clamp(Math.abs(f.model.y-ground)*1.5+220,250,1700):clamp(v.camera.position.distanceTo(p)*.65,350,8500);
    const step=distance*2/4096;p.x=Math.round(p.x/step)*step;p.z=Math.round(p.z/step)*step;
    const now=performance.now(),moved=p.distanceToSquared(this.lastCentre)>step*step*4||Math.abs(distance-(this.radius||0))>5;
    if(moved||f&&now-this.lastUpdate>50){
      this.sun.target.position.copy(p);this.sun.position.copy(p).addScaledVector(this.direction,12000);this.sun.target.updateMatrixWorld();const c=this.sun.shadow.camera;c.left=c.bottom=-distance;c.right=c.top=distance;c.updateProjectionMatrix();this.radius=distance;this.lastCentre.copy(p);this.lastUpdate=now;this.sun.shadow.needsUpdate=true;
    }
  }
  dispose(){this.setEnabled(false);for(const material of this.originals.values())material.dispose();this.originals.clear();this.sky?.geometry.dispose();this.sky?.material.dispose();this.sun?.shadow.dispose();}
}
