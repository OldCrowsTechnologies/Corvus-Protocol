// Node module-resolution hooks so the RN/TS game logic runs headlessly under
// `node --experimental-strip-types`. Maps the `@/` alias to src/, resolves
// extensionless imports to .ts, and stubs the native AsyncStorage module.
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve as pathResolve } from 'node:path';

const SRC = pathToFileURL(pathResolve(process.cwd(), 'src') + '/').href;
const ASYNC_STORAGE = pathToFileURL(
  pathResolve(process.cwd(), 'stress', 'stubs', 'async-storage.mjs'),
).href;

function addExt(url) {
  const p = fileURLToPath(url);
  const candidates = [p, `${p}.ts`, `${p}.tsx`, `${p}.mjs`, `${p}.js`, `${p}/index.ts`, `${p}/index.tsx`];
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) return pathToFileURL(c).href;
  }
  return url;
}

export async function resolve(specifier, context, next) {
  if (specifier === '@react-native-async-storage/async-storage') {
    return { url: ASYNC_STORAGE, shortCircuit: true };
  }
  if (specifier.startsWith('@/')) {
    return { url: addExt(new URL(specifier.slice(2), SRC).href), shortCircuit: true };
  }
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    return { url: addExt(new URL(specifier, context.parentURL).href), shortCircuit: true };
  }
  return next(specifier, context);
}
