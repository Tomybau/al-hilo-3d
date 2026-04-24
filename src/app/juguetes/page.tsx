import { Package, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { createToy } from "@/server/actions/toys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArsInput } from "@/components/ui/ars-input";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { EmptyState } from "@/components/empty-state";
import { ToyTable } from "./toy-table";

export const dynamic = "force-dynamic";

export default async function ToysPage() {
  const toys = await prisma.toy.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  const active = toys.filter((t) => t.active);
  const inactive = toys.filter((t) => !t.active);

  const toyData = (list: typeof toys) =>
    list.map((t) => ({
      id: t.id,
      name: t.name,
      sku: t.sku,
      category: t.category,
      currentPriceArs: Number(t.currentPriceArs),
      stock: t.stock,
      active: t.active,
      printTimeMinutes: t.printTimeMinutes,
      weightGrams: t.weightGrams ? Number(t.weightGrams) : null,
      postProcessMinutes: t.postProcessMinutes,
      notes: t.notes,
    }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Juguetes"
        description="Catálogo, precios y stock."
      />

      <details className="group rounded-lg border bg-card">
        <summary className="flex cursor-pointer items-center gap-2 px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/30">
          <Plus className="h-4 w-4 text-primary transition-transform group-open:rotate-45" />
          Agregar juguete
        </summary>
        <div className="border-t p-5">
          <form action={createToy} className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Nombre *</label>
                <Input name="name" placeholder="Pikachu mini" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">SKU</label>
                <Input name="sku" placeholder="opcional" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Categoría</label>
                <Input name="category" placeholder="opcional" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Precio ARS *</label>
                <ArsInput name="currentPriceArs" placeholder="Precio" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Stock inicial</label>
                <Input name="stock" type="number" min="0" defaultValue={0} />
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Notas</label>
                <Input name="notes" placeholder="opcional" />
              </div>
            </div>

            <details className="rounded-md border bg-muted/30 p-3">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                Datos de producción (para métricas)
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Tiempo impresión (min)</label>
                  <Input name="printTimeMinutes" type="number" min="0" placeholder="ej: 180" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Peso pieza (g)</label>
                  <Input name="weightGrams" type="number" step="0.1" min="0" placeholder="ej: 45.5" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Post-proceso (min)</label>
                  <Input name="postProcessMinutes" type="number" min="0" placeholder="ej: 30" />
                </div>
              </div>
            </details>

            <Button type="submit">
              <Plus className="h-4 w-4" /> Agregar juguete
            </Button>
          </form>
        </div>
      </details>

      <SectionCard
        title={`Activos (${active.length})`}
        description="Juguetes disponibles para la venta."
        padded={false}
      >
        {active.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Package}
              title="Sin juguetes activos"
              description="Agregá al menos un juguete para empezar a registrar ventas."
            />
          </div>
        ) : (
          <ToyTable toys={toyData(active)} />
        )}
      </SectionCard>

      {inactive.length > 0 && (
        <details className="group rounded-lg border bg-card">
          <summary className="flex cursor-pointer items-center justify-between gap-2 px-5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/30">
            <span>Pausados ({inactive.length})</span>
            <span className="text-xs transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="border-t">
            <ToyTable toys={toyData(inactive)} />
          </div>
        </details>
      )}
    </div>
  );
}
