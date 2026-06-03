import { PropertyDetail } from "@/components/property/property-detail";

export const metadata = { title: "Property" };

export default function PropertyDetailPage({ params }: { params: { id: string } }) {
  return <PropertyDetail propertyId={params.id} />;
}
