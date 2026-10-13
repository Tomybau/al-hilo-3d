/**
 * Se ejecuta una vez al arrancar el servidor.
 *
 * Valida la configuracion critica ANTES de atender requests: si COOKIE_SECRET falta
 * o es debil en produccion, el servidor no arranca. Antes el codigo caia en silencio
 * en "dev-secret-change-me", y como el repo es publico eso significa que cualquiera
 * podria firmar cookies validas para cualquier usuario.
 *
 * El middleware ademas falla cerrado (500) si llegara a correr con un secreto
 * invalido, como segunda barrera.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { getSessionSecret } = await import("./lib/session");
  getSessionSecret();
}
