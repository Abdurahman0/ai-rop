import { Suspense } from "react";
import { LeadsPage } from "@/components/features/resource-pages";

export default function Leads() {
  // LeadsPage reads ?tab= with useSearchParams, which needs a Suspense boundary.
  return (
    <Suspense>
      <LeadsPage />
    </Suspense>
  );
}
