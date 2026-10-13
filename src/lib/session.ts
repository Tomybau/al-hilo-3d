/**
 * Firma y verificacion de la cookie de sesion.
 *
 * Este modulo lo usan el middleware (runtime Edge) y el servidor (Node), asi que
 * solo puede usar Web Crypto: nada de `node:crypto`. Tener UNA sola implementacion
 * del formato es a proposito; dos copias del mismo algoritmo terminan divergiendo.
 *
 * Formato: `userId.version.issuedAt.firma`
 *   - version: User.sessionVersion al momento de emitirla. Se incrementa al cambiar
 *     la contrasena o desactivar el usuario.
 *   - issuedAt: milisegundos epoch.
 *   - firma: HMAC-SHA256 en hex de `userId.version.issuedAt`.
 *
 * El middleware verifica firma y vencimiento, pero NO puede verificar `version`
 * porque no tiene acceso a la base en Edge. Eso lo hace `requireUser()` en cada
 * Server Action. Consecuencia aceptada: una sesion vieja puede seguir LEYENDO hasta
 * que venza, pero ya no puede ESCRIBIR.
 */

export const SESSION_COOKIE = "alh_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** Tolerancia para relojes levemente adelantados. */
const CLOCK_SKEW_MS = 60_000;

/** Largo minimo del secreto en produccion. 32 bytes en hex = 64 caracteres. */
export const MIN_SECRET_LENGTH = 32;

export type Session = {
  userId: number;
  version: number;
  issuedAt: number;
};

/**
 * Devuelve el secreto de firma, o lanza si es inseguro.
 *
 * Antes caia en "dev-secret-change-me" cuando faltaba la variable: en produccion eso
 * significa que cualquiera que lea el codigo (el repo es publico) puede firmar
 * cookies validas para cualquier usuario. Ahora falla cerrado.
 */
export function getSessionSecret(): string {
  const secret = process.env.COOKIE_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!secret || secret.length < MIN_SECRET_LENGTH || secret.includes("change-me")) {
      throw new Error(
        `COOKIE_SECRET falta o es inseguro: se necesitan al menos ${MIN_SECRET_LENGTH} caracteres ` +
          "aleatorios (openssl rand -hex 32).",
      );
    }
    return secret;
  }
  return secret || "solo-para-desarrollo-local-no-usar-en-produccion";
}

const encoder = new TextEncoder();

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

// `Uint8Array<ArrayBuffer>` y no `Uint8Array` a secas: Web Crypto exige un buffer
// que no sea SharedArrayBuffer, y TypeScript >= 5.7 lo distingue.
function fromHex(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]+$/.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function parsePositiveInt(raw: string): number | null {
  if (!/^\d{1,15}$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

export async function signSession(
  input: { userId: number; version: number; issuedAt?: number },
  secret: string = getSessionSecret(),
): Promise<string> {
  const issuedAt = input.issuedAt ?? Date.now();
  const payload = `${input.userId}.${input.version}.${issuedAt}`;
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(payload));
  return `${payload}.${toHex(signature)}`;
}

/**
 * Verifica la cookie. Devuelve la sesion o null; nunca lanza por una cookie mala
 * (si lanza, es por configuracion: ver getSessionSecret).
 */
export async function verifySession(
  raw: string | undefined | null,
  options: { now?: number; secret?: string } = {},
): Promise<Session | null> {
  if (!raw || raw.length > 200) return null;

  const parts = raw.split(".");
  if (parts.length !== 4) return null;
  const [userIdRaw, versionRaw, issuedAtRaw, signatureHex] = parts;

  const userId = parsePositiveInt(userIdRaw);
  const version = parsePositiveInt(versionRaw);
  const issuedAt = parsePositiveInt(issuedAtRaw);
  const signature = fromHex(signatureHex);
  if (!userId || version === null || !issuedAt || !signature) return null;

  // `verify` de Web Crypto compara en tiempo constante: no hace falta (ni conviene)
  // recalcular la firma y compararla a mano.
  const secret = options.secret ?? getSessionSecret();
  const valid = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(secret),
    signature,
    encoder.encode(`${userIdRaw}.${versionRaw}.${issuedAtRaw}`),
  );
  if (!valid) return null;

  const now = options.now ?? Date.now();
  if (issuedAt > now + CLOCK_SKEW_MS) return null;
  if (now - issuedAt > SESSION_MAX_AGE_SECONDS * 1000) return null;

  return { userId, version, issuedAt };
}
