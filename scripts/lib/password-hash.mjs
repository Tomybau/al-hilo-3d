/**
 * Hash scrypt en JS plano, para los scripts que corren en la imagen de produccion
 * (donde no hay TypeScript ni `src/`).
 *
 * TIENE QUE producir el mismo formato que `src/lib/password.ts`:
 *   scrypt$N$r$p$salBase64$hashBase64
 * `tests/password.test.ts` verifica que un hash hecho aca valide con la funcion de la
 * app. Si cambias uno de los dos, ese test falla.
 */

import { randomBytes, scrypt } from "node:crypto";

const SCRYPT_N = 2 ** 15;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;
const MAX_MEMORY = 64 * 1024 * 1024;

export function hashPassword(password) {
  const salt = randomBytes(SALT_BYTES);
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: MAX_MEMORY },
      (err, key) => {
        if (err) return reject(err);
        resolve(["scrypt", SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString("base64"), key.toString("base64")].join("$"));
      },
    );
  });
}
