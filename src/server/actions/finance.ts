"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { TxDirection } from "@prisma/client";

const txSchema = z.object({
  date: z.string().min(1),
  direction: z.nativeEnum(TxDirection),
  amountArs: z.coerce.number().positive(),
  accountId: z.coerce.number().int().positive(),
  category: z.string().trim().max(60).optional().nullable(),
  description: z.string().trim().max(200).optional().nullable(),
});

export async function createTransaction(formData: FormData) {
  await requireUser();
  const data = txSchema.parse({
    date: formData.get("date"),
    direction: formData.get("direction"),
    amountArs: formData.get("amountArs"),
    accountId: formData.get("accountId"),
    category: formData.get("category") || null,
    description: formData.get("description") || null,
  });
  const userId = (await requireUser()).id;
  await prisma.transaction.create({
    data: {
      date: new Date(data.date),
      direction: data.direction,
      amountArs: data.amountArs,
      accountId: data.accountId,
      category: data.category ?? undefined,
      description: data.description ?? undefined,
      createdById: userId ?? undefined,
    },
  });
  revalidatePath("/finanzas");
  revalidatePath("/");
}

export async function deleteTransaction(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await prisma.transaction.delete({ where: { id } });
  revalidatePath("/finanzas");
}
