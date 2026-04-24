import { formatARS } from "@/lib/money";
import { cn } from "@/lib/utils";

type Intent = "neutral" | "positive" | "negative" | "muted";

export function Money({
  value,
  intent = "neutral",
  signed = false,
  className,
}: {
  value: number | bigint | null | undefined;
  intent?: Intent;
  signed?: boolean;
  className?: string;
}) {
  const n = value == null ? 0 : typeof value === "bigint" ? Number(value) : value;
  const base = formatARS(Math.abs(n));
  const sign = signed ? (n > 0 ? "+ " : n < 0 ? "− " : "") : n < 0 ? "− " : "";
  const resolved =
    intent === "positive"
      ? "text-emerald-600"
      : intent === "negative"
        ? "text-red-600"
        : intent === "muted"
          ? "text-muted-foreground"
          : "text-foreground";
  return <span className={cn("tabular font-medium", resolved, className)}>{sign}{base}</span>;
}
