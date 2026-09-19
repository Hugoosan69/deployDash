import { Card, CardContent } from "@/components/ui/primitives";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      {[0, 1].map((index) => (
        <Card key={index}>
          <CardContent className="pt-5">
            <TableSkeleton rows={2} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
