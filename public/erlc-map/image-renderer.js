import * as THREE from './vendor/three.module.js';
import {MapRenderer as BaseRenderer} from './balanced-renderer.js';
import {DetailMap} from './detail-map.js';
import {SurfaceIndex,chooseSurface} from './surface-index.js';
import {loadTrees} from './tree-layer.js';
import {surfaceLayer} from './surface-depth.js';

async function readGeometry(url, Type = Float32Array, signal) {
  const versioned=new URL(url,location.href);
    versioned.searchParams.set('scene','architecture-trees-v4');
  const response = await fetch(versioned,{cache:'no-store', signal});
  if (!response.ok) throw new Error(`Map geometry: ${response.status}`);
  let data = await response.arrayBuffer();
  const bytes = new Uint8Array(data);
  if (bytes[0] === 31 && bytes[1] === 139) {
    data = await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  }
  return new Type(data);
}

export class MapRenderer extends BaseRenderer {
  constructor(host) {
    super(host);
    this.loadController=new AbortController();
    this.scene.background.set('#bfdced');
    this.scene.fog=new THREE.Fog('#d5e5eb',12000,36000);
  }

  async load(map, base, status) {
    let loaded = 0;
    const read = (url, Type) => readGeometry(url, Type, this.loadController.signal);
    const labels = ['Overview image', 'Building geometry', 'Building colours', 'Terrain geometry', 'Terrain triangles', 'Elevation data', 'Terrain metadata', 'Bridge geometry', 'Bridge colours', 'Bridge decks', 'Road surfaces', 'HD tile index', 'Tunnel floors', 'Trees and foliage', 'Daylight sky'];
    status('Loading map assets', {loaded, total: labels.length});
    const [texture, positions, colors, terrainPositions, terrainIndices, terrain, meta, bridgePositions, bridgeColors, bridgeDecks, groundSurfaces, tileMeta, tunnelFloors, trees, sky] = await Promise.all([
      new THREE.TextureLoader().loadAsync(new URL('../map-base.webp', `${base}/`).href),
      read(`${base}/buildings-positions.bin.gz`),
      read(`${base}/buildings-colors.bin.gz`),
      read(`${base}/terrain-positions.bin.gz`),
      read(`${base}/terrain-indices.bin.gz`, Uint32Array),
      read(`${base}/terrain.bin.gz`),
      fetch(`${base}/meta.json`,{cache:'no-store',signal:this.loadController.signal}).then(response => {
        if(!response.ok) throw new Error(`Terrain metadata: ${response.status}`);
        return response.json();
      }),
      read(`${base}/bridges-positions.bin.gz`),
      read(`${base}/bridges-colors.bin.gz`),
      read(`${base}/bridges-decks.bin.gz`),
      read(`${base}/ground-surfaces.bin.gz`),
      fetch(new URL('../map-tiles/meta.json',`${base}/`),{signal:this.loadController.signal}).then(response=>{
        if(!response.ok)throw new Error(`Tile metadata: ${response.status}`);
        return response.json();
      }),
      read(`${base}/tunnel-floors.bin.gz`),
      loadTrees(base,this.loadController.signal),
      new THREE.CubeTextureLoader().loadAsync(['Rt','Lf','Up','Dn','Bk','Ft'].map(name=>new URL(`../sky/${name}.webp`,`${base}/`).href)),
    ].map((task, index) => task.then(value => {
      if (!this.disposed) status(`Loaded ${labels[index]} (${++loaded}/${labels.length})`, {loaded, total: labels.length});
      return value;
    })));
    if (this.disposed) { texture.dispose(); sky.dispose(); trees.traverse(o=>{o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose();}); return; }
    sky.colorSpace=THREE.SRGBColorSpace;
    this.scene.background=sky;
    this.scene.add(trees);
    this.host.dataset.treeInstances=trees.userData.instances;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.detail=new DetailMap(this,texture,new URL('../map-tiles',`${base}/`).href,tileMeta);
    status('Building terrain and road surfaces');
    await new Promise(resolve => requestAnimationFrame(resolve));
    if (this.disposed) return;

    
    const {originX:x, originZ:z, pxPerStud} = map.world;
    const span = map.mapPx / pxPerStud;
    const projectedSurface = (points, indices = null, layer = 0, name = 'Terrain') => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(points,3));
      const uv = new Float32Array(points.length/3*2);
      for(let i=0;i<points.length/3;i++) {
        uv[i*2]=(points[i*3+2]-z)/span;
        uv[i*2+1]=(points[i*3]-x)/span;
      }
      geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
      if(indices) geometry.setIndex(new THREE.BufferAttribute(indices,1));
      geometry.computeVertexNormals();
      const mesh=new THREE.Mesh(geometry,surfaceLayer(this.detail.material(),layer));mesh.name=name;mesh.renderOrder=layer;this.scene.add(mesh);
    };
    this.surfaces=new SurfaceIndex();
    this.surfaces.add(terrainPositions,terrainIndices,'terrain');
    this.surfaces.add(groundSurfaces,null,'platform');
    this.surfaces.add(bridgeDecks,null,'bridge');
    this.surfaces.add(tunnelFloors,null,'tunnel');
    projectedSurface(terrainPositions,terrainIndices);
    projectedSurface(groundSurfaces,null,1,'Road surfaces');
    projectedSurface(tunnelFloors,null,1,'Tunnel floors');
    this.meta=meta;
    this.terrain=terrain;
    const water=[];
    const cols=meta.xs.length;
    for(let row=0;row<meta.zs.length-1;row++)for(let col=0;col<cols-1;col++) {
      const corners=[[col,row],[col,row+1],[col+1,row],[col+1,row],[col,row+1],[col+1,row+1]];
      const heights=corners.map(([c,r])=>terrain[(r*cols+c)*3+1]);
      const valid=heights.filter(height=>height>-9998);
      if(!valid.length)continue;
      const level=Math.max(...valid);
      corners.forEach(([c,r],i)=>water.push(
        meta.terrain.x0+meta.xs[c]*meta.terrain.step,
        heights[i]>-9998?heights[i]:level,
        meta.terrain.z0+meta.zs[r]*meta.terrain.step,
      ));
    }
    projectedSurface(new Float32Array(water),null,0,'Water');

    projectedSurface(bridgeDecks,null,2,'Bridge decks');
    const bridges=new THREE.BufferGeometry();
    bridges.setAttribute('position',new THREE.BufferAttribute(bridgePositions,3));
    bridges.setAttribute('color',new THREE.BufferAttribute(bridgeColors,3));
    bridges.computeVertexNormals();
    this.scene.add(new THREE.Mesh(bridges,new THREE.MeshLambertMaterial({
      vertexColors:true,side:THREE.DoubleSide,
    })));

    const buildings = new THREE.BufferGeometry();
    buildings.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    buildings.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    buildings.computeVertexNormals();
    this.scene.add(new THREE.Mesh(buildings, new THREE.MeshLambertMaterial({
      vertexColors:true, side:THREE.DoubleSide,
    })));
    this.controls.limit(x-500,z-500,x+span+500,z+span+500);
    status('Compiling materials and rendering first frame');
    await this.renderer.compileAsync(this.scene, this.camera);
    if (this.disposed) return;
    this.renderer.render(this.scene, this.camera);
    this.dirty=true;
    status('Ready');
  }

  dispose(){this.loadController.abort();this.detail?.dispose();this.scene.background?.dispose?.();super.dispose();}

  groundAt(x,z){
    const base=super.groundAt(x,z);
    return this.surfaces?chooseSurface(this.surfaces.at(x,z),null,base):base;
  }

}
