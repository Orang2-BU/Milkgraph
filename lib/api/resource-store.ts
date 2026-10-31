export type Resource<T> = { loading: boolean; data?: T; error?: Error };

export function createResourceStore(fetcher: (path: string) => Promise<unknown>) {
  const cache = new Map<string, Resource<unknown>>();
  const versions = new Map<string, number>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());
  const loading: Resource<unknown> = { loading: true };
  const store = {
    snapshot: (path: string) => cache.get(path) ?? loading,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async load(path: string) {
      if (!path) return;
      const version = (versions.get(path) ?? 0) + 1;
      versions.set(path, version);
      cache.set(path, { ...cache.get(path), loading: true, error: undefined }); notify();
      try {
        const data = await fetcher(path);
        if (versions.get(path) === version) cache.set(path, { loading: false, data });
      } catch (error) {
        if (versions.get(path) === version) cache.set(path, { loading: false, error: error instanceof Error ? error : new Error(String(error)) });
      }
      notify();
    },
    invalidate(paths?: string[]) {
      const targets: string[] = [];
      for (const path of cache.keys()) {
        if (!paths || paths.some(prefix => path === prefix || path.startsWith(prefix + "/") || path.startsWith(prefix + "?"))) {
          targets.push(path);
        }
      }
      for (const path of targets) {
        void store.load(path);
      }
    },
  };
  return store;
}
