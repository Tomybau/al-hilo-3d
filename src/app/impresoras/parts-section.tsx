"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { adjustPartStock, createPart } from "@/server/actions/printers";

type Printer = { id: number; name: string };
type Part = {
  id: number;
  name: string;
  sku: string | null;
  stock: number;
  compatiblePrinters: { id: number; name: string }[];
};

export function PartsSection({ parts, printers }: { parts: Part[]; printers: Printer[] }) {
  const [search, setSearch] = useState("");
  const [printerFilter, setPrinterFilter] = useState<string>("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pid = printerFilter ? Number(printerFilter) : null;
    return parts.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !(p.sku ?? "").toLowerCase().includes(q)) return false;
      if (pid && !p.compatiblePrinters.some((cp) => cp.id === pid)) return false;
      return true;
    });
  }, [parts, search, printerFilter]);

  async function handleCreate(fd: FormData) {
    await createPart(fd);
    setOpen(false);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Repuestos</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">+ Nuevo repuesto</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo repuesto</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Nombre *</label>
                <Input name="name" placeholder="ej: Boquilla 0.4mm" required autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">SKU</label>
                  <Input name="sku" placeholder="opcional" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Stock inicial</label>
                  <Input name="stock" type="number" min="0" defaultValue={0} />
                </div>
              </div>
              {printers.length > 0 && (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Impresoras compatibles</p>
                  <div className="grid grid-cols-2 gap-1">
                    {printers.map((pr) => (
                      <label key={pr.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name={`printer_${pr.id}`} />
                        {pr.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 border-t pt-3">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit">Crear</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o SKU"
            className="w-64"
          />
          <select
            value={printerFilter}
            onChange={(e) => setPrinterFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todas las impresoras</option>
            {printers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {(search || printerFilter) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setPrinterFilter(""); }}>
              Limpiar
            </Button>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Compatibles</TableHead>
              <TableHead className="w-40">Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="font-medium">{p.name}</div>
                  {p.sku && <div className="text-xs text-muted-foreground">{p.sku}</div>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {p.compatiblePrinters.length > 0
                    ? p.compatiblePrinters.map((cp) => cp.name).join(", ")
                    : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <form action={adjustPartStock}>
                      <input type="hidden" name="partId" value={p.id} />
                      <input type="hidden" name="delta" value={-1} />
                      <Button type="submit" size="sm" variant="outline" disabled={p.stock <= 0}>−</Button>
                    </form>
                    <span className="w-10 text-center font-mono text-sm">{p.stock}</span>
                    <form action={adjustPartStock}>
                      <input type="hidden" name="partId" value={p.id} />
                      <input type="hidden" name="delta" value={1} />
                      <Button type="submit" size="sm" variant="outline">+</Button>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  {parts.length === 0 ? "Sin repuestos cargados." : "Sin resultados."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
