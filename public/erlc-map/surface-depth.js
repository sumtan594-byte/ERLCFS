export function surfaceLayer(material,layer){
  if(!layer)return material;
  const compile=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);
  material.polygonOffset=true;material.polygonOffsetFactor=-layer;material.polygonOffsetUnits=-layer;
  material.onBeforeCompile=function(shader,renderer){
    compile.call(this,shader,renderer);
    shader.fragmentShader=shader.fragmentShader.replace('#include <logdepthbuf_fragment>',`#include <logdepthbuf_fragment>
      #ifdef USE_LOGDEPTHBUF
        gl_FragDepth = max(0.0, gl_FragDepth - ${(layer*.0000002).toFixed(8)});
      #endif`);
  };
  const base=key();material.customProgramCacheKey=()=>base+':surface-layer-'+layer;
  return material;
}
