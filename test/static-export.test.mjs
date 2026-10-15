import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {flightAsset} from '../public/erlc-map/flight-model.js';

const root=new URL('../public/',import.meta.url);

test('all pinned runtime files are bundled and match their deployment manifest',async()=>{
  const manifest=JSON.parse(await readFile(new URL('runtime/manifest.json',root),'utf8'));
  assert.equal(Object.keys(manifest).length,10);
  for(const [file,entry]of Object.entries(manifest)){
    const bytes=await readFile(new URL('runtime/'+file,root));
    assert.equal(bytes.length,entry.bytes,file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256,file);
  }
  const wasm=await readFile(new URL('runtime/engine.wasm',root));
  assert.deepEqual([...wasm.subarray(0,4)],[0,97,115,109]);
  const engine=await readFile(new URL('runtime/engine.mjs',root),'utf8');
  assert.ok(engine.includes('var createJsInvoker = '));
});

test('entry assets and flight files resolve beneath root, repository and custom nested URLs',async()=>{
  const html=await readFile(new URL('index.html',root),'utf8');
  const assets=[...html.matchAll(/(?:src|href)="(\.[^"]+)"/g)].map(m=>m[1]);
  assert.ok(assets.length>=5);
  assert.doesNotMatch(html,/(?:src|href)="\//);
  for(const base of ['https://example.com/','https://example.com/county-flight/','https://example.com/nested/project/']){
    for(const asset of assets){assert.ok(new URL(asset,base).href.startsWith(base));await readFile(new URL(asset,root));}
    const model=new URL('erlc-map/flight-model.js',base);
    assert.equal(new URL('../runtime/engine.wasm',model).href,base+'runtime/engine.wasm');
  }
  assert.equal(flightAsset('engine.wasm'),new URL('runtime/engine.wasm',root).href);
});

test('runtime loaders use local relative Three.js imports',async()=>{
  for(const file of ['GLTFLoader.js','BufferGeometryUtils.js']){
    const source=await readFile(new URL('runtime/'+file,root),'utf8');
    assert.ok(source.includes("from '../erlc-map/vendor/three.module.js'"));
    assert.doesNotMatch(source,/from ['"]three['"]|\/runtime\?file=/);
  }
});
