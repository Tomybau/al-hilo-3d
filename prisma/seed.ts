import { PrismaClient, AccountKind } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({ where: { name: "Tomás" }, update: { active: true }, create: { name: "Tomás" } });

  const accounts = [
    { name: "Efectivo", kind: AccountKind.CASH },
    { name: "Transferencia", kind: AccountKind.BANK },
    { name: "Mercado Pago", kind: AccountKind.WALLET },
  ];
  for (const a of accounts) {
    await prisma.account.upsert({ where: { name: a.name }, update: { active: true, kind: a.kind }, create: a });
  }

  const locations = ["Feria de artesanos", "Mercado central", "Evento privado"];
  for (const name of locations) {
    await prisma.salesLocation.upsert({ where: { name }, update: {}, create: { name } });
  }

  const categories = ["Filamentos", "Impresión 3D", "Insumos", "Envíos", "Comisiones", "Servicios", "Varios"];
  for (const name of categories) {
    await prisma.transactionCategory.upsert({ where: { name }, update: { active: true }, create: { name } });
  }

  console.log("Seed OK: usuario, cuentas, lugares, categorías.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
