import { LegalPage, legalMetadata } from "@/components/LegalPage";
import { LEGAL_DOCS } from "@/legal/content";

export const generateStaticParams = () => LEGAL_DOCS.map((doc) => ({ doc }));
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }) {
  return legalMetadata("en", (await params).doc);
}

export default async function Page({ params }: { params: Promise<{ doc: string }> }) {
  return <LegalPage locale="en" doc={(await params).doc} />;
}
