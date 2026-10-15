import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createJsInvoker} from '../lib/flight-wasm-bindings.js';

const root=new URL('../public/runtime/',import.meta.url);
const CDN='https://cdn.jsdelivr.net/npm/';
const DATA='https://raw.githubusercontent.com/JSBSim-Team/jsbsim/v1.2.4/';
const assets={
  'sdk.js':CDN+'@0x62/jsbsim-wasm@1.2.4-beta.4/dist/index.js',
  'engine.mjs':CDN+'@0x62/jsbsim-wasm@1.2.4-beta.4/dist/wasm/jsbsim_wasm.mjs',
  'engine.wasm':CDN+'@0x62/jsbsim-wasm@1.2.4-beta.4/dist/wasm/jsbsim_wasm.wasm',
  'c172p.xml':DATA+'aircraft/c172p/c172p.xml',
  'eng_io320.xml':DATA+'engine/eng_io320.xml',
  'prop_75in2f.xml':DATA+'engine/prop_75in2f.xml',
  'GLTFLoader.js':CDN+'three@0.182.0/examples/jsm/loaders/GLTFLoader.js',
  'BufferGeometryUtils.js':CDN+'three@0.182.0/examples/jsm/utils/BufferGeometryUtils.js',
  'SDK-LICENSE':CDN+'@0x62/jsbsim-wasm@1.2.4-beta.4/LICENSE',
  'JSBSIM-COPYING':DATA+'COPYING'
};
const files=await Promise.all(Object.entries(assets).map(async([file,url])=>{
  const response=await fetch(url,{signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw new Error(`${file}: HTTP ${response.status}`);
  let data=Buffer.from(await response.arrayBuffer());
  if(file==='engine.mjs'){
    let source=data.toString();const start=source.indexOf('function createJsInvoker('),end=source.indexOf('function craftInvokerFunction(',start);
    if(start<0||end<start)throw new Error('Flight binding version mismatch');
    source=source.slice(0,start)+'var createJsInvoker = '+createJsInvoker.toString()+';'+source.slice(end);data=Buffer.from(source);
  }
  if(file==='GLTFLoader.js'||file==='BufferGeometryUtils.js')data=Buffer.from(data.toString().replaceAll("from 'three'","from '../erlc-map/vendor/three.module.js'").replaceAll("'../utils/BufferGeometryUtils.js'","'./BufferGeometryUtils.js'"));
  return {file,url,data};
}));
await mkdir(root,{recursive:true});
for(const {file,data}of files){await writeFile(new URL(file,root),data);console.log(`${file}: ${data.length} bytes`);}
await writeFile(new URL('manifest.json',root),JSON.stringify(Object.fromEntries(files.map(({file,url,data})=>[file,{url,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')} ])),null,2)+'\n');
