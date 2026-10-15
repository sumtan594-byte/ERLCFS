import {CountyViewer} from './erlc-map/viewer.js';
import {SimAudio} from './erlc-map/sim-audio.js';
import {SceneEffects} from './erlc-map/scene-effects.js';

const $=id=>document.getElementById(id);
const viewer=new CountyViewer($('map'));
window.countyFlight=viewer;
const audio=new SimAudio(),effects=viewer.effects=new SceneEffects(viewer);
window.countyAudio=audio;
let preferences={};try{preferences=JSON.parse(localStorage.getItem('county-flight-settings')||'{}')||{};}catch{}
const save=()=>{try{localStorage.setItem('county-flight-settings',JSON.stringify(preferences));}catch{}};
const settingError=error=>{$('settings-status').textContent=error.message||'Unable to apply settings';$('settings-status').hidden=false;};
audio.volume=Math.max(0,Math.min(1,Number(preferences.volume??.4)||0));$('volume').value=Math.round(audio.volume*100);$('volume-value').textContent=Math.round(audio.volume*100)+'%';
$('sound-enabled').checked=!!preferences.sound;
effects.strength=Math.max(0,Math.min(1,Number(preferences.strength??.8)||0));effects.exposure=Math.max(.8,Math.min(1.3,Number(preferences.exposure??1.05)||1.05));
$('shader-strength').value=Math.round(effects.strength*100);$('strength-value').textContent=Math.round(effects.strength*100)+'%';$('exposure').value=Math.round(effects.exposure*100);$('exposure-value').textContent=effects.exposure.toFixed(2);$('shaders-enabled').checked=!!preferences.shaders;
const timeText=hour=>{const minutes=Math.round(hour*60);return String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');};
effects.lighting.hour=Math.max(7,Math.min(19.5,Number(preferences.hour??18.8)||18.8));$('sun-time').value=effects.lighting.hour;$('sun-time-value').textContent=timeText(effects.lighting.hour);
$('sun-time').oninput=e=>{effects.lighting.hour=Number(e.target.value);effects.lighting.applyTime();preferences.hour=effects.lighting.hour;$('sun-time-value').textContent=timeText(effects.lighting.hour);save();};
$('sound-enabled').onchange=async e=>{try{await audio.enable(e.target.checked);preferences.sound=e.target.checked;save();$('settings-status').hidden=true;}catch(error){e.target.checked=false;settingError(error);}};
$('volume').oninput=e=>{audio.volume=Number(e.target.value)/100;preferences.volume=audio.volume;$('volume-value').textContent=e.target.value+'%';save();};
function setShaders(enabled){try{effects.setEnabled(enabled);$('shader-strength').disabled=!enabled;$('exposure').disabled=!enabled;$('sun-time').disabled=!enabled;preferences.shaders=enabled;save();}catch(error){$('shaders-enabled').checked=false;effects.setEnabled(false);settingError(error);}}
$('shaders-enabled').onchange=e=>setShaders(e.target.checked);
$('shader-strength').oninput=e=>{effects.strength=Number(e.target.value)/100;preferences.strength=effects.strength;$('strength-value').textContent=e.target.value+'%';save();};
$('exposure').oninput=e=>{effects.exposure=Number(e.target.value)/100;preferences.exposure=effects.exposure;$('exposure-value').textContent=effects.exposure.toFixed(2);save();};
document.addEventListener('pointerdown',()=>{if($('sound-enabled').checked)audio.enable(true).catch(settingError);},{once:true});
const desktop=matchMedia('(min-width:768px) and (pointer:fine)');
let ready=false,busy=false,frame;
function status(text,progress){
  $('loading').hidden=false;$('status').textContent=text;
  if(progress?.total){$('progress').max=progress.total;$('progress').value=progress.loaded;}else $('progress').removeAttribute('value');
}
function fail(error){document.body.classList.remove('clear-display');busy=false;status(error.message||'Unable to load');$('retry').hidden=false;$('fly').disabled=!ready||!desktop.matches;}
function focus(){viewer.renderer.domElement.focus({preventScroll:true});}
function toggleDisplay(e){
  if(e.code!=='KeyH'||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;
  e.preventDefault();document.body.classList.toggle('clear-display');focus();
}
window.addEventListener('keydown',toggleDisplay,true);
function stop(){viewer.stopFlight();$('flight-ui').hidden=true;$('exit').hidden=true;$('fly').hidden=!desktop.matches;$('overview').disabled=false;$('loading').hidden=true;focus();}
function action(fn){if(!viewer.flight)return;fn(viewer.flight.model,viewer.flight);focus();}
$('retry').onclick=()=>location.reload();
$('overview').onclick=()=>{viewer.overview();focus();};
$('fly').onclick=async()=>{
  if(busy||!ready||!desktop.matches)return;busy=true;$('fly').disabled=true;$('overview').disabled=true;
  try{await viewer.startFlight(stop,status);if(!viewer.flight)return;$('flight-ui').hidden=false;$('exit').hidden=false;$('fly').hidden=true;$('loading').hidden=true;focus();}catch(error){$('overview').disabled=false;fail(error);}finally{busy=false;$('fly').disabled=!desktop.matches;}
};
$('exit').onclick=stop;
$('view').onclick=()=>action(m=>m.view=m.view==='cockpit'?'exterior':'cockpit');
$('pause').onclick=()=>action(m=>m.paused=!m.paused);
$('restart').onclick=()=>action(m=>m.reset());
$('approach').onclick=()=>action(m=>m.reset(true));
$('centre').onclick=()=>action((m,f)=>f.look.reset(m.view));
$('flaps').onclick=()=>action(m=>m.flaps=!m.flaps);
$('parking').onclick=()=>action(m=>m.parkingBrake=!m.parkingBrake);
$('throttle').oninput=e=>{if(viewer.flight)viewer.flight.model.throttle=Number(e.target.value)/100;};
$('throttle').onchange=focus;
desktop.addEventListener('change',()=>{$('fly').hidden=!desktop.matches||!!viewer.flight;$('fly').disabled=!ready||busy||!desktop.matches;if(!desktop.matches&&viewer.flight)stop();});
$('fly').hidden=!desktop.matches;
function update(){
  audio.update(viewer);
  const f=viewer.flight;
  if(f){const data=f.model.instruments();$('speed').textContent=Math.round(data.speed);$('heading').textContent=String(Math.round(data.heading)%360).padStart(3,'0');$('altitude').textContent=Math.round(data.altitude);$('vertical').textContent=Math.round(data.verticalSpeed/10)*10;$('power').textContent=Math.round(data.throttle*100)+'%';if(document.activeElement!==$('throttle'))$('throttle').value=Math.round(data.throttle*100);$('view').textContent=data.view==='cockpit'?'Exterior':'Cockpit';$('pause').textContent=data.paused?'Resume':'Pause';$('flaps').setAttribute('aria-pressed',data.flaps);$('parking').setAttribute('aria-pressed',data.parkingBrake);}
  frame=requestAnimationFrame(update);
}
update();
try{await viewer.load({mapPx:29700,world:{originX:-6112,originZ:-5472,pxPerStud:2.75,turned:true}},new URL('./erlc-map/balanced-data',import.meta.url).href,status);viewer.overview();ready=true;$('loading').hidden=true;$('fly').disabled=!desktop.matches;$('shaders-enabled').disabled=false;if($('shaders-enabled').checked)setShaders(true);focus();}catch(error){fail(error);}
window.addEventListener('pagehide',()=>{window.removeEventListener('keydown',toggleDisplay,true);cancelAnimationFrame(frame);audio.dispose();viewer.dispose();},{once:true});
