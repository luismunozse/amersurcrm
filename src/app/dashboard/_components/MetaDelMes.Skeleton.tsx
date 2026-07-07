import { Card, CardContent } from "@/components/ui/Card";

export function MetaDelMesSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3 sm:shrink-0">
          <div className="h-11 w-11 shrink-0 rounded-xl bg-crm-border" />
          <div className="space-y-2">
            <div className="h-8 w-14 rounded bg-crm-border" />
            <div className="h-3 w-24 rounded bg-crm-border" />
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-5 w-36 rounded bg-crm-border" />
          <div className="h-3 w-full rounded-full bg-crm-border" />
        </div>
      </CardContent>
    </Card>
  );
}
