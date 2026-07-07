import { Card, CardContent } from "@/components/ui/Card";

export function LotesDonutBlockSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-crm-border" />
          <div className="h-4 w-32 rounded bg-crm-border" />
        </div>
        <div className="flex items-center justify-center py-4">
          <div className="h-32 w-32 rounded-full bg-crm-border sm:h-40 sm:w-40" />
        </div>
      </CardContent>
    </Card>
  );
}
