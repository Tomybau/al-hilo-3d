import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { createIssue, resolveIssue, setPrinterStatus } from "@/server/actions/printers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { IssueSeverity, PrinterStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function PrinterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) notFound();

  const [printer, parts] = await Promise.all([
    prisma.printer.findUnique({
      where: { id },
      include: {
        issues: {
          orderBy: { startedAt: "desc" },
          include: { partsUsed: { include: { part: true } } },
        },
      },
    }),
    prisma.part.findMany({
      where: {
        stock: { gt: 0 },
        compatiblePrinters: { some: { id } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const availableParts =
    parts.length > 0
      ? parts
      : await prisma.part.findMany({
          where: { stock: { gt: 0 } },
          orderBy: { name: "asc" },
        });

  if (!printer) notFound();

  const open = printer.issues.filter((i) => !i.resolvedAt);
  const resolved = printer.issues.filter((i) => i.resolvedAt);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={printer.name}
        description={printer.model ?? "Sin modelo"}
        crumbs={[
          { href: "/impresoras", label: "Impresoras" },
          { label: printer.name },
        ]}
        actions={
          <form action={setPrinterStatus} className="flex items-end gap-2">
            <input type="hidden" name="id" value={printer.id} />
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Estado
              </label>
              <select
                name="status"
                defaultValue={printer.status}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {Object.values(PrinterStatus).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="outline">
              Cambiar estado
            </Button>
          </form>
        }
      />

      <details className="group rounded-lg border bg-card">
        <summary className="flex cursor-pointer items-center gap-2 px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/30">
          <AlertTriangle className="h-4 w-4 text-amber-600 transition-transform group-open:rotate-12" />
          Reportar nuevo problema
        </summary>
        <div className="border-t p-5">
          <form action={createIssue} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="printerId" value={printer.id} />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Título *</label>
              <Input name="title" placeholder="ej: Atasco del extrusor" required />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Severidad</label>
              <select
                name="severity"
                defaultValue="MEDIUM"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {Object.values(IssueSeverity).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Descripción</label>
              <Textarea name="description" placeholder="Detalle opcional" />
            </div>
            <Button type="submit" className="md:col-span-2 w-fit">
              <Plus className="h-4 w-4" /> Crear problema
            </Button>
          </form>
        </div>
      </details>

      {open.length > 0 ? (
        <SectionCard
          title={`Problemas abiertos (${open.length})`}
          description="Resolvelos indicando los repuestos usados."
        >
          <ul className="flex flex-col gap-3">
            {open.map((i) => (
              <li key={i.id} className="rounded-md border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-medium text-foreground">{i.title}</span>
                    {i.description && (
                      <p className="text-sm text-muted-foreground">{i.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge
                      variant={
                        i.severity === "HIGH"
                          ? "destructive"
                          : i.severity === "MEDIUM"
                            ? "warning"
                            : "default"
                      }
                    >
                      {i.severity}
                    </Badge>
                    <span className="tabular text-xs text-muted-foreground">
                      {new Date(i.startedAt).toLocaleDateString("es-AR")}
                    </span>
                  </div>
                </div>
                <form action={resolveIssue} className="mt-3 space-y-2 border-t pt-3">
                  <input type="hidden" name="issueId" value={i.id} />
                  {availableParts.length > 0 && (
                    <>
                      <p className="text-xs font-medium text-muted-foreground">
                        Repuestos usados (opcional)
                      </p>
                      <div className="grid gap-1.5 md:grid-cols-3">
                        {availableParts.map((part) => (
                          <label
                            key={part.id}
                            className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-sm"
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {part.name}{" "}
                              <span className="text-muted-foreground">
                                ({part.stock})
                              </span>
                            </span>
                            <Input
                              type="number"
                              min="0"
                              max={part.stock}
                              name={`parts_${part.id}`}
                              defaultValue={0}
                              className="h-8 w-16"
                            />
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                  <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Marcar resuelto
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : (
        <div className="flex items-center gap-2 rounded-md border bg-emerald-50/60 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Sin problemas abiertos. Impresora operativa.
        </div>
      )}

      {resolved.length > 0 && (
        <details className="group rounded-lg border bg-card">
          <summary className="flex cursor-pointer items-center justify-between gap-2 px-5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/30">
            <span>Historial de resueltos ({resolved.length})</span>
            <span className="text-xs transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="border-t p-4">
            <ul className="flex flex-col gap-2">
              {resolved.map((i) => (
                <li
                  key={i.id}
                  className="flex items-start justify-between gap-3 rounded-md border bg-background p-3 text-sm"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium">{i.title}</span>
                    {i.partsUsed.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Repuestos: {i.partsUsed.map((p) => `${p.qty}× ${p.part.name}`).join(", ")}
                      </p>
                    )}
                  </div>
                  <span className="tabular text-xs text-muted-foreground">
                    Resuelto {new Date(i.resolvedAt!).toLocaleDateString("es-AR")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </div>
  );
}
