"use client";

import { useState } from "react";
import { Bell, Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createRecurringBill,
  deleteRecurringBill,
  payRecurringBill,
} from "@/server/actions/recurring";
import { formatARS } from "@/lib/money";

type Bill = {
  id: number;
  name: string;
  amountArs: number;
  dueDay: number;
  category: string | null;
  accountName: string | null;
  lastPaidAt: Date | null;
  isDueSoon: boolean;
  isPaidThisMonth: boolean;
};

type Account = { id: number; name: string };
type Category = { id: number; name: string };

export function RecurringBillsSection({
  bills,
  accounts,
  categories,
}: {
  bills: Bill[];
  accounts: Account[];
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);

  async function handleCreate(fd: FormData) {
    await createRecurringBill(fd);
    setOpen(false);
  }

  const pending = bills.filter((b) => !b.isPaidThisMonth);
  const paid = bills.filter((b) => b.isPaidThisMonth);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Pagos recurrentes</h2>
          {pending.length > 0 && (
            <Badge variant="warning">{pending.length} pendiente{pending.length !== 1 ? "s" : ""}</Badge>
          )}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" /> Nuevo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Nuevo pago recurrente</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Nombre *</label>
                <Input name="name" placeholder="Ej: Alquiler puesto" required maxLength={80} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Monto ARS</label>
                  <Input type="number" name="amountArs" min="0" step="0.01" placeholder="0" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Día del mes</label>
                  <Input type="number" name="dueDay" min="1" max="31" placeholder="1-31" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Cuenta (opcional)</label>
                  <select
                    name="accountId"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Sin cuenta</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Categoría</label>
                  <select
                    name="category"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t pt-3">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit">Guardar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {bills.length === 0 ? (
        <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          <Bell className="h-4 w-4 shrink-0" />
          <span>No hay pagos recurrentes configurados. Agregá uno para recibir recordatorios.</span>
        </div>
      ) : (
        <div className="rounded-lg border bg-card divide-y overflow-hidden">
          {[...pending, ...paid].map((b) => (
            <div
              key={b.id}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                b.isDueSoon && !b.isPaidThisMonth ? "bg-amber-50" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${b.isPaidThisMonth ? "text-muted-foreground line-through" : ""}`}>
                    {b.name}
                  </span>
                  {b.isDueSoon && !b.isPaidThisMonth && (
                    <Badge variant="warning" className="text-[10px]">Vence pronto</Badge>
                  )}
                  {b.isPaidThisMonth && (
                    <Badge variant="success" className="text-[10px]">Pagado</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Día {b.dueDay} · {b.amountArs > 0 ? formatARS(b.amountArs) : "Sin monto fijo"}
                  {b.accountName && ` · ${b.accountName}`}
                  {b.category && ` · ${b.category}`}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {!b.isPaidThisMonth && (
                  <form action={payRecurringBill}>
                    <input type="hidden" name="id" value={b.id} />
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      title="Marcar como pagado"
                    >
                      <Check className="h-3.5 w-3.5" /> Pagado
                    </Button>
                  </form>
                )}
                <form action={deleteRecurringBill}>
                  <input type="hidden" name="id" value={b.id} />
                  <Button
                    type="submit"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
