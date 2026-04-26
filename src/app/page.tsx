import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarCheck2,
  Check,
  Coins,
  Disc3,
  Package,
  Plus,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { payRecurringBill } from "@/server/actions/recurring";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { SectionCard } from "@/components/section-card";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const d30 = new Date(now);
  d30.setDate(d30.getDate() - 30);

  const [toysCount, openSalesDay, filaments, recentTx, salesDays30, txs30, recurringBills] = await Promise.all([
    prisma.toy.count({ where: { active: true } }),
    prisma.salesDay.findFirst({ where: { status: "DRAFT" }, orderBy: { date: "desc" } }),
    prisma.filament.findMany({
      where: { active: true },
      include: { batches: { select: { gramsRemaining: true } } },
    }),
    prisma.transaction.findMany({ orderBy: { date: "desc" }, take: 6, include: { account: true } }),
    prisma.salesDay.findMany({
      where: { status: "CLOSED", date: { gte: d30 } },
      include: { lines: { select: { quantity: true, unitPriceArs: true } }, settlements: { select: { kind: true, amountArs: true } } },
    }),
    prisma.transaction.findMany({
      where: { date: { gte: d30 } },
      select: { direction: true, amountArs: true },
    }),
    prisma.recurringBill.findMany({
      where: { active: true },
      orderBy: { dueDay: "asc" },
    }),
  ]);

  const totalGrams = filaments.reduce(
    (acc, f) => acc + f.batches.reduce((s, b) => s + b.gramsRemaining, 0),
    0
  );
  const lowFilamentCount = filaments.filter(
    (f) => f.batches.reduce((s, b) => s + b.gramsRemaining, 0) < 500
  ).length;

  // Pagos recurrentes pendientes (vencen en 7 días y no fueron pagados este mes)
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = now.getDate();
  const dueSoonBills = recurringBills.filter((b) => {
    const isPaid = b.lastPaidAt !== null && b.lastPaidAt >= firstOfMonth;
    if (isPaid) return false;
    const daysUntil = b.dueDay >= today ? b.dueDay - today : 31 - today + b.dueDay;
    return daysUntil <= 7;
  });

  // Métricas de ventas últimos 30 días
  const revenue30 = salesDays30.reduce((s, d) => {
    const gross = d.lines.reduce((a, l) => a + l.quantity * Number(l.unitPriceArs), 0);
    const disc = d.settlements.filter((x) => x.kind === "DISCOUNT").reduce((a, x) => a + Number(x.amountArs), 0);
    return s + gross - disc;
  }, 0);
  const units30 = salesDays30.reduce((s, d) => s + d.lines.reduce((a, l) => a + l.quantity, 0), 0);
  const days30Count = salesDays30.length;

  // Salud financiera últimos 30 días
  const income30 = txs30.filter((t) => t.direction === "INCOME").reduce((s, t) => s + Number(t.amountArs), 0);
  const expense30 = txs30.filter((t) => t.direction === "EXPENSE").reduce((s, t) => s + Number(t.amountArs), 0);
  const net30 = income30 - expense30;

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

      {/* Recordatorios de pagos recurrentes */}
      {dueSoonBills.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Pagos próximos
            </h2>
          </div>
          <div className="flex flex-col gap-1.5">
            {dueSoonBills.map((b) => {
              const daysUntil = b.dueDay >= today ? b.dueDay - today : 31 - today + b.dueDay;
              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-medium">{b.name}</span>
                    <span className="ml-2 text-xs text-amber-700">
                      {daysUntil === 0 ? "hoy" : `en ${daysUntil} día${daysUntil !== 1 ? "s" : ""}`}
                    </span>
                  </div>
                  <form action={payRecurringBill} className="shrink-0">
                    <input type="hidden" name="id" value={b.id} />
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      <Check className="h-3.5 w-3.5" /> Marcar pagado
                    </Button>
                  </form>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Ventas — últimos 30 días */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Ventas — últimos 30 días</h2>
          <Link href="/metricas" className="text-xs text-muted-foreground hover:text-primary hover:underline">
            Ver métricas completas →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Facturado"
            value={<Money value={revenue30} intent="positive" />}
            icon={TrendingUp}
            accent="success"
          />
          <StatCard
            label="Unidades"
            value={units30}
            icon={ShoppingCart}
            accent="info"
            hint={`En ${days30Count} día${days30Count !== 1 ? "s" : ""} de venta`}
          />
          <StatCard
            label="Promedio por día"
            value={<Money value={days30Count > 0 ? revenue30 / days30Count : 0} />}
            icon={CalendarCheck2}
            accent="primary"
          />
        </div>
      </section>

      {/* Salud financiera — últimos 30 días */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Salud financiera — últimos 30 días</h2>
          <Link href="/finanzas" className="text-xs text-muted-foreground hover:text-primary hover:underline">
            Ver finanzas →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Ingresos"
            value={<Money value={income30} intent="positive" />}
            icon={TrendingUp}
            accent="success"
          />
          <StatCard
            label="Gastos"
            value={<Money value={expense30} intent="negative" />}
            icon={TrendingDown}
            accent="destructive"
          />
          <StatCard
            label="Neto"
            value={<Money value={net30} intent={net30 < 0 ? "negative" : "positive"} />}
            icon={Coins}
            accent={net30 < 0 ? "destructive" : "success"}
          />
        </div>
      </section>

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
