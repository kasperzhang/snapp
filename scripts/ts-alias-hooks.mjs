// Resolver hook so plain `node` can run the app's TypeScript modules directly.
//
// Node strips types natively, but it knows nothing about the `@/*` -> `src/*`
// path alias from tsconfig.json, so any app import fails with ERR_MODULE_NOT_FOUND.
// This maps the alias and fills in the extension/index resolution that Node's
// ESM loader won't do for TS files.
//
// Used by scripts/scan-preview.mjs via --import ./scripts/ts-alias-register.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CANDIDATES = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

function firstExisting(base) {
  for (const suffix of CANDIDATES) {
    const candidate = base + suffix;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

export async function resolve(specifier, context, next) {
  // `@/foo` -> `<root>/src/foo`
  if (specifier.startsWith("@/")) {
    const hit = firstExisting(path.join(root, "src", specifier.slice(2)));
    if (hit) return next(pathToFileURL(hit).href, context);
  }

  // `./foo` / `../foo` with no extension. TypeScript allows it, Node's ESM
  // loader does not — so one TS module importing another by relative path
  // fails without this, even though the alias case already worked.
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !path.extname(specifier) &&
    context.parentURL?.startsWith("file:")
  ) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const hit = firstExisting(path.resolve(parentDir, specifier));
    if (hit) return next(pathToFileURL(hit).href, context);
  }

  return next(specifier, context);
}
