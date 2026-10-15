import {WebGLRenderTarget,DepthTexture,HalfFloatType,UnsignedByteType,UnsignedIntType,ShaderMaterial,Scene,OrthographicCamera,Mesh,PlaneGeometry,Vector2,Vector3,Color} from './vendor/three.module.js';
import {SunLighting} from './sun-lighting.js';

const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;
const fragment=`
uniform sampler2D sceneMap;uniform sampler2D sceneDepth;uniform vec2 texel;uniform float farPlane;uniform float exposure;uniform float strength;uniform float horizonHaze;uniform vec3 hazeColor;varying vec2 vUv;
float distanceAt(vec2 p){return exp2(texture2D(sceneDepth,p).r*log2(farPlane+1.0))-1.0;}
vec3 highlight(vec2 p){vec3 c=texture2D(sceneMap,p).rgb;return c*max(0.0,max(c.r,max(c.g,c.b))-1.0)/(1.0+max(c.r,max(c.g,c.b)));}
vec3 film(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.0,1.0);}
void main(){
 vec3 original=texture2D(sceneMap,vUv).rgb,c=original;float depth=texture2D(sceneDepth,vUv).r,dist=distanceAt(vUv);
 vec3 bloom=highlight(vUv)*.2;
 for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 offset=vec2(cos(a),sin(a))*texel*5.0;bloom+=highlight(vUv+offset)*.1;}
 float outside=step(15.0,dist);c+=bloom*.3*outside;
 float haze=(1.0-exp(-dist*.00002))*(1.0-step(.99999,depth));c=mix(c,hazeColor,haze*.4*horizonHaze);
 float ao=0.0;
 for(int i=0;i<4;i++){float a=float(i)*1.570796;float other=distanceAt(vUv+vec2(cos(a),sin(a))*texel*3.0);float gap=dist-other;ao+=smoothstep(1.0,8.0,gap)*(1.0-smoothstep(20.0,100.0,gap));}
 c*=1.0-ao*.025*outside;
 float luma=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(luma),c,1.08);c*=mix(vec3(.96,1.0,1.035),vec3(1.045,1.02,.97),smoothstep(.1,.8,luma));
 c*=exposure;float shoulder=smoothstep(.45,1.2,max(c.r,max(c.g,c.b)));c=mix(c,film(c),shoulder);c=mix(original,c,strength);gl_FragColor=vec4(c,1.0);
 #include <colorspace_fragment>
}`;
const waterVertex=`varying vec3 vWorld;void main(){vec4 p=modelMatrix*vec4(position,1.0);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;
 #include <logdepthbuf_vertex>
}`;
const waterFragment=`uniform float time;uniform vec3 sunDirection;uniform vec3 sunTint;uniform vec3 skyTint;varying vec3 vWorld;
 #include <common>
 #include <logdepthbuf_pars_fragment>
void main(){
 #include <logdepthbuf_fragment>
 vec2 p=vWorld.xz*.1;float a=p.x+p.y*.6+time*.65,b=p.x*.5-p.y*.9-time*.4;
 float footprint=max(length(dFdx(p)),length(dFdy(p))),ripple=1.0-smoothstep(.08,.7,footprint);
 vec3 n=normalize(vec3((cos(a)*.055+cos(b)*.025)*ripple,1.0,(sin(a)*.04-sin(b)*.05)*ripple));vec3 view=normalize(cameraPosition-vWorld);float fresnel=pow(1.0-max(dot(n,view),0.0),3.0);
 vec3 c=mix(vec3(.09,.34,.41)*mix(vec3(1.0),sunTint,.25),skyTint,fresnel*.7);float glint=pow(max(dot(n,normalize(sunDirection+view)),0.0),110.0);c+=sunTint*glint*.9;
 gl_FragColor=vec4(c,1.0);
 #include <colorspace_fragment>
}`;

export class SceneEffects{
  constructor(viewer){this.viewer=viewer;this.enabled=false;this.strength=.8;this.exposure=1.05;this.lighting=new SunLighting(viewer);}
  setup(){
    if(this.target)return;const v=this.viewer,r=v.renderer;
    this.target=new WebGLRenderTarget(1,1,{type:r.extensions.has('EXT_color_buffer_float')?HalfFloatType:UnsignedByteType,depthBuffer:true});this.target.depthTexture=new DepthTexture(1,1,UnsignedIntType);
    this.direction=new Vector3();this.material=new ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,depthTest:false,depthWrite:false,toneMapped:false,uniforms:{sceneMap:{value:this.target.texture},sceneDepth:{value:this.target.depthTexture},texel:{value:new Vector2()},farPlane:{value:v.camera.far},exposure:{value:this.exposure},strength:{value:this.strength},horizonHaze:{value:1},hazeColor:{value:new Color('#bdd7e5')}}});
    this.quad=new Mesh(new PlaneGeometry(2,2),this.material);this.scene=new Scene();this.scene.add(this.quad);this.camera=new OrthographicCamera(-1,1,1,-1,0,1);
    this.waterMaterial=new ShaderMaterial({vertexShader:'#include <common>\n#include <logdepthbuf_pars_vertex>\n'+waterVertex,fragmentShader:waterFragment,uniforms:{time:{value:0},sunDirection:{value:new Vector3(-.32,.8,.48)},sunTint:{value:new Color('#ffe0a3')},skyTint:{value:new Color('#b7dae4')}},toneMapped:false});
    this.resize(v.host.clientWidth,v.host.clientHeight);
  }
  setEnabled(enabled){
    if(enabled)this.setup();this.enabled=enabled;
    const water=this.viewer.scene.children.find(n=>n.name==='Water');
    if(water){this.water=water;if(enabled){this.originalWater||=water.material;water.material=this.waterMaterial;}else if(this.originalWater)water.material=this.originalWater;}
    this.lighting.setEnabled(enabled);
    this.viewer.dirty=true;
  }
  resize(width,height){if(!this.target)return;const ratio=this.viewer.renderer.getPixelRatio(),w=Math.max(1,Math.round(width*ratio)),h=Math.max(1,Math.round(height*ratio));this.target.setSize(w,h);this.material.uniforms.texel.value.set(1/w,1/h);}
  render(){
    this.lighting.update();
    const v=this.viewer,r=v.renderer;this.material.uniforms.exposure.value=this.exposure;this.material.uniforms.strength.value=this.strength;this.waterMaterial.uniforms.time.value=performance.now()/1000;this.material.uniforms.farPlane.value=v.camera.far;this.material.uniforms.horizonHaze.value=.15+.85*(1-Math.abs(v.camera.getWorldDirection(this.direction).y));
    this.material.uniforms.hazeColor.value.copy(v.scene.fog.color);this.waterMaterial.uniforms.sunDirection.value.copy(this.lighting.direction);this.waterMaterial.uniforms.sunTint.value.copy(this.lighting.sun.color);this.waterMaterial.uniforms.skyTint.value.copy(this.lighting.fill.color);
    r.setRenderTarget(this.target);r.render(v.scene,v.camera);r.setRenderTarget(null);r.render(this.scene,this.camera);
  }
  dispose(){this.lighting.dispose();if(this.water&&this.originalWater)this.water.material=this.originalWater;this.target?.dispose();this.material?.dispose();this.waterMaterial?.dispose();this.quad?.geometry.dispose();}
}
