"use client";

import { useState } from "react";
import { createFilamentOrder } from "@/server/actions/filaments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilamentType } from "@prisma/client";

export function NewOrderForm() {
  const [rowCount, setRowCount] = useState(1);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      await createFilamentOrder(new FormData(e.currentTarget));
      (e.target as HTMLFormElement).reset();
      setRowCount(1);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Proveedor *</label>
          <Input name="supplier" placeholder="Printalot, eSun..." required />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Fecha *</label>
          <Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs text-muted-foreground">Notas</label>
          <Input name="notes" placeholder="Opcional" />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Filamentos comprados</p>
        {Array.from({ length: rowCount }).map((_, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 rounded border p-2 md:grid-cols-6 items-end">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Marca *</label>
              <Input name={`filament_${i}_brand`} placeholder="Grilon3, eSun..." required />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Color *</label>
              <Input name={`filament_${i}_color`} placeholder="Negro, Rojo..." required />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Tipo</label>
              <select
                name={`filament_${i}_type`}
                defaultValue="PLA"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {Object.values(FilamentType).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Rollos</label>
              <Input name={`filament_${i}_qty`} type="number" min="1" defaultValue="1" className="w-full" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Precio/rollo ARS</label>
              <Input name={`filament_${i}_price`} type="number" min="0" step="0.01" placeholder="0" />
            </div>
            {rowCount > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-end text-muted-foreground"
                onClick={() => setRowCount((n) => Math.max(1, n - 1))}
              >
                ✕
              </Button>
            )}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setRowCount((n) => n + 1)}>
          + Agregar filamento
        </Button>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Registrar compra"}
      </Button>
    </form>
  );
}
