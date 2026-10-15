import test from 'node:test';
import assert from 'node:assert/strict';
import {BoxGeometry,Plane,Vector3} from '../public/erlc-map/vendor/three.module.js';
import {splitGeometry} from '../public/erlc-map/aircraft-geometry.js';
test('rudder hinge clipping retains geometry, UVs and normals on both sides with no crossed triangles',()=>{
  const geometry=new BoxGeometry(2,2,2),plane=new Plane(new Vector3(0,.2,1).normalize(),0),parts=splitGeometry(geometry,plane);
  for(let side=0;side<2;side++){const g=parts[side],p=g.attributes.position;assert.ok(p.count>0);assert.equal(g.attributes.uv.count,p.count);assert.equal(g.attributes.normal.count,p.count);
    for(let i=0;i<p.count;i++){const v=new Vector3(p.getX(i),p.getY(i),p.getZ(i));assert.ok((side?1:-1)*plane.distanceToPoint(v)>=-1e-6);assert.ok(v.toArray().every(Number.isFinite));}
    g.dispose();
  }geometry.dispose();
});
