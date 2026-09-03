import { OperatorDetail } from "@/components/features/operator-detail";

export default async function OperatorPage({ params }: PageProps<"/users/[id]">) {
  const { id } = await params;
  return <OperatorDetail id={id} />;
}
