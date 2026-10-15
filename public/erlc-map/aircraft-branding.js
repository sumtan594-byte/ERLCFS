import {CanvasTexture,MeshBasicMaterial,Mesh,PlaneGeometry,Vector3,Raycaster,Box3,SRGBColorSpace} from './vendor/three.module.js';

function texture(materials,textures,interior){
  const canvas=document.createElement('canvas');canvas.width=interior?2048:1536;canvas.height=interior?224:192;
  const c=canvas.getContext('2d');
  c.font=interior?'600 160px Arial':'600 100px Arial';c.textAlign='center';c.textBaseline='middle';c.fillStyle=interior?'#ffffff':'#243d48';c.fillText('Made by @daddygraddy',canvas.width/2,canvas.height/2);
  const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;map.anisotropy=8;
  const material=new MeshBasicMaterial({map,transparent:true,opacity:interior?1:.62,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  textures.add(map);materials.add(material);return material;
}

export function addAircraftBranding(aircraft){
  const {root,materials,textures}=aircraft,yokeMaterial=texture(materials,textures,true);
  for(const [index,yoke]of aircraft.yokes.entries()){
    const proxy=new Mesh(yoke.geometry,yoke.material),ray=new Raycaster(),probe=new PlaneGeometry(.2,.022,48,4),positions=probe.attributes.position;let valid=true,front=-Infinity;
    proxy.updateMatrixWorld(true);
    for(let i=0;i<positions.count;i++){
      ray.set(new Vector3(positions.getX(i),positions.getY(i)-.043,.3),new Vector3(0,0,-1));const hit=ray.intersectObject(proxy,false)[0];
      if(!hit){valid=false;break;}
      front=Math.max(front,hit.point.z);
    }
    probe.dispose();if(!valid)continue;
    const mesh=new Mesh(new PlaneGeometry(.2,.022),yokeMaterial);mesh.position.set(0,-.043,front+.002);mesh.name=(index===0?'Pilot':'Copilot')+' yoke maker watermark';yoke.add(mesh);
  }
  const material=texture(materials,textures,false),ray=new Raycaster(),direction=new Vector3(0,-1,0),origin=new Vector3();
  root.updateMatrixWorld(true);
  for(const part of [2,4]){
    const wing=root.children.find(n=>n.isMesh&&n.name.includes('Exterior_Body_MAT_00'+String(part).padStart(2,'0')+'_'));
    if(!wing)continue;
    const box=new Box3().setFromObject(wing),centre=root.worldToLocal(box.getCenter(new Vector3())),size=box.getSize(new Vector3()).multiplyScalar(.28);
    const geometry=new PlaneGeometry(Math.min(1.8,size.x*.6),Math.min(.225,size.z*.3),32,6),positions=geometry.attributes.position;let valid=true;
    for(let i=0;i<positions.count;i++){
      origin.set(centre.x+positions.getX(i),centre.y+2,centre.z-positions.getY(i));root.localToWorld(origin);ray.set(origin,direction);
      const hit=ray.intersectObject(wing,false)[0];if(!hit){valid=false;break;}
      const p=root.worldToLocal(hit.point);positions.setXYZ(i,p.x,p.y+.0025,p.z);
    }
    if(!valid){geometry.dispose();continue;}
    positions.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
    const mesh=new Mesh(geometry,material);mesh.name=part===2?'Left wing maker marking':'Right wing maker marking';root.add(mesh);
  }
}
