import * as THREE from './vendor/three.module.js';
import {CameraControls} from './camera-controls.js';

export class MapRenderer {
constructor(host) {
    this.host = host;
    this.disposed = false;
    this.dirty = true;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#111719');
    this.camera = new THREE.PerspectiveCamera(50, 1, 2, 40000);
    
    this.renderer = new THREE.WebGLRenderer({antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance', preserveDrawingBuffer: false});
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    host.append(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight(0xe7f3ff, 0x9d927f, 2.1));
    const sun = new THREE.DirectionalLight(0xfff2dc, 2.0);
    sun.position.set(-2000, 5000, 3000);
    this.scene.add(sun);
    this.controls = new CameraControls(this.camera, this.renderer.domElement, (x, z) => this.groundAt(x, z));
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();
    this.previous = new THREE.Matrix4();
    this.last = performance.now();
    const frame = now => {
      if (this.disposed) return;
      if (this.flight) this.flight.update(Math.min(.1, (now - this.last) / 1000));
      else this.controls.update(Math.min(.1, (now - this.last) / 1000));
      this.last = now;
      this.camera.updateMatrixWorld();
      if (this.dirty || this.effects?.enabled || !this.previous.equals(this.camera.matrixWorld)) {
        if(this.effects?.enabled)this.effects.render();else this.renderer.render(this.scene, this.camera);
        this.previous.copy(this.camera.matrixWorld);
        this.dirty = false;
        this.host.dataset.triangles = this.renderer.info.render.triangles;
        this.host.dataset.drawCalls = this.renderer.info.render.calls;
      }
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }
groundAt(x,z) {
    if (!this.terrain) return null;
    const t=this.meta.terrain;
    const col=Math.round((x-t.x0)/(t.step*4)),row=Math.round((z-t.z0)/(t.step*4));
    if (col<0||row<0||col>=this.meta.xs.length||row>=this.meta.zs.length) return null;
    return this.terrain[(row*this.meta.xs.length+col)*3];
  }
lookAt(x,z,distance,turned) {
    this.controls.target.set(x,0,z);
    this.camera.position.set(x-(turned?distance*.55:0),distance*.83,z+(turned?0:distance*.55));
    this.controls.update();this.dirty=true;
  }
resize() {
    const width=this.host.clientWidth,height=this.host.clientHeight;
    if (!width||!height) return;
    this.renderer.setSize(width,height);this.effects?.resize(width,height);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.dirty=true;
  }
dispose() {
    this.disposed=true;cancelAnimationFrame(this.raf);this.ro.disconnect();this.controls.dispose();this.effects?.dispose();
    const materials=new Set(),textures=new Set();
    this.scene.traverse(object => {object.geometry?.dispose();if(object.material) materials.add(object.material);});
    for (const material of materials) {if(material.map) textures.add(material.map);material.dispose();}
    for (const texture of textures) texture.dispose();
    this.renderer.dispose();this.renderer.domElement.remove();
  }
}
