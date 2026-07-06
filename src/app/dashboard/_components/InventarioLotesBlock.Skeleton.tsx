import { Card, CardContent } from "@/components/ui/Card";

export function InventarioLotesBlockSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="space-y-4 p-6">
        <div className="h-4 w-44 rounded bg-crm-border" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-crm-border" />
          ))}
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-8 w-full rounded bg-crm-border" />
        ))}
      </CardContent>
    </Card>
  );
}
