"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApexEmptyState } from "@/components/apex/PageChrome";
import { PieChart as PieChartIcon } from "lucide-react";

export type ChartSlice = { key?: string; label: string; value: number; color: string };

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartSlice }[];
}) {
  if (!active || !payload?.[0]) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-[oklch(0.18_0.025_160/95)] px-3 py-2 shadow-xl backdrop-blur-md">
      <p className="text-xs font-semibold text-foreground">{item.label}</p>
      <p className="text-sm font-bold tabular-nums text-primary">{item.value}</p>
    </div>
  );
}

export function ApexDonutChart({
  title,
  description,
  data,
  centerLabel,
  centerValue,
}: {
  title: string;
  description?: string;
  data: ChartSlice[];
  centerLabel?: string;
  centerValue?: string | number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="apex-panel-surface apex-chart-card border-2">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[oklch(0.3_0.04_160)] text-primary ring-1 ring-primary/30">
            <PieChartIcon className="h-4 w-4" />
          </span>
          {title}
        </CardTitle>
        {description ? <CardDescription className="text-[13px]">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="pt-5">
        {data.length === 0 || total === 0 ? (
          <ApexEmptyState
            icon={PieChartIcon}
            title="No data yet"
            description="Data will appear once clinics are registered."
          />
        ) : (
          <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start">
            <div className="relative h-52 w-52 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {data.map((entry) => (
                      <Cell key={entry.key ?? entry.label} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                {centerValue != null ? (
                  <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                    {centerValue}
                  </p>
                ) : null}
                {centerLabel ? (
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {centerLabel}
                  </p>
                ) : null}
              </div>
            </div>
            <ul className="flex w-full flex-1 flex-col gap-2.5">
              {data.map((d) => (
                <li key={d.key ?? d.label} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/10"
                      style={{ background: d.color }}
                    />
                    <span className="truncate font-medium text-foreground">{d.label}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-bold tabular-nums text-foreground">{d.value}</span>
                    <span className="text-xs text-muted-foreground">
                      ({Math.round((d.value / total) * 100)}%)
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
