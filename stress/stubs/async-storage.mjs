// In-memory AsyncStorage stub so the Zustand store loads outside React Native.
const mem = new Map();
const AsyncStorage = {
  getItem: async (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: async (k, v) => void mem.set(k, v),
  removeItem: async (k) => void mem.delete(k),
  clear: async () => void mem.clear(),
  getAllKeys: async () => [...mem.keys()],
  __dump: () => Object.fromEntries(mem),
};
export default AsyncStorage;
