import { Card, CardContent } from "@/components/ui/primitives";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <Card>
        <CardContent className="pt-5">
          <TableSkeleton rows={5} />
        </CardContent>
      </Card>
    </div>
  );
}
