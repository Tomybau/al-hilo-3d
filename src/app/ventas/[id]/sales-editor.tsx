"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatARS } from "@/lib/money";
import {
  closeSalesDay,
  deleteMiscLine,
  setMiscLine,
  setSaleLine,
  setSaleLineVariants,
  updateSalesDayMeta,
} from "@/server/actions/sales";

type Variant = { id: number; name: string; quantity: number };
type Toy = { id: number; name: string; category: string | null; price: number; qty: number; variants: Variant[]; recentVol: number; saleLineId?: number };
type Account = { id: number; name: string; kind: string };
type Loc = { id: number; name: string };
type MiscLine = { id: number; description: string; quantity: number; unitPriceArs: number };

export function SalesEditor({
  salesDayId,
  date,
  notes,
  locationId,
  locations,
  toys: initialToys,
  categories,
  miscLines: initialMiscLines,
  accounts,
}: {
  salesDayId: number;
  date: string;
  notes: string | null;
  locationId: number | null;
  locations: Loc[];
  toys: Toy[];
  categories: string[];
  miscLines: MiscLine[];
  accounts: Account[];
}) {
  const router = useRouter();
  const [toys, setToys] = useState(initialToys);
  const [miscLines, setMiscLines] = useState(initialMiscLines);
  const [filter, setFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [pending, startTransition] = useTransition();
  const [closing, setClosing] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [sortMode, setSortMode] = useState<"popular" | "alpha">("popular");
  const [addingMisc, setAddingMisc] = useState(false);
  const [expandedVariants, setExpandedVariants] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let result = toys.filter((t) => {
      if (q && !t.name.toLowerCase().includes(q)) return false;
      if (catFilter && t.category !== catFilter) return false;
      return true;
    });
    if (sortMode === "alpha") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name, "es"));
    }
    // "popular" mantiene el orden del servidor (recentVol desc → alpha)
    return result;
  }, [toys, filter, catFilter, sortMode]);

  const totals = useMemo(() => {
    const toyTotal = toys.reduce((s, t) => s + t.qty * t.price, 0);
    const miscTotal = miscLines.reduce((s, m) => s + m.quantity * m.unitPriceArs, 0);
    const subtotal = toyTotal + miscTotal;
    const units = toys.reduce((s, t) => s + t.qty, 0) + miscLines.reduce((s, m) => s + m.quantity, 0);
    const distinct = toys.filter((t) => t.qty > 0).length;
    return { subtotal, units, distinct, miscTotal };
  }, [toys, miscLines]);

  const currentLoc = locations.find((l) => l.id === locationId);

  function setQty(toyId: number, qty: number) {
    setToys((prev) => prev.map((t) => (t.id === toyId ? { ...t, qty: Math.max(0, qty) } : t)));
    const fd = new FormData();
    fd.set("salesDayId", String(salesDayId));
    fd.set("toyId", String(toyId));
    fd.set("quantity", String(Math.max(0, qty)));
    startTransition(() => { setSaleLine(fd).catch(console.error); });
  }

  function toggleVariants(toyId: number) {
    setExpandedVariants((prev) => {
      const next = new Set(prev);
      if (next.has(toyId)) next.delete(toyId); else next.add(toyId);
      return next;
    });
  }

  function saveVariants(toy: Toy, variants: Variant[]) {
    setToys((prev) => prev.map((t) => (t.id === toy.id ? { ...t, variants } : t)));
    if (!toy.saleLineId) {
      router.refresh();
      return;
    }
    const fd = new FormData();
    fd.set("saleLineId", String(toy.saleLineId));
    variants.forEach((v, i) => {
      fd.set(`variantName_${i}`, v.name);
      fd.set(`variantQty_${i}`, String(v.quantity));
    });
    startTransition(() => { setSaleLineVariants(fd).catch(console.error); });
  }

  async function addMisc(description: string, quantity: number, unitPriceArs: number) {
    const fd = new FormData();
    fd.set("salesDayId", String(salesDayId));
    fd.set("description", description);
    fd.set("quantity", String(quantity));
    fd.set("unitPriceArs", String(unitPriceArs));
    const tempId = -Date.now();
    setMiscLines((prev) => [...prev, { id: tempId, description, quantity, unitPriceArs }]);
    setAddingMisc(false);
    try { await setMiscLine(fd); router.refresh(); } catch { router.refresh(); }
  }

  async function removeMisc(id: number) {
    setMiscLines((prev) => prev.filter((m) => m.id !== id));
    const fd = new FormData();
    fd.set("id", String(id));
    fd.set("salesDayId", String(salesDayId));
    try { await deleteMiscLine(fd); } catch { router.refresh(); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Venta {new Date(date).toLocaleDateString("es-AR")}</h1>
            <button type="button" onClick={() => setEditingMeta(!editingMeta)} className="text-xs text-muted-foreground underline">
              {currentLoc?.name ?? "Sin lugar"}{notes && ` · ${notes}`} — editar
            </button>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Buscar..." value={filter} onChange={(e) => setFilter(e.target.value)} className="w-40" />
            {categories.length > 0 && (
              <select
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Todas</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <button
              type="button"
              onClick={() => setSortMode((m) => (m === "popular" ? "alpha" : "popular"))}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
              title={sortMode === "popular" ? "Ordenado por más vendidos — clic para A–Z" : "Ordenado A–Z — clic para más vendidos"}
            >
              {sortMode === "popular" ? "★ Populares" : "A–Z"}
            </button>
          </div>
        </div>

        {editingMeta && (
          <Card>
            <CardContent className="p-3">
              <form action={async (fd) => { await updateSalesDayMeta(fd); setEditingMeta(false); router.refresh(); }} className="grid gap-2 md:grid-cols-3">
                <input type="hidden" name="id" value={salesDayId} />
                <Input type="date" name="date" defaultValue={date.slice(0, 10)} />
                <select name="locationId" defaultValue={locationId ?? ""} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Sin lugar</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <Input name="notes" defaultValue={notes ?? ""} placeholder="Notas" />
                <div className="md:col-span-3 flex gap-2">
                  <Button type="submit" size="sm">Guardar</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditingMeta(false)}>Cancelar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lista de juguetes */}
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map((t) => (
                <div key={t.id} className={t.qty > 0 ? "bg-primary/5" : ""}>
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium">{t.name}</span>
                        {t.recentVol > 0 && (
                          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                            {t.recentVol}
                          </span>
                        )}
                      </div>
                      {t.category && <div className="text-xs text-muted-foreground">{t.category}</div>}
                      <div className="text-xs text-muted-foreground">{formatARS(t.price)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="icon" onClick={() => setQty(t.id, t.qty - 1)}>−</Button>
                      <Input
                        type="number" min="0" value={t.qty}
                        onChange={(e) => setQty(t.id, Number(e.target.value) || 0)}
                        className="h-10 w-16 text-center text-lg font-semibold"
                      />
                      <Button type="button" variant="outline" size="icon" onClick={() => setQty(t.id, t.qty + 1)}>+</Button>
                      <div className="w-24 text-right text-sm font-medium">{formatARS(t.qty * t.price)}</div>
                      {t.qty > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleVariants(t.id)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                          title="Desglose"
                        >
                          {expandedVariants.has(t.id) ? "▲" : "▾"}
                        </button>
                      )}
                    </div>
                  </div>
                  {t.qty > 0 && expandedVariants.has(t.id) && (
                    <VariantBreakdown
                      toy={t}
                      onSave={(variants) => saveVariants(t, variants)}
                      onClose={() => toggleVariants(t.id)}
                    />
                  )}
                </div>
              ))}
              {filtered.length === 0 && <p className="p-6 text-center text-muted-foreground">Sin resultados.</p>}
            </div>
          </CardContent>
        </Card>

        {/* Items puntuales */}
        <Card>
          <CardHeader className="flex-row items-center justify-between py-3">
            <CardTitle className="text-sm">Items puntuales</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={() => setAddingMisc(true)}>+ Agregar</Button>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {addingMisc && <MiscLineForm onSave={addMisc} onCancel={() => setAddingMisc(false)} />}
            {miscLines.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 rounded border px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{m.description}</span>
                  <span className="ml-2 text-muted-foreground">×{m.quantity} · {formatARS(m.unitPriceArs)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatARS(m.quantity * m.unitPriceArs)}</span>
                  {m.id > 0 && <button type="button" onClick={() => removeMisc(m.id)} className="text-red-400 hover:text-red-600">×</button>}
                </div>
              </div>
            ))}
            {miscLines.length === 0 && !addingMisc && <p className="text-xs text-muted-foreground">Sin items puntuales.</p>}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        <Card>
          <CardHeader><CardTitle>Totales</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Juguetes distintos</span><strong>{totals.distinct}</strong></div>
            <div className="flex justify-between"><span>Unidades vendidas</span><strong>{totals.units}</strong></div>
            {totals.miscTotal > 0 && (
              <div className="flex justify-between text-muted-foreground"><span>Items puntuales</span><span>{formatARS(totals.miscTotal)}</span></div>
            )}
            <div className="flex justify-between border-t pt-2 text-lg"><span>Total</span><strong>{formatARS(totals.subtotal)}</strong></div>
            {pending && <p className="text-xs text-muted-foreground">Guardando…</p>}
          </CardContent>
        </Card>

        {!closing ? (
          <Button className="w-full" size="lg" onClick={() => setClosing(true)} disabled={totals.units === 0}>
            Cerrar día y conciliar
          </Button>
        ) : (
          <CloseForm salesDayId={salesDayId} accounts={accounts} expected={totals.subtotal} onCancel={() => setClosing(false)} onClosed={() => router.refresh()} />
        )}
      </aside>
    </div>
  );
}

// ── Variant breakdown component ───────────────────────────────────────────────

function VariantBreakdown({
  toy,
  onSave,
  onClose,
}: {
  toy: Toy;
  onSave: (variants: Variant[]) => void;
  onClose: () => void;
}) {
  const [variants, setVariants] = useState<Omit<Variant, "id">[]>(
    toy.variants.length > 0
      ? toy.variants.map((v) => ({ name: v.name, quantity: v.quantity }))
      : [{ name: "", quantity: 1 }]
  );

  const variantTotal = variants.reduce((s, v) => s + v.quantity, 0);
  const remaining = toy.qty - variantTotal;

  function updateVariant(i: number, patch: Partial<Omit<Variant, "id">>) {
    setVariants((prev) => prev.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }

  function save() {
    const valid = variants.filter((v) => v.name.trim() && v.quantity > 0);
    onSave(valid.map((v, i) => ({ id: i, name: v.name.trim(), quantity: v.quantity })));
    onClose();
  }

  return (
    <div className="border-t bg-muted/20 px-4 py-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Desglose de {toy.qty} × {toy.name}
        {remaining !== 0 && <span className={remaining < 0 ? " text-red-500" : " text-orange-500"}> · {remaining > 0 ? `${remaining} sin especificar` : `${Math.abs(remaining)} de más`}</span>}
      </p>
      <div className="space-y-1.5">
        {variants.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={v.name}
              onChange={(e) => updateVariant(i, { name: e.target.value })}
              placeholder="ej: Pikachu"
              className="h-8 flex-1"
              list="variant-names-list"
            />
            <Input
              type="number" min="1" value={v.quantity}
              onChange={(e) => updateVariant(i, { quantity: Math.max(1, Number(e.target.value) || 1) })}
              className="h-8 w-16 text-center"
            />
            {variants.length > 1 && (
              <button type="button" onClick={() => setVariants((p) => p.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 text-xs">×</button>
            )}
          </div>
        ))}
      </div>
      <datalist id="variant-names-list">
        {/* populated dynamically — kept empty, user types freely */}
      </datalist>
      <div className="mt-2 flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setVariants((p) => [...p, { name: "", quantity: 1 }])}>+ Variante</Button>
        <Button type="button" size="sm" onClick={save}>Guardar</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>Cerrar</Button>
      </div>
    </div>
  );
}

// ── Misc line form ────────────────────────────────────────────────────────────

function MiscLineForm({ onSave, onCancel }: { onSave: (d: string, q: number, p: number) => void; onCancel: () => void }) {
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  return (
    <div className="rounded border bg-muted/20 p-3 space-y-2">
      <Input placeholder="Descripción *" value={desc} onChange={(e) => setDesc(e.target.value)} autoFocus />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Cantidad</label>
          <Input type="number" min="1" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Precio ARS</label>
          <Input type="number" min="0" value={price || ""} onChange={(e) => setPrice(Number(e.target.value) || 0)} placeholder="0" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={!desc.trim()} onClick={() => onSave(desc.trim(), qty, price)}>Guardar</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}

// ── Close form ────────────────────────────────────────────────────────────────

function CloseForm({ salesDayId, accounts, expected, onCancel, onClosed }: {
  salesDayId: number; accounts: Account[]; expected: number; onCancel: () => void; onClosed: () => void;
}) {
  const [receipts, setReceipts] = useState<Record<number, number>>(Object.fromEntries(accounts.map((a) => [a.id, 0])));
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const received = Object.values(receipts).reduce((s, n) => s + n, 0);
  const diff = expected - received - discount;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData();
    fd.set("salesDayId", String(salesDayId));
    fd.set("discount", String(discount));
    fd.set("discountNote", note);
    for (const a of accounts) fd.set(`receipt_${a.id}`, String(receipts[a.id] ?? 0));
    try { await closeSalesDay(fd); onClosed(); } finally { setSubmitting(false); }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Conciliar y cerrar</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3 text-sm">
          <div className="text-muted-foreground">Esperado: <strong className="text-foreground">{formatARS(expected)}</strong></div>
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center gap-2">
              <label className="flex-1">{a.name}</label>
              <Input type="number" step="0.01" min="0" value={receipts[a.id] ?? 0}
                onChange={(e) => setReceipts((r) => ({ ...r, [a.id]: Number(e.target.value) || 0 }))}
                className="h-8 w-32 text-right" />
            </div>
          ))}
          <div className="flex items-center gap-2 border-t pt-2">
            <label className="flex-1">Descuento</label>
            <Input type="number" step="0.01" min="0" value={discount || ""}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              className="h-8 w-32 text-right" placeholder="0" />
          </div>
          {discount > 0 && <Input placeholder="Motivo descuento" value={note} onChange={(e) => setNote(e.target.value)} className="h-8" />}
          <div className={`rounded p-2 text-sm ${Math.abs(diff) < 0.5 ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"}`}>
            Diferencia: <strong>{formatARS(diff)}</strong>
            {Math.abs(diff) >= 0.5 && <p className="text-xs">Quedará registrada como discrepancia.</p>}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>Cancelar</Button>
            <Button type="submit" disabled={submitting} className="flex-1">{submitting ? "Cerrando…" : "Confirmar cierre"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
