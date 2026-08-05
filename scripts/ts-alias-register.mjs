// Registers the `@/*` resolver hook (see ts-alias-hooks.mjs) into the module
// loader. Pass with --import so it takes effect before the entry module loads.
import { register } from "node:module";

register("./ts-alias-hooks.mjs", import.meta.url);
