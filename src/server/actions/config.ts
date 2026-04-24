"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { AccountKind } from "@prisma/client";

// ---------- Settings ----------

export async function upsertSetting(formData: FormData) {
  const key = String(formData.get("key"));
  const value = String(formData.get("value") ?? "");
  if (!key) return;
  await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  revalidatePath("/configuracion");
  revalidatePath("/metricas");
}

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

// ---------- SalesLocation ----------

export async function createSalesLocation(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await prisma.salesLocation.upsert({ where: { name }, update: {}, create: { name } });
  revalidatePath("/configuracion");
  revalidatePath("/ventas");
}

export async function deleteSalesLocation(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await prisma.salesLocation.delete({ where: { id } }).catch(() => {});
  revalidatePath("/configuracion");
}

// ---------- TransactionCategory ----------

export async function createTxCategory(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await prisma.transactionCategory.upsert({ where: { name }, update: { active: true }, create: { name } });
  revalidatePath("/configuracion");
  revalidatePath("/finanzas");
}

export async function toggleTxCategory(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  const c = await prisma.transactionCategory.findUnique({ where: { id } });
  if (!c) return;
  await prisma.transactionCategory.update({ where: { id }, data: { active: !c.active } });
  revalidatePath("/configuracion");
}

// ---------- Account (movido a config) ----------

export async function createAccount(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "CASH") as AccountKind;
  if (!name) return;
  await prisma.account.upsert({ where: { name }, update: { active: true, kind }, create: { name, kind } });
  revalidatePath("/configuracion");
  revalidatePath("/finanzas");
}

export async function toggleAccount(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  const a = await prisma.account.findUnique({ where: { id } });
  if (!a) return;
  await prisma.account.update({ where: { id }, data: { active: !a.active } });
  revalidatePath("/configuracion");
}
