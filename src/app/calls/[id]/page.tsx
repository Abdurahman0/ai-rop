import { CallDetail } from "@/components/features/call-detail";

export default async function CallDetailPage({ params }: PageProps<"/calls/[id]">) {
  const { id } = await params;
  return <CallDetail id={id} />;
}
