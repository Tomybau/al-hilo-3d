"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/current-user";
import { FilamentType } from "@prisma/client";

const orderSchema = z.object({
  supplier: z.string().trim().min(1).max(60),
  date: z.string().min(1),
  shippingArs: z.coerce.number().nonnegative().default(0),
  notes: z.string().trim().max(200).optional().nullable(),
});

// Proveedores que representan carga inicial histórica — no generan transacción financiera.
const SKIP_FINANCE_SUPPLIERS = ["Carga Inicial"];

// Crear orden de compra + batches.
// Lee líneas: filament_<i>_brand, color, type, qty, price.
// Si shippingArs > 0, distribuye proporcional al subtotal de cada línea.
// Si accountId está presente y el proveedor no es de carga inicial, registra un gasto.
export async function createFilamentOrder(formData: FormData) {
  const data = orderSchema.parse({
    supplier: formData.get("supplier"),
    date: formData.get("date"),
    shippingArs: formData.get("shippingArs") ?? 0,
    notes: formData.get("notes") || null,
  });
  const userId = await getCurrentUserId();
  const accountId = formData.get("accountId") ? Number(formData.get("accountId")) : null;

  const lines: { brand: string; color: string; type: FilamentType; qty: number; price: number }[] = [];
  for (let i = 0; i < 50; i++) {
    const brand = String(formData.get(`filament_${i}_brand`) ?? "").trim();
    if (!brand) continue;
    const color = String(formData.get(`filament_${i}_color`) ?? "").trim();
    const type = (String(formData.get(`filament_${i}_type`) ?? "PLA")) as FilamentType;
    const qty = Number(formData.get(`filament_${i}_qty`) ?? 1);
    const price = Number(formData.get(`filament_${i}_price`) ?? 0);
    if (color && qty > 0) lines.push({ brand, color, type, qty, price });
  }
  if (lines.length === 0) return;

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const shipping = data.shippingArs;

  await prisma.$transaction(async (tx) => {
    const order = await tx.filamentOrder.create({
      data: {
        supplier: data.supplier,
        date: new Date(data.date),
        shippingArs: shipping,
        notes: data.notes ?? undefined,
        createdById: userId ?? undefined,
      },
    });

    for (const line of lines) {
      const filament = await tx.filament.upsert({
        where: { brand_color_type: { brand: line.brand, color: line.color, type: line.type } },
        update: { active: true },
        create: { brand: line.brand, color: line.color, type: line.type },
      });

      // Prorrateo del envío a cada rollo: share = (precio_rollo / subtotal) * envío
      const shippingPerRoll = subtotal > 0 ? (line.price / subtotal) * shipping : 0;
      const realPrice = line.price + shippingPerRoll;

      for (let r = 0; r < line.qty; r++) {
        await tx.filamentBatch.create({
          data: {
            filamentId: filament.id,
            orderId: order.id,
            gramsTotal: 1000,
            gramsRemaining: 1000,
            purchasePriceArs: realPrice,
            purchaseDate: new Date(data.date),
            createdById: userId ?? undefined,
          },
        });
      }
    }

    // Registrar gasto automático si se eligió cuenta y no es proveedor de carga inicial
    const totalCost = subtotal + shipping;
    if (accountId && !SKIP_FINANCE_SUPPLIERS.includes(data.supplier) && totalCost > 0) {
      await tx.transaction.create({
        data: {
          date: new Date(data.date),
          direction: "EXPENSE",
          amountArs: totalCost,
          accountId,
          category: "Filamentos",
          description: `Compra filamentos – ${data.supplier}`,
          createdById: userId ?? undefined,
        },
      });
    }
  });
  revalidatePath("/filamentos");
  revalidatePath("/finanzas");
  redirect("/filamentos");
}

export async function markBatchFinished(formData: FormData) {
  const batchId = Number(formData.get("batchId"));
  if (!Number.isInteger(batchId)) return;
  await prisma.filamentBatch.update({
    where: { id: batchId },
    data: { isFinished: true, gramsRemaining: 0 },
  });
  revalidatePath("/filamentos");
}

export async function updateFilamentStock(formData: FormData) {
  const updates: { filamentId: number; activeQty: number }[] = [];
  for (const [k, v] of formData.entries()) {
    if (typeof k === "string" && k.startsWith("stock_")) {
      const fid = Number(k.slice("stock_".length));
      const qty = Number(v);
      if (Number.isInteger(fid) && Number.isFinite(qty) && qty >= 0) {
        updates.push({ filamentId: fid, activeQty: qty });
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const u of updates) {
      const activeBatches = await tx.filamentBatch.findMany({
        where: { filamentId: u.filamentId, isFinished: false },
        orderBy: { purchaseDate: "asc" },
      });
      const toFinish = activeBatches.length - u.activeQty;
      if (toFinish > 0) {
        const ids = activeBatches.slice(0, toFinish).map((b) => b.id);
        await tx.filamentBatch.updateMany({
          where: { id: { in: ids } },
          data: { isFinished: true, gramsRemaining: 0 },
        });
      }
    }
  });
  revalidatePath("/filamentos");
}
