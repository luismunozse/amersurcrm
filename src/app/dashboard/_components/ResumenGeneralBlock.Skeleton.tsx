import { Card, CardContent } from "@/components/ui/Card";

// Assumes the esGlobal (5-tile) variant of ResumenGeneralBlock — CommandCenter
// only mounts this block in global views. Add an esGlobal prop if that changes.
export function ResumenGeneralBlockSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {[...Array(5)].map((_, i) => (
        <Card key={i} className="h-full animate-pulse">
          <CardContent className="flex h-full flex-col justify-center gap-2.5 p-5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 shrink-0 rounded-lg bg-crm-border" />
              <div className="h-3 w-28 rounded bg-crm-border" />
            </div>
            <div className="h-7 w-16 rounded bg-crm-border" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
