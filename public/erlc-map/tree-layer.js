import * as THREE from './vendor/three.module.js';

export async function loadTrees(base,signal) {
  const response=await fetch(`${base}/trees.json`,{signal});
  if(!response.ok)throw new Error(`Tree geometry: ${response.status}`);
  const data=await response.json(),root=new THREE.Group(),geometries=new Map(),textures=new Map();
  root.name='County trees';
  try {
    const ids=[...new Set(data.groups.map(g=>g.texture).filter(Boolean))];
    const results=await Promise.allSettled(ids.map(async id=>{
      const texture=await new THREE.TextureLoader().loadAsync(`${base}/trees/${id}.webp`);
      texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;texture.anisotropy=4;
      textures.set(id,texture);
    }));
    const failed=results.find(result=>result.status==='rejected');
    if(failed)throw failed.reason;
    if(signal.aborted)throw new DOMException('Map closed','AbortError');
    const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),p=new THREE.Vector3(),scale=new THREE.Vector3(),color=new THREE.Color();
    for(const group of data.groups){
      let geometry=geometries.get(group.geom);
      if(!geometry){
        const shape=data.shapes[group.geom];geometry=new THREE.BufferGeometry();
        geometry.setAttribute('position',new THREE.Float32BufferAttribute(shape.positions,3));
        geometry.setAttribute('uv',new THREE.Float32BufferAttribute(shape.uv,2));
        geometry.setIndex(shape.indices);geometry.computeVertexNormals();geometries.set(group.geom,geometry);
      }
      const material=new THREE.MeshLambertMaterial({map:textures.get(group.texture)||null,color:0xffffff,side:THREE.DoubleSide,alphaTest:group.alpha?.4:0,alphaToCoverage:group.alpha});
      const mesh=new THREE.InstancedMesh(geometry,material,group.rows.length);
      mesh.name=`Tree ${group.geom}`;
      group.rows.forEach((row,i)=>{
        p.fromArray(row);q.fromArray(row,3);scale.fromArray(row,7);matrix.compose(p,q,scale);mesh.setMatrixAt(i,matrix);
        color.setRGB(row[10]<0?1:row[10],row[10]<0?1:row[11],row[10]<0?1:row[12],THREE.SRGBColorSpace);mesh.setColorAt(i,color);
      });
      mesh.computeBoundingSphere();root.add(mesh);
    }
    root.userData.instances=data.groups.reduce((count,group)=>count+group.rows.length,0);
    return root;
  } catch(error){
    for(const texture of textures.values())texture.dispose();
    for(const geometry of geometries.values())geometry.dispose();
    for(const mesh of root.children)mesh.material.dispose();
    throw error;
  }
}
