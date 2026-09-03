import { Suspense } from "react";
import { UsersPage } from "@/components/features/users-page";

export default function Users() {
  // UsersPage reads ?tab= with useSearchParams, which needs a Suspense boundary.
  return (
    <Suspense>
      <UsersPage />
    </Suspense>
  );
}
