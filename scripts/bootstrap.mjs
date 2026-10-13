#!/usr/bin/env node
/**
 * Garantiza que exista al menos un usuario capaz de iniciar sesion.
 *
 * Corre en cada arranque del contenedor, entre `prisma migrate deploy` y el servidor.
 * Es idempotente: si ya hay algun usuario activo con contrasena, no hace nada.
 *
 * Solo actua en el primer despliegue (o si alguien deja el sistema sin usuarios con
 * acceso): crea el usuario ADMIN_NAME con ADMIN_PASSWORD, o le asigna esa contrasena
 * si ya existia (por ejemplo, el "Tomás" que crea el seed).
 *
 * Despues del primer login conviene cambiar la contrasena desde la app y BORRAR
 * ADMIN_PASSWORD del .env: ya no se usa y no tiene sentido dejarla escrita.
 */

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "./lib/password-hash.mjs";

const MIN_PASSWORD_LENGTH = 8;

const prisma = new PrismaClient();

async function main() {
  const usable = await prisma.user.count({ where: { active: true, passwordHash: { not: null } } });
  if (usable > 0) {
    console.log(`[bootstrap] ${usable} usuario(s) con acceso. Nada que hacer.`);
    return 0;
  }

  const name = process.env.ADMIN_NAME?.trim();
  const password = process.env.ADMIN_PASSWORD ?? "";

  if (!name || !password) {
    console.error(
      "[bootstrap] No hay ningun usuario que pueda iniciar sesion.\n" +
        "            Defini ADMIN_NAME y ADMIN_PASSWORD en el .env para crear el primero.",
    );
    // Fallar es lo correcto: una app en la que nadie puede entrar no sirve, y es
    // mejor un error claro en el primer deploy que una pantalla de login inutil.
    return 1;
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`[bootstrap] ADMIN_PASSWORD tiene que tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    return 1;
  }

  const passwordHash = await hashPassword(password);
  const existing = await prisma.user.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, active: true, sessionVersion: { increment: 1 } },
    });
  } else {
    await prisma.user.create({ data: { name, passwordHash } });
  }

  console.log(`[bootstrap] Usuario "${name}" listo para iniciar sesion. Cambiá la contraseña desde la app y borrá ADMIN_PASSWORD del .env.`);
  return 0;
}

main()
  .then(async (code) => {
    await prisma.$disconnect();
    process.exit(code);
  })
  .catch(async (err) => {
    console.error("[bootstrap] Error:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
