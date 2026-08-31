import { redirect } from "next/navigation";
import { ADMIN_DASHBOARD_ROUTE } from "@/lib/auth/config";

/**
 * /admin — convenience entry point. Always forwards to the protected
 * dashboard, which performs the real server-side session check and bounces
 * logged-out visitors to /admin/login.
 */
export default function AdminIndexPage() {
  redirect(ADMIN_DASHBOARD_ROUTE);
}
