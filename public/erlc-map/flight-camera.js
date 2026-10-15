import {Vector3,Quaternion,Euler} from './vendor/three.module.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class FlightCamera {
  constructor(){this.views={cockpit:{yaw:0,pitch:0,pan:new Vector3(),zoom:76},exterior:{yaw:0,pitch:Math.atan2(12,55),pan:new Vector3(),zoom:Math.hypot(12,55)}};}
  reset(view){const fresh=new FlightCamera();this.views[view]=fresh.views[view];}
  drag(view,mode,dx,dy){
    const s=this.views[view];
    if(mode==='look'){s.yaw-=dx*.004;s.pitch=clamp(s.pitch-dy*.004,view==='cockpit'?-1.25:-.95,view==='cockpit'?1.1:1.3);if(view==='cockpit')s.yaw=clamp(s.yaw,-2.65,2.65);}
    else {const scale=view==='cockpit'?.0025:s.zoom*.002;s.pan.x-=dx*scale;s.pan.y+=dy*scale;
      s.pan.x=clamp(s.pan.x,view==='cockpit'?-.45:-150,view==='cockpit'?.45:150);s.pan.y=clamp(s.pan.y,view==='cockpit'?-.25:-150,view==='cockpit'?.3:150);}
  }
  wheel(view,delta){const s=this.views[view];s.zoom=view==='cockpit'?clamp(s.zoom+delta*.035,35,100):clamp(s.zoom*Math.exp(delta*.001),22,350);}
  pose(view,eye){
    const s=this.views[view],cockpit=view==='cockpit';
    const quaternion=new Quaternion().setFromEuler(new Euler(cockpit?s.pitch-.1:-s.pitch,s.yaw,0,'YXZ'));
    const offset=cockpit?eye.clone():new Vector3(Math.sin(s.yaw)*Math.cos(s.pitch)*s.zoom,Math.sin(s.pitch)*s.zoom,Math.cos(s.yaw)*Math.cos(s.pitch)*s.zoom);
    offset.add(s.pan.clone().multiplyScalar(cockpit?1/.28:1).applyQuaternion(quaternion));return {offset,quaternion,fov:cockpit?s.zoom:62};
  }
}
