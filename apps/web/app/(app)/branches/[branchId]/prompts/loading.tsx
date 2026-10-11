import { TableSkeleton } from "@/components/app/page-skeletons";

export default function Loading() {
  return <TableSkeleton rows={10} label="Loading answers" />;
}
