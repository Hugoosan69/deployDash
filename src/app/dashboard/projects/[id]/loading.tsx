import { Card, CardContent } from "@/components/ui/primitives";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((index) => (
          <Card key={index}>
            <CardContent className="space-y-3 pt-5">
              <Skeleton className="h-4 w-32" />
              <TableSkeleton rows={4} />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-5">
          <TableSkeleton rows={6} />
        </CardContent>
      </Card>
    </div>
  );
}
