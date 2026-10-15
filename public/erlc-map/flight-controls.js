import {FlightModel, METERS_PER_STUD} from './flight-model.js';
import {AircraftLayer} from './aircraft-layer.js';
import {Vector3,Quaternion,Euler,Raycaster,Vector2} from './vendor/three.module.js';
import {FlightCamera} from './flight-camera.js';

export class FlightControls {
  static async create(viewer,onExit,status) {
    const model=await FlightModel.create((x,z)=>viewer.groundAt(x,z),status);
    let aircraft;
    try {aircraft=await AircraftLayer.create(status);if(viewer.flightCancelled){aircraft.dispose();model.dispose();return null;}return new FlightControls(viewer,onExit,model,aircraft);}
    catch(e){aircraft?.dispose();model.dispose();throw e;}
  }
  constructor(viewer,onExit,model,aircraft) {
    this.viewer=viewer;this.onExit=onExit;this.model=model;this.aircraft=aircraft;this.keys=new Set();this.mouse={pitch:0,bank:0};
    this.direction=new Vector3();this.cameraPitch=0;this.cameraRoll=0;this.cameraReady=false;this.model.view='cockpit';
    this.look=new FlightCamera();this.gesture=null;this.raycaster=new Raycaster();this.pointerPoint=new Vector2();
    this.saved={position:viewer.camera.position.clone(),quaternion:viewer.camera.quaternion.clone(),fov:viewer.camera.fov,near:viewer.camera.near,box:[...viewer.controls.box]};
    this.dom=viewer.renderer.domElement;viewer.controls.dispose();viewer.controls.keys.clear();viewer.controls.vel.set(0,0,0);viewer.controls.zoom=0;
    viewer.scene.add(aircraft.root);
    this.keydown=e=>{
      if(e.ctrlKey||e.metaKey||e.altKey||document.activeElement!==this.dom)return;
      if(e.code==='Escape'){e.preventDefault();onExit();return;}
      if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyS','KeyQ','KeyE','Space','KeyF','KeyP','KeyV','KeyB','KeyR','BracketLeft','BracketRight'].includes(e.code))return;
      e.preventDefault();e.stopImmediatePropagation();
      if(!e.repeat){if(e.code==='KeyF')model.flaps=!model.flaps;if(e.code==='KeyP')model.paused=!model.paused;if(e.code==='KeyV')model.view=model.view==='cockpit'?'exterior':'cockpit';if(e.code==='KeyB')model.parkingBrake=!model.parkingBrake;if(e.code==='KeyR')this.look.reset(model.view);}
      this.keys.add(e.code);
    };
    this.keyup=e=>this.keys.delete(e.code);
    this.down=e=>{
      const control=e.button===0&&!e.shiftKey&&model.view==='cockpit'?this.controlAt(e):null;
      const mode=e.button===1||e.shiftKey?'pan':e.button===0?(control||'look'):e.button===2?'look':null;
      if(!mode)return;e.preventDefault();this.leave();this.dom.focus({preventScroll:true});this.dom.setPointerCapture(e.pointerId);
      this.gesture={mode,x:e.clientX,y:e.clientY,id:e.pointerId};
      if(mode==='parkingBrake')model.parkingBrake=!model.parkingBrake;if(mode==='flaps')model.flaps=!model.flaps;
    };
    this.up=e=>{if(this.gesture?.id===e.pointerId){this.gesture=null;if(this.dom.hasPointerCapture(e.pointerId))this.dom.releasePointerCapture(e.pointerId);}};
    this.pointer=e=>{
      if(!this.gesture&&document.activeElement!==this.dom)return;
      if(this.gesture){const g=this.gesture,dx=e.clientX-g.x,dy=e.clientY-g.y;g.x=e.clientX;g.y=e.clientY;
        if(g.mode==='throttle'||g.mode==='mixture')model[g.mode]=Math.max(0,Math.min(1,model[g.mode]-dy*.006));
        else if(g.mode==='look'||g.mode==='pan')this.look.drag(model.view,g.mode,dx,dy);return;
      }
      if(model.paused)return;
      const r=this.dom.getBoundingClientRect(),dead=v=>Math.abs(v)<.06?0:Math.max(-1,Math.min(1,v));
      this.mouse.pitch=dead((r.top+r.height/2-e.clientY)/(r.height*.42));
      this.mouse.bank=dead((e.clientX-r.left-r.width/2)/(r.width*.42));
    };
    this.wheel=e=>{e.preventDefault();const control=model.view==='cockpit'?this.controlAt(e):null,delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?this.dom.clientHeight:1);
      if(control==='throttle'||control==='mixture')model[control]=Math.max(0,Math.min(1,model[control]-delta*.001));else this.look.wheel(model.view,delta);
    };
    this.menu=e=>e.preventDefault();
    this.leave=()=>{this.mouse.pitch=0;this.mouse.bank=0;};
    this.blur=()=>{this.keys.clear();this.leave();if(this.gesture){const id=this.gesture.id;this.gesture=null;if(this.dom.hasPointerCapture(id))this.dom.releasePointerCapture(id);}model.paused=true;};
    this.visibility=()=>{if(document.hidden)this.blur();};
    window.addEventListener('keydown',this.keydown,true);window.addEventListener('keyup',this.keyup,true);window.addEventListener('blur',this.blur);
    document.addEventListener('visibilitychange',this.visibility);this.dom.addEventListener('pointermove',this.pointer);this.dom.addEventListener('pointerleave',this.leave);
    this.dom.addEventListener('pointerdown',this.down);this.dom.addEventListener('pointerup',this.up);this.dom.addEventListener('pointercancel',this.up);this.dom.addEventListener('lostpointercapture',this.up);this.dom.addEventListener('wheel',this.wheel,{passive:false});this.dom.addEventListener('contextmenu',this.menu);
    viewer.camera.near=.04;this.apply(1);this.dom.focus({preventScroll:true});
  }
  controlAt(e){const r=this.dom.getBoundingClientRect();this.pointerPoint.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.viewer.camera.updateMatrixWorld();this.aircraft.root.updateMatrixWorld(true);this.raycaster.setFromCamera(this.pointerPoint,this.viewer.camera);return this.raycaster.intersectObjects(this.aircraft.controls,false)[0]?.object.userData.flightControl;}
  update(dt) {
    const k=this.keys,axis=(p,n)=>Number(k.has(p))-Number(k.has(n));
    try {this.model.update(dt,{pitch:axis('ArrowUp','ArrowDown')||this.mouse.pitch,bank:axis('ArrowRight','ArrowLeft')||this.mouse.bank,
      rudder:axis('KeyE','KeyQ'),throttle:axis('KeyW','KeyS'),trim:axis('BracketRight','BracketLeft'),brake:k.has('Space')});}
    catch(e){this.model.paused=true;console.error(e);}
    this.apply(dt);
  }
  apply(dt) {
    const m=this.model,v=this.viewer,c=v.camera,state=m.renderState(),t=1-Math.exp(-dt*8);
    this.aircraft.update(state,m,m.paused?0:dt);
    
    this.cameraPitch+=((m.grounded?Math.max(-.06,Math.min(.035,m.acceleration*.006)):0)-this.cameraPitch)*t;
    this.cameraRoll+=((m.grounded?(m.gear[1].compression-m.gear[2].compression)*.25:0)-this.cameraRoll)*t;
    const cockpit=m.view==='cockpit',pose=this.look.pose(m.view,this.aircraft.eye.clone().divideScalar(METERS_PER_STUD));
    const pos=pose.offset.applyQuaternion(state.quaternion).add(state.position);
    if(cockpit||!this.cameraReady)c.position.copy(pos);else c.position.lerp(pos,1-Math.exp(-dt*5));
    c.quaternion.copy(state.quaternion).multiply(pose.quaternion).multiply(new Quaternion().setFromEuler(new Euler(this.cameraPitch,0,this.cameraRoll,'YXZ')));
    const fov=pose.fov+Math.min(5,m.speed*.10)+Math.max(-3,Math.min(2,m.acceleration*.45));
    c.fov+=(fov-c.fov)*t;c.updateProjectionMatrix();c.updateMatrixWorld();this.cameraReady=true;
    v.controls.target.copy(c.position).addScaledVector(c.getWorldDirection(this.direction),500);v.controls.seen.copy(v.controls.target);v.dirty=true;
  }
  dispose() {
    window.removeEventListener('keydown',this.keydown,true);window.removeEventListener('keyup',this.keyup,true);window.removeEventListener('blur',this.blur);
    document.removeEventListener('visibilitychange',this.visibility);this.dom.removeEventListener('pointermove',this.pointer);this.dom.removeEventListener('pointerleave',this.leave);
    this.dom.removeEventListener('pointerdown',this.down);this.dom.removeEventListener('pointerup',this.up);this.dom.removeEventListener('pointercancel',this.up);this.dom.removeEventListener('lostpointercapture',this.up);this.dom.removeEventListener('wheel',this.wheel);this.dom.removeEventListener('contextmenu',this.menu);
    this.aircraft.dispose();this.model.dispose();
  }
}
