"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { IssueSeverity, PartMoveType, PrinterStatus } from "@prisma/client";

export async function createPrinter(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim() || null;
  if (!name) return;
  await prisma.printer.create({ data: { name, model: model ?? undefined } });
  revalidatePath("/configuracion");
  revalidatePath("/impresoras");
}

export async function setPrinterStatus(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  const status = formData.get("status") as PrinterStatus;
  if (!Number.isInteger(id) || !status) return;
  await prisma.printer.update({ where: { id }, data: { status } });
  revalidatePath("/impresoras");
  revalidatePath(`/impresoras/${id}`);
}

export async function createPart(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim() || null;
  const stock = Number(formData.get("stock") ?? 0);
  const printerIds: number[] = [];
  for (const [k, v] of formData.entries()) {
    if (typeof k === "string" && k.startsWith("printer_") && v === "on") {
      const pid = Number(k.slice("printer_".length));
      if (Number.isInteger(pid)) printerIds.push(pid);
    }
  }
  if (!name) return;
  const userId = (await requireUser()).id;
  await prisma.$transaction(async (tx) => {
    const part = await tx.part.create({
      data: {
        name,
        sku: sku ?? undefined,
        stock,
        compatiblePrinters: printerIds.length > 0 ? { connect: printerIds.map((id) => ({ id })) } : undefined,
      },
    });
    if (stock > 0) {
      await tx.partMove.create({
        data: { partId: part.id, type: PartMoveType.PURCHASE, qty: stock, createdById: userId ?? undefined },
      });
    }
  });
  revalidatePath("/impresoras");
  revalidatePath("/configuracion");
}

export async function adjustPartStock(formData: FormData) {
  await requireUser();
  const partId = Number(formData.get("partId"));
  const delta = Number(formData.get("delta"));
  if (!Number.isInteger(partId) || !Number.isFinite(delta) || delta === 0) return;
  const userId = (await requireUser()).id;
  await prisma.$transaction([
    prisma.part.update({ where: { id: partId }, data: { stock: { increment: delta } } }),
    prisma.partMove.create({
      data: {
        partId,
        type: delta > 0 ? PartMoveType.PURCHASE : PartMoveType.ADJUSTMENT,
        qty: Math.abs(delta),
        createdById: userId ?? undefined,
      },
    }),
  ]);
  revalidatePath("/impresoras");
}

export async function createIssue(formData: FormData) {
  await requireUser();
  const printerId = Number(formData.get("printerId"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const severity = (String(formData.get("severity") ?? "MEDIUM")) as IssueSeverity;
  if (!Number.isInteger(printerId) || !title) return;
  const userId = (await requireUser()).id;
  await prisma.issue.create({
    data: { printerId, title, description: description ?? undefined, severity, createdById: userId ?? undefined },
  });
  revalidatePath(`/impresoras/${printerId}`);
  revalidatePath("/impresoras");
}

export async function resolveIssue(formData: FormData) {
  await requireUser();
  const issueId = Number(formData.get("issueId"));
  if (!Number.isInteger(issueId)) return;
  const userId = (await requireUser()).id;
  const issue = await prisma.issue.findUniqueOrThrow({ where: { id: issueId } });

  const partsUsed: { partId: number; qty: number }[] = [];
  for (const [k, v] of formData.entries()) {
    if (typeof k === "string" && k.startsWith("parts_")) {
      const pid = Number(k.slice("parts_".length));
      const q = Number(v);
      if (Number.isInteger(pid) && q > 0) partsUsed.push({ partId: pid, qty: q });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.issue.update({ where: { id: issueId }, data: { resolvedAt: new Date() } });
    for (const p of partsUsed) {
      await tx.issuePart.upsert({
        where: { issueId_partId: { issueId, partId: p.partId } },
        update: { qty: p.qty },
        create: { issueId, partId: p.partId, qty: p.qty },
      });
      await tx.part.update({ where: { id: p.partId }, data: { stock: { decrement: p.qty } } });
      await tx.partMove.create({
        data: {
          partId: p.partId,
          type: PartMoveType.USE,
          qty: p.qty,
          printerId: issue.printerId,
          issueId,
          createdById: userId ?? undefined,
        },
      });
    }
  });
  revalidatePath(`/impresoras/${issue.printerId}`);
  revalidatePath("/impresoras");
}
