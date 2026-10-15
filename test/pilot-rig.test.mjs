import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Bone,Vector3} from '../public/erlc-map/vendor/three.module.js';
import {solveLimb} from '../public/erlc-map/pilot-rig.js';
import {readFile} from 'node:fs/promises';

function chain(){const root=new Group(),upper=new Bone(),lower=new Bone(),hand=new Bone();root.add(upper);upper.add(lower);lower.add(hand);lower.position.y=.285;hand.position.y=.252;root.updateMatrixWorld(true);return {root,upper,lower,hand};}

test('pilot arm IK reaches both grips while preserving elbow and forearm lengths',()=>{
  for(const sign of [-1,1])for(const roll of [-.65,0,.65])for(const push of [-.085,0,.085]){
    const {root,upper,lower,hand}=chain(),target=new Vector3(sign*.08,.22,-.35+push).applyAxisAngle(new Vector3(0,0,1),roll),pole=new Vector3(sign*.3,-.1,0);
    solveLimb(upper,lower,hand,target,pole);root.updateMatrixWorld(true);
    const a=upper.getWorldPosition(new Vector3()),b=lower.getWorldPosition(new Vector3()),c=hand.getWorldPosition(new Vector3());
    assert.ok(c.distanceTo(target)<1e-6);assert.ok(Math.abs(a.distanceTo(b)-.285)<1e-6);assert.ok(Math.abs(b.distanceTo(c)-.252)<1e-6);
  }
});

test('pilot IK remains correct inside a rotated, translated and scaled aircraft',()=>{
  const {root,upper,lower,hand}=chain();root.position.set(1860,115,-1500);root.rotation.set(.3,1.4,-.6);root.scale.setScalar(1/.28);root.updateMatrixWorld(true);
  const target=root.localToWorld(new Vector3(.08,.2,-.35)),pole=root.localToWorld(new Vector3(.3,-.1,0));
  solveLimb(upper,lower,hand,target,pole);assert.ok(hand.getWorldPosition(new Vector3()).distanceTo(target)<1e-6);
});

test('unreachable and singular pilot IK targets remain finite without stretching',()=>{
  for(const target of [new Vector3(),new Vector3(0,10,0),new Vector3(.001,0,0)]){
    const {upper,lower,hand}=chain();solveLimb(upper,lower,hand,target,new Vector3(0,10,0));
    for(const bone of [upper,lower,hand])assert.ok(bone.quaternion.toArray().every(Number.isFinite));
    assert.ok(hand.getWorldPosition(new Vector3()).length()<=.53701);
  }
});

test('bundled pilot has a complete deforming body, articulated fingers and embedded textures',async()=>{
  const bytes=await readFile(new URL('../public/erlc-map/aircraft/pilot.glb',import.meta.url));
  assert.equal(bytes.readUInt32LE(0),0x46546c67);const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  const names=new Set(gltf.nodes.map(n=>n.name));
  for(const side of ['Left','Right'])for(const digit of ['Thumb','Index','Middle','Ring','Pinky'])for(const joint of [1,2,3])assert.ok(names.has(side+'Hand'+digit+joint));
  assert.ok(gltf.skins[0].joints.length>=60);assert.ok(gltf.images.length>=10);assert.ok(gltf.images.every(i=>i.bufferView!=null));
  assert.ok(gltf.meshes.every(m=>m.primitives.every(p=>p.attributes.JOINTS_0!=null&&p.attributes.WEIGHTS_0!=null)));
});
