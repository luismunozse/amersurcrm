import { Card, CardContent } from "@/components/ui/Card";

export function MoraAlertasBlockSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-crm-border" />
          <div className="space-y-2">
            <div className="h-8 w-32 rounded bg-crm-border" />
            <div className="h-3 w-28 rounded bg-crm-border" />
          </div>
        </div>
        <div className="h-9 w-full rounded-lg bg-crm-border" />
      </CardContent>
    </Card>
  );
}
