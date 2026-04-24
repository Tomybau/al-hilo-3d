import Link from "next/link";
import {
  AlertTriangle,
  BarChart2,
  CalendarDays,
  CheckCircle2,
  Coins,
  Disc3,
  Factory,
  Package,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { prisma } from "@/lib/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { LineChartCard } from "@/components/charts/line-chart-card";
import { BarChartCard } from "@/components/charts/bar-chart-card";

export const dynamic = "force-dynamic";

export default async function MetricsPage() {
  const now = new Date();
  const d30 = new Date(now);
  d30.setDate(d30.getDate() - 30);
  const d90 = new Date(now);
  d90.setDate(d90.getDate() - 90);

  const [
    toys,
    settings,
    batches,
    salesDays30,
    salesDays90,
    allLines,
    txs30,
    allBatches,
    openIssues,
    allPrinters,
  ] = await Promise.all([
    prisma.toy.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.setting.findMany(),
    prisma.filamentBatch.findMany({ select: { purchasePriceArs: true, gramsTotal: true } }),
    prisma.salesDay.findMany({
      where: { status: "CLOSED", date: { gte: d30 } },
      include: { lines: true, settlements: true },
    }),
    prisma.salesDay.findMany({
      where: { status: "CLOSED", date: { gte: d90 } },
      include: { lines: { include: { toy: { select: { name: true } } } } },
      orderBy: { date: "asc" },
    }),
    prisma.saleLine.findMany({
      where: { salesDay: { status: "CLOSED", date: { gte: d90 } } },
      include: { toy: { select: { id: true, name: true } } },
    }),
    prisma.transaction.findMany({
      where: { date: { gte: d30 } },
      select: { direction: true, amountArs: true, category: true, salesDayId: true },
    }),
    prisma.filamentBatch.findMany({
      select: { isFinished: true, purchasePriceArs: true },
    }),
    prisma.issue.count({ where: { resolvedAt: null } }),
    prisma.printer.findMany({ select: { status: true } }),
  ]);

  const s = Object.fromEntries(settings.map((r) => [r.key, Number(r.value) || 0]));
  const electricityPerHour = s["electricity_price_per_hour"] ?? 0;
  const postProcessPerHour = s["postprocess_rate_per_hour"] ?? 0;
  const monthlyFixed = s["monthly_fixed_cost"] ?? 0;
  const monthlyUnits = s["monthly_units_target"] ?? 1;
  const desiredMarginPct = s["desired_margin_pct"] ?? 40;
  const fixedPerUnit = monthlyUnits > 0 ? monthlyFixed / monthlyUnits : 0;

  const avgGramsPrice =
    batches.length > 0
      ? batches.reduce((sum, b) => sum + Number(b.purchasePriceArs) / b.gramsTotal, 0) /
        batches.length
      : 0;
  const avgKgPrice = avgGramsPrice * 1000;

  const revenue30 = salesDays30.reduce(
    (s, d) => s + d.lines.reduce((a, l) => a + Number(l.unitPriceArs) * l.quantity, 0),
    0
  );
  const units30 = salesDays30.reduce(
    (s, d) => s + d.lines.reduce((a, l) => a + l.quantity, 0),
    0
  );
  const days30Count = salesDays30.length;
  const avgSale = days30Count > 0 ? revenue30 / days30Count : 0;

  const toyStats = new Map<number, { name: string; qty: number; revenue: number }>();
  for (const l of allLines) {
    const cur = toyStats.get(l.toyId) ?? { name: l.toy.name, qty: 0, revenue: 0 };
    cur.qty += l.quantity;
    cur.revenue += Number(l.unitPriceArs) * l.quantity;
    toyStats.set(l.toyId, cur);
  }
  const topToys = Array.from(toyStats.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const weekly = new Map<string, number>();
  for (const d of salesDays90) {
    const date = new Date(d.date);
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    const rev = d.lines.reduce((a, l) => a + Number(l.unitPriceArs) * l.quantity, 0);
    weekly.set(key, (weekly.get(key) ?? 0) + rev);
  }
  const weeklyArr = Array.from(weekly.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([wk, rev]) => ({
      label: new Date(wk + "T00:00:00").toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "short",
      }),
      value: rev,
    }));

  const lowStock = toys.filter((t) => t.stock < 5).sort((a, b) => a.stock - b.stock);
  const income30 = txs30
    .filter((t) => t.direction === "INCOME")
    .reduce((s, t) => s + Number(t.amountArs), 0);
  const expense30 = txs30
    .filter((t) => t.direction === "EXPENSE")
    .reduce((s, t) => s + Number(t.amountArs), 0);
  const net30 = income30 - expense30;
  const expenseByCat = new Map<string, number>();
  for (const t of txs30.filter((x) => x.direction === "EXPENSE")) {
    const k = t.category ?? "Sin categoría";
    expenseByCat.set(k, (expenseByCat.get(k) ?? 0) + Number(t.amountArs));
  }
  const topExpenses = Array.from(expenseByCat.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const activeBatches = allBatches.filter((b) => !b.isFinished).length;
  const finishedBatches = allBatches.filter((b) => b.isFinished).length;
  const filamentInvested = allBatches.reduce((s, b) => s + Number(b.purchasePriceArs), 0);
  const printerActive = allPrinters.filter((p) => p.status === "ACTIVE").length;
  const printerDown = allPrinters.filter((p) => p.status === "DOWN").length;

  function calcToy(toy: (typeof toys)[number]) {
    const filamentCost = avgGramsPrice * Number(toy.weightGrams ?? 0);
    const electricityCost = (Number(toy.printTimeMinutes ?? 0) / 60) * electricityPerHour;
    const postProcessCost = (Number(toy.postProcessMinutes ?? 0) / 60) * postProcessPerHour;
    const totalCost = filamentCost + electricityCost + postProcessCost + fixedPerUnit;
    const salePrice = Number(toy.currentPriceArs);
    const idealPrice =
      desiredMarginPct < 100 ? totalCost / (1 - desiredMarginPct / 100) : totalCost * 2;
    const currentMargin = salePrice > 0 ? ((salePrice - totalCost) / salePrice) * 100 : null;
    return { filamentCost, electricityCost, postProcessCost, totalCost, idealPrice, currentMargin };
  }

  const missingData = toys.filter((t) => !t.weightGrams && !t.printTimeMinutes);
  const configured = toys.filter((t) => t.weightGrams || t.printTimeMinutes);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Métricas"
        description="Monitoreo del negocio y rentabilidad."
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Ventas — últimos 30 días
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Facturado"
            value={<Money value={revenue30} intent="positive" />}
            icon={TrendingUp}
            accent="success"
          />
          <StatCard
            label="Días de venta"
            value={days30Count}
            icon={CalendarDays}
            accent="primary"
          />
          <StatCard label="Unidades" value={units30} icon={Package} accent="info" />
          <StatCard
            label="Promedio por día"
            value={<Money value={avgSale} />}
            icon={BarChart2}
            accent="primary"
          />
        </div>
      </section>

      {weeklyArr.length > 0 && (
        <LineChartCard
          title="Tendencia semanal"
          description="Facturación por semana (últimos 90 días)."
          data={weeklyArr}
          seriesLabel="Facturado"
          currency
        />
      )}

      {topToys.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <BarChartCard
              title="Top juguetes — 90 días"
              description="Facturación por producto."
              data={topToys.slice(0, 8).map((t) => ({ label: t.name, value: t.revenue }))}
              currency
              horizontal
              height={280}
            />
          </div>
          <SectionCard
            title="Ranking de unidades"
            description="Más vendidos últimos 90 días."
            className="lg:col-span-2"
            padded={false}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Juguete</TableHead>
                  <TableHead className="text-right">Unid.</TableHead>
                  <TableHead className="text-right">Facturado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topToys.map((t, i) => (
                  <TableRow key={t.name}>
                    <TableCell className="tabular text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="max-w-[160px] truncate font-medium">
                      {t.name}
                    </TableCell>
                    <TableCell className="text-right tabular">{t.qty}</TableCell>
                    <TableCell className="text-right">
                      <Money value={t.revenue} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Salud financiera — últimos 30 días
        </h2>
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
            value={
              <Money value={net30} intent={net30 < 0 ? "negative" : "positive"} />
            }
            icon={Coins}
            accent={net30 < 0 ? "destructive" : "success"}
          />
        </div>
        {topExpenses.length > 0 && (
          <SectionCard title="Gastos por categoría" padded={false}>
            <ul className="divide-y">
              {topExpenses.map(([cat, amt]) => (
                <li key={cat} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <span className="text-foreground">{cat}</span>
                  <Money value={amt} intent="muted" />
                </li>
              ))}
            </ul>
          </SectionCard>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Inventario</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Stock bajo (<5)"
            value={lowStock.length}
            icon={AlertTriangle}
            accent={lowStock.length > 0 ? "warning" : "success"}
            hint={
              lowStock.length > 0
                ? lowStock
                    .slice(0, 3)
                    .map((t) => `${t.name} (${t.stock})`)
                    .join(" · ")
                : "Todo OK"
            }
          />
          <StatCard
            label="Filamento"
            value={`${activeBatches} activos`}
            icon={Disc3}
            accent="info"
            hint={
              <>
                {finishedBatches} consumidos ·{" "}
                <Money value={filamentInvested} intent="muted" /> invertido
              </>
            }
          />
          <StatCard
            label="Impresoras"
            value={
              <>
                {printerActive}
                {printerDown > 0 && (
                  <span className="ml-2 text-sm text-red-600 tabular">
                    / {printerDown} caídas
                  </span>
                )}
              </>
            }
            icon={Factory}
            accent={printerDown > 0 || openIssues > 0 ? "warning" : "success"}
            hint={`${openIssues} problema${openIssues !== 1 ? "s" : ""} abierto${openIssues !== 1 ? "s" : ""}`}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Rentabilidad por juguete
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              label: "Precio kg filamento",
              value: <Money value={avgKgPrice} intent="muted" />,
              ok: avgKgPrice > 0,
            },
            {
              label: "Luz/h impresión",
              value: <Money value={electricityPerHour} intent="muted" />,
              ok: electricityPerHour > 0,
            },
            {
              label: "Post-proceso/h",
              value: <Money value={postProcessPerHour} intent="muted" />,
              ok: postProcessPerHour > 0,
            },
            {
              label: "Fijos / unidad",
              value: <Money value={fixedPerUnit} intent="muted" />,
              ok: monthlyFixed > 0,
            },
            {
              label: "Margen deseado",
              value: <span className="tabular font-semibold">{desiredMarginPct}%</span>,
              ok: desiredMarginPct > 0,
            },
          ].map((item) => (
            <StatCard
              key={item.label}
              label={item.label}
              value={item.value}
              hint={!item.ok ? "Configurar" : undefined}
              accent={item.ok ? "primary" : "warning"}
            />
          ))}
        </div>

        {(!electricityPerHour || !avgKgPrice) && (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            Faltan configurar costos.{" "}
            <Link href="/configuracion#costos" className="underline hover:text-amber-900">
              Ir a Configuración → Costos
            </Link>
          </div>
        )}

        {configured.length > 0 ? (
          <SectionCard padded={false}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Juguete</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Filamento</TableHead>
                  <TableHead className="text-right">Costo total</TableHead>
                  <TableHead className="text-right">Precio actual</TableHead>
                  <TableHead className="text-right">Precio ideal</TableHead>
                  <TableHead className="text-right">Margen</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configured.map((toy) => {
                  const { filamentCost, totalCost, idealPrice, currentMargin } = calcToy(toy);
                  const salePrice = Number(toy.currentPriceArs);
                  const ok = currentMargin !== null && currentMargin >= desiredMarginPct;
                  const warn =
                    currentMargin !== null &&
                    currentMargin >= desiredMarginPct * 0.7 &&
                    currentMargin < desiredMarginPct;
                  return (
                    <TableRow key={toy.id}>
                      <TableCell className="max-w-[200px] truncate font-medium">
                        {toy.name}
                      </TableCell>
                      <TableCell className="text-right tabular">{toy.stock}</TableCell>
                      <TableCell className="text-right">
                        {filamentCost > 0 ? (
                          <Money value={filamentCost} intent="muted" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {totalCost > 0 ? (
                          <Money value={totalCost} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Money value={salePrice} />
                      </TableCell>
                      <TableCell className="text-right">
                        {idealPrice > 0 ? (
                          <Money
                            value={idealPrice}
                            intent={salePrice < idealPrice ? "negative" : "positive"}
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {currentMargin !== null ? (
                          <span
                            className={
                              "tabular font-medium " +
                              (ok ? "text-emerald-600" : warn ? "text-amber-600" : "text-red-600")
                            }
                          >
                            {currentMargin.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {currentMargin === null ? (
                          <Badge variant="outline">—</Badge>
                        ) : ok ? (
                          <Badge variant="success">
                            <CheckCircle2 className="h-3 w-3" /> Bien
                          </Badge>
                        ) : warn ? (
                          <Badge variant="warning">Ajustar</Badge>
                        ) : (
                          <Badge variant="destructive">Bajo</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </SectionCard>
        ) : (
          <EmptyState
            icon={Package}
            title="Sin datos de producción"
            description="Ningún juguete tiene peso ni tiempo de impresión cargados."
            action={
              <Link
                href="/juguetes"
                className="text-sm font-medium text-primary hover:underline"
              >
                Configurar en Juguetes →
              </Link>
            }
          />
        )}

        {missingData.length > 0 && (
          <details className="group rounded-lg border bg-card">
            <summary className="flex cursor-pointer items-center justify-between px-5 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/30">
              <span>
                {missingData.length} juguete{missingData.length !== 1 ? "s" : ""} sin datos de
                producción
              </span>
              <span className="text-xs transition-transform group-open:rotate-180">▾</span>
            </summary>
            <div className="border-t p-4">
              <ul className="grid gap-1 text-sm text-muted-foreground md:grid-cols-2 lg:grid-cols-3">
                {missingData.map((t) => (
                  <li key={t.id}>— {t.name}</li>
                ))}
              </ul>
            </div>
          </details>
        )}
      </section>
    </div>
  );
}
