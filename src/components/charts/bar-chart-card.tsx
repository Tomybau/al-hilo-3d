"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SectionCard } from "@/components/section-card";
import { formatARS } from "@/lib/money";

export type BarDatum = { label: string; value: number };

export function BarChartCard({
  title,
  description,
  data,
  currency = false,
  height = 260,
  horizontal = false,
}: {
  title: string;
  description?: string;
  data: BarDatum[];
  currency?: boolean;
  height?: number;
  horizontal?: boolean;
}) {
  const fmt = (n: number) =>
    currency ? formatARS(n) : new Intl.NumberFormat("es-AR").format(n);
  return (
    <SectionCard title={title} description={description} padded={false}>
      <div className="px-3 py-4" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout={horizontal ? "vertical" : "horizontal"}
            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
          >
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            {horizontal ? (
              <>
                <XAxis
                  type="number"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (currency ? fmt(Number(v)).replace(/\s/g, "") : String(v))}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
              </>
            ) : (
              <>
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
              </>
            )}
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
                fontSize: 12,
              }}
              formatter={(v) => fmt(Number(v))}
            />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
