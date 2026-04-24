import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  Disc3,
  Package,
  Plus,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { SectionCard } from "@/components/section-card";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [toysCount, openSalesDay, filaments, recentTx] = await Promise.all([
    prisma.toy.count({ where: { active: true } }),
    prisma.salesDay.findFirst({ where: { status: "DRAFT" }, orderBy: { date: "desc" } }),
    prisma.filament.findMany({
      where: { active: true },
      include: { batches: { select: { gramsRemaining: true } } },
    }),
    prisma.transaction.findMany({ orderBy: { date: "desc" }, take: 6, include: { account: true } }),
  ]);

  const totalGrams = filaments.reduce(
    (acc, f) => acc + f.batches.reduce((s, b) => s + b.gramsRemaining, 0),
    0
  );
  const lowFilamentCount = filaments.filter(
    (f) => f.batches.reduce((s, b) => s + b.gramsRemaining, 0) < 500
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Panel"
        description="Resumen rápido del negocio."
        actions={
          openSalesDay ? (
            <Button asChild>
              <Link href={`/ventas/${openSalesDay.id}`}>
                <CalendarCheck2 className="h-4 w-4" />
                Continuar venta abierta
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/ventas/nueva">
                <Plus className="h-4 w-4" />
                Iniciar venta
              </Link>
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Juguetes activos"
          value={toysCount}
          icon={Package}
          accent="primary"
          href="/juguetes"
          hrefLabel="Ver catálogo"
        />
        <StatCard
          label="Filamento disponible"
          value={`${(totalGrams / 1000).toFixed(2)} kg`}
          icon={Disc3}
          accent="info"
          hint={
            lowFilamentCount > 0
              ? `${lowFilamentCount} por debajo de 500 g`
              : "Stock saludable"
          }
          href="/filamentos"
          hrefLabel="Ver inventario"
        />
        <StatCard
          label="Día de venta"
          value={
            openSalesDay
              ? new Date(openSalesDay.date).toLocaleDateString("es-AR", {
                  day: "2-digit",
                  month: "short",
                })
              : "—"
          }
          icon={ShoppingCart}
          accent={openSalesDay ? "warning" : "primary"}
          hint={openSalesDay ? "Abierta, pendiente de cierre" : "Sin ventas abiertas"}
          href={openSalesDay ? `/ventas/${openSalesDay.id}` : "/ventas/nueva"}
          hrefLabel={openSalesDay ? "Continuar carga" : "Iniciar venta"}
        />
        <StatCard
          label="Movimientos recientes"
          value={recentTx.length}
          icon={Wallet}
          accent="success"
          hint="Últimos registros de caja"
          href="/finanzas"
          hrefLabel="Ir a finanzas"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Movimientos recientes"
          description="Últimas entradas y salidas."
          className="lg:col-span-2"
          padded={false}
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link href="/finanzas">
                Ver todo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          }
        >
          {recentTx.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Wallet}
                title="Sin movimientos"
                description="Cuando registres transacciones, van a aparecer acá."
              />
            </div>
          ) : (
            <ul className="divide-y">
              {recentTx.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-foreground">
                      {t.description ?? t.category ?? "Movimiento"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(t.date).toLocaleDateString("es-AR")} · {t.account.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={t.direction === "INCOME" ? "success" : "destructive"}>
                      {t.direction === "INCOME" ? "Entrada" : "Salida"}
                    </Badge>
                    <Money
                      value={Number(t.amountArs)}
                      intent={t.direction === "INCOME" ? "positive" : "negative"}
                      signed
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Atajos"
          description="Acciones frecuentes del día a día."
        >
          <div className="flex flex-col gap-2">
            <ShortcutLink href="/ventas/nueva" icon={Plus} label="Nueva venta" />
            <ShortcutLink href="/juguetes" icon={Package} label="Agregar juguete" />
            <ShortcutLink href="/filamentos/nueva" icon={Disc3} label="Registrar compra de filamento" />
            <ShortcutLink href="/finanzas" icon={Wallet} label="Nueva transacción" />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function ShortcutLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 truncate">{label}</span>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}
