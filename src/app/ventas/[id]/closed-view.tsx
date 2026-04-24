"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatARS } from "@/lib/money";
import { reopenSalesDay, updateSalesDayMeta } from "@/server/actions/sales";

type Line = { id: number; toyName: string; quantity: number; unitPriceArs: number };
type MiscLine = { id: number; description: string; quantity: number; unitPriceArs: number };
type Settle = { id: number; kind: string; amountArs: number; accountName: string | null; note: string | null };
type Loc = { id: number; name: string };

export function ClosedSalesView({
  salesDayId,
  date,
  notes,
  locationId,
  locations,
  lines,
  miscLines,
  settlements,
}: {
  salesDayId: number;
  date: string;
  notes: string | null;
  locationId: number | null;
  locations: Loc[];
  lines: Line[];
  miscLines: MiscLine[];
  settlements: Settle[];
}) {
  const [editingMeta, setEditingMeta] = useState(false);
  const [reopening, setReopening] = useState(false);
  const total =
    lines.reduce((s, l) => s + l.quantity * l.unitPriceArs, 0) +
    miscLines.reduce((s, m) => s + m.quantity * m.unitPriceArs, 0);
  const units =
    lines.reduce((s, l) => s + l.quantity, 0) +
    miscLines.reduce((s, m) => s + m.quantity, 0);
  const currentLoc = locations.find((l) => l.id === locationId);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            Venta {new Date(date).toLocaleDateString("es-AR")} — Cerrada
          </h1>
          <p className="text-sm text-muted-foreground">
            Lugar: {currentLoc?.name ?? "—"}
            {notes && <span> · {notes}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditingMeta(!editingMeta)}>
            Editar lugar/fecha
          </Button>
          <form
            action={async (fd) => {
              setReopening(true);
              try {
                await reopenSalesDay(fd);
              } finally {
                setReopening(false);
              }
            }}
          >
            <input type="hidden" name="salesDayId" value={salesDayId} />
            <Button type="submit" variant="outline" size="sm" className="text-orange-600" disabled={reopening}>
              {reopening ? "Reabriendo…" : "Reabrir para editar"}
            </Button>
          </form>
        </div>
      </div>

      {editingMeta && (
        <Card>
          <CardHeader><CardTitle className="text-base">Editar metadata</CardTitle></CardHeader>
          <CardContent>
            <form
              action={async (fd) => {
                await updateSalesDayMeta(fd);
                setEditingMeta(false);
              }}
              className="grid gap-2 md:grid-cols-3"
            >
              <input type="hidden" name="id" value={salesDayId} />
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Fecha</label>
                <Input type="date" name="date" defaultValue={date.slice(0, 10)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Lugar</label>
                <select name="locationId" defaultValue={locationId ?? ""} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Sin lugar</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Notas</label>
                <Input name="notes" defaultValue={notes ?? ""} />
              </div>
              <div className="md:col-span-3 flex gap-2">
                <Button type="submit" size="sm">Guardar</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditingMeta(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Resumen</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p>Total esperado: <strong>{formatARS(total)}</strong></p>
          <p>Unidades: {units}</p>
          <div className="border-t pt-2">
            <h3 className="mb-1 font-medium">Liquidación</h3>
            <ul className="space-y-1 text-sm">
              {settlements.map((s) => (
                <li key={s.id}>
                  <span className="text-muted-foreground">{s.kind}</span>{" "}
                  {s.accountName ? `(${s.accountName})` : ""} —{" "}
                  <strong>{formatARS(s.amountArs)}</strong>
                  {s.note && <span className="text-muted-foreground"> · {s.note}</span>}
                </li>
              ))}
              {settlements.length === 0 && (
                <li className="text-muted-foreground">Sin movimientos.</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Detalle de productos</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {lines.map((l) => (
              <div key={l.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="font-medium">{l.toyName}</span>
                <span className="text-muted-foreground">
                  {l.quantity} × {formatARS(l.unitPriceArs)} = <strong className="text-foreground">{formatARS(l.quantity * l.unitPriceArs)}</strong>
                </span>
              </div>
            ))}
            {miscLines.map((m) => (
              <div key={`misc-${m.id}`} className="flex items-center justify-between bg-muted/20 px-4 py-2 text-sm">
                <span className="font-medium">{m.description} <span className="text-xs text-muted-foreground">(puntual)</span></span>
                <span className="text-muted-foreground">
                  {m.quantity} × {formatARS(m.unitPriceArs)} = <strong className="text-foreground">{formatARS(m.quantity * m.unitPriceArs)}</strong>
                </span>
              </div>
            ))}
            {lines.length === 0 && miscLines.length === 0 && (
              <p className="p-4 text-center text-muted-foreground">Sin líneas.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
