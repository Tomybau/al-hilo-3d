"use client";

import { useState, useMemo } from "react";
import { updateFilamentStock } from "@/server/actions/filaments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FilamentSummary = { id: number; brand: string; color: string; type: string; active: number; total: number };

export function StockUpdateForm({
  filaments,
  action,
}: {
  filaments: FilamentSummary[];
  action: typeof updateFilamentStock;
}) {
  const brands = useMemo(() => [...new Set(filaments.map((f) => f.brand))].sort(), [filaments]);
  const [brand, setBrand] = useState(brands[0] ?? "");
  const [quantities, setQuantities] = useState<Record<number, number>>(
    Object.fromEntries(filaments.map((f) => [f.id, f.active]))
  );
  const [pending, setPending] = useState(false);

  const filtered = filaments.filter((f) => !brand || f.brand === brand);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData();
    for (const [id, qty] of Object.entries(quantities)) {
      fd.set(`stock_${id}`, String(qty));
    }
    try {
      await action(fd);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {brands.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setBrand(b)}
            className={
              "rounded border px-3 py-1 text-sm " +
              (brand === b ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent")
            }
          >
            {b}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setBrand("")}
          className={"rounded border px-3 py-1 text-sm " + (!brand ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent")}
        >
          Todos
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Escribí cuántos rollos de cada color tenés ahora. Los que sobraron se marcarán como consumidos.
      </p>

      <div className="grid gap-2 md:grid-cols-3">
        {filtered.map((f) => (
          <div key={f.id} className="flex items-center gap-2 rounded border p-2">
            <div className="flex-1 text-sm">
              <div className="font-medium">{f.color}</div>
              <div className="text-xs text-muted-foreground">{f.brand} · {f.type}</div>
            </div>
            <Input
              type="number"
              min="0"
              value={quantities[f.id] ?? f.active}
              onChange={(e) =>
                setQuantities((q) => ({ ...q, [f.id]: Number(e.target.value) || 0 }))
              }
              className="h-8 w-16 text-center"
            />
            <span className="text-xs text-muted-foreground">de {f.total}</span>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">Sin filamentos para esta marca.</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar stock"}
      </Button>
    </form>
  );
}
