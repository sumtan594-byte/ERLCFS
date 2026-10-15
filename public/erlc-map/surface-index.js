export class SurfaceIndex {
  constructor(cellSize = 64) {
    this.cellSize = cellSize;
    this.cells = new Map();
    this.triangles = [];
  }
  add(points, indices = null, kind = 'ground') {
    const count = indices ? indices.length : points.length / 3;
    for (let i = 0; i < count; i += 3) {
      const a = (indices ? indices[i] : i) * 3,
        b = (indices ? indices[i + 1] : i + 1) * 3,
        c = (indices ? indices[i + 2] : i + 2) * 3;
      const ax = points[a],
        ay = points[a + 1],
        az = points[a + 2],
        bx = points[b],
        by = points[b + 1],
        bz = points[b + 2],
        cx = points[c],
        cy = points[c + 1],
        cz = points[c + 2];
      const den = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(den) < .01) continue;
      if (kind === 'terrain' && den > 0) continue;
      const id = this.triangles.length;
      this.triangles.push([ax, ay, az, bx, by, bz, cx, cy, cz, den, kind]);
      for (let z = Math.floor(Math.min(az, bz, cz) / this.cellSize); z <= Math.floor(Math.max(az, bz, cz) / this.cellSize); z++) for (let x = Math.floor(Math.min(ax, bx, cx) / this.cellSize); x <= Math.floor(Math.max(ax, bx, cx) / this.cellSize); x++) {
        const key = x + ',' + z;
        let cell = this.cells.get(key);
        if (!cell) {
          cell = [];
          this.cells.set(key, cell);
        }
        cell.push(id);
      }
    }
  }
  at(x, z) {
    const result = [];
    for (const id of this.cells.get(Math.floor(x / this.cellSize) + ',' + Math.floor(z / this.cellSize)) || []) {
      const [ax, ay, az, bx, by, bz, cx, cy, cz, den, kind] = this.triangles[id];
      const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / den,
        v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / den;
      if (u >= -1e-5 && v >= -1e-5 && u + v <= 1.00001) {
        const y = u * ay + v * by + (1 - u - v) * cy;
        if (Number.isFinite(y) && !result.some(h => Math.abs(h.y - y) < .15 && h.kind === kind)) result.push({
          y,
          kind
        });
      }
    }
    return result;
  }
}
export function chooseSurface(candidates, previous = null, base = null) {
  if (!candidates.length) return Number.isFinite(base) && base > -9998 ? base : null;
  if (Number.isFinite(previous)) {
    
    
    const score=c=>Math.abs(c.y-previous)-(['bridge','tunnel','platform'].includes(c.kind)&&Math.abs(c.y-previous)<2?1:0);
    return candidates.reduce((best,c)=>score(c)<score(best)?c:best).y;
  }
  const ground = candidates.filter(c => c.kind !== 'bridge' && c.kind !== 'tunnel');
  const pool = ground.length ? ground : candidates;
  
  const nearest = pool.reduce((best, c) => Math.abs(c.y - (base ?? c.y)) < Math.abs(best.y - (base ?? best.y)) ? c : best);
  const platforms = pool.filter(c => c.kind === 'platform' && c.y >= nearest.y - .5 && c.y - nearest.y < 40);
  return platforms.length ? Math.max(...platforms.map(c => c.y)) : nearest.y;
}
