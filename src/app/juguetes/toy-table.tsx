"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArsInput } from "@/components/ui/ars-input";
import { formatARS } from "@/lib/money";
import {
  adjustToyStock,
  toggleToyActive,
  updateToy,
  updateToyPrice,
} from "@/server/actions/toys";

type Toy = {
  id: number;
  name: string;
  sku: string | null;
  category: string | null;
  currentPriceArs: number;
  stock: number;
  active: boolean;
  printTimeMinutes: number | null;
  weightGrams: number | null;
  postProcessMinutes: number | null;
  notes: string | null;
};

export function ToyTable({ toys }: { toys: Toy[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead className="w-52">Precio ARS</TableHead>
          <TableHead className="w-36">Stock</TableHead>
          <TableHead className="w-32">Producción</TableHead>
          <TableHead className="w-28">Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {toys.map((t) => (
          <ToyRow key={t.id} toy={t} />
        ))}
        {toys.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">Sin juguetes.</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function ToyRow({ toy: t }: { toy: Toy }) {
  const [editing, setEditing] = useState(false);

  const prodSummary =
    [
      t.printTimeMinutes ? `${t.printTimeMinutes}m` : null,
      t.weightGrams ? `${t.weightGrams}g` : null,
      t.postProcessMinutes ? `${t.postProcessMinutes}m post` : null,
    ]
      .filter(Boolean)
      .join(" · ") || "—";

  return (
    <>
      <TableRow>
        <TableCell>
          <div className="font-medium">{t.name}</div>
          {t.category && <div className="text-xs text-primary/70">{t.category}</div>}
          {t.sku && <div className="text-xs text-muted-foreground">{t.sku}</div>}
        </TableCell>
        <TableCell>
          <form action={updateToyPrice} className="flex items-center gap-1">
            <input type="hidden" name="id" value={t.id} />
            <ArsInput name="price" defaultValue={t.currentPriceArs} className="h-8 w-32" />
            <Button type="submit" size="sm" variant="outline">OK</Button>
          </form>
          <div className="mt-0.5 text-xs text-muted-foreground">{formatARS(t.currentPriceArs)}</div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <form action={adjustToyStock}>
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="delta" value={-1} />
              <Button type="submit" size="sm" variant="outline" disabled={t.stock <= 0}>−</Button>
            </form>
            <span className="w-10 text-center font-mono text-sm">{t.stock}</span>
            <form action={adjustToyStock}>
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="delta" value={1} />
              <Button type="submit" size="sm" variant="outline">+</Button>
            </form>
          </div>
        </TableCell>
        <TableCell>
          <button
            type="button"
            onClick={() => setEditing(!editing)}
            className="text-left text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            {prodSummary}
            <span className="ml-1 text-primary">✎</span>
          </button>
        </TableCell>
        <TableCell>
          <form action={toggleToyActive}>
            <input type="hidden" name="id" value={t.id} />
            <Button
              type="submit"
              size="sm"
              variant={t.active ? "ghost" : "secondary"}
              className={t.active ? "text-muted-foreground" : ""}
            >
              {t.active ? "Pausar" : "Activar"}
            </Button>
          </form>
        </TableCell>
      </TableRow>
      {editing && (
        <TableRow>
          <TableCell colSpan={5} className="bg-muted/30">
            <form
              action={async (fd) => {
                await updateToy(fd);
                setEditing(false);
              }}
              className="flex flex-wrap items-end gap-3"
            >
              <input type="hidden" name="id" value={t.id} />
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Categoría</label>
                <Input name="category" defaultValue={t.category ?? ""} placeholder="ej: Pokémon" className="h-8 w-28" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Tiempo impresión (min)</label>
                <Input
                  name="printTimeMinutes"
                  type="number"
                  min="0"
                  defaultValue={t.printTimeMinutes ?? ""}
                  className="h-8 w-28"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Peso (gramos)</label>
                <Input
                  name="weightGrams"
                  type="number"
                  step="0.1"
                  min="0"
                  defaultValue={t.weightGrams ?? ""}
                  className="h-8 w-28"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Post-proceso (min)</label>
                <Input
                  name="postProcessMinutes"
                  type="number"
                  min="0"
                  defaultValue={t.postProcessMinutes ?? ""}
                  className="h-8 w-28"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-muted-foreground">Notas</label>
                <Input name="notes" defaultValue={t.notes ?? ""} className="h-8" />
              </div>
              <Button type="submit" size="sm">Guardar</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </form>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
