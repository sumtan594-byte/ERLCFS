export class TileStore {
  constructor(url, storage = globalThis.caches, fetcher = globalThis.fetch) {
    this.url = url;
    this.fetcher = fetcher.bind(globalThis);
    this.pending = new Map();
    this.controller = new AbortController();
    this.cache = storage ? storage.open('county-flight-tiles-v1').catch(() => null) : Promise.resolve(null);
  }

  read(key) {
    if (this.disposed) return Promise.reject(new Error('Map closed'));
    if (this.pending.has(key)) return this.pending.get(key);
    const task = this.download(key).finally(() => this.pending.delete(key));
    this.pending.set(key, task);
    return task;
  }

  async download(key) {
    const url = `${this.url}/z5/${key}.webp`;
    const cache = await this.cache;
    const saved = await cache?.match(url).catch(() => null);
    if (saved) return saved.blob();
    const response = await this.fetcher(url, { signal: this.controller.signal, cache: 'force-cache' });
    if (!response.ok) throw new Error(`Detail tile ${key}: ${response.status}`);
    if (cache) await cache.put(url, response.clone()).catch(() => {});
    return response.blob();
  }

  async warm(keys, paused, progress) {
    
    if (!await this.cache || this.disposed) return;
    let next = 0, completed = 0;
    await Promise.all(Array.from({ length: 3 }, async () => {
      while (!this.disposed && next < keys.length) {
        if (paused()) {
          await new Promise(resolve => setTimeout(resolve, 200));
          continue;
        }
        const key = keys[next++];
        try {
          await this.read(key);
          progress(++completed, keys.length);
        } catch {
          if (this.disposed) return;
        }
      }
    }));
  }

  dispose() {
    this.disposed = true;
    this.controller.abort();
  }
}
