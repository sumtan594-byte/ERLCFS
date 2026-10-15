import test from 'node:test';
import assert from 'node:assert/strict';
import {FlightModel,RUNWAY,onRunway,mapToGeo,geoToMap} from '../public/erlc-map/flight-model.js';
function create() {
  const values=new Map(),sdk={steps:0,setPropertyValue:(k,v)=>values.set(k,v),getPropertyValue:k=>values.get(k)||0,
    resetToInitialConditions(){},runIc(){values.set('position/lat-geod-deg',values.get('ic/lat-geod-deg'));values.set('position/long-gc-deg',values.get('ic/long-gc-deg'));values.set('position/h-sl-ft',values.get('ic/h-sl-ft'));return true;},
    run(){this.steps++;return true;},destroy(){this.destroyed=true;}};
  return {model:new FlightModel(sdk,()=>RUNWAY.y),sdk,values};
}
test('map geography round trips without changing player/map coordinates',()=>{
  for(const [x,z]of [[0,0],[5355,-5355],[RUNWAY.x,RUNWAY.z]]){const g=mapToGeo(x,z),p=geoToMap(g.lat,g.lon);assert.ok(Math.abs(p.x-x)<1e-6);assert.ok(Math.abs(p.z-z)<1e-6);}
});
test('runway initialization configures the engine and independent wheel contacts',()=>{
  const {model:m,values}=create();assert.ok(onRunway(m.x,m.z));assert.equal(values.get('propulsion/set-running'),-1);
  assert.equal(m.gear.length,3);assert.equal(m.throttle,0);m.reset(true);assert.equal(m.flaps,true);assert.ok(m.y>RUNWAY.y+100);
});
test('mouse pitch, bank and rudder deflect physical control surfaces with correct signs',()=>{
  const {model:m,values}=create();m.update(.1,{pitch:1,bank:1,rudder:1});
  assert.ok(values.get('fcs/elevator-cmd-norm')<0);assert.ok(values.get('fcs/aileron-cmd-norm')>0);assert.ok(values.get('fcs/rudder-cmd-norm')<0);
  assert.equal(m.pitch,0,'adapter does not directly invent an aircraft pitch');
});
test('throttle, braking and trim are bounded and sent to JSBSim',()=>{
  const {model:m,values}=create();for(let i=0;i<60;i++)m.update(.1,{throttle:1,trim:1,brake:true});
  assert.equal(m.throttle,1);assert.equal(m.trim,.4);assert.equal(values.get('fcs/left-brake-cmd-norm'),1);
  assert.equal(values.get('fcs/right-brake-cmd-norm'),1);m.flaps=true;m.update(.1);assert.equal(values.get('fcs/flap-cmd-norm'),2/3);
});
test('fixed-step dynamics are independent of rendering cadence and stop while paused',()=>{
  const a=create(),b=create();for(let i=0;i<120;i++)a.model.update(1/30);for(let i=0;i<480;i++)b.model.update(1/120);
  assert.ok(Math.abs(a.sdk.steps-b.sdk.steps)<=1);assert.ok(Math.abs(a.model.throttle-b.model.throttle)<.001);
  a.model.paused=true;const steps=a.sdk.steps;a.model.update(.1);assert.equal(a.sdk.steps,steps);a.model.dispose();assert.ok(a.sdk.destroyed);
});
test('gear compression and attitude come from engine state, interpolated transforms stay finite',()=>{
  const {model:m,values}=create();values.set('gear/unit[1]/compression-ft',.2);values.set('gear/unit[1]/WOW',1);values.set('attitude/theta-rad',.1);values.set('attitude/phi-rad',.2);m.update(.1);
  assert.equal(m.gear[1].compression,.06096000000000001);assert.ok(m.grounded);assert.equal(m.pitch,.1);assert.equal(m.roll,-.2);
  assert.ok(m.renderState().quaternion.toArray().every(Number.isFinite));
});
test('actual surface positions, RPM and flap progress are independent of input commands',()=>{
  const {model:m,values}=create();m.flaps=true;values.set('fcs/flap-pos-deg',7);values.set('fcs/left-aileron-pos-rad',.13);values.set('fcs/right-aileron-pos-rad',-.17);values.set('fcs/elevator-pos-rad',-.2);values.set('fcs/rudder-pos-rad',.06);values.set('propulsion/engine/propeller-rpm',2200);m.readState();
  assert.equal(m.surfaces.leftAileron,.13);assert.equal(m.surfaces.rightAileron,-.17);assert.equal(m.surfaces.elevator,-.2);assert.equal(m.surfaces.rudder,.06);assert.ok(Math.abs(m.instruments().flapAngle-7)<1e-9);assert.equal(m.rpm,2200);
});
test('parking brake maintains braking after Space is released and mixture is forwarded',()=>{
  const {model:m,values}=create();m.parkingBrake=true;m.mixture=.8;m.update(.1);assert.equal(values.get('fcs/left-brake-cmd-norm'),1);assert.equal(values.get('fcs/mixture-cmd-norm'),.8);m.parkingBrake=false;m.update(.1);assert.equal(values.get('fcs/right-brake-cmd-norm'),0);assert.equal(m.brake,0);
});
