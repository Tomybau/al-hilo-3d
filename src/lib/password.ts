/**
 * Hash de contrasenas con scrypt (node:crypto, sin dependencias nuevas).
 *
 * Formato guardado: `scrypt$N$r$p$salBase64$hashBase64`.
 * Los parametros viajan dentro del hash para poder endurecerlos mas adelante sin
 * invalidar las contrasenas existentes: cada hash se verifica con SUS parametros.
 *
 * OJO: `scripts/bootstrap.mjs` reimplementa `hashPassword` en JS plano, porque corre
 * en la imagen de produccion donde no hay TypeScript. Un test verifica que los dos
 * produzcan hashes compatibles; si cambias el formato aca, cambialo alla.
 */

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const SCRYPT_N = 2 ** 15;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;
/** scrypt necesita 128 * N * r bytes; con N=2^15, r=8 son 32 MiB, justo el tope por defecto. */
const MAX_MEMORY = 64 * 1024 * 1024;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 200;

type Params = { N: number; r: number; p: number };

function scrypt(password: string, salt: Buffer, keylen: number, params: Params): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      keylen,
      { N: params.N, r: params.r, p: params.p, maxmem: MAX_MEMORY },
      (err, key) => (err ? reject(err) : resolve(key)),
    );
  });
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La contrasena tiene que tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return "La contrasena es demasiado larga.";
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const params = { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P };
  const key = await scrypt(password, salt, KEY_LENGTH, params);
  return ["scrypt", params.N, params.r, params.p, salt.toString("base64"), key.toString("base64")].join(
    "$",
  );
}

function parseHash(stored: string) {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;
  const [, n, r, p, saltB64, keyB64] = parts;
  const params = { N: Number(n), r: Number(r), p: Number(p) };
  if (![params.N, params.r, params.p].every((v) => Number.isSafeInteger(v) && v > 0)) return null;
  const salt = Buffer.from(saltB64, "base64");
  const key = Buffer.from(keyB64, "base64");
  if (salt.length === 0 || key.length === 0) return null;
  return { params, salt, key };
}

/**
 * Hash de una contrasena que nadie conoce, para verificar contra algo cuando el
 * usuario no existe. Sin esto, "usuario inexistente" responderia en microsegundos y
 * "contrasena incorrecta" en ~100 ms: la diferencia de tiempo revela que usuarios
 * existen.
 */
let dummyHash: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(32).toString("hex"));
  return dummyHash;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (password.length > MAX_PASSWORD_LENGTH) return false;

  const parsed = parseHash(stored ?? (await getDummyHash()));
  if (!parsed) {
    // Hash corrupto: igual gastamos el tiempo de una verificacion.
    await verifyPassword(password, await getDummyHash());
    return false;
  }

  const candidate = await scrypt(password, parsed.salt, parsed.key.length, parsed.params);
  const matches = candidate.length === parsed.key.length && timingSafeEqual(candidate, parsed.key);
  // Si no habia hash real (usuario inexistente o sin contrasena), nunca es valido.
  return matches && Boolean(stored);
}
