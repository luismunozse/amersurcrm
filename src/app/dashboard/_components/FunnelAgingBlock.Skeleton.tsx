import { Card, CardContent } from "@/components/ui/Card";

export function FunnelAgingBlockSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-crm-border" />
          <div className="h-4 w-48 rounded bg-crm-border" />
        </div>
        <div className="h-20 w-full rounded-xl bg-crm-border" />
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-6 w-24 rounded-full bg-crm-border" />
          ))}
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 rounded bg-crm-border" />
              <div className="h-3 w-16 rounded bg-crm-border" />
            </div>
            <div className="h-1.5 w-full rounded-full bg-crm-border" />
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 border-t border-crm-border/60 pt-3">
          <div className="h-3 w-28 rounded bg-crm-border" />
          <div className="h-3 w-10 rounded bg-crm-border" />
        </div>
      </CardContent>
    </Card>
  );
}
