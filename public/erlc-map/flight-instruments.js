import {CanvasTexture,MeshBasicMaterial,Mesh,CircleGeometry,PlaneGeometry,SRGBColorSpace} from './vendor/three.module.js';
const RAD=Math.PI/180,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const DIALS=[
  ['Fuel flow',-.383,.242,-.915,.027,'fuelFlow',0,20,'GPH'],
  ['Airspeed',-.308,.251,-.915,.035,'speed',0,160,'KTS'],
  ['Attitude',-.222,.251,-.915,.036,'attitude'],
  ['Altitude',-.132,.253,-.915,.036,'altitude',0,1000,'FT'],
  ['RPM',-.044,.254,-.915,.036,'rpm',0,3000,'RPM'],
  ['Oil pressure',.246,.253,-.915,.036,'oilPressure',0,100,'PSI'],
  ['Oil temperature',.338,.253,-.915,.036,'oilTemperature',0,300,'°F'],
  ['Turn / slip',-.308,.160,-.909,.036,'turn'],
  ['Heading',-.222,.160,-.909,.036,'heading'],
  ['Vertical speed',-.133,.161,-.909,.036,'verticalSpeed',-2000,2000,'FPM'],
  ['Fuel',.239,.166,-.907,.030,'fuel',0,40,'GAL'],
  ['Attitude',-.308,.065,-.887,.043,'attitude'],
  ['Manifold',-.132,.069,-.905,.026,'manifold',0,35,'IN HG'],
  ['Engine power',-.045,.068,-.904,.028,'power',0,180,'HP'],
  ['Clock',-.044,.160,-.907,.036,'clock'],
  ['Fuel remaining',-.416,.060,-.902,.020,'fuel',0,40,'GAL'],
];
export class FlightInstruments {
  constructor(root,materials,textures){
    this.faces=DIALS.map(def=>this.face(root,materials,textures,def));
    this.screen=this.face(root,materials,textures,['Navigation',.1,.142,-.876,.08,'navigation'],true);this.elapsed=1;
  }
  face(root,materials,textures,def,rect=false){
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=rect?384:256;
    const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;const material=new MeshBasicMaterial({map:texture,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
    const mesh=new Mesh(rect?new PlaneGeometry(.147,.229):new CircleGeometry(def[4],48),material);mesh.name='Live instrument: '+def[0];mesh.position.set(def[1],def[2],def[3]);mesh.rotation.x=-.06;root.add(mesh);materials.add(material);textures.add(texture);
    return {def,canvas,ctx:canvas.getContext('2d'),texture,mesh};
  }
  update(model,dt){
    this.elapsed+=dt;const controls=[model.throttle,model.mixture,model.parkingBrake,model.flaps].join(':');if(this.elapsed<1/20&&controls===this.lastControls)return;this.elapsed=0;this.lastControls=controls;const data=model.instruments();
    for(const face of this.faces)this.draw(face,data);this.draw(this.screen,data);
  }
  draw(face,d){
    const {ctx:c,canvas,def,texture}=face,key=def[5];c.clearRect(0,0,canvas.width,canvas.height);c.fillStyle='#11181b';c.fillRect(0,0,canvas.width,canvas.height);
    c.textAlign='center';c.textBaseline='middle';c.strokeStyle='#bdced4';c.fillStyle='#eef5f5';c.lineWidth=2;c.font='15px monospace';
    if(key==='navigation'){
      c.fillStyle='#8fd8e0';c.font='bold 20px monospace';c.fillText('FLIGHT DATA',128,28);
      const rows=[['IAS',`${d.speed.toFixed(0)} KT`],['ALT',`${d.altitude.toFixed(0)} FT`],['HDG',`${d.heading.toFixed(0)}°`],['V/S',`${d.verticalSpeed.toFixed(0)}`],['FUEL L',`${d.fuelLeft.toFixed(1)} GAL`],['FUEL R',`${d.fuelRight.toFixed(1)} GAL`],['FLAPS',`${d.flapAngle.toFixed(0)}°`],['THROTTLE',`${Math.round(d.throttle*100)}%`],['PARK',d.parkingBrake?'SET':'RELEASED']];
      c.font='17px monospace';rows.forEach(([label,value],i)=>{c.textAlign='left';c.fillStyle='#84989f';c.fillText(label,12,66+i*31);c.textAlign='right';c.fillStyle='#edf8e8';c.fillText(value,244,66+i*31);});
    } else if(key==='attitude'){
      c.save();c.translate(128,128);c.rotate(d.roll*RAD);c.translate(0,d.pitch*3);c.fillStyle='#3587b4';c.fillRect(-300,-600,600,600);c.fillStyle='#97613c';c.fillRect(-300,0,600,600);c.strokeStyle='#fff';
      for(let p=-30;p<=30;p+=10){c.beginPath();c.moveTo(-35,-p*3);c.lineTo(35,-p*3);c.stroke();}c.restore();c.fillStyle='#ffd962';c.fillRect(54,125,60,5);c.fillRect(142,125,60,5);c.fillRect(123,123,10,10);
    } else if(key==='heading'){
      c.save();c.translate(128,128);c.rotate(-d.heading*RAD);for(let h=0;h<360;h+=30){c.save();c.rotate(h*RAD);c.fillText(h===0?'N':h===90?'E':h===180?'S':h===270?'W':String(h/10),0,-92);c.restore();}c.restore();this.needle(c,0,72);c.fillText(String(Math.round(d.heading)%360).padStart(3,'0')+'°',128,175);
    } else if(key==='clock'){
      const seconds=d.elapsed||0;for(let i=1;i<=12;i++){const a=i*Math.PI/6;c.fillText(String(i),128+Math.sin(a)*94,128-Math.cos(a)*94);}this.needle(c,(seconds/3600%12)*Math.PI/6,53);this.needle(c,(seconds/60%60)*Math.PI/30,82);c.fillText('FLIGHT TIME',128,214);
    } else if(key==='turn'){
      c.save();c.translate(128,110);c.rotate(clamp(d.turnRate,-10,10)*RAD*5);c.fillRect(-70,-3,140,6);c.fillRect(-3,-18,6,44);c.restore();c.strokeStyle='#75858b';c.strokeRect(40,175,176,25);c.fillStyle='#fff';c.beginPath();c.arc(128+clamp(d.beta,-12,12)*5,187,10,0,Math.PI*2);c.fill();c.fillText('TURN / SLIP',128,225);
    } else {
      const min=def[6],max=def[7],value=d[key]||0,angle=v=>(-135+(v-min)/(max-min)*270)*RAD;
      for(let i=0;i<=10;i++){const a=angle(min+(max-min)*i/10);c.save();c.translate(128,128);c.rotate(a);c.beginPath();c.moveTo(0,-108);c.lineTo(0,-98);c.stroke();c.restore();
        if(i%2===0){c.fillText(String(Math.round(min+(max-min)*i/10)),128+Math.sin(a)*81,128-Math.cos(a)*81);}}
      this.needle(c,angle(clamp(key==='altitude'?value%1000:value,min,max)),85);c.font='bold 20px monospace';c.fillText(Math.round(value),128,169);c.font='14px monospace';c.fillText(def[0].toUpperCase(),128,207);c.fillStyle='#8fa2ab';c.fillText(def[8],128,229);
    }
    if(key!=='navigation'){c.strokeStyle='#050809';c.lineWidth=9;c.beginPath();c.arc(128,128,123,0,Math.PI*2);c.stroke();}texture.needsUpdate=true;
  }
  needle(c,angle,length){c.save();c.translate(128,128);c.rotate(angle);c.fillStyle='#fff3cc';c.beginPath();c.moveTo(-3,10);c.lineTo(0,-length);c.lineTo(3,10);c.fill();c.beginPath();c.arc(0,0,7,0,Math.PI*2);c.fill();c.restore();}
}
