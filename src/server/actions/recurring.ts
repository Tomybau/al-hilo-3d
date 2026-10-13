"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/current-user";

const billSchema = z.object({
  name: z.string().trim().min(1).max(80),
  amountArs: z.coerce.number().nonnegative(),
  dueDay: z.coerce.number().int().min(1).max(31),
  accountId: z.coerce.number().int().positive().optional().nullable(),
  category: z.string().trim().max(60).optional().nullable(),
});

export async function createRecurringBill(formData: FormData) {
  await requireUser();
  const data = billSchema.parse({
    name: formData.get("name"),
    amountArs: formData.get("amountArs"),
    dueDay: formData.get("dueDay"),
    accountId: formData.get("accountId") ? Number(formData.get("accountId")) : null,
    category: formData.get("category") || null,
  });
  await prisma.recurringBill.create({
    data: {
      name: data.name,
      amountArs: data.amountArs,
      dueDay: data.dueDay,
      accountId: data.accountId ?? undefined,
      category: data.category ?? undefined,
    },
  });
  revalidatePath("/finanzas");
  revalidatePath("/");
}

export async function toggleRecurringBill(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  const bill = await prisma.recurringBill.findUnique({ where: { id } });
  if (!bill) return;
  await prisma.recurringBill.update({ where: { id }, data: { active: !bill.active } });
  revalidatePath("/finanzas");
  revalidatePath("/");
}

export async function deleteRecurringBill(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await prisma.recurringBill.delete({ where: { id } });
  revalidatePath("/finanzas");
  revalidatePath("/");
}

/**
 * Marca un pago recurrente como pagado este mes:
 * - Actualiza lastPaidAt
 * - Crea una Transaction de EXPENSE si hay accountId
 */
export async function payRecurringBill(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  const userId = (await requireUser()).id;

  const bill = await prisma.recurringBill.findUnique({
    where: { id },
    include: { account: true },
  });
  if (!bill) return;

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.recurringBill.update({
      where: { id },
      data: { lastPaidAt: now },
    });

    if (bill.accountId) {
      await tx.transaction.create({
        data: {
          date: now,
          direction: "EXPENSE",
          amountArs: bill.amountArs,
          accountId: bill.accountId,
          category: bill.category ?? "Gastos fijos",
          description: bill.name,
          createdById: userId ?? undefined,
        },
      });
    }
  });

  revalidatePath("/finanzas");
  revalidatePath("/");
}
