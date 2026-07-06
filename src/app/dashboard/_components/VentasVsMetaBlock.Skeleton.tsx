import { Card, CardContent } from "@/components/ui/Card";

export function VentasVsMetaBlockSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="space-y-3 p-6">
        <div className="h-4 w-40 rounded bg-crm-border" />
        <div className="h-7 w-36 rounded bg-crm-border" />
        <div className="h-2 w-full rounded-full bg-crm-border" />
        <div className="h-3 w-48 rounded bg-crm-border" />
      </CardContent>
    </Card>
  );
}
