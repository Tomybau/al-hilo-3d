import { LogOut, Plus, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { logout } from "@/server/actions/auth";
import { requireUser } from "@/lib/current-user";
import { UsersSection, type UserRow } from "./users-section";
import { AccountSection } from "./account-section";
import {
  createAccount,
  toggleAccount,
  createSalesLocation,
  deleteSalesLocation,
  createTxCategory,
  toggleTxCategory,
  upsertSetting,
} from "@/server/actions/config";
import { createPrinter, createPart } from "@/server/actions/printers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArsInput } from "@/components/ui/ars-input";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountKind } from "@prisma/client";

export const dynamic = "force-dynamic";

const TABS = ["usuarios", "cuenta", "lugares", "cuentas", "categorias", "impresoras", "costos"] as const;

export default async function ConfigPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const me = await requireUser();
  const sp = await searchParams;
  const initialTab = TABS.includes(sp.tab as (typeof TABS)[number]) ? sp.tab! : "usuarios";
  const [users, accounts, locations, categories, printers, parts, settings] =
    await Promise.all([
      prisma.user.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, active: true, passwordHash: true },
      }),
      prisma.account.findMany({ orderBy: { name: "asc" } }),
      prisma.salesLocation.findMany({ orderBy: { name: "asc" } }),
      prisma.transactionCategory.findMany({ orderBy: { name: "asc" } }),
      prisma.printer.findMany({ orderBy: { name: "asc" } }),
      prisma.part.findMany({ orderBy: { name: "asc" } }),
      prisma.setting.findMany(),
    ]);

  const s = Object.fromEntries(settings.map((r) => [r.key, r.value]));

  // El hash de la contrasena se convierte en un booleano ACA, en el servidor:
  // `users` se pasa a un componente cliente y todo lo que lleve viaja al navegador.
  const userRows: UserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    active: u.active,
    hasPassword: u.passwordHash !== null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configuración"
        description="Administración de usuarios, cuentas, ubicaciones, flota e indicadores."
        actions={
          <form action={logout}>
            <Button variant="outline" size="sm">
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </Button>
          </form>
        }
      />

      <Tabs defaultValue={initialTab} className="flex flex-col gap-4">
        <TabsList className="w-fit flex-wrap">
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="cuenta">Mi cuenta</TabsTrigger>
          <TabsTrigger value="lugares">Lugares</TabsTrigger>
          <TabsTrigger value="cuentas">Cuentas</TabsTrigger>
          <TabsTrigger value="categorias">Categorías</TabsTrigger>
          <TabsTrigger value="impresoras">Impresoras</TabsTrigger>
          <TabsTrigger value="costos">Costos</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-0">
          <UsersSection users={userRows} currentUserId={me.id} />
        </TabsContent>

        <TabsContent value="cuenta" className="mt-0">
          <AccountSection name={me.name} />
        </TabsContent>

        <TabsContent value="lugares" className="mt-0">
          <SectionCard
            title={`Lugares de venta (${locations.length})`}
            description="Ferias, eventos y puntos recurrentes."
          >
            <form action={createSalesLocation} className="mb-4 flex gap-2">
              <Input name="name" placeholder="Feria, Evento X..." required />
              <Button type="submit">
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            </form>
            <ul className="divide-y">
              {locations.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2">
                  <span className="font-medium">{l.name}</span>
                  <form action={deleteSalesLocation}>
                    <input type="hidden" name="id" value={l.id} />
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="cuentas" className="mt-0">
          <SectionCard
            title={`Cuentas financieras (${accounts.length})`}
            description="Efectivo, billeteras virtuales, cuentas bancarias."
          >
            <form action={createAccount} className="mb-4 flex flex-wrap gap-2">
              <Input name="name" placeholder="Efectivo, MP, Banco..." required className="flex-1 min-w-[180px]" />
              <select
                name="kind"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {Object.values(AccountKind).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <Button type="submit">
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            </form>
            <ul className="divide-y">
              {accounts.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        a.active
                          ? "font-medium"
                          : "text-muted-foreground line-through"
                      }
                    >
                      {a.name}
                    </span>
                    <Badge variant="outline">{a.kind}</Badge>
                  </div>
                  <form action={toggleAccount}>
                    <input type="hidden" name="id" value={a.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      {a.active ? "Desactivar" : "Activar"}
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="categorias" className="mt-0">
          <SectionCard
            title={`Categorías de movimiento (${categories.length})`}
            description="Agrupan ingresos y gastos."
          >
            <form action={createTxCategory} className="mb-4 flex gap-2">
              <Input name="name" placeholder="Insumos, Servicios, Comida..." required />
              <Button type="submit">
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            </form>
            <ul className="divide-y">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2">
                  <span
                    className={
                      c.active
                        ? "font-medium"
                        : "text-muted-foreground line-through"
                    }
                  >
                    {c.name}
                  </span>
                  <form action={toggleTxCategory}>
                    <input type="hidden" name="id" value={c.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      {c.active ? "Ocultar" : "Mostrar"}
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="impresoras" className="mt-0 flex flex-col gap-4" id="impresoras">
          <SectionCard title="Impresoras" description="Flota activa.">
            <form action={createPrinter} className="mb-4 flex flex-wrap gap-2">
              <Input name="name" placeholder="Ender 3 #1" required className="flex-1 min-w-[180px]" />
              <Input name="model" placeholder="Modelo (opcional)" className="flex-1 min-w-[180px]" />
              <Button type="submit">
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            </form>
            <ul className="divide-y">
              {printers.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    {p.model && (
                      <span className="text-muted-foreground">· {p.model}</span>
                    )}
                  </div>
                  <Badge
                    variant={
                      p.status === "ACTIVE"
                        ? "success"
                        : p.status === "DOWN"
                          ? "destructive"
                          : "default"
                    }
                  >
                    {p.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Repuestos" description="Stock de repuestos por impresora compatible.">
            <form action={createPart} className="mb-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Input name="name" placeholder="Boquilla 0.4mm" required className="flex-1 min-w-[180px]" />
                <Input name="sku" placeholder="SKU (opc)" className="w-32" />
                <Input
                  name="stock"
                  type="number"
                  min="0"
                  defaultValue={0}
                  className="w-24"
                  placeholder="Stock"
                />
              </div>
              {printers.length > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Compatible con
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {printers.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center gap-1.5 rounded-md border bg-muted/20 px-2 py-1 text-sm"
                      >
                        <input
                          type="checkbox"
                          name={`printer_${p.id}`}
                          value="on"
                          className="h-3.5 w-3.5"
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <Button type="submit" size="sm">
                <Plus className="h-4 w-4" /> Agregar repuesto
              </Button>
            </form>
            {parts.length > 0 && (
              <ul className="divide-y border-t pt-2">
                {parts.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between py-1.5 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      {p.sku && (
                        <span className="text-xs text-muted-foreground">({p.sku})</span>
                      )}
                    </span>
                    <Badge variant="outline">Stock {p.stock}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="costos" className="mt-0" id="costos">
          <SectionCard
            title="Costos para métricas"
            description="Se usan para calcular el costo real y el precio ideal de cada juguete."
          >
            <div className="flex flex-col gap-3">
              {[
                {
                  key: "electricity_price_per_hour",
                  label: "Precio luz por hora de impresión (ARS)",
                  type: "ars",
                },
                {
                  key: "postprocess_rate_per_hour",
                  label: "Tarifa post-proceso por hora (ARS)",
                  type: "ars",
                },
                {
                  key: "monthly_fixed_cost",
                  label: "Costos fijos mensuales (ARS)",
                  type: "ars",
                },
                {
                  key: "monthly_units_target",
                  label: "Unidades objetivo por mes",
                  type: "number",
                },
                {
                  key: "desired_margin_pct",
                  label: "Margen de ganancia deseado (%)",
                  type: "number",
                },
              ].map(({ key, label, type }) => (
                <form
                  key={key}
                  action={upsertSetting}
                  className="flex flex-wrap items-end gap-2 border-b pb-3 last:border-0 last:pb-0"
                >
                  <input type="hidden" name="key" value={key} />
                  <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm">
                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                    {type === "ars" ? (
                      <ArsInput
                        name="value"
                        defaultValue={s[key] ? Number(s[key]) : undefined}
                        className="w-40"
                      />
                    ) : (
                      <Input
                        name="value"
                        type="number"
                        defaultValue={s[key] ?? ""}
                        className="w-28"
                      />
                    )}
                  </label>
                  <Button type="submit" size="sm" variant="outline">
                    Guardar
                  </Button>
                </form>
              ))}
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
