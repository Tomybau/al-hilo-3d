import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { prisma } from "@/lib/db";
import { createSalesDay, deleteSalesDay } from "@/server/actions/sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";

export const dynamic = "force-dynamic";

export default async function SalesIndexPage() {
  const [days, locations] = await Promise.all([
    prisma.salesDay.findMany({
      orderBy: { date: "desc" },
      include: { lines: true, miscLines: true, settlements: true, location: true },
      take: 30,
    }),
    prisma.salesLocation.findMany({ orderBy: { name: "asc" } }),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ventas"
        description="Registro de días de venta, unidades y recaudación."
      />

      <SectionCard
        title="Iniciar nuevo día de venta"
        description="Elegí fecha y lugar para abrir un nuevo registro."
      >
        <form action={createSalesDay} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Fecha</label>
            <Input name="date" type="date" defaultValue={today} required className="w-40" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Lugar</label>
            {locations.length > 0 ? (
              <select
                name="locationId"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Sin lugar</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            ) : (
              <Link
                href="/configuracion"
                className="self-center text-xs text-muted-foreground hover:underline"
              >
                Agregar lugares en Configuración
              </Link>
            )}
          </div>
          <Button type="submit">Crear y empezar</Button>
        </form>
      </SectionCard>

      <SectionCard title="Historial" description="Últimos 30 días." padded={false}>
        {days.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={ShoppingCart}
              title="Todavía no hay ventas"
              description="Creá un día de venta arriba para empezar a registrar unidades."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Lugar</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Unidades</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {days.map((d) => {
                const grossTotal =
                  d.lines.reduce((s, l) => s + l.quantity * Number(l.unitPriceArs), 0) +
                  d.miscLines.reduce((s, m) => s + m.quantity * Number(m.unitPriceArs), 0);
                const discount = d.settlements
                  .filter((s) => s.kind === "DISCOUNT")
                  .reduce((sum, s) => sum + Number(s.amountArs), 0);
                const total = grossTotal - discount;
                const items =
                  d.lines.reduce((s, l) => s + l.quantity, 0) +
                  d.miscLines.reduce((s, m) => s + m.quantity, 0);
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      {new Date(d.date).toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.location?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={d.status === "CLOSED" ? "success" : "warning"}>
                        {d.status === "CLOSED" ? "Cerrado" : "Borrador"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular">{items}</TableCell>
                    <TableCell className="text-right">
                      <Money value={total} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/ventas/${d.id}`}>Abrir</Link>
                        </Button>
                        {d.status !== "CLOSED" && (
                          <form action={deleteSalesDay}>
                            <input type="hidden" name="id" value={d.id} />
                            <Button size="sm" variant="destructive" type="submit">
                              Borrar
                            </Button>
                          </form>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </div>
  );
}
