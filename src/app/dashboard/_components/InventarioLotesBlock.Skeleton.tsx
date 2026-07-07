import { Card, CardContent } from "@/components/ui/Card";

export function InventarioLotesBlockSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-crm-border" />
          <div className="h-4 w-40 rounded bg-crm-border" />
        </div>
        <div className="h-3 w-64 rounded bg-crm-border" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-full rounded bg-crm-border" />
            <div className="h-2.5 w-full rounded-full bg-crm-border" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
