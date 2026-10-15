import http from 'node:http';
import {readFile,stat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('./public/',import.meta.url));
const base='/'+(process.env.BASE_PATH||'').split('/').filter(Boolean).join('/');
const prefix=base==='/'?'':base;
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.xml':'application/xml','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.glb':'model/gltf-binary','.gz':'application/octet-stream','.wav':'audio/wav','.mp3':'audio/mpeg'};
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
  const send=(code,type,data,cacheControl='no-cache')=>{res.writeHead(code,{'Content-Type':type,'Content-Length':data.length,'Cache-Control':cacheControl});res.end(req.method==='HEAD'?undefined:data);};
  try{
    const url=new URL(req.url,'http://localhost');
    if(prefix&&url.pathname===prefix){res.writeHead(302,{Location:prefix+'/'});res.end();return;}
    if(prefix&&!url.pathname.startsWith(prefix+'/')){send(404,'text/plain',Buffer.from('Not found'));return;}
    const pathname=decodeURIComponent(url.pathname.slice(prefix.length)),candidate=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    const file=await realpath(candidate);
    if(!file.startsWith(root)||!(await stat(file)).isFile()){send(404,'text/plain',Buffer.from('Not found'));return;}
    send(200,types[path.extname(file)]||'application/octet-stream',await readFile(file),file.endsWith('.html')||file.endsWith('.js')||file.endsWith('.css')?'no-cache':'public, max-age=86400');
  }catch{if(!res.headersSent)send(404,'text/plain',Buffer.from('Not found'));else res.end();}
});
server.listen(Number(process.env.PORT||8766),process.env.HOST||'127.0.0.1',()=>console.log('County Flight: http://localhost:'+server.address().port+prefix+'/'));
