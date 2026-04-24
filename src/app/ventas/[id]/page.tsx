import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SalesEditor } from "./sales-editor";
import { ClosedSalesView } from "./closed-view";

export const dynamic = "force-dynamic";

export default async function SalesDayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) notFound();

  // Sales volume últimos 90 días para ordenar los juguetes
  const d90 = new Date(); d90.setDate(d90.getDate() - 90);

  const [salesDay, toys, accounts, locations, recentVolume] = await Promise.all([
    prisma.salesDay.findUnique({
      where: { id },
      include: {
        lines: { include: { toy: true, variants: { orderBy: { id: "asc" } } } },
        miscLines: { orderBy: { id: "asc" } },
        settlements: { include: { account: true } },
        location: true,
      },
    }),
    prisma.toy.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.account.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.salesLocation.findMany({ orderBy: { name: "asc" } }),
    prisma.saleLine.groupBy({
      by: ["toyId"],
      where: { salesDay: { status: "CLOSED", date: { gte: d90 } } },
      _sum: { quantity: true },
    }),
  ]);
  if (!salesDay) notFound();

  // Mapa toyId → volumen reciente
  const volMap = new Map(recentVolume.map((r) => [r.toyId, r._sum.quantity ?? 0]));

  const linesByToy = new Map(salesDay.lines.map((l) => [l.toyId, l]));

  // Ordenar por volumen desc, luego nombre
  const toysSorted = [...toys].sort((a, b) => {
    const va = volMap.get(a.id) ?? 0;
    const vb = volMap.get(b.id) ?? 0;
    if (vb !== va) return vb - va;
    return a.name.localeCompare(b.name, "es");
  });

  // Categorías únicas para el filtro
  const categories = Array.from(new Set(toys.map((t) => t.category).filter(Boolean) as string[])).sort();

  const miscLinesData = salesDay.miscLines.map((m) => ({
    id: m.id,
    description: m.description,
    quantity: m.quantity,
    unitPriceArs: Number(m.unitPriceArs),
  }));

  if (salesDay.status === "CLOSED") {
    return (
      <ClosedSalesView
        salesDayId={salesDay.id}
        date={salesDay.date.toISOString()}
        notes={salesDay.notes}
        locationId={salesDay.locationId}
        locations={locations}
        lines={salesDay.lines.map((l) => ({
          id: l.id,
          toyName: l.toy.name,
          category: l.toy.category,
          quantity: l.quantity,
          unitPriceArs: Number(l.unitPriceArs),
          variants: l.variants.map((v) => ({ id: v.id, name: v.name, quantity: v.quantity })),
        }))}
        miscLines={miscLinesData}
        settlements={salesDay.settlements.map((s) => ({
          id: s.id,
          kind: s.kind,
          amountArs: Number(s.amountArs),
          accountName: s.account?.name ?? null,
          note: s.note,
        }))}
      />
    );
  }

  return (
    <SalesEditor
      salesDayId={salesDay.id}
      date={salesDay.date.toISOString()}
      notes={salesDay.notes}
      locationId={salesDay.locationId}
      locations={locations}
      toys={toysSorted.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        price: Number(t.currentPriceArs),
        qty: linesByToy.get(t.id)?.quantity ?? 0,
        saleLineId: linesByToy.get(t.id)?.id,
        variants: linesByToy.get(t.id)?.variants.map((v) => ({ id: v.id, name: v.name, quantity: v.quantity })) ?? [],
        recentVol: volMap.get(t.id) ?? 0,
      }))}
      categories={categories}
      miscLines={miscLinesData}
      accounts={accounts.map((a) => ({ id: a.id, name: a.name, kind: a.kind }))}
    />
  );
}
