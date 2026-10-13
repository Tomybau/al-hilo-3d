"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { endSession, requireUser, startSession } from "@/lib/current-user";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/password";
import { clearFailures, registerFailure, retryAfterSeconds } from "@/lib/rate-limit";
import { safeNext } from "@/lib/safe-redirect";

export type FormState = { error?: string; ok?: string } | null;

/** Mensaje unico para usuario inexistente y contrasena incorrecta: no revela cuales nombres existen. */
const BAD_CREDENTIALS = "Usuario o contraseña incorrectos.";

async function clientIp(): Promise<string> {
  const h = await headers();
  // Detras de Caddy, la IP real llega en X-Forwarded-For. Se toma la PRIMERA:
  // es la que agrego el proxy de confianza para el cliente original.
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "local";
}

/**
 * Inicio de sesion. Publica por definicion: es la UNICA accion (junto con logout)
 * que no llama a requireUser. Esta en la lista de excepciones de
 * scripts/check-actions-auth.mjs.
 */
export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!name || !password) return { error: "Completá usuario y contraseña." };

  const keys = [`ip:${await clientIp()}`, `user:${name.toLowerCase()}`];
  const wait = retryAfterSeconds(keys);
  if (wait > 0) {
    const minutes = Math.ceil(wait / 60);
    return { error: `Demasiados intentos fallidos. Probá de nuevo en ${minutes} minuto${minutes === 1 ? "" : "s"}.` };
  }

  // Sin distinguir mayusculas: "tomás" y "Tomás" son la misma persona.
  const user = await prisma.user.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true, active: true, passwordHash: true, sessionVersion: true },
  });

  // La verificacion corre SIEMPRE, aunque el usuario no exista (contra un hash
  // ficticio). Si no, el tiempo de respuesta revelaria que nombres existen.
  const valid = await verifyPassword(password, user?.passwordHash);

  if (!valid || !user || !user.active) {
    registerFailure(keys);
    return { error: BAD_CREDENTIALS };
  }

  clearFailures(keys);
  await startSession(user);
  redirect(next);
}

/** Cerrar sesion. Publica a proposito: tiene que funcionar aunque la sesion este vencida. */
export async function logout() {
  await endSession();
  redirect("/login");
}

/**
 * Cambiar la propia contrasena. Incrementa sessionVersion: cierra las sesiones en
 * cualquier OTRO dispositivo, y re-emite la cookie de este para no echarte a vos.
 */
export async function changeOwnPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();

  const current = String(formData.get("current") ?? "");
  const nextPassword = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const row = await prisma.user.findUnique({ where: { id: me.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(current, row?.passwordHash))) {
    return { error: "La contraseña actual no es correcta." };
  }

  const weak = validatePasswordStrength(nextPassword);
  if (weak) return { error: weak };
  if (nextPassword !== confirm) return { error: "Las contraseñas nuevas no coinciden." };

  const updated = await prisma.user.update({
    where: { id: me.id },
    data: { passwordHash: await hashPassword(nextPassword), sessionVersion: { increment: 1 } },
    select: { id: true, sessionVersion: true },
  });
  await startSession(updated);

  return { ok: "Contraseña actualizada. Se cerró la sesión en los demás dispositivos." };
}
