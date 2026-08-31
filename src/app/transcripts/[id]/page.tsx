import { TranscriptDetail } from "@/components/features/intelligence-pages";

export default async function Transcript({ params }: PageProps<"/transcripts/[id]">) {
  const { id } = await params;
  return <TranscriptDetail id={id} />;
}
