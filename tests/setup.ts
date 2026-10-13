/**
 * Solo para tests: Web Crypto como global.
 *
 * `src/lib/session.ts` usa `crypto.subtle` porque tiene que correr tambien en el
 * middleware (runtime Edge). En produccion esta disponible siempre: Node 22 lo trae
 * como global, Edge tambien, y el servidor de Next lo rellena en versiones viejas.
 * Vitest corriendo sobre Node 18 es el unico entorno donde falta.
 */
import { webcrypto } from "node:crypto";

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
}
