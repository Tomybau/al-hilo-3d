import { Activity } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/money";

export const dynamic = "force-dynamic";

type ActivityEvent = {
  id: string;
  date: Date;
  user: string;
  action: string;
  detail: string;
  type: "venta" | "filamento" | "transaccion" | "precio";
};

export default async function ActividadPage() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60); // últimos 60 días

  const [salesDays, filamentOrders, transactions, toyPrices] = await Promise.all([
    prisma.salesDay.findMany({
      where: { createdById: { not: null }, createdAt: { gte: cutoff } },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        date: true,
        status: true,
        createdAt: true,
        createdBy: { select: { name: true } },
        location: { select: { name: true } },
      },
    }),
    prisma.filamentOrder.findMany({
      where: { createdById: { not: null }, createdAt: { gte: cutoff } },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        supplier: true,
        createdAt: true,
        createdBy: { select: { name: true } },
        batches: { select: { purchasePriceArs: true } },
      },
    }),
    prisma.transaction.findMany({
      where: { createdById: { not: null }, createdAt: { gte: cutoff } },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true,
        date: true,
        direction: true,
        amountArs: true,
        description: true,
        category: true,
        createdAt: true,
        createdBy: { select: { name: true } },
        account: { select: { name: true } },
      },
    }),
    prisma.toyPrice.findMany({
      where: { createdById: { not: null }, effectiveFrom: { gte: cutoff } },
      orderBy: { effectiveFrom: "desc" },
      take: 30,
      select: {
        id: true,
        priceArs: true,
        effectiveFrom: true,
        createdBy: { select: { name: true } },
        toy: { select: { name: true } },
      },
    }),
  ]);

  const events: ActivityEvent[] = [
    ...salesDays.map((d) => ({
      id: `sd-${d.id}`,
      date: d.createdAt,
      user: d.createdBy?.name ?? "—",
      action: "Creó día de venta",
      detail: `${new Date(d.date).toLocaleDateString("es-AR")}${d.location ? ` · ${d.location.name}` : ""}`,
      type: "venta" as const,
    })),
    ...filamentOrders.map((o) => {
      const total = o.batches.reduce((s, b) => s + Number(b.purchasePriceArs), 0);
      return {
        id: `fo-${o.id}`,
        date: o.createdAt,
        user: o.createdBy?.name ?? "—",
        action: "Registró compra de filamentos",
        detail: `${o.supplier} · ${o.batches.length} rollos · $${total.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`,
        type: "filamento" as const,
      };
    }),
    ...transactions.map((t) => ({
      id: `tx-${t.id}`,
      date: t.createdAt,
      user: t.createdBy?.name ?? "—",
      action: t.direction === "INCOME" ? "Registró ingreso" : "Registró gasto",
      detail: `${t.description ?? t.category ?? "Movimiento"} · ${t.account.name} · $${Number(t.amountArs).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`,
      type: "transaccion" as const,
    })),
    ...toyPrices.map((p) => ({
      id: `tp-${p.id}`,
      date: p.effectiveFrom,
      user: p.createdBy?.name ?? "—",
      action: "Actualizó precio",
      detail: `${p.toy.name} → $${Number(p.priceArs).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`,
      type: "precio" as const,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 100);

  const typeStyles: Record<ActivityEvent["type"], { label: string; variant: "default" | "success" | "info" | "outline" }> = {
    venta: { label: "Venta", variant: "info" },
    filamento: { label: "Filamento", variant: "outline" },
    transaccion: { label: "Transacción", variant: "success" },
    precio: { label: "Precio", variant: "outline" },
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Actividad reciente"
        description="Últimas 100 acciones registradas en el sistema (60 días)."
      />

      <SectionCard padded={false}>
        {events.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Activity}
              title="Sin actividad reciente"
              description="Las acciones de los usuarios aparecerán acá a medida que se registren operaciones."
            />
          </div>
        ) : (
          <ul className="divide-y">
            {events.map((e) => {
              const style = typeStyles[e.type];
              return (
                <li
                  key={e.id}
                  className="flex items-start gap-3 px-5 py-3 text-sm transition-colors hover:bg-muted/20"
                >
                  <Badge variant={style.variant} className="mt-0.5 shrink-0 text-[10px]">
                    {style.label}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{e.user}</span>
                      <span className="text-muted-foreground">·</span>
                      <span>{e.action}</span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{e.detail}</p>
                  </div>
                  <time className="shrink-0 text-xs tabular text-muted-foreground">
                    {e.date.toLocaleDateString("es-AR")}
                    {" "}
                    {e.date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
