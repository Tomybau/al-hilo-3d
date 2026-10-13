/**
 * Valida el destino al que se redirige despues del login (`?next=...`).
 *
 * Antes se aceptaba cualquier cosa que empezara con "/", y eso deja pasar
 * `//sitio-externo.com`: el navegador lo interpreta como una URL absoluta sin
 * protocolo. Es un "open redirect" — el ataque tipico es un link de phishing que
 * pasa por tu dominio real y termina en una copia falsa de tu login.
 *
 * Este modulo no importa nada de Node: lo usa tambien el middleware (Edge).
 */
export function safeNext(raw: unknown, fallback = "/"): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2000) return fallback;

  // Tiene que ser una ruta relativa al propio sitio.
  if (!raw.startsWith("/")) return fallback;

  // "//host" y "/\host": los navegadores los tratan como URL absoluta.
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;

  // Caracteres de control: el parser de URL del navegador DESCARTA tabs y saltos de
  // linea, asi que "/\t/evil.com" termina siendo "//evil.com".
  if (/[\x00-\x1f\x7f]/.test(raw)) return fallback;

  // Volver al login despues de loguearse seria un loop.
  if (raw === "/login" || raw.startsWith("/login?") || raw.startsWith("/login/")) return fallback;

  return raw;
}
