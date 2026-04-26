"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { upsertSetting } from "@/server/actions/config";

type CostValues = {
  electricityPerHour: number;
  postProcessPerHour: number;
  monthlyFixed: number;
  monthlyUnits: number;
  desiredMarginPct: number;
};

export function CostSettingsDialog({
  values,
  avgMonthlyUnits,
}: {
  values: CostValues;
  /** Promedio de unidades/mes de los últimos 90 días, para sugerir como objetivo. */
  avgMonthlyUnits: number;
}) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(fd: FormData) {
    const settings: Record<string, string> = {
      electricity_price_per_hour: String(Number(fd.get("electricity_price_per_hour")) || 0),
      postprocess_rate_per_hour: String(Number(fd.get("postprocess_rate_per_hour")) || 0),
      monthly_fixed_cost: String(Number(fd.get("monthly_fixed_cost")) || 0),
      monthly_units_target: String(Number(fd.get("monthly_units_target")) || 1),
      desired_margin_pct: String(Number(fd.get("desired_margin_pct")) || 40),
    };
    for (const [key, value] of Object.entries(settings)) {
      const f = new FormData();
      f.set("key", key);
      f.set("value", value);
      await upsertSetting(f);
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground">
          <Pencil className="h-3.5 w-3.5" /> Editar parámetros
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Parámetros de costo</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4 pt-1">
          <Field
            name="electricity_price_per_hour"
            label="Luz por hora de impresión (ARS)"
            defaultValue={values.electricityPerHour}
            hint="Costo de electricidad mientras imprimís ($/h)"
          />
          <Field
            name="postprocess_rate_per_hour"
            label="Post-proceso por hora (ARS)"
            defaultValue={values.postProcessPerHour}
            hint="Tu tiempo de lijado, pintura, armado ($/h)"
          />
          <Field
            name="monthly_fixed_cost"
            label="Costos fijos del mes (ARS)"
            defaultValue={values.monthlyFixed}
            hint="Puesto, alquiler, impuestos, etc. (total mes)"
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium">
              Unidades objetivo por mes
            </label>
            <Input
              type="number"
              name="monthly_units_target"
              min="1"
              step="1"
              defaultValue={values.monthlyUnits || avgMonthlyUnits || 1}
            />
            {avgMonthlyUnits > 0 && (
              <p className="text-xs text-muted-foreground">
                Tu promedio real (últimos 90 días): ≈{avgMonthlyUnits} u/mes.
                Usá ese valor para que el cálculo sea exacto.
              </p>
            )}
          </div>
          <Field
            name="desired_margin_pct"
            label="Margen deseado (%)"
            defaultValue={values.desiredMarginPct}
            hint="Porcentaje de ganancia sobre el precio de venta"
            max={99}
          />
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  name,
  label,
  defaultValue,
  hint,
  max,
}: {
  name: string;
  label: string;
  defaultValue: number;
  hint?: string;
  max?: number;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium">{label}</label>
      <Input
        type="number"
        name={name}
        min="0"
        step="0.01"
        max={max}
        defaultValue={defaultValue}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
