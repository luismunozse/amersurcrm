import { Card, CardContent } from "@/components/ui/Card";

export function CobranzaAlertasPropiasSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="space-y-3 p-6">
        <div className="h-4 w-40 rounded bg-crm-border" />
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-9 w-full rounded bg-crm-border" />
        ))}
      </CardContent>
    </Card>
  );
}
