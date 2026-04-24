"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SectionCard } from "@/components/section-card";
import { formatARS } from "@/lib/money";

export type LineDatum = { label: string; value: number; secondary?: number };

export function LineChartCard({
  title,
  description,
  data,
  seriesLabel = "Valor",
  secondaryLabel,
  currency = false,
  height = 260,
}: {
  title: string;
  description?: string;
  data: LineDatum[];
  seriesLabel?: string;
  secondaryLabel?: string;
  currency?: boolean;
  height?: number;
}) {
  const fmt = (n: number) =>
    currency ? formatARS(n) : new Intl.NumberFormat("es-AR").format(n);
  return (
    <SectionCard title={title} description={description} padded={false}>
      <div className="px-3 py-4" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => (currency ? fmt(Number(v)).replace(/\s/g, "") : String(v))}
              width={72}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
                fontSize: 12,
              }}
              formatter={(v) => fmt(Number(v))}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              name={seriesLabel}
            />
            {secondaryLabel && (
              <Line
                type="monotone"
                dataKey="secondary"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                name={secondaryLabel}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
