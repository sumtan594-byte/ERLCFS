import {CountyViewer} from './erlc-map/viewer.js';
import {SimAudio} from './erlc-map/sim-audio.js';
import {SceneEffects} from './erlc-map/scene-effects.js';
import {FlightHUDControls} from './flight-hud-controls.js';

const $=id=>document.getElementById(id),viewer=new CountyViewer($('map'));
document.querySelectorAll('dt').forEach(n=>{if(n.textContent==='C')n.textContent='V';});
window.countyFlight=viewer;
const flightHUD=new FlightHUDControls(viewer);
const audio=new SimAudio(),effects=viewer.effects=new SceneEffects(viewer),music=$('menu-audio');
window.countyAudio=audio;
let preferences={};try{preferences=JSON.parse(localStorage.getItem('county-flight-settings')||'{}')||{};}catch{}
const save=()=>{try{localStorage.setItem('county-flight-settings',JSON.stringify(preferences));}catch{}};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const desktop=matchMedia('(min-width:768px) and (pointer:fine)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
let ready=false,busy=false,frame,screen='menu',drawer=false,musicStarted=true,musicFade=0,helpPaused=null;
const focus=()=>viewer.renderer.domElement.focus({preventScroll:true});
const settingError=e=>{$('settings-status').textContent=e.message||'Unable to apply settings';$('settings-status').hidden=false;};
function status(text,progress){$('loading').hidden=false;$('status').textContent=text;if(progress?.total){$('progress').max=progress.total;$('progress').value=progress.loaded;}else $('progress').removeAttribute('value');}
function fail(error){busy=false;document.body.classList.remove('clear-display');status(error.message||'Unable to load');$('retry').hidden=false;setButtons();}
function setButtons(){for(const id of ['fly','drawer-fly']){$(id).disabled=!ready||busy||!desktop.matches;$(id).title=desktop.matches?'Start flight':'Flight requires a desktop with a mouse';}$('explore').disabled=!ready||busy;}
function setScreen(value){screen=value;document.body.dataset.screen=value;$('menu').hidden=value!=='menu';$('drawer-toggle').hidden=value==='menu';$('flight-ui').hidden=value!=='flight';$('flight-actions').hidden=value!=='flight';$('map-actions').hidden=value==='flight';$('throttle-row').hidden=value!=='flight';setButtons();}
function setDrawer(open){drawer=open;$('drawer').classList.toggle('open',open);$('drawer').inert=!open;$('drawer').setAttribute('aria-hidden',String(!open));$('drawer-toggle').setAttribute('aria-expanded',String(open));$('drawer-veil').hidden=!open;if(open){viewer.flight?.keys.clear();viewer.flight?.leave();$('drawer-close').focus();}else if(screen!=='menu'&&!$('help-dialog').open)focus();}
function fadeMusic(playing){playing=playing&&musicStarted&&!document.hidden;cancelAnimationFrame(musicFade);if(playing)music.play().catch(()=>{});const from=music.volume,to=playing?clamp(Number(preferences.menuVolume??.3),0,1):0,start=performance.now();function tick(now){music.volume=from+(to-from)*Math.min(1,(now-start)/500);if(now-start<500)musicFade=requestAnimationFrame(tick);else if(!playing)music.pause();}musicFade=requestAnimationFrame(tick);}
function startMusic(){musicStarted=true;$('menu-music').setAttribute('aria-pressed','true');fadeMusic(screen==='menu');}
$('menu-music').onclick=()=>{if(musicStarted){musicStarted=false;fadeMusic(false);$('menu-music').setAttribute('aria-pressed','false');}else startMusic();preferences.music=musicStarted;save();};
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#menu-music')&&musicStarted)startMusic();if($('sound-enabled').checked)audio.enable(true).catch(settingError);},{once:true});
music.volume=clamp(Number(preferences.menuVolume??.3),0,1);
music.play().catch(()=>{});
$('menu-volume').value=Math.round(music.volume*100);$('menu-volume-value').textContent=$('menu-volume').value+'%';
$('menu-volume').oninput=e=>{preferences.menuVolume=Number(e.target.value)/100;music.volume=preferences.menuVolume;$('menu-volume-value').textContent=e.target.value+'%';save();};
audio.volume=clamp(Number(preferences.volume??.4)||0,0,1);$('volume').value=Math.round(audio.volume*100);$('volume-value').textContent=$('volume').value+'%';$('sound-enabled').checked=!!preferences.sound;
$('sound-enabled').onchange=async e=>{try{await audio.enable(e.target.checked);preferences.sound=e.target.checked;save();$('settings-status').hidden=true;}catch(error){e.target.checked=false;settingError(error);}};
$('volume').oninput=e=>{audio.volume=Number(e.target.value)/100;preferences.volume=audio.volume;$('volume-value').textContent=e.target.value+'%';save();};
effects.strength=clamp(Number(preferences.strength??.8)||0,0,1);effects.exposure=clamp(Number(preferences.exposure??1.05)||1.05,.8,1.3);
$('shader-strength').value=Math.round(effects.strength*100);$('strength-value').textContent=$('shader-strength').value+'%';$('exposure').value=Math.round(effects.exposure*100);$('exposure-value').textContent=effects.exposure.toFixed(2);$('shaders-enabled').checked=!!preferences.shaders;
const timeText=hour=>{const minutes=Math.round(hour*60);return String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');};
effects.lighting.hour=clamp(Number(preferences.hour??18.8)||18.8,7,19.5);$('sun-time').value=effects.lighting.hour;$('sun-time-value').textContent=timeText(effects.lighting.hour);
$('sun-time').oninput=e=>{effects.lighting.hour=Number(e.target.value);effects.lighting.applyTime();preferences.hour=effects.lighting.hour;$('sun-time-value').textContent=timeText(effects.lighting.hour);save();};
function setShaders(enabled){try{effects.setEnabled(enabled);for(const id of ['shader-strength','exposure','sun-time'])$(id).disabled=!enabled;preferences.shaders=enabled;save();}catch(error){$('shaders-enabled').checked=false;effects.setEnabled(false);settingError(error);}}
$('shaders-enabled').onchange=e=>setShaders(e.target.checked);
$('shader-strength').oninput=e=>{effects.strength=Number(e.target.value)/100;preferences.strength=effects.strength;$('strength-value').textContent=e.target.value+'%';save();};
$('exposure').oninput=e=>{effects.exposure=Number(e.target.value)/100;preferences.exposure=effects.exposure;$('exposure-value').textContent=effects.exposure.toFixed(2);save();};
function tab(settings){for(const [id,active]of [['controls',!settings],['settings',settings]]){$(id+'-panel').hidden=!active;$(id+'-tab').classList.toggle('active',active);$(id+'-tab').setAttribute('aria-selected',String(active));}}
function help(){setDrawer(false);helpPaused=viewer.flight?{model:viewer.flight.model,paused:viewer.flight.model.paused}:null;if(helpPaused)helpPaused.model.paused=true;$('help-dialog').showModal();}
$('menu-help').onclick=help;$('help').onclick=help;$('controls-tab').onclick=()=>tab(false);$('settings-tab').onclick=()=>tab(true);
$('help-dialog').addEventListener('close',()=>{if(helpPaused&&viewer.flight?.model===helpPaused.model&&!document.hidden)helpPaused.model.paused=helpPaused.paused;helpPaused=null;if(screen!=='menu')focus();});
$('drawer-toggle').onclick=()=>setDrawer(!drawer);$('drawer-close').onclick=() =>setDrawer(false);$('drawer-veil').onclick=()=>setDrawer(false);
function stop(){setDrawer(false);viewer.stopFlight();setScreen('explore');$('loading').hidden=true;focus();}
async function launch(mode){if(busy||!ready||(mode==='flight'&&!desktop.matches))return;busy=true;setButtons();setDrawer(false);fadeMusic(false);if(screen==='menu'){$('menu').classList.add('departing');await new Promise(resolve=>setTimeout(resolve,reduced.matches?1:680));$('menu').classList.remove('departing');}setScreen('explore');try{if(mode==='flight'){status('Preparing aircraft and cockpit');await viewer.startFlight(stop,status);if(viewer.flight)setScreen('flight');}$('loading').hidden=true;focus();}catch(error){fail(error);}finally{busy=false;setButtons();}}
$('explore').onclick=()=>launch('explore');$('fly').onclick=()=>launch('flight');$('drawer-fly').onclick=()=>launch('flight');
$('home').onclick=()=>{setDrawer(false);viewer.stopFlight();viewer.overview();setScreen('menu');fadeMusic(true);$('explore').focus();};
$('overview').onclick=()=>{viewer.overview();setDrawer(false);};$('retry').onclick=()=>location.reload();
function action(fn){if(viewer.flight){fn(viewer.flight.model,viewer.flight);focus();}}
$('view').onclick=()=>action(m=>m.view=m.view==='cockpit'?'exterior':'cockpit');$('pause').onclick=()=>action(m=>m.paused=!m.paused);$('restart').onclick=()=>action(m=>m.reset());$('approach').onclick=()=>action(m=>m.reset(true));$('centre').onclick=()=>action((m,f)=>f.look.reset(m.view));$('flaps').onclick=()=>action(m=>m.flaps=!m.flaps);$('parking').onclick=()=>action(m=>m.parkingBrake=!m.parkingBrake);
$('throttle').oninput=e=>{if(viewer.flight)viewer.flight.model.throttle=Number(e.target.value)/100;};$('throttle').onchange=focus;
window.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;if(e.code==='Escape'&&($('help-dialog').open||drawer)){e.preventDefault();e.stopImmediatePropagation();if($('help-dialog').open)$('help-dialog').close();else setDrawer(false);return;}if(e.key==='?'){e.preventDefault();if(!$('help-dialog').open)help();return;}if($('help-dialog').open||screen==='menu')return;if(e.code==='KeyH'){e.preventDefault();setDrawer(false);document.body.classList.toggle('clear-display');focus();}if(e.code==='KeyM'){e.preventDefault();document.body.classList.remove('clear-display');setDrawer(!drawer);}},true);
desktop.addEventListener('change',()=>{setButtons();if(!desktop.matches&&viewer.flight)stop();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)fadeMusic(false);else if(screen==='menu')fadeMusic(true);});
function update(){audio.update(viewer);if(viewer.flight){const d=viewer.flight.model.instruments();flightHUD.update(d);$('speed').textContent=Math.round(d.speed);$('heading').textContent=String(Math.round(d.heading)%360).padStart(3,'0');$('altitude').textContent=Math.round(d.altitude);$('vertical').textContent=Math.round(d.verticalSpeed/10)*10;$('power').textContent=Math.round(d.throttle*100)+'%';if(document.activeElement!==$('throttle'))$('throttle').value=Math.round(d.throttle*100);$('pause').querySelector('span').textContent=d.paused?'Resume':'Pause';$('pause').querySelector('img').src='./icons/'+(d.paused?'play':'pause')+'.svg';$('flaps').setAttribute('aria-pressed',String(d.flaps));$('parking').setAttribute('aria-pressed',String(d.parkingBrake));$('flight-mode').textContent=d.paused?'PAUSED':d.view.toUpperCase();$('aoa').textContent='AOA '+d.aoa.toFixed(1);$('attitude-horizon').style.transform=`rotate(${d.roll}deg) translateY(${clamp(d.pitch,-60,60)*1.5}px)`;}frame=requestAnimationFrame(update);}
setButtons();update();
try{await viewer.load({mapPx:29700,world:{originX:-6112,originZ:-5472,pxPerStud:2.75,turned:true}},new URL('./erlc-map/balanced-data',import.meta.url).href,status);viewer.overview();ready=true;$('loading').hidden=true;$('shaders-enabled').disabled=false;if($('shaders-enabled').checked)setShaders(true);setButtons();}catch(error){fail(error);}
window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);cancelAnimationFrame(musicFade);music.pause();flightHUD.dispose();audio.dispose();viewer.dispose();},{once:true});
