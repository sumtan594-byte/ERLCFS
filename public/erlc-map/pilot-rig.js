import {Vector3,Quaternion,Matrix4,Group,Mesh,MeshStandardMaterial,SphereGeometry,TubeGeometry,CatmullRomCurve3} from './vendor/three.module.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const worldPoint=(root,p)=>root.localToWorld(new Vector3(...p));

export function aimBone(bone,child,target){
  const origin=bone.getWorldPosition(new Vector3()),from=child.getWorldPosition(new Vector3()).sub(origin),to=target.clone().sub(origin);
  if(from.lengthSq()<1e-12||to.lengthSq()<1e-12)return;
  const rotation=new Quaternion().setFromUnitVectors(from.normalize(),to.normalize()).multiply(bone.getWorldQuaternion(new Quaternion()));
  bone.quaternion.copy(bone.parent.getWorldQuaternion(new Quaternion()).invert().multiply(rotation));bone.updateWorldMatrix(false,true);
}

export function solveLimb(upper,lower,end,target,pole){
  const origin=upper.getWorldPosition(new Vector3()),joint=lower.getWorldPosition(new Vector3()),tip=end.getWorldPosition(new Vector3());
  const a=origin.distanceTo(joint),b=joint.distanceTo(tip),direction=target.clone().sub(origin),raw=direction.length();
  if(raw<1e-8||a<1e-8||b<1e-8)return;
  direction.divideScalar(raw);const distance=clamp(raw,Math.abs(a-b)+1e-5,a+b-1e-5);
  const bend=pole.clone().sub(origin);bend.addScaledVector(direction,-bend.dot(direction));
  if(bend.lengthSq()<1e-10){bend.set(0,1,0).addScaledVector(direction,-direction.y);if(bend.lengthSq()<1e-10)bend.set(1,0,0);}
  bend.normalize();const along=(a*a+distance*distance-b*b)/(2*distance),height=Math.sqrt(Math.max(0,a*a-along*along));
  const elbow=origin.clone().addScaledVector(direction,along).addScaledVector(bend,height),reachable=origin.clone().addScaledVector(direction,distance);
  aimBone(upper,lower,elbow);aimBone(lower,end,reachable);
}

export class PilotRig{
  constructor(source,aircraft){
    this.aircraft=aircraft;this.root=source;this.root.name='Articulated pilot';this.root.rotation.y=Math.PI;this.root.scale.setScalar(.96);aircraft.root.add(source);
    this.bones=new Map();this.rest=new Map();this.face=[];this.skeletons=new Set();
    source.traverse(node=>{
      if(node.isBone){this.bones.set(node.name,node);this.rest.set(node,node.quaternion.clone());}
      if(!node.isMesh)return;node.frustumCulled=false;node.castShadow=true;node.receiveShadow=true;
      if(node.skeleton)this.skeletons.add(node.skeleton);
      if(/Eye|Head|Teeth|Beard/i.test(node.name))this.face.push(node);
      for(const material of [].concat(node.material)){
        aircraft.materials.add(material);for(const value of Object.values(material))if(value?.isTexture)aircraft.textures.add(value);
        material.roughness=Math.max(.5,material.roughness||0);material.metalness=0;
        if(/Outfit_Top/.test(material.name)){material.map=null;material.color.set('#344c64');}
        if(/Outfit_Footwear/.test(material.name)){material.map=null;material.color.set('#29333b');}
      }
    });
    this.hips=this.bone('Hips');source.updateWorldMatrix(true,true);
    const hip=aircraft.root.worldToLocal(this.hips.getWorldPosition(new Vector3()));source.position.add(new Vector3(-.22,-.28,-.28).sub(hip));source.updateWorldMatrix(true,true);
    this.yoke=aircraft.yokes.reduce((a,b)=>a.position.x<b.position.x?a:b);this.arms=[];this.legs=[];
    for(const [side,sign]of [['Left',-1],['Right',1]]){
      const upper=this.bone(side+'Arm'),lower=this.bone(side+'ForeArm'),hand=this.bone(side+'Hand');
      const middle=this.bone(side+'HandMiddle1').position.clone().normalize(),across=this.bone(side+'HandIndex1').position.clone().sub(this.bone(side+'HandPinky1').position);across.addScaledVector(middle,-across.dot(middle)).normalize();
      const normal=new Vector3().crossVectors(across,middle).normalize(),bind=new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(across,middle,normal));
      const frame=new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(new Vector3(0,1,0),new Vector3(0,0,-1),new Vector3(-1,0,0)));
      this.arms.push({side,sign,upper,lower,hand,grip:new Vector3(sign*.12,-.016,.093),orientation:frame.multiply(bind.invert()),fingers:['Index','Middle','Ring','Pinky'].map(name=>[1,2,3,4].map(i=>this.bone(side+'Hand'+name+i))),thumb:[1,2,3,4].map(i=>this.bone(side+'HandThumb'+i))});
      this.legs.push({sign,upper:this.bone(side+'UpLeg'),lower:this.bone(side+'Leg'),foot:this.bone(side+'Foot')});
    }
    this.headset=this.addHeadset();this.update({view:'cockpit',surfaces:{rudder:0},brake:0},0);
    aircraft.eye.copy(aircraft.root.worldToLocal(this.bone('LeftEye').getWorldPosition(new Vector3()).add(this.bone('RightEye').getWorldPosition(new Vector3())).multiplyScalar(.5))).add(new Vector3(0,.12,.2));aircraft.light.position.copy(aircraft.eye);
  }
  bone(name){const bone=this.bones.get(name);if(!bone)throw new Error('Pilot rig missing '+name);return bone;}
  addHeadset(){
    const group=new Group(),dark=new MeshStandardMaterial({color:'#172024',roughness:.58}),padding=new MeshStandardMaterial({color:'#343f40',roughness:.92}),metal=new MeshStandardMaterial({color:'#a0a8a8',metalness:.65,roughness:.4});
    this.aircraft.materials.add(dark);this.aircraft.materials.add(padding);this.aircraft.materials.add(metal);
    const sphere=(p,s,m)=>{const mesh=new Mesh(new SphereGeometry(1,24,16),m);mesh.position.set(...p);mesh.scale.set(...s);group.add(mesh);};
    for(const sign of [-1,1]){sphere([sign*.102,.105,-.005],[.026,.061,.047],dark);sphere([sign*.085,.105,-.005],[.014,.052,.04],padding);}
    const tube=(points,r,m)=>{const mesh=new Mesh(new TubeGeometry(new CatmullRomCurve3(points.map(p=>new Vector3(...p))),32,r,8,false),m);group.add(mesh);};
    tube([[-.106,.11,-.007],[-.112,.19,-.007],[-.07,.23,-.007],[0,.245,-.007],[.07,.23,-.007],[.112,.19,-.007],[.106,.11,-.007]],.009,dark);
    tube([[-.124,.085,.01],[-.13,.045,.08],[-.07,.035,.126],[-.025,.035,.13]],.004,metal);sphere([-.024,.035,.13],[.024,.012,.013],padding);
    const hair=new Mesh(new SphereGeometry(1,32,20,0,Math.PI*2,0,Math.PI*.68),new MeshStandardMaterial({color:'#30241f',roughness:.94}));hair.position.set(0,.134,-.013);hair.scale.set(.096,.105,.084);group.add(hair);this.aircraft.materials.add(hair.material);
    this.bone('Head').add(group);return group;
  }
  orient(bone,local){const parent=bone.parent.getWorldQuaternion(new Quaternion()).invert(),world=this.aircraft.root.getWorldQuaternion(new Quaternion()).multiply(local);bone.quaternion.copy(parent.multiply(world));bone.updateWorldMatrix(false,true);}
  update(model,dt){
    for(const [bone,rotation]of this.rest)bone.quaternion.copy(rotation);
    this.bone('Spine').rotateX(.12+clamp((model.surfaces.elevator||0)/.49,0,1)*.18);this.bone('Spine1').rotateX(.10);this.root.updateWorldMatrix(true,true);
    for(const arm of this.arms){
      const {side,sign,upper,lower,hand,grip,orientation,fingers,thumb}=arm,target=this.yoke.localToWorld(grip.clone());
      solveLimb(upper,lower,hand,target,worldPoint(this.aircraft.root,[-.22+sign*.28,-.03,-.3]));
      const yokeQ=new Quaternion().setFromEuler(this.yoke.rotation).multiply(orientation);this.orient(hand,yokeQ);
      for(const digit of fingers){
        for(let i=0;i<3;i++){
          const directions=[[-sign*.8,0,-.6],[-sign*.65,0,.76],[sign*.15,0,.99]],direction=new Vector3(...directions[i]).transformDirection(this.yoke.matrixWorld);
          aimBone(digit[i],digit[i+1],digit[i].getWorldPosition(new Vector3()).add(direction));
        }
      }
      for(let i=0;i<3;i++){
        const offsets=[[sign*.105,.055,.045],[sign*.11,.045,.012],[sign*.10,.025,.005]];
        aimBone(thumb[i],thumb[i+1],this.yoke.localToWorld(new Vector3(...offsets[i])));
      }
    }
    for(const leg of this.legs){
      const rudder=(model.surfaces.rudder||0)*leg.sign*.07;
      solveLimb(leg.upper,leg.lower,leg.foot,worldPoint(this.aircraft.root,[-.22+leg.sign*.105,-.49,-.84+rudder]),worldPoint(this.aircraft.root,[-.22+leg.sign*.13,-.15,-.6]));
      this.orient(leg.foot,new Quaternion().setFromAxisAngle(new Vector3(1,0,0),-.12-(model.brake||0)*.12).multiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.PI)));
    }
    const cockpit=model.view==='cockpit';for(const mesh of this.face)mesh.visible=!cockpit&&!/Headwear/.test(mesh.name);this.headset.visible=!cockpit;this.root.updateWorldMatrix(true,true);
  }
  dispose(){for(const skeleton of this.skeletons)skeleton.dispose();}
}
