"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/current-user";

const toySchema = z.object({
  name: z.string().trim().min(1).max(80),
  sku: z.string().trim().max(40).optional().nullable(),
  category: z.string().trim().max(40).optional().nullable(),
  currentPriceArs: z.coerce.number().nonnegative(),
  stock: z.coerce.number().int().nonnegative().default(0),
  notes: z.string().trim().max(300).optional().nullable(),
  printTimeMinutes: z.coerce.number().int().nonnegative().optional().nullable(),
  weightGrams: z.coerce.number().nonnegative().optional().nullable(),
  postProcessMinutes: z.coerce.number().int().nonnegative().optional().nullable(),
});

export async function createToy(formData: FormData) {
  await requireUser();
  const data = toySchema.parse({
    name: formData.get("name"),
    sku: formData.get("sku") || null,
    category: formData.get("category") || null,
    currentPriceArs: formData.get("currentPriceArs"),
    stock: formData.get("stock") ?? 0,
    notes: formData.get("notes") || null,
    printTimeMinutes: formData.get("printTimeMinutes") || null,
    weightGrams: formData.get("weightGrams") || null,
    postProcessMinutes: formData.get("postProcessMinutes") || null,
  });
  const userId = (await requireUser()).id;
  await prisma.$transaction(async (tx) => {
    const toy = await tx.toy.create({ data });
    await tx.toyPrice.create({
      data: { toyId: toy.id, priceArs: data.currentPriceArs, createdById: userId ?? undefined },
    });
  });
  revalidatePath("/juguetes");
}

export async function updateToy(formData: FormData) {
  await requireUser();
  // El stock NO se edita aca: solo cambia por incrementos (adjustToyStock y la
  // confirmacion de impresiones). Escribirlo como valor absoluto pisaria cualquier
  // incremento que ocurra mientras alguien tiene el formulario abierto.
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  const data = toySchema.omit({ stock: true }).partial().parse({
    name: formData.get("name") || undefined,
    sku: formData.get("sku") || null,
    category: formData.get("category") || null,
    currentPriceArs: formData.get("currentPriceArs") || undefined,
    notes: formData.get("notes") || null,
    printTimeMinutes: formData.get("printTimeMinutes") || null,
    weightGrams: formData.get("weightGrams") || null,
    postProcessMinutes: formData.get("postProcessMinutes") || null,
  });
  const userId = (await requireUser()).id;
  const prev = await prisma.toy.findUnique({ where: { id } });
  await prisma.toy.update({ where: { id }, data });
  if (data.currentPriceArs !== undefined && prev && Number(prev.currentPriceArs) !== data.currentPriceArs) {
    await prisma.toyPrice.create({
      data: { toyId: id, priceArs: data.currentPriceArs, createdById: userId ?? undefined },
    });
  }
  revalidatePath("/juguetes");
}

export async function updateToyPrice(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  const price = Number(formData.get("price"));
  if (!Number.isInteger(id) || !Number.isFinite(price) || price < 0) return;
  const userId = (await requireUser()).id;
  await prisma.$transaction([
    prisma.toy.update({ where: { id }, data: { currentPriceArs: price } }),
    prisma.toyPrice.create({ data: { toyId: id, priceArs: price, createdById: userId ?? undefined } }),
  ]);
  revalidatePath("/juguetes");
}

export async function adjustToyStock(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  const delta = Number(formData.get("delta"));
  if (!Number.isInteger(id) || !Number.isFinite(delta)) return;
  await prisma.toy.update({ where: { id }, data: { stock: { increment: delta } } });
  revalidatePath("/juguetes");
}

export async function updateToyProduction(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  const printTimeMinutes = formData.get("printTimeMinutes");
  const weightGrams = formData.get("weightGrams");
  const postProcessMinutes = formData.get("postProcessMinutes");
  const notes = formData.get("notes");

  const data: any = {};
  data.printTimeMinutes = printTimeMinutes ? Number(printTimeMinutes) : null;
  data.weightGrams = weightGrams ? Number(weightGrams) : null;
  data.postProcessMinutes = postProcessMinutes ? Number(postProcessMinutes) : null;
  data.notes = notes ? String(notes).trim() || null : null;

  await prisma.toy.update({ where: { id }, data });
  revalidatePath("/juguetes");
  revalidatePath("/metricas");
}

export async function toggleToyActive(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  const t = await prisma.toy.findUnique({ where: { id } });
  if (!t) return;
  await prisma.toy.update({ where: { id }, data: { active: !t.active } });
  revalidatePath("/juguetes");
}
