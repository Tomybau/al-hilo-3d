import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  href,
  hrefLabel = "Ver detalle",
  accent,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: { direction: "up" | "down" | "neutral"; label: string };
  href?: string;
  hrefLabel?: string;
  accent?: "primary" | "success" | "warning" | "destructive" | "info";
  className?: string;
}) {
  const accentClass =
    accent === "primary"
      ? "bg-primary/10 text-primary"
      : accent === "success"
        ? "bg-emerald-50 text-emerald-600"
        : accent === "warning"
          ? "bg-amber-50 text-amber-600"
          : accent === "destructive"
            ? "bg-red-50 text-red-600"
            : accent === "info"
              ? "bg-sky-50 text-sky-600"
              : "bg-slate-100 text-slate-600";

  const trendClass =
    trend?.direction === "up"
      ? "text-emerald-600"
      : trend?.direction === "down"
        ? "text-red-600"
        : "text-muted-foreground";

  return (
    <div
      className={cn(
        "group flex flex-col gap-3 rounded-lg border bg-card p-5 transition-shadow hover:shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <span className="text-2xl font-semibold tabular tracking-tight text-foreground">
            {value}
          </span>
        </div>
        {Icon && (
          <span className={cn("flex h-9 w-9 items-center justify-center rounded-md", accentClass)}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      {(hint || trend) && (
        <div className="flex items-center gap-2 text-xs">
          {trend && (
            <span className={cn("font-medium tabular", trendClass)}>{trend.label}</span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      )}
      {href && (
        <Link
          href={href}
          className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
        >
          {hrefLabel}
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
