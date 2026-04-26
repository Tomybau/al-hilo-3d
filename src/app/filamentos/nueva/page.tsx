import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { NewOrderPageForm } from "./new-order-page-form";

export const dynamic = "force-dynamic";

export default async function NewFilamentOrderPage() {
  const [orders, filaments, accounts] = await Promise.all([
    prisma.filamentOrder.findMany({
      select: { supplier: true },
      distinct: ["supplier"],
      orderBy: { date: "desc" },
      take: 30,
    }),
    prisma.filament.findMany({
      select: { brand: true, color: true },
    }),
    prisma.account.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const suppliers = Array.from(new Set(orders.map((o) => o.supplier))).sort();
  const brands = Array.from(new Set(filaments.map((f) => f.brand))).sort();
  const colors = Array.from(new Set(filaments.map((f) => f.color))).sort();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nueva compra de filamentos"
        description="Cargá los filamentos comprados y el envío se reparte automáticamente."
        crumbs={[
          { href: "/filamentos", label: "Filamentos" },
          { label: "Nueva compra" },
        ]}
      />
      <NewOrderPageForm
        suppliers={suppliers}
        brands={brands}
        colors={colors}
        accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
      />
    </div>
  );
}
