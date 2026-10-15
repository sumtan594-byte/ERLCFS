export class FlightHUDControls {
  constructor(viewer){
    this.viewer=viewer;
    this.root=document.createElement('div');
    this.root.className='cockpit-controls';
    this.root.setAttribute('aria-label','Aircraft levers and brakes');
    this.root.innerHTML=`<div class="lever throttle-lever"><label for="hud-throttle">THROTTLE</label><span class="lever-stop">MAX</span><div class="lever-slot"><input id="hud-throttle" type="range" min="0" max="100" step="1" value="0" aria-label="Throttle"></div><span class="lever-stop">IDLE</span><output id="hud-throttle-value" for="hud-throttle">0%</output></div><div class="lever flap-lever"><label for="hud-flaps">FLAPS</label><span class="lever-stop">UP</span><div class="lever-slot"><input id="hud-flaps" type="range" min="0" max="1" step="1" value="0" aria-label="Flap lever" aria-valuetext="Retracted"></div><span class="lever-stop">DOWN</span><output id="hud-flaps-value" for="hud-flaps">0°</output></div><div class="brake-control"><span class="control-label">BRAKES</span><button id="hud-brake" class="brake-pedal" aria-label="Hold wheel brakes" aria-pressed="false" title="Hold to brake"><span></span><span></span><span></span><span></span></button><span class="lever-stop">HOLD</span><button id="hud-parking" class="parking-pull" aria-label="Parking brake" aria-pressed="false" title="Toggle parking brake"><span>P</span></button><span class="lever-stop">PARK</span></div>`;
    document.getElementById('flight-ui').append(this.root);
    this.throttle=this.root.querySelector('#hud-throttle');
    this.flaps=this.root.querySelector('#hud-flaps');
    this.brake=this.root.querySelector('#hud-brake');
    this.parking=this.root.querySelector('#hud-parking');
    this.throttle.oninput=()=>{if(viewer.flight)viewer.flight.model.throttle=Number(this.throttle.value)/100;};
    this.flaps.oninput=()=>{if(viewer.flight)viewer.flight.model.flaps=this.flaps.value==='1';};
    const focus=()=>viewer.renderer.domElement.focus({preventScroll:true});
    this.throttle.onchange=focus;this.flaps.onchange=focus;
    this.parking.onclick=()=>{if(viewer.flight)viewer.flight.model.parkingBrake=!viewer.flight.model.parkingBrake;focus();};
    this.press=e=>{if(e.type==='pointerdown'){if(e.button!==0)return;this.brake.setPointerCapture(e.pointerId);}else if(!['Space','Enter'].includes(e.code))return;e.preventDefault();if(viewer.flight)viewer.flight.hudBrake=true;};
    this.release=()=>{if(viewer.flight)viewer.flight.hudBrake=false;};
    this.brake.addEventListener('pointerdown',this.press);
    for(const event of ['pointerup','pointercancel','lostpointercapture','blur'])this.brake.addEventListener(event,this.release);
    this.brake.addEventListener('keydown',this.press);
    this.brake.addEventListener('keyup',this.release);
    window.addEventListener('blur',this.release);
    this.visibility=()=>{if(document.hidden)this.release();};
    document.addEventListener('visibilitychange',this.visibility);
  }
  update(data){
    if(document.activeElement!==this.throttle)this.throttle.value=Math.round(data.throttle*100);
    this.flaps.value=data.flaps?'1':'0';
    this.flaps.setAttribute('aria-valuetext',data.flaps?'Extended':'Retracted');
    this.root.querySelector('#hud-throttle-value').textContent=Math.round(data.throttle*100)+'%';
    this.root.querySelector('#hud-flaps-value').textContent=Math.round(data.flapAngle)+'°';
    this.brake.setAttribute('aria-pressed',String(data.brake>.01||!!this.viewer.flight?.hudBrake));
    this.parking.setAttribute('aria-pressed',String(data.parkingBrake));
  }
  dispose(){this.release();window.removeEventListener('blur',this.release);document.removeEventListener('visibilitychange',this.visibility);this.root.remove();}
}
