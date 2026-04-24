import { Wallet, X } from "lucide-react";
import { prisma } from "@/lib/db";
import { deleteTransaction } from "@/server/actions/finance";
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
import { StatCard } from "@/components/stat-card";
import { Money } from "@/components/money";
import { NewTxDialog } from "./new-tx-dialog";

export const dynamic = "force-dynamic";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; account?: string; direction?: string }>;
}) {
  const sp = await searchParams;
  const [accounts, categories] = await Promise.all([
    prisma.account.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.transactionCategory.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const where: any = {};
  if (sp.from) where.date = { ...(where.date ?? {}), gte: new Date(sp.from) };
  if (sp.to) where.date = { ...(where.date ?? {}), lte: new Date(sp.to + "T23:59:59") };
  if (sp.account) where.accountId = Number(sp.account);
  if (sp.direction) where.direction = sp.direction;

  const txs = await prisma.transaction.findMany({
    where,
    orderBy: { date: "desc" },
    include: { account: true, createdBy: true },
    take: 200,
  });

  const balances = await Promise.all(
    accounts.map(async (a) => {
      const [inc, exp] = await Promise.all([
        prisma.transaction.aggregate({
          where: { accountId: a.id, direction: "INCOME" },
          _sum: { amountArs: true },
        }),
        prisma.transaction.aggregate({
          where: { accountId: a.id, direction: "EXPENSE" },
          _sum: { amountArs: true },
        }),
      ]);
      return {
        account: a,
        balance: Number(inc._sum.amountArs ?? 0) - Number(exp._sum.amountArs ?? 0),
      };
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Finanzas"
        description="Cuentas, ingresos y gastos."
        actions={<NewTxDialog accounts={accounts} categories={categories} />}
      />

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Sin cuentas configuradas"
          description="Creá cuentas desde Configuración para empezar a registrar movimientos."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {balances.map(({ account, balance }) => (
            <StatCard
              key={account.id}
              label={account.name}
              value={<Money value={balance} intent={balance < 0 ? "negative" : "neutral"} />}
              hint={account.kind}
              accent={balance < 0 ? "destructive" : "primary"}
            />
          ))}
        </div>
      )}

      <SectionCard
        title="Movimientos"
        description="Últimos 200 registros según filtros."
        padded={false}
      >
        <form className="flex flex-wrap gap-2 border-b px-5 py-3 text-sm">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Desde
            </label>
            <Input name="from" type="date" defaultValue={sp.from} className="w-40" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Hasta
            </label>
            <Input name="to" type="date" defaultValue={sp.to} className="w-40" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Cuenta
            </label>
            <select
              name="account"
              defaultValue={sp.account ?? ""}
              className="h-10 rounded-md border border-input bg-background px-3"
            >
              <option value="">Todas</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Tipo
            </label>
            <select
              name="direction"
              defaultValue={sp.direction ?? ""}
              className="h-10 rounded-md border border-input bg-background px-3"
            >
              <option value="">Todos</option>
              <option value="INCOME">Ingresos</option>
              <option value="EXPENSE">Gastos</option>
            </select>
          </div>
          <div className="ml-auto flex items-end">
            <Button type="submit" variant="secondary">
              Filtrar
            </Button>
          </div>
        </form>

        {txs.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Wallet}
              title="Sin movimientos"
              description="No hay transacciones con los filtros actuales."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Por</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {txs.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="tabular text-muted-foreground">
                    {new Date(t.date).toLocaleDateString("es-AR")}
                  </TableCell>
                  <TableCell className="font-medium">{t.account.name}</TableCell>
                  <TableCell>
                    {t.category ? (
                      <Badge variant="outline">{t.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate">
                    {t.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t.createdBy?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Money
                      value={Number(t.amountArs)}
                      intent={t.direction === "INCOME" ? "positive" : "negative"}
                      signed
                    />
                  </TableCell>
                  <TableCell>
                    <form action={deleteTransaction}>
                      <input type="hidden" name="id" value={t.id} />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Borrar"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </div>
  );
}
