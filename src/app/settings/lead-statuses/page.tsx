import { redirect } from "next/navigation";

/** Lead statuses now live on the leads page as a tab; keep old links working. */
export default function LeadStatuses() {
  redirect("/leads?tab=statuses");
}
