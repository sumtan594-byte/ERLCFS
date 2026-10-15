import test from 'node:test';
import assert from 'node:assert/strict';
import {FlightCamera} from '../public/erlc-map/flight-camera.js';
import {Vector3} from '../public/erlc-map/vendor/three.module.js';
test('both camera views independently look, pan and zoom without changing aircraft attitude',()=>{
  const camera=new FlightCamera(),eye=new Vector3(-1,1,0),before=camera.pose('cockpit',eye);
  camera.drag('cockpit','look',100,-50);camera.drag('cockpit','pan',-30,20);camera.wheel('cockpit',-300);
  const after=camera.pose('cockpit',eye);assert.ok(after.fov<before.fov);assert.ok(after.quaternion.angleTo(before.quaternion)>.1);assert.ok(after.offset.distanceTo(before.offset)>0);
  assert.equal(camera.views.exterior.yaw,0);const distance=camera.pose('exterior',eye).offset.length();camera.wheel('exterior',300);assert.ok(camera.pose('exterior',eye).offset.length()>distance);
});
test('cockpit head stays inside cabin, zoom remains bounded and camera reset recentres',()=>{
  const camera=new FlightCamera();for(let i=0;i<100;i++){camera.drag('cockpit','pan',1000,1000);camera.drag('cockpit','look',1000,1000);camera.wheel('cockpit',-1000);camera.wheel('exterior',1000);}
  assert.equal(camera.views.cockpit.zoom,35);assert.equal(camera.views.exterior.zoom,350);assert.equal(camera.views.cockpit.pan.x,-.45);assert.equal(camera.views.cockpit.pitch,-1.25);
  camera.reset('cockpit');assert.equal(camera.views.cockpit.yaw,0);assert.equal(camera.views.cockpit.zoom,76);assert.ok(camera.views.cockpit.pan.equals(new Vector3()));
});
