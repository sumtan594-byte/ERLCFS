import test from 'node:test';
import assert from 'node:assert/strict';
import {MeshBasicMaterial} from '../public/erlc-map/vendor/three.module.js';
import {surfaceLayer} from '../public/erlc-map/surface-depth.js';

test('terrain retains its original depth and shader',()=>{
  const material=new MeshBasicMaterial(),compile=material.onBeforeCompile;
  assert.equal(surfaceLayer(material,0),material);assert.equal(material.onBeforeCompile,compile);assert.equal(material.polygonOffset,false);
});

test('road and bridge priorities preserve detail shader and use distinct depth keys',()=>{
  const road=new MeshBasicMaterial(),bridge=new MeshBasicMaterial();
  road.onBeforeCompile=shader=>{shader.fragmentShader+='\nDETAIL_TEXTURE';};road.customProgramCacheKey=()=> 'detail';
  surfaceLayer(road,1);surfaceLayer(bridge,2);
  const shader={fragmentShader:'#include <logdepthbuf_fragment>'};road.onBeforeCompile(shader);
  assert.match(shader.fragmentShader,/DETAIL_TEXTURE/);assert.match(shader.fragmentShader,/USE_LOGDEPTHBUF/);assert.match(shader.fragmentShader,/0.00000020/);
  assert.equal(road.customProgramCacheKey(),'detail:surface-layer-1');assert.notEqual(road.customProgramCacheKey(),bridge.customProgramCacheKey());
  assert.equal(road.polygonOffsetUnits,-1);assert.equal(bridge.polygonOffsetUnits,-2);
});
