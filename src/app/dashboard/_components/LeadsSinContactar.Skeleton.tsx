import { Card, CardContent } from "@/components/ui/Card";

export function LeadsSinContactarSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="space-y-3 p-6">
        <div className="h-4 w-36 rounded bg-crm-border" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-8 w-full rounded bg-crm-border" />
        ))}
      </CardContent>
    </Card>
  );
}
