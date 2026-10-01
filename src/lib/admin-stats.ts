import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AdminStats = {
  users_total: number;
  users_verified: number;
  users_pending: number;
  signups_today: number;
  signups_week: number;
  active_week: number;
  test_accounts: number;
  verifications_pending: number;
  verifications_approved: number;
  verifications_rejected: number;
  deals_active: number;
  partners_total: number;
  jobs_active: number;
  housing_active: number;
  marketplace_active: number;
  marketplace_total: number;
  applications_total: number;
  views_deal: number;
  views_job: number;
  views_housing: number;
  views_marketplace: number;
  signups_by_day: { day: string; count: number }[];
};

export async function getAdminStats() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_stats");
  if (error) throw error;
  return data as unknown as AdminStats;
}
