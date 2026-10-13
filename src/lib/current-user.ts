/**
 * Sesion del usuario actual, del lado del servidor.
 *
 * Dos niveles de verificacion, a proposito:
 *   - El middleware (Edge) verifica firma y vencimiento de la cookie. Frena a
 *     cualquiera sin sesion, sea para leer una pagina o para invocar una accion.
 *   - `requireUser()` ademas va a la base: el usuario tiene que existir, estar
 *     activo, tener contrasena y la misma `sessionVersion` que la cookie. Es lo que
 *     invalida una sesion despues de un cambio de contrasena.
 *
 * Toda Server Action tiene que empezar con `await requireUser()`. En un archivo
 * "use server", CADA funcion exportada es un endpoint publico invocable con un POST,
 * aunque parezca una funcion interna. `scripts/check-actions-auth.mjs` lo verifica.
 */

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSession, verifySession } from "./session";

export type CurrentUser = { id: number; name: string };

/**
 * Usuario de la request actual, o null.
 *
 * Envuelto en `cache()`: el layout y varias acciones lo piden en la misma request,
 * y asi se consulta la base una sola vez.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, active: true, sessionVersion: true, passwordHash: true },
  });

  if (!user || !user.active || !user.passwordHash) return null;
  // Cookie emitida antes de un cambio de contrasena o de una desactivacion.
  if (user.sessionVersion !== session.version) return null;

  return { id: user.id, name: user.name };
});

/** El usuario actual, o redirige al login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Compatibilidad con el codigo existente que solo necesita el id. */
export async function getCurrentUserId(): Promise<number | null> {
  return (await getCurrentUser())?.id ?? null;
}

export async function startSession(user: { id: number; sessionVersion: number }) {
  const value = await signSession({ userId: user.id, version: user.sessionVersion });
  const store = await cookies();
  store.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
