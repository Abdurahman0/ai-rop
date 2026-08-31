import { LeadDetail } from "@/components/features/resource-pages";

export default async function Lead({ params }: PageProps<"/leads/[id]">) {
  const { id } = await params;
  return <LeadDetail id={id} />;
}
