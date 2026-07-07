import { Card, CardContent } from "@/components/ui/Card";

export function VentasChartBlockSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-crm-border" />
            <div className="h-4 w-32 rounded bg-crm-border" />
          </div>
          <div className="h-5 w-24 rounded-full bg-crm-border" />
        </div>
        <div className="h-3 w-56 rounded bg-crm-border" />
        <div className="h-48 w-full rounded-lg bg-crm-border sm:h-64" />
      </CardContent>
    </Card>
  );
}
