import { jsonLd, organizationSchema, softwareApplicationSchema } from "@/lib/seo";

/** Organization and SoftwareApplication structured data for the marketing site. */
export function SiteSchema() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(softwareApplicationSchema()) }} />
    </>
  );
}
