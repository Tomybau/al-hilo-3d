/**
 * Limite de intentos de login, en memoria.
 *
 * Alcanza porque la app corre como UNA instancia. Si algun dia hubiera varias
 * replicas, cada una tendria su contador y esto habria que moverlo a la base.
 *
 * Se cuentan solo los FALLOS, por dos claves independientes:
 *   - por IP: frena a quien prueba muchos usuarios desde un lugar
 *   - por usuario: frena a quien prueba muchas contrasenas contra una cuenta,
 *     aunque rote de IP
 * Un login exitoso limpia ambos contadores.
 */

type Bucket = { failures: number; resetAt: number };

export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60 * 1000;
/** Tope de claves en memoria, para que no crezca sin limite en un proceso 24/7. */
const MAX_KEYS = 10_000;

const buckets = new Map<string, Bucket>();

function prune(now: number) {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // Si sigue lleno (ataque distribuido), se descarta lo mas viejo.
  while (buckets.size >= MAX_KEYS) {
    const oldest = buckets.keys().next().value;
    if (oldest === undefined) break;
    buckets.delete(oldest);
  }
}

/** Segundos que faltan para poder reintentar, o 0 si esta permitido. */
export function retryAfterSeconds(keys: string[], now = Date.now()): number {
  let wait = 0;
  for (const key of keys) {
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (bucket.resetAt <= now) {
      buckets.delete(key);
      continue;
    }
    if (bucket.failures >= MAX_FAILURES) {
      wait = Math.max(wait, Math.ceil((bucket.resetAt - now) / 1000));
    }
  }
  return wait;
}

export function registerFailure(keys: string[], now = Date.now()) {
  prune(now);
  for (const key of keys) {
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { failures: 1, resetAt: now + WINDOW_MS });
    } else {
      bucket.failures += 1;
    }
  }
}

export function clearFailures(keys: string[]) {
  for (const key of keys) buckets.delete(key);
}

/** Solo para tests. */
export function _resetRateLimit() {
  buckets.clear();
}
