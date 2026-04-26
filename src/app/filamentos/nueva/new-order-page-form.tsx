"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatARS } from "@/lib/money";
import { FilamentType } from "@prisma/client";
import { createFilamentOrder } from "@/server/actions/filaments";

type ColorEntry = { color: string; qty: number };

type BrandEntry = {
  brand: string;
  pricePerRoll: number;
  filamentType: FilamentType;
  colors: ColorEntry[];
};

type AccountEntry = { id: number; name: string };

function emptyBrand(): BrandEntry {
  return { brand: "", pricePerRoll: 0, filamentType: "PLA", colors: [{ color: "", qty: 1 }] };
}

const SKIP_FINANCE_SUPPLIERS = ["Carga Inicial"];

export function NewOrderPageForm({
  suppliers,
  brands: knownBrands,
  colors: knownColors,
  accounts,
}: {
  suppliers: string[];
  brands: string[];
  colors: string[];
  accounts: AccountEntry[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [step, setStep] = useState<"supplier" | "items">(suppliers.length > 0 ? "supplier" : "items");
  const [supplier, setSupplier] = useState("");
  const [date, setDate] = useState(today);
  const [shipping, setShipping] = useState(0);
  const [notes, setNotes] = useState("");
  const [accountId, setAccountId] = useState<number | null>(accounts.length === 1 ? accounts[0].id : null);
  const [brandEntries, setBrandEntries] = useState<BrandEntry[]>([emptyBrand()]);
  const [submitting, setSubmitting] = useState(false);

  const skipFinance = SKIP_FINANCE_SUPPLIERS.includes(supplier.trim());

  const subtotal = useMemo(
    () => brandEntries.reduce((s, b) => s + b.pricePerRoll * b.colors.reduce((cs, c) => cs + c.qty, 0), 0),
    [brandEntries]
  );
  const totalRolls = useMemo(
    () => brandEntries.reduce((s, b) => s + b.colors.reduce((cs, c) => cs + c.qty, 0), 0),
    [brandEntries]
  );
  const total = subtotal + shipping;

  function updateBrand(idx: number, patch: Partial<BrandEntry>) {
    setBrandEntries((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  }

  function updateColor(brandIdx: number, colorIdx: number, patch: Partial<ColorEntry>) {
    setBrandEntries((prev) =>
      prev.map((b, i) =>
        i === brandIdx
          ? { ...b, colors: b.colors.map((c, j) => (j === colorIdx ? { ...c, ...patch } : c)) }
          : b
      )
    );
  }

  function addColor(brandIdx: number) {
    setBrandEntries((prev) =>
      prev.map((b, i) => (i === brandIdx ? { ...b, colors: [...b.colors, { color: "", qty: 1 }] } : b))
    );
  }

  function removeColor(brandIdx: number, colorIdx: number) {
    setBrandEntries((prev) =>
      prev.map((b, i) =>
        i === brandIdx && b.colors.length > 1
          ? { ...b, colors: b.colors.filter((_, j) => j !== colorIdx) }
          : b
      )
    );
  }

  function removeBrand(idx: number) {
    setBrandEntries((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supplier.trim()) return;

    // Flatten brand × color to individual lines
    const lines: { brand: string; color: string; type: FilamentType; qty: number; price: number }[] = [];
    for (const b of brandEntries) {
      if (!b.brand.trim()) continue;
      for (const c of b.colors) {
        if (!c.color.trim() || c.qty <= 0) continue;
        lines.push({ brand: b.brand.trim(), color: c.color.trim(), type: b.filamentType, qty: c.qty, price: b.pricePerRoll });
      }
    }
    if (lines.length === 0) return;

    setSubmitting(true);
    const fd = new FormData();
    fd.set("supplier", supplier.trim());
    fd.set("date", date);
    fd.set("shippingArs", String(shipping));
    fd.set("notes", notes);
    if (accountId && !SKIP_FINANCE_SUPPLIERS.includes(supplier.trim())) {
      fd.set("accountId", String(accountId));
    }
    lines.forEach((l, i) => {
      fd.set(`filament_${i}_brand`, l.brand);
      fd.set(`filament_${i}_color`, l.color);
      fd.set(`filament_${i}_type`, l.type);
      fd.set(`filament_${i}_qty`, String(l.qty));
      fd.set(`filament_${i}_price`, String(l.price));
    });
    try {
      await createFilamentOrder(fd);
    } catch (err: any) {
      if (err?.digest?.startsWith("NEXT_REDIRECT")) return;
      console.error(err);
      setSubmitting(false);
    }
  }

  if (step === "supplier") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>1. ¿De qué proveedor?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {suppliers.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Proveedores anteriores</p>
              <div className="flex flex-wrap gap-2">
                {suppliers.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant={supplier === s ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSupplier(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm">O escribí uno nuevo</label>
            <Input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Printalot, eSun..."
              autoFocus={suppliers.length === 0}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Fecha de la compra</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="ghost" onClick={() => router.push("/filamentos")}>
              Cancelar
            </Button>
            <Button type="button" disabled={!supplier.trim()} onClick={() => setStep("items")}>
              Siguiente →
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Compra a <span className="text-primary">{supplier}</span>
          </h2>
          <Button type="button" variant="ghost" size="sm" onClick={() => setStep("supplier")}>
            ← Cambiar proveedor
          </Button>
        </div>

        {brandEntries.map((b, brandIdx) => (
          <Card key={brandIdx}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                {/* Marca */}
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-muted-foreground">Marca *</label>
                  <Input
                    value={b.brand}
                    onChange={(e) => updateBrand(brandIdx, { brand: e.target.value })}
                    placeholder="Grilon3, eSun..."
                    list="brands-list"
                    autoFocus={brandIdx === brandEntries.length - 1 && !b.brand}
                  />
                  <datalist id="brands-list">
                    {knownBrands.map((br) => <option key={br} value={br} />)}
                  </datalist>
                </div>
                {/* Tipo */}
                <div className="w-24">
                  <label className="mb-1 block text-xs text-muted-foreground">Tipo</label>
                  <select
                    value={b.filamentType}
                    onChange={(e) => updateBrand(brandIdx, { filamentType: e.target.value as FilamentType })}
                    className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {Object.values(FilamentType).map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {/* Precio */}
                <div className="w-36">
                  <label className="mb-1 block text-xs text-muted-foreground">Precio/rollo ARS *</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={b.pricePerRoll || ""}
                    onChange={(e) => updateBrand(brandIdx, { pricePerRoll: Number(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                {brandEntries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBrand(brandIdx)}
                    className="mt-6 text-sm text-red-500 hover:underline"
                  >
                    Quitar
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <p className="text-xs font-medium text-muted-foreground">Colores</p>
              {b.colors.map((c, colorIdx) => (
                <div key={colorIdx} className="flex items-center gap-2">
                  <Input
                    value={c.color}
                    onChange={(e) => updateColor(brandIdx, colorIdx, { color: e.target.value })}
                    placeholder="Negro, Azul..."
                    list={`colors-list-${brandIdx}`}
                    className="flex-1"
                  />
                  <datalist id={`colors-list-${brandIdx}`}>
                    {knownColors.map((cl) => <option key={cl} value={cl} />)}
                  </datalist>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => updateColor(brandIdx, colorIdx, { qty: Math.max(1, c.qty - 1) })}
                    >
                      −
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      value={c.qty}
                      onChange={(e) => updateColor(brandIdx, colorIdx, { qty: Math.max(1, Number(e.target.value) || 1) })}
                      className="h-9 w-14 text-center"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => updateColor(brandIdx, colorIdx, { qty: c.qty + 1 })}
                    >
                      +
                    </Button>
                  </div>
                  {b.pricePerRoll > 0 && (
                    <span className="w-24 text-right text-xs text-muted-foreground">
                      {formatARS(b.pricePerRoll * c.qty)}
                    </span>
                  )}
                  {b.colors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeColor(brandIdx, colorIdx)}
                      className="text-red-400 hover:text-red-600"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addColor(brandIdx)}
                className="mt-1"
              >
                + Color
              </Button>
            </CardContent>
          </Card>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => setBrandEntries((prev) => [...prev, emptyBrand()])}
        >
          + Agregar otra marca
        </Button>

        <div>
          <label className="mb-1 block text-sm text-muted-foreground">Notas (opcional)</label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ej: pago en 3 cuotas" />
        </div>
      </div>

      {/* Sidebar */}
      <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        <Card>
          <CardHeader><CardTitle>Resumen</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Rollos</span>
              <strong>{totalRolls}</strong>
            </div>
            <div className="flex justify-between">
              <span>Subtotal</span>
              <strong>{formatARS(subtotal)}</strong>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <label htmlFor="shipping-input">Envío</label>
              <Input
                id="shipping-input"
                type="number"
                min="0"
                step="0.01"
                value={shipping || ""}
                onChange={(e) => setShipping(Number(e.target.value) || 0)}
                className="h-8 w-32 text-right"
                placeholder="0"
              />
            </div>
            <div className="flex justify-between border-t pt-2 text-lg">
              <span>Total</span>
              <strong>{formatARS(total)}</strong>
            </div>
            {shipping > 0 && totalRolls > 0 && (
              <p className="text-xs text-muted-foreground">
                Envío: {formatARS(shipping / totalRolls)} c/rollo (promedio)
              </p>
            )}
          </CardContent>
        </Card>

        {accounts.length > 0 && !skipFinance && (
          <div className="rounded-md border bg-muted/30 p-3 space-y-2 text-sm">
            <p className="font-medium">¿De qué cuenta sale el dinero?</p>
            <select
              value={accountId ?? ""}
              onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : null)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">No registrar gasto</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            {accountId && (
              <p className="text-xs text-muted-foreground">
                Se registrará un gasto de <strong>{formatARS(total)}</strong> en «Filamentos».
              </p>
            )}
          </div>
        )}
        {skipFinance && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Proveedor de carga inicial — no se registrará gasto automático.
          </p>
        )}
        <Button type="submit" className="w-full" size="lg" disabled={submitting || subtotal === 0}>
          {submitting ? "Guardando…" : "Registrar compra"}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={() => router.push("/filamentos")}>
          Cancelar
        </Button>
      </aside>
    </form>
  );
}
