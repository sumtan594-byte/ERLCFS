import {MapRenderer} from './image-renderer.js';
import {FlightControls} from './flight-controls.js';
import {CameraControls} from './camera-controls.js';
import {Vector3} from './vendor/three.module.js';

export class CountyViewer extends MapRenderer {
  constructor(host){
    super(host);this.point=new Vector3();const canvas=this.renderer.domElement;
    canvas.tabIndex=0;canvas.setAttribute('aria-label','Interactive 3D county map');
    window.removeEventListener('keydown',this.controls.onKey,true);
    this.scopedKey=e=>{if(!this.flight&&document.activeElement===canvas)this.controls.onKey(e);};
    this.focus=()=>canvas.focus({preventScroll:true});
    window.addEventListener('keydown',this.scopedKey,true);canvas.addEventListener('pointerdown',this.focus);
  }
  overview(){
    const aspect=this.camera.aspect;this.camera.fov=aspect<.8?80:50;this.camera.updateProjectionMatrix();
    const height=Math.min(14000,Math.max(7000,11880/(2*Math.tan(this.camera.fov*Math.PI/360)*Math.min(aspect,1))));
    this.controls.target.set(-712,0,-72);this.camera.position.set(-1612,height,-72);this.controls.update();this.dirty=true;
  }
  async startFlight(onExit,status){
    if(this.flight||this.flightPending)return;this.flightPending=true;
    try{const flight=await FlightControls.create(this,onExit,status);if(flight)this.flight=flight;}finally{this.flightPending=false;}
  }
  stopFlight(){
    if(!this.flight)return;const saved=this.flight.saved;this.flight.dispose();this.flight=null;
    this.camera.position.copy(saved.position);this.camera.quaternion.copy(saved.quaternion);this.camera.fov=saved.fov;this.camera.near=saved.near;this.camera.updateProjectionMatrix();
    this.controls=new CameraControls(this.camera,this.renderer.domElement,(x,z)=>this.groundAt(x,z));this.controls.limit(...saved.box);window.removeEventListener('keydown',this.controls.onKey,true);
    this.camera.getWorldDirection(this.point);this.controls.target.copy(this.camera.position).addScaledVector(this.point,500);this.controls.update();this.dirty=true;
  }
  dispose(){this.flightCancelled=true;this.flight?.dispose();window.removeEventListener('keydown',this.scopedKey,true);this.renderer.domElement.removeEventListener('pointerdown',this.focus);super.dispose();}
}
