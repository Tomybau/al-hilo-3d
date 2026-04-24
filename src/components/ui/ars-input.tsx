"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

function fmtArs(n: number): string {
  if (!n || isNaN(n)) return "";
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(n);
}

function parseArs(s: string): number {
  const clean = s.replace(/\./g, "").replace(",", ".");
  return parseFloat(clean) || 0;
}

interface ArsInputProps {
  name: string;
  defaultValue?: number;
  className?: string;
  required?: boolean;
  placeholder?: string;
  min?: number;
}

export function ArsInput({ name, defaultValue, className, required, placeholder, min }: ArsInputProps) {
  const [display, setDisplay] = useState(defaultValue ? fmtArs(defaultValue) : "");
  const numeric = parseArs(display);

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        value={display}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d.,]/g, "");
          setDisplay(raw);
        }}
        onBlur={() => {
          const n = parseArs(display);
          setDisplay(n > 0 ? fmtArs(n) : "");
        }}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
        required={required}
        placeholder={placeholder ?? "0"}
        min={min}
      />
      <input type="hidden" name={name} value={numeric || ""} />
    </div>
  );
}
