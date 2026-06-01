import { PropertyDetail } from "@/components/property/property-detail";

export const metadata = { title: "Property — Estate Agent AI" };

export default function PropertyDetailPage({ params }: { params: { id: string } }) {
  return <PropertyDetail propertyId={params.id} />;
}
