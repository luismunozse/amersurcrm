import { Card, CardContent } from "@/components/ui/Card";

export function MetaDelMesSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="space-y-3 p-6">
        <div className="h-4 w-28 rounded bg-crm-border" />
        <div className="h-6 w-32 rounded bg-crm-border" />
        <div className="h-2 w-full rounded-full bg-crm-border" />
      </CardContent>
    </Card>
  );
}
