import { ClientDetail } from "@/components/features/resource-pages";

export default async function Client({ params }: PageProps<"/clients/[id]">) {
  const { id } = await params;
  return <ClientDetail id={id} />;
}
