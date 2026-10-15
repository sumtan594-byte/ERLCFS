const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export class SimAudio{
  constructor(){this.enabled=false;this.volume=.4;this.nodes=[];this.nextBird=0;this.request=0;this.visibility=()=>{if(document.hidden&&this.context)this.master.gain.setTargetAtTime(0,this.context.currentTime,.04);};document.addEventListener('visibilitychange',this.visibility);}
  async enable(enabled){
    const request=++this.request;
    if(!enabled){this.enabled=false;if(this.context)this.master.gain.setTargetAtTime(0,this.context.currentTime,.04);return;}
    if(!this.context)this.create();
    await this.context.resume();
    if(!this.recordings){this.recordings=this.loadRecordings().catch(error=>{this.recordings=null;throw error;});}
    await this.recordings;if(request===this.request)this.enabled=true;
  }
  create(){
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('Audio is unavailable in this browser');
    const c=this.context=new Audio(),master=this.master=c.createGain(),limiter=c.createDynamicsCompressor();master.gain.value=0;
    limiter.threshold.value=-12;limiter.knee.value=12;limiter.ratio.value=5;limiter.attack.value=.004;limiter.release.value=.2;
    this.analyser=c.createAnalyser();this.analyser.fftSize=1024;master.connect(limiter).connect(this.analyser).connect(c.destination);
    const buffer=c.createBuffer(1,c.sampleRate*4,c.sampleRate),data=buffer.getChannelData(0);let brown=0;
    for(let i=0;i<data.length;i++){brown=(brown+Math.random()*.04-.02)/1.02;data[i]=brown*2.8+(Math.random()*2-1)*.35;}
    this.noise=buffer;
    this.samples={};this.wind=this.loop('highpass',550,.5);this.ambient=this.loop('lowpass',650,.7);
    this.flaps=this.loop('bandpass',1100,1.4);this.servo=this.oscillator('triangle',175);this.roll=this.loop('lowpass',160,.8);this.brakes=this.loop('bandpass',2100,2);
    this.gust=c.createOscillator();const gustDepth=c.createGain();this.gust.frequency.value=.17;gustDepth.gain.value=140;this.gust.connect(gustDepth).connect(this.wind.filter.frequency);this.gust.start();this.nodes.push(this.gust);
  }
  async loadRecordings(){
    const buffers=await Promise.all(['interior','exterior'].map(async name=>{const response=await fetch(new URL('../audio/'+name+'-loop.wav',import.meta.url));if(!response.ok)throw new Error('Unable to load '+name+' engine recording');return [name,await this.context.decodeAudioData(await response.arrayBuffer())];}));
    if(this.context.state==='closed')return;
    for(const [name,buffer]of buffers){const source=this.context.createBufferSource(),gain=this.context.createGain(),pan=this.context.createStereoPanner();source.buffer=buffer;source.loop=true;gain.gain.value=0;source.connect(gain).connect(pan).connect(this.master);source.start();this.nodes.push(source);this.samples[name]={source,gain,pan};}
  }
  loop(type,frequency,q){
    const c=this.context,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=this.noise;source.loop=true;filter.type=type;filter.frequency.value=frequency;filter.Q.value=q;gain.gain.value=0;
    source.connect(filter).connect(gain).connect(this.master);source.start();this.nodes.push(source);return {source,filter,gain};
  }
  oscillator(type,frequency){
    const c=this.context,osc=c.createOscillator(),filter=c.createBiquadFilter(),gain=c.createGain(),pan=c.createStereoPanner();osc.type=type;osc.frequency.value=frequency;filter.type='lowpass';filter.frequency.value=4000;gain.gain.value=0;
    osc.connect(filter).connect(gain).connect(pan).connect(this.master);osc.start();this.nodes.push(osc);return {osc,filter,gain,pan};
  }
  target(param,value,time=.09){param.setTargetAtTime(value,this.context.currentTime,time);}
  transient(frequency,gain,duration){
    const c=this.context,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),t=c.currentTime;s.buffer=this.noise;f.type='lowpass';f.frequency.value=frequency;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);s.connect(f).connect(g).connect(this.master);s.start();s.stop(t+duration+.02);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};
  }
  bird(){
    const c=this.context,t=c.currentTime;
    for(let i=0;i<2;i++){const o=c.createOscillator(),g=c.createGain(),pan=c.createStereoPanner();o.frequency.setValueAtTime(2400+i*320,t+i*.14);o.frequency.exponentialRampToValueAtTime(3800,t+i*.14+.045);o.frequency.exponentialRampToValueAtTime(2600,t+i*.14+.11);g.gain.setValueAtTime(0,t+i*.14);g.gain.linearRampToValueAtTime(.025,t+i*.14+.015);g.gain.exponentialRampToValueAtTime(.0001,t+i*.14+.12);pan.pan.value=Math.random()*1.6-.8;o.connect(g).connect(pan).connect(this.master);o.start(t+i*.14);o.stop(t+i*.14+.14);o.onended=()=>{o.disconnect();g.disconnect();pan.disconnect();};}
  }
  update(viewer){
    if(!this.context||!this.enabled)return;
    const f=viewer.flight,m=f?.model,hidden=document.hidden,paused=!!m?.paused,cabin=m?.view==='cockpit',playing=!!m&&!paused&&!hidden;
    this.target(this.master.gain,hidden||paused?0:this.volume*.65,.05);
    const speed=playing?m.speed:0,rpm=playing?Math.max(0,m.rpm):0,throttle=playing?m.throttle:0;
    const distance=cabin?1:clamp(1/Math.sqrt((f?.look.views.exterior.zoom||60)/25),.2,1),yaw=f?.look.views[m.view]?.yaw||0;
    const rate=clamp(Math.pow(Math.max(rpm,200)/2200,.7),.5,1.3),engineGain=rpm>100?(.38+throttle*.3)*Math.sqrt(clamp(rpm/2500,0,1.2))*distance:0;
    for(const [name,sample]of Object.entries(this.samples)){this.target(sample.source.playbackRate,rate,.16);this.target(sample.gain.gain,playing&&(cabin?name==='interior':name==='exterior')?engineGain:0,.11);this.target(sample.pan.pan,Math.sin(yaw)*-.3);}
    this.target(this.wind.gain.gain,playing?clamp(speed*speed*.000045,0,.25)*(cabin?.25:1):0);
    const altitude=Math.max(0,viewer.camera.position.y-(viewer.groundAt(viewer.camera.position.x,viewer.camera.position.z)||0));
    this.target(this.ambient.gain.gain,hidden||paused?0:(playing?.004:.022)*clamp(1-altitude/12000,.15,1));
    const flapAngle=m?.surfaces.flaps||0,now=this.context.currentTime;
    const flapMoving=playing&&this.lastFlap!=null&&Math.abs(flapAngle-this.lastFlap)>.000015;
    this.target(this.flaps.gain.gain,flapMoving?.045:0,.025);this.target(this.servo.gain.gain,flapMoving?.018:0,.025);
    if(this.movingFlaps&&!flapMoving&&playing)this.transient(1800,.025,.07);
    this.movingFlaps=flapMoving;this.lastFlap=flapAngle;
    this.target(this.roll.gain.gain,playing&&m.grounded?Math.min(.11,speed*.004):0);
    this.target(this.brakes.gain.gain,playing&&m.grounded&&m.brake?Math.min(.035,speed*.0015):0);
    if(playing&&m.grounded&&this.wasGrounded===false&&this.lastDescent<-.6)this.transient(180,Math.min(.2,-this.lastDescent*.025),.22);
    this.wasGrounded=playing?m.grounded:null;this.lastDescent=m?.verticalSpeed||0;
    if(!playing&&!hidden&&!paused&&altitude<350&&now>this.nextBird){this.bird();this.nextBird=now+9+Math.random()*9;}
  }
  dispose(){this.enabled=false;this.request++;document.removeEventListener('visibilitychange',this.visibility);for(const n of this.nodes)try{n.stop();}catch{}this.context?.close();}
}
