import Link from "next/link";
import { AlertTriangle, CheckCircle2, Factory, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { EmptyState } from "@/components/empty-state";
import { PartsSection } from "./parts-section";

export const dynamic = "force-dynamic";

export default async function PrintersPage() {
  const [printers, parts, allPrinters] = await Promise.all([
    prisma.printer.findMany({
      where: { status: { not: "RETIRED" } },
      orderBy: { name: "asc" },
      include: {
        issues: {
          where: { resolvedAt: null },
          orderBy: { startedAt: "desc" },
        },
      },
    }),
    prisma.part.findMany({
      orderBy: { name: "asc" },
      include: { compatiblePrinters: { select: { id: true, name: true } } },
    }),
    prisma.printer.findMany({
      where: { status: { not: "RETIRED" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const partsPlain = parts.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    stock: p.stock,
    compatiblePrinters: p.compatiblePrinters,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Impresoras"
        description="Estado de la flota, problemas abiertos y repuestos."
        actions={
          <Button asChild variant="outline">
            <Link href="/configuracion#impresoras">
              <Plus className="h-4 w-4" /> Agregar impresora
            </Link>
          </Button>
        }
      />

      {printers.length === 0 ? (
        <EmptyState
          icon={Factory}
          title="Sin impresoras"
          description="Agregá una impresora desde Configuración para empezar a llevar el control."
          action={
            <Button asChild>
              <Link href="/configuracion#impresoras">
                <Plus className="h-4 w-4" /> Ir a Configuración
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {printers.map((p) => {
            const down = p.status === "DOWN";
            return (
              <div
                key={p.id}
                className={
                  "group flex flex-col gap-3 rounded-lg border bg-card p-5 transition-shadow hover:shadow-sm " +
                  (down ? "border-red-200" : "")
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <Link
                      href={`/impresoras/${p.id}`}
                      className="truncate text-base font-semibold text-foreground transition-colors hover:text-primary"
                    >
                      {p.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {p.model ?? "Sin modelo"}
                    </span>
                  </div>
                  <Badge variant={down ? "destructive" : "success"}>
                    {down ? "Caída" : "Activa"}
                  </Badge>
                </div>

                {p.issues.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Sin problemas abiertos
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {p.issues.length} problema{p.issues.length !== 1 ? "s" : ""} abierto
                      {p.issues.length !== 1 ? "s" : ""}
                    </div>
                    <ul className="flex flex-col gap-1.5">
                      {p.issues.map((i) => (
                        <li
                          key={i.id}
                          className="flex items-start gap-2 rounded-md border bg-muted/20 px-2.5 py-1.5 text-xs"
                        >
                          <Badge
                            variant={
                              i.severity === "HIGH"
                                ? "destructive"
                                : i.severity === "MEDIUM"
                                  ? "warning"
                                  : "default"
                            }
                            className="mt-0.5 shrink-0"
                          >
                            {i.severity}
                          </Badge>
                          <span className="flex-1 text-foreground">{i.title}</span>
                          <span className="shrink-0 tabular text-muted-foreground">
                            {new Date(i.startedAt).toLocaleDateString("es-AR")}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Button size="sm" variant="outline" asChild className="mt-1 self-start">
                      <Link href={`/impresoras/${p.id}`}>Ver detalle →</Link>
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <PartsSection parts={partsPlain} printers={allPrinters} />
    </div>
  );
}
