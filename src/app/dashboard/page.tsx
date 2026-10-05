import { redirect } from "next/navigation";

// /dashboard has no page of its own. Send people to the client dashboard; the
// route guard (src/proxy.ts) forwards experts on to theirs.
export default function DashboardIndex() {
  redirect("/dashboard/client");
}
