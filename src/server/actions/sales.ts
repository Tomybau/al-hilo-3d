"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/current-user";
import { SettlementKind, TxDirection } from "@prisma/client";

export async function createSalesDay(formData: FormData) {
  const date = String(formData.get("date") ?? new Date().toISOString().slice(0, 10));
  const locationId = Number(formData.get("locationId")) || null;
  const userId = await getCurrentUserId();
  const sd = await prisma.salesDay.create({
    data: {
      date: new Date(date),
      locationId: locationId ?? undefined,
      createdById: userId ?? undefined,
    },
  });
  redirect(`/ventas/${sd.id}`);
}

const lineSchema = z.object({
  salesDayId: z.coerce.number().int().positive(),
  toyId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(0),
});

export async function setSaleLine(formData: FormData) {
  const data = lineSchema.parse({
    salesDayId: formData.get("salesDayId"),
    toyId: formData.get("toyId"),
    quantity: formData.get("quantity"),
  });
  const sd = await prisma.salesDay.findUniqueOrThrow({ where: { id: data.salesDayId } });
  if (sd.status === "CLOSED") throw new Error("Día cerrado — reabrí para editar");
  const toy = await prisma.toy.findUniqueOrThrow({ where: { id: data.toyId } });

  if (data.quantity === 0) {
    await prisma.saleLine.deleteMany({ where: { salesDayId: data.salesDayId, toyId: data.toyId } });
  } else {
    await prisma.saleLine.upsert({
      where: { salesDayId_toyId: { salesDayId: data.salesDayId, toyId: data.toyId } },
      update: { quantity: data.quantity, unitPriceArs: toy.currentPriceArs },
      create: {
        salesDayId: data.salesDayId,
        toyId: data.toyId,
        quantity: data.quantity,
        unitPriceArs: toy.currentPriceArs,
      },
    });
  }
  revalidatePath(`/ventas/${data.salesDayId}`);
}

export async function closeSalesDay(formData: FormData) {
  const salesDayId = Number(formData.get("salesDayId"));
  const accounts = await prisma.account.findMany({ where: { active: true } });
  const receipts = accounts
    .map((a) => ({ accountId: a.id, amount: Number(formData.get(`receipt_${a.id}`) ?? 0) }))
    .filter((r) => r.amount > 0);

  const discountCount = Number(formData.get("discountCount") ?? 0);
  const discountLines: { amount: number; category: string; note: string }[] = [];
  for (let i = 0; i < discountCount; i++) {
    const amount = Number(formData.get(`discount_amount_${i}`) ?? 0);
    const category = String(formData.get(`discount_category_${i}`) ?? "").trim();
    const note = String(formData.get(`discount_note_${i}`) ?? "").trim();
    if (amount > 0) discountLines.push({ amount, category, note });
  }
  const discountTotal = discountLines.reduce((s, d) => s + d.amount, 0);

  const userId = await getCurrentUserId();

  // Cuenta donde se asentarán los gastos derivados de descuentos (la de mayor recibo, o la primera CASH)
  const expenseAccountId =
    receipts.sort((a, b) => b.amount - a.amount)[0]?.accountId ??
    accounts.find((a) => a.kind === "CASH")?.id ??
    accounts[0]?.id;

  await prisma.$transaction(async (tx) => {
    const sd = await tx.salesDay.findUniqueOrThrow({
      where: { id: salesDayId },
      include: { lines: true, miscLines: true },
    });
    if (sd.status === "CLOSED") throw new Error("Ya cerrado");

    const expected =
      sd.lines.reduce((acc, l) => acc + l.quantity * Number(l.unitPriceArs), 0) +
      sd.miscLines.reduce((acc, l) => acc + l.quantity * Number(l.unitPriceArs), 0);
    const received = receipts.reduce((acc, r) => acc + r.amount, 0);
    const discrepancy = expected - received - discountTotal;

    for (const r of receipts) {
      await tx.settlement.create({
        data: { salesDayId: sd.id, accountId: r.accountId, amountArs: r.amount, kind: SettlementKind.RECEIVED },
      });
      await tx.transaction.create({
        data: {
          date: sd.date,
          direction: TxDirection.INCOME,
          amountArs: r.amount,
          accountId: r.accountId,
          category: "Venta",
          description: `Cierre venta ${sd.date.toISOString().slice(0, 10)}`,
          salesDayId: sd.id,
          createdById: userId ?? undefined,
        },
      });
    }

    for (const d of discountLines) {
      const noteParts = [d.category, d.note].filter(Boolean);
      await tx.settlement.create({
        data: {
          salesDayId: sd.id,
          amountArs: d.amount,
          kind: SettlementKind.DISCOUNT,
          note: noteParts.join(" — ") || undefined,
        },
      });
      if (d.category && expenseAccountId) {
        await tx.transaction.create({
          data: {
            date: sd.date,
            direction: TxDirection.EXPENSE,
            amountArs: d.amount,
            accountId: expenseAccountId,
            category: d.category,
            description: d.note || `Descuento cierre ${sd.date.toISOString().slice(0, 10)}`,
            salesDayId: sd.id,
            createdById: userId ?? undefined,
          },
        });
      }
    }

    if (Math.abs(discrepancy) > 0.5) {
      await tx.settlement.create({
        data: {
          salesDayId: sd.id,
          amountArs: discrepancy,
          kind: SettlementKind.DISCREPANCY,
          note: `Esperado ${expected.toFixed(2)} - Recibido ${received.toFixed(2)} - Desc ${discountTotal.toFixed(2)}`,
        },
      });
    }

    for (const line of sd.lines) {
      await tx.toy.update({ where: { id: line.toyId }, data: { stock: { decrement: line.quantity } } });
    }
    await tx.salesDay.update({ where: { id: sd.id }, data: { status: "CLOSED", closedAt: new Date() } });
  });

  revalidatePath(`/ventas/${salesDayId}`);
  revalidatePath("/ventas");
  revalidatePath("/finanzas");
  revalidatePath("/");
}

// Reabre una venta cerrada: borra settlements/transactions y restaura stock.
// Permite editar y volver a cerrar.
export async function reopenSalesDay(formData: FormData) {
  const salesDayId = Number(formData.get("salesDayId"));
  if (!Number.isInteger(salesDayId)) return;

  await prisma.$transaction(async (tx) => {
    const sd = await tx.salesDay.findUniqueOrThrow({
      where: { id: salesDayId },
      include: { lines: true },
    });
    if (sd.status !== "CLOSED") return;

    // Restaurar stock vendido
    for (const line of sd.lines) {
      await tx.toy.update({ where: { id: line.toyId }, data: { stock: { increment: line.quantity } } });
    }
    // Borrar transactions y settlements asociados
    await tx.transaction.deleteMany({ where: { salesDayId } });
    await tx.settlement.deleteMany({ where: { salesDayId } });
    // Marcar como DRAFT
    await tx.salesDay.update({
      where: { id: salesDayId },
      data: { status: "DRAFT", closedAt: null },
    });
  });

  revalidatePath(`/ventas/${salesDayId}`);
  revalidatePath("/ventas");
  revalidatePath("/finanzas");
  redirect(`/ventas/${salesDayId}`);
}

// Actualiza metadata de la venta (lugar, notas, fecha) — funciona en draft o cerrada.
export async function updateSalesDayMeta(formData: FormData) {
  const id = Number(formData.get("id"));
  const locationIdRaw = formData.get("locationId");
  const date = formData.get("date") as string | null;
  const notes = (formData.get("notes") as string | null) || null;
  if (!Number.isInteger(id)) return;

  const data: any = {};
  if (locationIdRaw !== null) {
    const lid = Number(locationIdRaw);
    data.locationId = Number.isFinite(lid) && lid > 0 ? lid : null;
  }
  if (date) data.date = new Date(date);
  if (notes !== undefined) data.notes = notes;

  await prisma.salesDay.update({ where: { id }, data });
  revalidatePath(`/ventas/${id}`);
  revalidatePath("/ventas");
}

export async function deleteSalesDay(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  const sd = await prisma.salesDay.findUnique({ where: { id } });
  if (!sd || sd.status === "CLOSED") return;
  await prisma.salesDay.delete({ where: { id } });
  revalidatePath("/ventas");
}

export async function setMiscLine(formData: FormData) {
  const salesDayId = Number(formData.get("salesDayId"));
  const id = Number(formData.get("id")) || null;
  const description = String(formData.get("description") ?? "").trim();
  const quantity = Math.max(1, Number(formData.get("quantity")) || 1);
  const unitPriceArs = Number(formData.get("unitPriceArs")) || 0;
  if (!Number.isInteger(salesDayId) || !description) return;
  const sd = await prisma.salesDay.findUniqueOrThrow({ where: { id: salesDayId } });
  if (sd.status === "CLOSED") throw new Error("Día cerrado — reabrí para editar");

  if (id) {
    await prisma.miscLine.update({ where: { id }, data: { description, quantity, unitPriceArs } });
  } else {
    await prisma.miscLine.create({ data: { salesDayId, description, quantity, unitPriceArs } });
  }
  revalidatePath(`/ventas/${salesDayId}`);
}

export async function deleteMiscLine(formData: FormData) {
  const id = Number(formData.get("id"));
  const salesDayId = Number(formData.get("salesDayId"));
  if (!Number.isInteger(id)) return;
  const line = await prisma.miscLine.findUnique({ where: { id }, include: { salesDay: { select: { status: true } } } });
  if (!line || line.salesDay.status === "CLOSED") return;
  await prisma.miscLine.delete({ where: { id } });
  revalidatePath(`/ventas/${salesDayId}`);
}

// Reemplaza todas las variantes de una SaleLine (Pokémon → Pikachu×2, Charizard×1…)
export async function setSaleLineVariants(formData: FormData) {
  const saleLineId = Number(formData.get("saleLineId"));
  if (!Number.isInteger(saleLineId)) return;
  const line = await prisma.saleLine.findUniqueOrThrow({
    where: { id: saleLineId },
    include: { salesDay: { select: { status: true } } },
  });
  if (line.salesDay.status === "CLOSED") return;

  // Parse variants: variantName_0, variantQty_0, variantName_1, …
  const variants: { name: string; quantity: number }[] = [];
  let i = 0;
  while (formData.has(`variantName_${i}`)) {
    const name = String(formData.get(`variantName_${i}`) ?? "").trim();
    const qty = Math.max(1, Number(formData.get(`variantQty_${i}`)) || 1);
    if (name) variants.push({ name, quantity: qty });
    i++;
  }

  await prisma.$transaction([
    prisma.saleLineVariant.deleteMany({ where: { saleLineId } }),
    ...variants.map((v) =>
      prisma.saleLineVariant.create({ data: { saleLineId, ...v } })
    ),
  ]);
  revalidatePath(`/ventas/${line.salesDayId}`);
}
