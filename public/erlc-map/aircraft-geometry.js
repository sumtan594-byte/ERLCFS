import {BufferGeometry,Float32BufferAttribute,Vector3} from './vendor/three.module.js';


export function splitGeometry(geometry,plane){
  const source=geometry.index?geometry.toNonIndexed():geometry,names=Object.keys(source.attributes),buffers=[{},{}];
  for(const b of buffers)for(const name of names)b[name]=[];
  const vertex=i=>Object.fromEntries(names.map(n=>{const a=source.attributes[n];return [n,Array.from({length:a.itemSize},(_,j)=>a.array[i*a.itemSize+j])];}));
  const distance=v=>plane.distanceToPoint(new Vector3(...v.position));
  const intersect=(a,b,t)=>Object.fromEntries(names.map(n=>[n,a[n].map((v,i)=>v+(b[n][i]-v)*t)]));
  for(let i=0;i<source.attributes.position.count;i+=3){
    const triangle=[vertex(i),vertex(i+1),vertex(i+2)];
    for(let side=0;side<2;side++){
      const sign=side?1:-1,polygon=[];
      for(let j=0;j<3;j++){const a=triangle[j],b=triangle[(j+1)%3],da=distance(a),db=distance(b),inside=sign*da>=-1e-8,next=sign*db>=-1e-8;
        if(inside)polygon.push(a);if(inside!==next)polygon.push(intersect(a,b,da/(da-db)));
      }
      for(let j=1;j<polygon.length-1;j++)for(const v of [polygon[0],polygon[j],polygon[j+1]])for(const name of names)buffers[side][name].push(...v[name]);
    }
  }
  if(source!==geometry)source.dispose();
  return buffers.map(b=>{const g=new BufferGeometry();for(const name of names)g.setAttribute(name,new Float32BufferAttribute(b[name],geometry.attributes[name].itemSize));g.normalizeNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;});
}
