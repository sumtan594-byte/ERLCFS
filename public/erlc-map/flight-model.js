import {Euler, Quaternion, Vector3} from './vendor/three.module.js';
export const METERS_PER_STUD = .28;
export const RUNWAY = {x:1863.5935,z:-1501.9769,y:115.439,yaw:-1.5883,length:1297.65,width:80};
const FT=.3048,RAD=Math.PI/180,EARTH=6378137,LAT=33,LON=-84;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function onRunway(x,z) {
  const dx=x-RUNWAY.x,dz=z-RUNWAY.z;
  return Math.abs(-dx*Math.sin(RUNWAY.yaw)-dz*Math.cos(RUNWAY.yaw))<RUNWAY.length/2&&Math.abs(dx*Math.cos(RUNWAY.yaw)-dz*Math.sin(RUNWAY.yaw))<RUNWAY.width/2;
}
export function mapToGeo(x,z) {return {lat:LAT+(x-RUNWAY.x)*METERS_PER_STUD/EARTH/RAD,lon:LON+(z-RUNWAY.z)*METERS_PER_STUD/(EARTH*Math.cos(LAT*RAD))/RAD};}
export function geoToMap(lat,lon) {return {x:RUNWAY.x+(lat-LAT)*RAD*EARTH/METERS_PER_STUD,z:RUNWAY.z+(lon-LON)*RAD*EARTH*Math.cos(LAT*RAD)/METERS_PER_STUD};}
export const flightAsset=file=>new URL('../runtime/'+file,import.meta.url).href;
export class FlightModel {
  static async create(groundAt,status=()=>{}) {
    status('Loading JSBSim flight dynamics');
    const {JSBSimSdk}=await import(flightAsset('sdk.js'));
    const sdk=await JSBSimSdk.create({moduleUrl:flightAsset('engine.mjs'),wasmUrl:flightAsset('engine.wasm'),log:{console:false}});
    try {
      sdk.setDebugLevel(0);sdk.setDt(1/120);status('Loading Cessna 172 aerodynamics');
      await Promise.all([['c172p.xml','aircraft/c172p/c172p.xml'],['eng_io320.xml','engine/eng_io320.xml'],['prop_75in2f.xml','engine/prop_75in2f.xml']].map(async([file,path])=>{
        const r=await fetch(flightAsset(file));if(!r.ok)throw new Error('Cessna flight data unavailable');sdk.writeDataFile(path,await r.text());
      }));
      if(!sdk.loadModel('c172p'))throw new Error('Cessna dynamics could not initialize');
      return new FlightModel(sdk,groundAt);
    }catch(e){sdk.destroy();throw e;}
  }
  constructor(sdk,groundAt) {this.sdk=sdk;this.groundAt=groundAt;this.reset();}
  get(key) {const n=this.sdk.getPropertyValue(key);return Number.isFinite(n)?n:0;}
  set(key,value) {this.sdk.setPropertyValue(key,value);}
  reset(approach=false) {
    this.sdk.resetToInitialConditions(2);
    const distance=approach?-2700:-560;
    const x=RUNWAY.x-Math.sin(RUNWAY.yaw)*distance,z=RUNWAY.z-Math.cos(RUNWAY.yaw)*distance,geo=mapToGeo(x,z);
    this.throttle=approach?.27:0;this.flaps=approach;this.trim=approach?-.03:0;
    this.parkingBrake=false;this.mixture=1;
    this.paused=false;this.crashed=false;this.touchdown=null;this.accumulator=0;
    this.input={pitch:0,bank:0,rudder:0};this.engineThrottle=this.throttle;
    const values={'ic/lat-geod-deg':geo.lat,'ic/long-gc-deg':geo.lon,
      'ic/h-sl-ft':RUNWAY.y*METERS_PER_STUD/FT+(approach?145*METERS_PER_STUD/FT:4.4),
      'ic/terrain-elevation-ft':RUNWAY.y*METERS_PER_STUD/FT,'ic/psi-true-deg':(-RUNWAY.yaw/RAD-90+360)%360,
      'ic/theta-deg':approach?2:0,'ic/phi-deg':0,'ic/u-fps':approach?32/FT:0,'ic/v-fps':0,'ic/w-fps':approach?5:0,
      'fcs/throttle-cmd-norm':this.throttle,'fcs/mixture-cmd-norm':1,'fcs/flap-cmd-norm':approach?2/3:0,
      'fcs/elevator-cmd-norm':0,'fcs/aileron-cmd-norm':0,'fcs/rudder-cmd-norm':0,'fcs/pitch-trim-cmd-norm':this.trim,
      'fcs/left-brake-cmd-norm':approach?0:1,'fcs/right-brake-cmd-norm':approach?0:1,
      'propulsion/magneto_cmd':3,'propulsion/set-running':-1};
    for(const [k,v]of Object.entries(values))this.set(k,v);
    if(!this.sdk.runIc())throw new Error('Cessna initial conditions failed');
    if(!approach)for(let i=0;i<240;i++)this.sdk.run();
    this.readState();this.previous=this.state();this.current=this.state();this.lastSpeed=this.speed;this.acceleration=0;
  }
  state() {return {position:new Vector3(this.x,this.y,this.z),quaternion:new Quaternion().setFromEuler(new Euler(this.pitch,this.yaw,this.roll,'YXZ'))};}
  update(dt,input={}) {
    if(this.paused||this.crashed)return;
    this.accumulator+=clamp(dt,0,.25);const step=1/120;
    while(this.accumulator>=step){
      this.previous=this.current;
      this.throttle=clamp(this.throttle+(input.throttle||0)*step*.24,0,1);this.trim=clamp(this.trim+(input.trim||0)*step*.08,-.4,.4);
      for(const axis of ['pitch','bank','rudder'])this.input[axis]+=(clamp(input[axis]||0,-1,1)-this.input[axis])*(1-Math.exp(-step*7));
      this.engineThrottle+=(this.throttle-this.engineThrottle)*(1-Math.exp(-step*2.5));
      this.set('fcs/throttle-cmd-norm',this.engineThrottle);this.set('fcs/elevator-cmd-norm',-this.input.pitch*.65);
      this.set('fcs/mixture-cmd-norm',this.mixture);
      this.set('fcs/aileron-cmd-norm',this.input.bank*.65);this.set('fcs/rudder-cmd-norm',-this.input.rudder*.7);
      this.set('fcs/pitch-trim-cmd-norm',this.trim);this.set('fcs/flap-cmd-norm',this.flaps?2/3:0);
      this.set('fcs/left-brake-cmd-norm',input.brake||this.parkingBrake?1:0);this.set('fcs/right-brake-cmd-norm',input.brake||this.parkingBrake?1:0);
      
      const ground=onRunway(this.x,this.z)?RUNWAY.y:this.groundAt(this.x,this.z);
      if(Number.isFinite(ground)&&ground>-9998)this.set('position/terrain-elevation-asl-ft',ground*METERS_PER_STUD/FT);
      const wasGrounded=this.grounded,descent=this.verticalSpeed;
      if(!this.sdk.run())throw new Error('JSBSim stopped');this.readState();
      this.acceleration=(this.speed-this.lastSpeed)/step;this.lastSpeed=this.speed;
      if(!wasGrounded&&this.grounded){this.touchdown=descent<-2?'Firm landing':'Smooth landing';if(descent<-7)this.crashed=true;}
      this.current=this.state();this.accumulator-=step;
    }
  }
  readState() {
    const pos=geoToMap(this.get('position/lat-geod-deg'),this.get('position/long-gc-deg'));
    this.x=pos.x;this.z=pos.z;this.y=this.get('position/h-sl-ft')*FT/METERS_PER_STUD;
    this.pitch=this.get('attitude/theta-rad');this.roll=-this.get('attitude/phi-rad');this.yaw=-this.get('attitude/psi-rad')-Math.PI/2;
    this.speed=this.get('velocities/vtrue-kts')/1.94384;this.verticalSpeed=-this.get('velocities/v-down-fps')*FT;
    this.aoa=this.speed>3?this.get('aero/alpha-rad'):0;this.beta=this.get('aero/beta-rad');this.stall=this.speed>10&&(this.get('aero/stall-hyst-norm')>.5||this.aoa>.28);
    this.gear=[0,1,2].map(i=>({wow:this.get(`gear/unit[${i}]/WOW`)>0,compression:this.get(`gear/unit[${i}]/compression-ft`)*FT}));
    this.grounded=this.gear.some(g=>g.wow);this.rpm=this.get('propulsion/engine/propeller-rpm');
    this.surfaces={elevator:this.get('fcs/elevator-pos-rad'),leftAileron:this.get('fcs/left-aileron-pos-rad'),rightAileron:this.get('fcs/right-aileron-pos-rad'),rudder:this.get('fcs/rudder-pos-rad'),flaps:this.get('fcs/flap-pos-deg')*RAD};
    this.brake=Math.max(this.get('fcs/left-brake-cmd-norm'),this.get('fcs/right-brake-cmd-norm'));
  }
  renderState() {
    const t=this.paused?1:clamp(this.accumulator*120,0,1);
    return {position:this.previous.position.clone().lerp(this.current.position,t),quaternion:this.previous.quaternion.clone().slerp(this.current.quaternion,t)};
  }
  instruments() {
    return {speed:this.speed*1.94384,altitude:this.get('position/h-sl-ft'),agl:Math.max(0,this.get('position/h-agl-ft')),
      verticalSpeed:this.verticalSpeed*196.85,heading:(this.get('attitude/psi-deg')+360)%360,
      pitch:this.pitch/RAD,roll:this.roll/RAD,aoa:this.aoa/RAD,beta:this.beta/RAD,throttle:this.throttle,flaps:this.flaps,
      trim:this.trim,rpm:this.rpm,gear:this.gear,paused:this.paused,view:this.view||'cockpit',
      flapAngle:this.surfaces.flaps/RAD,parkingBrake:this.parkingBrake,brake:this.brake,mixture:this.mixture,
      fuel:this.get('propulsion/total-fuel-lbs')/6,fuelLeft:this.get('propulsion/tank/contents-lbs')/6,fuelRight:this.get('propulsion/tank[1]/contents-lbs')/6,
      fuelFlow:this.get('propulsion/engine/fuel-flow-rate-gph'),oilPressure:this.get('propulsion/engine/oil-pressure-psi'),oilTemperature:this.get('propulsion/engine/oil-temperature-degF'),
      power:this.get('propulsion/engine/power-hp'),manifold:this.get('propulsion/engine/map-inhg'),turnRate:this.get('velocities/r-rad_sec')/RAD,elapsed:this.get('simulation/sim-time-sec'),
      status:this.crashed?'Hard impact':this.paused?'Paused':this.stall?'Stall':this.grounded?this.touchdown||'On ground':'Airborne'};
  }
  dispose() {this.sdk.destroy();}
}
