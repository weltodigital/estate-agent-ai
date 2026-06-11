import { LegalDocument, type LegalSection } from "@/components/marketing/legal-document";
import { CONTACT_EMAIL } from "@/lib/copy";

export const metadata = { title: "Privacy Policy" };

const SECTIONS: LegalSection[] = [
  {
    heading: "Who we are",
    blocks: [
      `Privett is marketing software for UK estate agents, operated by Privett Ltd ("Privett", "we", "us"). We are the data controller for the account and website data described below, and a data processor for the property content you upload. You can reach us at ${CONTACT_EMAIL}.`,
    ],
  },
  {
    heading: "What we collect",
    blocks: [
      "We collect only what we need to run the service:",
      [
        "Account details: your name, work email, agency name, branch postcode, and team roles.",
        "Property content: the listings, photographs, floor plan sketches, and notes you upload to market a property.",
        "Usage data: the actions you take (descriptions generated, photos enhanced, staging created, floor plans and EPC lookups) so we can meter your plan.",
        "Billing data: your subscription tier and Stripe customer reference. Card details are handled by Stripe; we never see or store them.",
        "Technical data: authentication sessions, and error and performance diagnostics.",
      ],
    ],
  },
  {
    heading: "How we use it",
    blocks: [
      "We use your data to provide and improve the service: to generate descriptions, virtual staging and floor plans, to look up EPC data, to enforce plan limits, to take payment, to send service emails, and to keep the product secure and reliable.",
      "Our lawful bases under UK GDPR are performance of our contract with you, our legitimate interests in running and securing the service, and, where required, your consent.",
    ],
  },
  {
    heading: "AI processing and the providers we use",
    blocks: [
      "Some features send your content to trusted sub-processors so they can do their job. We do not sell your data, and we do not use your property content to train our own models.",
      [
        "Anthropic (Claude): writes property descriptions and reads floor plan sketches.",
        "Replicate: generates virtual staging and photo enhancements.",
        "Amazon Web Services (Rekognition): detects faces and number plates so they can be blurred for GDPR compliance.",
        "Cloudflare R2: stores your uploaded images and generated files.",
        "Supabase: our database and authentication.",
        "Stripe: payment processing.",
        "Resend: transactional and notification emails.",
        "Vercel and Railway: application hosting.",
        "Sentry: error and performance monitoring.",
      ],
    ],
  },
  {
    heading: "Photographs of people",
    blocks: [
      "Property photos may incidentally capture people or vehicles. Our GDPR-blur feature can detect and blur faces and number plates. You remain responsible for ensuring you have the right to upload and market any photograph, and for blurring identifying details before publication where appropriate.",
    ],
  },
  {
    heading: "International transfers",
    blocks: [
      "Some of our providers process data outside the UK, including in the United States. Where they do, transfers are protected by appropriate safeguards such as the UK International Data Transfer Agreement or Standard Contractual Clauses.",
    ],
  },
  {
    heading: "How long we keep it",
    blocks: [
      "We keep account and property data for as long as your account is active, and for a reasonable period afterwards to meet legal, accounting and dispute-resolution obligations. You can ask us to delete your data at any time, subject to those obligations.",
    ],
  },
  {
    heading: "Your rights",
    blocks: [
      "Under UK GDPR you have the right to access, correct, delete, restrict, or object to our use of your personal data, and to data portability. To exercise any of these, email us at " +
        CONTACT_EMAIL +
        ". You also have the right to complain to the Information Commissioner's Office (ico.org.uk), though we'd appreciate the chance to put things right first.",
    ],
  },
  {
    heading: "Security",
    blocks: [
      "Data is encrypted in transit, access is tenant-isolated at the database level, and we restrict internal access to what's needed to run the service. No system is perfectly secure, but we take protecting your data seriously.",
    ],
  },
  {
    heading: "Changes to this policy",
    blocks: [
      `We may update this policy from time to time. When we make material changes we'll update the date above and, where appropriate, let you know by email. Questions? Email ${CONTACT_EMAIL}.`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      lastUpdated="10 June 2026"
      intro="This policy explains what personal data Privett collects, how we use it, and the rights you have over it. We keep it plain and we keep it short."
      sections={SECTIONS}
    />
  );
}
