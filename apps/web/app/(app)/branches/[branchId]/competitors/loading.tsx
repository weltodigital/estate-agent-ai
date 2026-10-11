import { TableSkeleton } from "@/components/app/page-skeletons";

export default function Loading() {
  return <TableSkeleton rows={12} label="Loading competitors" />;
}
