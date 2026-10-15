import {Group, Mesh, Box3, Matrix4, Vector3, PointLight, CircleGeometry, MeshBasicMaterial, DoubleSide,Plane} from './vendor/three.module.js';
import {flightAsset, METERS_PER_STUD} from './flight-model.js';
import {splitGeometry} from './aircraft-geometry.js';
import {FlightInstruments} from './flight-instruments.js';
import {addAircraftBranding} from './aircraft-branding.js';
import {PilotRig} from './pilot-rig.js';

export class AircraftLayer {
  static async create(status=()=>{}) {
    status('Loading Cessna exterior and cockpit');
    const {GLTFLoader}=await import(flightAsset('GLTFLoader.js'));
    const loader=new GLTFLoader();
    const [gltf,pilot]=await Promise.all(['cessna172.glb','pilot.glb'].map(file=>loader.loadAsync(new URL('./aircraft/'+file,import.meta.url).href)));
    return new AircraftLayer(gltf.scene,pilot.scene);
  }
  constructor(source,pilot) {
    source.updateMatrixWorld(true);
    const box=new Box3().setFromObject(source),scale=10.912/(box.max.x-box.min.x);
    
    const transform=new Matrix4().makeTranslation(0,-box.min.y*scale-1.32,-.24);
    transform.multiply(new Matrix4().makeRotationY(Math.PI)).multiply(new Matrix4().makeScale(scale,scale,scale));
    this.root=new Group();this.root.name='Cessna172';this.root.scale.setScalar(1/METERS_PER_STUD);
    this.yokes=[];this.gear=[];this.propeller=null;this.materials=new Set();this.textures=new Set();this.surfaces=[];this.controls=[];
    source.traverse(node=>{
      if(!node.isMesh)return;
      const geometry=node.geometry.clone().applyMatrix4(transform.clone().multiply(node.matrixWorld));
      geometry.computeBoundingBox();const pivot=geometry.boundingBox.getCenter(new Vector3());geometry.translate(-pivot.x,-pivot.y,-pivot.z);
      const mesh=new Mesh(geometry,node.material);mesh.name=node.name;mesh.position.copy(pivot);mesh.userData.home=pivot.clone();this.root.add(mesh);
      for(const material of [].concat(node.material)){
        this.materials.add(material);
        for(const value of Object.values(material))if(value?.isTexture)this.textures.add(value);
        if(material.name==='Glass_MAT'){material.transparent=true;material.opacity=.16;material.depthWrite=false;}
      }
      if(node.name.includes('Steering_MAT'))this.yokes.push(mesh);
      const control=node.name.match(/^Dynamic_Switch_00([2567])_/);
      if(control){mesh.userData.flightControl={2:'parkingBrake',5:'throttle',6:'mixture',7:'flaps'}[control[1]];this.controls.push(mesh);}
      const part=node.name.match(/Exterior_Body_MAT_00(\d\d)_/);
      if(part){const n=Number(part[1]);if(n===1)this.propeller=mesh;
        if([19,21,22,23].includes(n))this.gear.push({mesh,index:n===22?1:n===23?2:0});
        if(n===20)this.mainStrut=mesh;
        if([12,13,14,15,16,17].includes(n)){
          const pivot=new Vector3(0,geometry.boundingBox.getCenter(new Vector3()).y,geometry.boundingBox.min.z).add(mesh.position);
          const group=this.hinge(mesh,pivot);this.surfaces.push({group,axis:new Vector3(1,0,0),key:n===14?'leftAileron':n===15?'rightAileron':n>=16?'flaps':'elevator',sign:1});
        }
        if(n===8)this.fin=mesh;
      }
    });
    if(this.fin){
      const fin=this.fin,full=fin.geometry.clone().translate(fin.position.x,fin.position.y,fin.position.z),plane=new Plane(new Vector3(0,.2,1).normalize(),-5.02/Math.hypot(1,.2));
      const [fixed,moving]=splitGeometry(full,plane);full.dispose();fin.geometry.dispose();fin.geometry=fixed.translate(-fin.position.x,-fin.position.y,-fin.position.z);
      const mesh=new Mesh(moving,fin.material);mesh.name='Rudder';this.root.add(mesh);const group=this.hinge(mesh,new Vector3(0,0,5.02));
      this.surfaces.push({group,axis:new Vector3(0,1,-.2).normalize(),key:'rudder',sign:-1});
    }
    source.traverse(node=>{if(node.isMesh)node.geometry.dispose();});
    if(this.propeller){
      const material=new MeshBasicMaterial({color:0x9ea9ae,transparent:true,opacity:.07,depthWrite:false,side:DoubleSide});
      this.propBlur=new Mesh(new CircleGeometry(.87,48),material);this.propBlur.position.copy(this.propeller.position);this.root.add(this.propBlur);this.materials.add(material);
    }
    this.eye=new Vector3(-.22,.38,-.12);this.light=new PointLight(0xfff4df,.8,3,2);this.light.position.copy(this.eye);this.root.add(this.light);
    this.instruments=new FlightInstruments(this.root,this.materials,this.textures);
    addAircraftBranding(this);
    this.pilot=new PilotRig(pilot,this);
  }
  hinge(mesh,pivot){const group=new Group();group.name=mesh.name+' hinge';group.position.copy(pivot);mesh.position.sub(pivot);group.add(mesh);this.root.add(group);return group;}
  update(state,model,dt) {
    this.root.position.copy(state.position);this.root.quaternion.copy(state.quaternion);
    for(const surface of this.surfaces)surface.group.quaternion.setFromAxisAngle(surface.axis,model.surfaces[surface.key]*surface.sign);
    for(const yoke of this.yokes){yoke.rotation.z=-model.surfaces.leftAileron/.26*.65;yoke.position.z=yoke.userData.home.z-model.surfaces.elevator/.49*.085;}
    this.pilot.update(model,dt);
    for(const control of this.controls){const key=control.userData.flightControl;control.position.copy(control.userData.home);
      if(key==='throttle'||key==='mixture')control.position.z+=(1-model[key])*.05;
      if(key==='parkingBrake')control.position.z+=model.parkingBrake?.018:0;
      if(key==='flaps')control.position.y-=model.surfaces.flaps/(Math.PI/6)*.025;
    }
    for(const {mesh,index} of this.gear)mesh.position.y=mesh.userData.home.y+model.gear[index].compression;
    if(this.mainStrut)this.mainStrut.scale.y=Math.max(.75,1-(model.gear[1].compression+model.gear[2].compression)*1.5);
    if(this.propeller){this.propeller.rotation.z=(this.propeller.rotation.z+model.rpm*Math.PI/30*dt)%(Math.PI*2);this.propeller.visible=model.rpm<600;this.propBlur.visible=model.rpm>=600;this.propBlur.rotation.z=this.propeller.rotation.z;this.propBlur.material.opacity=Math.min(.15,.025+model.rpm/30000);}
    this.instruments.update(model,dt);
  }
  dispose() {this.pilot.dispose();this.root.removeFromParent();this.root.traverse(n=>n.geometry?.dispose());for(const m of this.materials)m.dispose();for(const t of this.textures)t.dispose();}
}
