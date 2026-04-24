import * as React from "react";
import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  padded = true,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  padded?: boolean;
}) {
  return (
    <section className={cn("rounded-lg border bg-card", className)}>
      {(title || actions || description) && (
        <header className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="flex flex-col gap-1">
            {title && (
              <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(padded ? "p-5" : "", contentClassName)}>{children}</div>
    </section>
  );
}
