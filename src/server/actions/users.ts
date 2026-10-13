"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, startSession } from "@/lib/current-user";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import type { FormState } from "./auth";

/*
 * Antes `createUser` era publica y ademas te dejaba logueado: desde /quien-soy
 * cualquiera se creaba un usuario y entraba al sistema. Ahora crear usuarios exige
 * sesion, y cada usuario nuevo nace con contrasena.
 *
 * No hay roles: cualquier persona con sesion puede administrar usuarios. Para un
 * negocio familiar es lo razonable; si algun dia hiciera falta, el lugar para
 * agregar un `isAdmin` es aca.
 */

const nameSchema = z.string().trim().min(1, "Falta el nombre.").max(40, "Nombre demasiado largo.");

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();

  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Nombre inválido." };
  const name = parsed.data;

  const password = String(formData.get("password") ?? "");
  const weak = validatePasswordStrength(password);
  if (weak) return { error: weak };

  const existing = await prisma.user.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return { error: `Ya existe un usuario llamado "${name}".` };

  await prisma.user.create({ data: { name, passwordHash: await hashPassword(password) } });
  revalidatePath("/configuracion");
  return { ok: `Usuario "${name}" creado.` };
}

/**
 * Asignar o resetear la contrasena de un usuario. Cierra todas sus sesiones abiertas.
 * Es tambien la forma de darle acceso a un usuario viejo que todavia no tiene contrasena.
 */
export async function setUserPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();

  const userId = Number(formData.get("userId"));
  if (!Number.isInteger(userId) || userId <= 0) return { error: "Usuario inválido." };

  const password = String(formData.get("password") ?? "");
  const weak = validatePasswordStrength(password);
  if (weak) return { error: weak };

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password), sessionVersion: { increment: 1 } },
    select: { id: true, name: true, sessionVersion: true },
  });

  // Si te cambiaste la tuya desde aca, re-emitimos tu cookie para no echarte.
  if (updated.id === me.id) await startSession(updated);

  revalidatePath("/configuracion");
  return { ok: `Contraseña de "${updated.name}" actualizada.` };
}

export async function deactivateUser(formData: FormData) {
  const me = await requireUser();

  const id = Number(formData.get("userId"));
  if (!Number.isInteger(id) || id <= 0) return;

  // No te podes desactivar a vos mismo: es la forma mas facil de quedarse afuera.
  if (id === me.id) return;

  // Y siempre tiene que quedar al menos otro usuario capaz de iniciar sesion.
  const others = await prisma.user.count({
    where: { id: { not: id }, active: true, passwordHash: { not: null } },
  });
  if (others === 0) return;

  // Incrementar sessionVersion cierra sus sesiones abiertas en el acto.
  await prisma.user.update({
    where: { id },
    data: { active: false, sessionVersion: { increment: 1 } },
  });
  revalidatePath("/configuracion");
}
