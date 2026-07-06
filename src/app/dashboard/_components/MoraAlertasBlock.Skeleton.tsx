import { Card, CardContent } from "@/components/ui/Card";

export function MoraAlertasBlockSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="space-y-3 p-6">
        <div className="h-4 w-32 rounded bg-crm-border" />
        <div className="h-7 w-40 rounded bg-crm-border" />
        <div className="h-3 w-36 rounded bg-crm-border" />
      </CardContent>
    </Card>
  );
}
