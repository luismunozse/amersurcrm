import { Card, CardContent } from "@/components/ui/Card";

export function FunnelAgingBlockSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="space-y-4 p-6">
        <div className="h-4 w-48 rounded bg-crm-border" />
        <div className="h-16 w-full rounded-xl bg-crm-border" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-3 w-full rounded bg-crm-border" />
        ))}
      </CardContent>
    </Card>
  );
}
