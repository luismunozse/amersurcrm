import { Card, CardContent } from "@/components/ui/Card";

export function VentasVsMetaBlockSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 rounded-xl bg-crm-border" />
          <div className="space-y-2">
            <div className="h-8 w-32 rounded bg-crm-border" />
            <div className="h-3 w-40 rounded bg-crm-border" />
          </div>
        </div>
        <div className="h-3 w-full rounded-full bg-crm-border" />
        <div className="h-3 w-48 rounded bg-crm-border" />
      </CardContent>
    </Card>
  );
}
