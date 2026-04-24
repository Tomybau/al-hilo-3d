"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { setCurrentUser, clearCurrentUser } from "@/lib/current-user";

const createUserSchema = z.object({
  name: z.string().trim().min(1).max(40),
});

export async function createUser(formData: FormData) {
  const data = createUserSchema.parse({ name: formData.get("name") });
  const user = await prisma.user.upsert({
    where: { name: data.name },
    update: { active: true },
    create: { name: data.name },
  });
  await setCurrentUser(user.id);
  revalidatePath("/");
  redirect("/");
}

export async function selectUser(formData: FormData) {
  const id = Number(formData.get("userId"));
  if (!Number.isInteger(id) || id <= 0) throw new Error("Usuario inválido");
  const user = await prisma.user.findUnique({ where: { id, active: true } });
  if (!user) throw new Error("Usuario no encontrado");
  await setCurrentUser(user.id);
  const next = String(formData.get("next") ?? "/");
  redirect(next.startsWith("/") ? next : "/");
}

export async function logout() {
  await clearCurrentUser();
  redirect("/quien-soy");
}

export async function deactivateUser(formData: FormData) {
  const id = Number(formData.get("userId"));
  if (Number.isInteger(id) && id > 0) {
    await prisma.user.update({ where: { id }, data: { active: false } });
  }
  revalidatePath("/configuracion/usuarios");
}
