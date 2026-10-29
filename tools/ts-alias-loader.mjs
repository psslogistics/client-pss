import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const root = path.dirname(fileURLToPath(import.meta.url));
    const candidate = path.resolve(root, "..", specifier.slice(2));
    return { url: `${pathToFileURL(candidate).href}.ts`, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
