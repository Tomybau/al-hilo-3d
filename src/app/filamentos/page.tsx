import Link from "next/link";
import { Disc3, Plus, Minus } from "lucide-react";
import { prisma } from "@/lib/db";
import { markBatchFinished } from "@/server/actions/filaments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { EmptyState } from "@/components/empty-state";
import { formatARS } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function FilamentsPage() {
  const filaments = await prisma.filament.findMany({
    where: { active: true },
    include: {
      batches: {
        where: { isFinished: false },
        orderBy: { purchaseDate: "asc" },
      },
    },
    orderBy: [{ brand: "asc" }, { color: "asc" }],
  });

  const withStock = filaments.filter((f) => f.batches.length > 0);
  const noStock = filaments.filter((f) => f.batches.length === 0);

  const brandMap = new Map<string, typeof withStock>();
  for (const f of withStock) {
    if (!brandMap.has(f.brand)) brandMap.set(f.brand, []);
    brandMap.get(f.brand)!.push(f);
  }
  const brands = [...brandMap.entries()].sort(([a], [b]) => a.localeCompare(b));
  const totalRolls = withStock.reduce((s, f) => s + f.batches.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Filamentos"
        description={`${totalRolls} rollos activos · ${withStock.length} colores con stock`}
        actions={
          <Button asChild>
            <Link href="/filamentos/nueva">
              <Plus className="h-4 w-4" /> Nueva compra
            </Link>
          </Button>
        }
      />

      {withStock.length === 0 ? (
        <EmptyState
          icon={Disc3}
          title="Sin filamentos con stock"
          description="Registrá una compra para empezar a controlar el inventario."
          action={
            <Button asChild>
              <Link href="/filamentos/nueva">
                <Plus className="h-4 w-4" /> Registrar compra
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {brands.map(([brand, filamentList]) => {
            const brandTotal = filamentList.reduce((s, f) => s + f.batches.length, 0);
            return (
              <SectionCard
                key={brand}
                title={brand}
                description={`${brandTotal} rollo${brandTotal !== 1 ? "s" : ""} en total`}
                padded={false}
              >
                <ul className="divide-y">
                  {filamentList.map((f) => {
                    const count = f.batches.length;
                    const oldestBatch = f.batches[0];
                    return (
                      <li
                        key={f.id}
                        className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-muted/30"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="font-medium">{f.color}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {f.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="tabular text-sm font-semibold text-foreground">
                            {count}
                          </span>
                          {oldestBatch && (
                            <form action={markBatchFinished}>
                              <input type="hidden" name="batchId" value={oldestBatch.id} />
                              <Button
                                type="submit"
                                size="icon"
                                variant="outline"
                                className="h-7 w-7"
                                title={`Marcar 1 rollo terminado · ${formatARS(Number(oldestBatch.purchasePriceArs))}`}
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </Button>
                            </form>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </SectionCard>
            );
          })}
        </div>
      )}

      {noStock.length > 0 && (
        <details className="group rounded-lg border bg-card">
          <summary className="flex cursor-pointer items-center justify-between px-5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/30">
            <span>Sin stock ({noStock.length} color{noStock.length !== 1 ? "es" : ""})</span>
            <span className="text-xs transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="grid gap-1 border-t p-4 md:grid-cols-2 xl:grid-cols-3">
            {noStock.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-muted-foreground"
              >
                <span className="font-medium text-foreground">{f.brand}</span>
                <span>—</span>
                <span>{f.color}</span>
                <Badge variant="outline" className="ml-auto text-[10px]">
                  {f.type}
                </Badge>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
