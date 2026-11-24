import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type BarRow = { label: string; value: number; color: string };

export function ApexBarBreakdown({
  title,
  description,
  data,
}: {
  title: string;
  description?: string;
  data: BarRow[];
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <Card className="apex-panel-surface apex-chart-card border-2">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description ? <CardDescription className="text-[13px]">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
        ) : (
          data.map((row) => (
            <div key={row.label} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-semibold tabular-nums text-foreground">{row.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(row.value / max) * 100}%`,
                    backgroundColor: row.color,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
